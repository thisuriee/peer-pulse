const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const request = require('supertest');

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value) => `hashed-${value}`),
  compare: jest.fn(async () => true),
}));

jest.mock('../../../src/integrations/cloudinary', () => ({
  cloudinary: {},
  uploadToCloudinary: jest.fn(),
  deleteFromCloudinary: jest.fn(),
  extractPublicId: jest.fn(() => 'peer-pulse/resources/mock-file'),
  normalizeResourceType: jest.fn((type) => {
    if (type === 'image') return 'image';
    if (type === 'video') return 'video';
    return 'raw';
  }),
}));

const app = require('../../helpers/app.helper');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');
const { signJwtToken } = require('../../../src/common/utils/token-utils');
const UserModel = require('../../../src/database/models/user.model');
const AuthSessionModel = require('../../../src/database/models/authSession.model');
const ResourceModel = require('../../../src/database/models/resource.model');
const LibraryAccessModel = require('../../../src/database/models/library-access.model');
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require('../../../src/integrations/cloudinary');

const createUserWithSession = async (role) => {
  const user = await UserModel.create({
    name: `Test ${role} ${Date.now()}`,
    email: `test-${role}-${Date.now()}-${Math.random()}@example.com`,
    password: 'password123',
    role,
  });

  const session = await AuthSessionModel.create({
    userId: user._id,
    userAgent: 'jest',
  });

  const accessToken = signJwtToken({ userId: user._id, sessionId: session._id });
  return { user, accessToken };
};

