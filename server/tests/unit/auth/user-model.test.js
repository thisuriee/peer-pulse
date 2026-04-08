const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');
const User = require('../../../src/database/models/user.model');

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

describe('User Model', () => {
  it('creates a user with required fields', async () => {
    const user = await User.create({ name: 'Bob', email: 'bob@test.com', password: 'hashed' });
    expect(user._id).toBeDefined();
    expect(user.role).toBe('student');
    expect(user.badge).toBe('none');
    expect(user.reputationScore).toBe(0);
  });

  it('rejects duplicate email', async () => {
    await User.create({ name: 'A', email: 'dup@test.com', password: 'x' });
    await expect(User.create({ name: 'B', email: 'dup@test.com', password: 'y' })).rejects.toThrow();
  });

  it('omitPassword removes password field', async () => {
    const user = await User.create({ name: 'C', email: 'c@test.com', password: 'secret' });
    expect(user.omitPassword().password).toBeUndefined();
  });

  it('isOAuthUser returns true when no password set', async () => {
    const user = await User.create({ name: 'D', email: 'd@test.com', googleId: 'gid123' });
    expect(user.isOAuthUser()).toBe(true);
  });
});