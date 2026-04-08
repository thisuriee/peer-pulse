const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');
const Resource = require('../../../src/database/models/resource.model');
const User = require('../../../src/database/models/user.model');

let tutorId;

beforeAll(async () => {
  await connectTestDB();
  const tutor = await User.create({ name: 'Tutor', email: 'tutor@res.com', role: 'tutor' });
  tutorId = tutor._id;
});
afterEach(async () => await Resource.deleteMany({}));
afterAll(async () => await disconnectTestDB());

describe('Resource Model', () => {
  it('creates a resource with required fields', async () => {
    const resource = await Resource.create({
      title: 'Calculus Notes', description: 'Intro to derivatives',
      type: 'PDF', cloudinary_url: 'https://res.cloudinary.com/demo/sample.pdf',
      tutor_id: tutorId,
    });
    expect(resource._id).toBeDefined();
    expect(resource.type).toBe('PDF');
  });

  it('rejects resource without required title', async () => {
    await expect(Resource.create({
      description: 'No title', type: 'PDF',
      cloudinary_url: 'https://example.com/file.pdf', tutor_id: tutorId,
    })).rejects.toThrow();
  });

  it('rejects resource without cloudinary_url', async () => {
    await expect(Resource.create({
      title: 'No URL', description: 'Missing URL', type: 'PDF', tutor_id: tutorId,
    })).rejects.toThrow();
  });
});