describe('Resource Integration Tests', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await clearTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it('rejects unauthenticated requests', async () => {
    const response = await request(app).get('/api/v1/resources');

    expect(response.status).toBe(401);
    expect(response.body.message).toBeDefined();
  });

  it('creates file resource for tutor (happy path)', async () => {
    const { user: tutor, accessToken } = await createUserWithSession('tutor');
    uploadToCloudinary.mockResolvedValue({ secure_url: 'https://cdn.example.com/resource.pdf' });

    const response = await request(app)
      .post('/api/v1/resources')
      .set('Cookie', `accessToken=${accessToken}`)
      .field('title', 'Physics Notes')
      .field('description', 'Fundamentals')
      .field('type', 'document')
      .field('category', 'Science')
      .attach('file', Buffer.from('resource-content'), {
        filename: 'notes.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.title).toBe('Physics Notes');
    expect(response.body.data.tutor_id._id.toString()).toBe(tutor._id.toString());

    const fromDb = await ResourceModel.findById(response.body.data._id);
    expect(fromDb).not.toBeNull();
    expect(fromDb.cloudinary_url).toBe('https://cdn.example.com/resource.pdf');
  });

  it('creates link resource without file', async () => {
    const { accessToken } = await createUserWithSession('tutor');

    const response = await request(app)
      .post('/api/v1/resources')
      .set('Cookie', `accessToken=${accessToken}`)
      .field('title', 'Calculus Video')
      .field('description', 'Watch this')
      .field('type', 'link')
      .field('linkUrl', 'https://youtube.com/watch?v=123');

    expect(response.status).toBe(201);
    expect(response.body.data.type).toBe('link');
    expect(response.body.data.cloudinary_url).toBe('https://youtube.com/watch?v=123');
  });

  it('returns 400 when link resource has missing linkUrl', async () => {
    const { accessToken } = await createUserWithSession('tutor');

    const response = await request(app)
      .post('/api/v1/resources')
      .set('Cookie', `accessToken=${accessToken}`)
      .field('title', 'Broken Link')
      .field('description', 'No url')
      .field('type', 'link');

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Link URL is required/i);
  });

  it('returns 400 when student requests resources without tutorId', async () => {
    const { accessToken } = await createUserWithSession('student');

    const response = await request(app)
      .get('/api/v1/resources')
      .set('Cookie', `accessToken=${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/tutorId is required/i);
  });

  it('returns 401 when student has no approved library access', async () => {
    const { user: tutor } = await createUserWithSession('tutor');
    const { accessToken: studentToken } = await createUserWithSession('student');

    const response = await request(app)
      .get(`/api/v1/resources?tutorId=${tutor._id}`)
      .set('Cookie', `accessToken=${studentToken}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/do not have access/i);
  });

  it('allows approved student to fetch tutor resources', async () => {
    const { user: tutor } = await createUserWithSession('tutor');
    const { user: student, accessToken: studentToken } = await createUserWithSession('student');

    await ResourceModel.create({
      title: 'Chemistry',
      description: 'Acids and bases',
      type: 'document',
      category: 'Science',
      cloudinary_url: 'https://cdn.example.com/chemistry.pdf',
      tutor_id: tutor._id,
    });

    await LibraryAccessModel.create({
      student_id: student._id,
      tutor_id: tutor._id,
      status: 'approved',
    });

    const response = await request(app)
      .get(`/api/v1/resources?tutorId=${tutor._id}&limit=1&skip=0`)
      .set('Cookie', `accessToken=${studentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.total).toBe(1);
  });

  it('updates metadata only and keeps same file URL', async () => {
    const { user: tutor, accessToken } = await createUserWithSession('tutor');
    const resource = await ResourceModel.create({
      title: 'Old title',
      description: 'Old desc',
      type: 'document',
      category: 'General',
      cloudinary_url: 'https://cdn.example.com/original.pdf',
      tutor_id: tutor._id,
    });

    const response = await request(app)
      .put(`/api/v1/resources/${resource._id}`)
      .set('Cookie', `accessToken=${accessToken}`)
      .field('title', 'New title')
      .field('description', 'New desc')
      .field('category', 'Updated');

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe('New title');

    const updated = await ResourceModel.findById(resource._id);
    expect(updated.description).toBe('New desc');
    expect(updated.category).toBe('Updated');
    expect(updated.cloudinary_url).toBe('https://cdn.example.com/original.pdf');
  });

  it('prevents tutor from updating another tutor resource', async () => {
    const { user: owner } = await createUserWithSession('tutor');
    const { accessToken: otherTutorToken } = await createUserWithSession('tutor');

    const resource = await ResourceModel.create({
      title: 'Owner file',
      description: 'Protected',
      type: 'document',
      category: 'General',
      cloudinary_url: 'https://cdn.example.com/owner.pdf',
      tutor_id: owner._id,
    });

    const response = await request(app)
      .put(`/api/v1/resources/${resource._id}`)
      .set('Cookie', `accessToken=${otherTutorToken}`)
      .field('title', 'Illegal update');

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/not authorized/i);
  });

  it('deletes owned resource and invokes cloudinary deletion flow', async () => {
    const { user: tutor, accessToken } = await createUserWithSession('tutor');
    deleteFromCloudinary.mockResolvedValue({ result: 'ok' });

    const resource = await ResourceModel.create({
      title: 'To delete',
      description: 'Delete me',
      type: 'document',
      category: 'General',
      cloudinary_url: 'https://res.cloudinary.com/demo/upload/v1/folder/test.pdf',
      tutor_id: tutor._id,
    });

    const response = await request(app)
      .delete(`/api/v1/resources/${resource._id}`)
      .set('Cookie', `accessToken=${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Resource deleted successfully');

    const deleted = await ResourceModel.findById(resource._id);
    expect(deleted).toBeNull();
    expect(deleteFromCloudinary).toHaveBeenCalled();
  });

  it('returns 400 for search endpoint when q is missing', async () => {
    const { accessToken } = await createUserWithSession('tutor');

    const response = await request(app)
      .get('/api/v1/resources/search')
      .set('Cookie', `accessToken=${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Search query is required');
  });

  it('searches resources by q with type filter', async () => {
    const { user: tutor, accessToken } = await createUserWithSession('tutor');

    await ResourceModel.create({
      title: 'Linear Algebra Notes',
      description: 'Matrices and vectors',
      type: 'document',
      category: 'Math',
      cloudinary_url: 'https://cdn.example.com/la.pdf',
      tutor_id: tutor._id,
    });
    await ResourceModel.create({
      title: 'History podcast',
      description: 'Ancient world',
      type: 'video',
      category: 'History',
      cloudinary_url: 'https://cdn.example.com/history.mp4',
      tutor_id: tutor._id,
    });

    const response = await request(app)
      .get('/api/v1/resources/search?q=algebra&type=document&limit=5&skip=0')
      .set('Cookie', `accessToken=${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.data[0].title).toMatch(/Algebra/i);
  });
});
