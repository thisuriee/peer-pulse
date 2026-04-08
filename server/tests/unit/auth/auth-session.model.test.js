const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');
const SessionModel = require('../../../src/database/models/authSession.model');
const UserModel = require('../../../src/database/models/user.model');

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

describe('AuthSession Model', () => {
  let userId;

  beforeEach(async () => {
    const user = await UserModel.create({
      name: 'Test User',
      email: 'test@test.com',
      password: 'hashed',
    });
    userId = user._id;
  });

  it('creates a session with a valid userId', async () => {
    const session = await SessionModel.create({ userId });

    expect(session._id).toBeDefined();
    expect(session.userId.toString()).toBe(userId.toString());
  });

  it('sets expiredAt to approximately 30 days from now by default', async () => {
    const before = Date.now();
    const session = await SessionModel.create({ userId });
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    expect(session.expiredAt.getTime()).toBeGreaterThanOrEqual(before + thirtyDays - 1000);
    expect(session.expiredAt.getTime()).toBeLessThanOrEqual(before + thirtyDays + 5000);
  });

  it('stores an optional userAgent', async () => {
    const session = await SessionModel.create({ userId, userAgent: 'Mozilla/5.0' });

    expect(session.userAgent).toBe('Mozilla/5.0');
  });

  it('allows a session without a userAgent', async () => {
    const session = await SessionModel.create({ userId });

    expect(session.userAgent).toBeUndefined();
  });

  it('throws a validation error when userId is missing', async () => {
    await expect(SessionModel.create({ userAgent: 'test-agent' })).rejects.toThrow();
  });

  it('allows a custom expiredAt date', async () => {
    const customExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await SessionModel.create({ userId, expiredAt: customExpiry });

    expect(Math.abs(session.expiredAt.getTime() - customExpiry.getTime())).toBeLessThan(1000);
  });

  it('sets createdAt timestamp automatically', async () => {
    const session = await SessionModel.create({ userId });

    expect(session.createdAt).toBeDefined();
    expect(session.createdAt).toBeInstanceOf(Date);
  });

  it('can be deleted by id', async () => {
    const session = await SessionModel.create({ userId });

    await SessionModel.findByIdAndDelete(session._id);

    const found = await SessionModel.findById(session._id);
    expect(found).toBeNull();
  });
});
