const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const mongoose = require('mongoose');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');
const { AuthService } = require('../../../src/modules/auth/auth.service');
const UserModel = require('../../../src/database/models/user.model');
const SessionModel = require('../../../src/database/models/authSession.model');
const { signJwtToken, refreshTokenSignOptions } = require('../../../src/common/utils/token-utils');
const { BadRequestException, UnauthorizedException, NotFoundException } = require('../../../src/common/utils/errors-utils');

let authService;

beforeAll(async () => {
  await connectTestDB();
  authService = new AuthService();
});
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── register ─────────────────────────────────────────────────────────────────

describe('AuthService.register', () => {
  it('creates a user and returns data without password', async () => {
    const result = await authService.register({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'password123',
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('alice@test.com');
    expect(result.user.password).toBeUndefined();
  });

  it('defaults role to student when not provided', async () => {
    const { user } = await authService.register({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'password123',
    });

    expect(user.role).toBe('student');
  });

  it('accepts an explicit tutor role', async () => {
    const { user } = await authService.register({
      name: 'Bob',
      email: 'bob@test.com',
      password: 'password123',
      role: 'tutor',
    });

    expect(user.role).toBe('tutor');
  });

  it('throws BadRequestException for a duplicate email', async () => {
    await authService.register({ name: 'Alice', email: 'alice@test.com', password: 'password123' });

    await expect(
      authService.register({ name: 'Alice2', email: 'alice@test.com', password: 'password456' })
    ).rejects.toThrow(BadRequestException);
  });

  it('persists the user in the database', async () => {
    await authService.register({ name: 'Charlie', email: 'charlie@test.com', password: 'pass123' });

    const stored = await UserModel.findOne({ email: 'charlie@test.com' });
    expect(stored).not.toBeNull();
    expect(stored.name).toBe('Charlie');
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('AuthService.login', () => {
  beforeEach(async () => {
    await authService.register({ name: 'Alice', email: 'alice@test.com', password: 'password123' });
  });

  it('returns user, accessToken, and refreshToken on success', async () => {
    const result = await authService.login({
      email: 'alice@test.com',
      password: 'password123',
      userAgent: 'jest',
    });

    expect(result.user).toBeDefined();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.mfaRequired).toBe(false);
  });

  it('omits password from the returned user object', async () => {
    const { user } = await authService.login({
      email: 'alice@test.com',
      password: 'password123',
      userAgent: 'jest',
    });

    expect(user.password).toBeUndefined();
  });

  it('creates a session record in the database', async () => {
    await authService.login({ email: 'alice@test.com', password: 'password123', userAgent: 'chrome' });

    const sessions = await SessionModel.find({});
    expect(sessions.length).toBe(1);
    expect(sessions[0].userAgent).toBe('chrome');
  });

  it('throws BadRequestException for an unregistered email', async () => {
    await expect(
      authService.login({ email: 'nobody@test.com', password: 'password123', userAgent: 'jest' })
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for a wrong password', async () => {
    await expect(
      authService.login({ email: 'alice@test.com', password: 'wrongpassword', userAgent: 'jest' })
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── refreshToken ─────────────────────────────────────────────────────────────

describe('AuthService.refreshToken', () => {
  let session;
  let validRefreshToken;

  beforeEach(async () => {
    const user = await UserModel.create({ name: 'Alice', email: 'alice@test.com', password: 'hashed' });
    session = await SessionModel.create({ userId: user._id, userAgent: 'jest' });
    validRefreshToken = signJwtToken({ sessionId: session._id }, refreshTokenSignOptions);
  });

  it('returns a new accessToken for a valid refresh token', async () => {
    const result = await authService.refreshToken(validRefreshToken);

    expect(result.accessToken).toBeDefined();
  });

  it('does not issue a new refreshToken when session is not near expiry', async () => {
    const result = await authService.refreshToken(validRefreshToken);

    expect(result.newRefreshToken).toBeUndefined();
  });

  it('throws UnauthorizedException for a malformed token', async () => {
    await expect(authService.refreshToken('invalid.token.here')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when session does not exist', async () => {
    await SessionModel.findByIdAndDelete(session._id);

    await expect(authService.refreshToken(validRefreshToken)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for an expired session', async () => {
    await SessionModel.findByIdAndUpdate(session._id, {
      expiredAt: new Date(Date.now() - 1000),
    });

    await expect(authService.refreshToken(validRefreshToken)).rejects.toThrow(UnauthorizedException);
  });

  it('rotates the refresh token when session is within one day of expiry', async () => {
    // Set session to expire in 30 minutes (within 1-day threshold)
    await SessionModel.findByIdAndUpdate(session._id, {
      expiredAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    const result = await authService.refreshToken(validRefreshToken);

    expect(result.newRefreshToken).toBeDefined();
    expect(result.accessToken).toBeDefined();
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('AuthService.logout', () => {
  it('deletes the session by sessionId', async () => {
    const user = await UserModel.create({ name: 'Alice', email: 'alice@test.com', password: 'hashed' });
    const session = await SessionModel.create({ userId: user._id });

    await authService.logout(session._id);

    const found = await SessionModel.findById(session._id);
    expect(found).toBeNull();
  });

  it('returns null when session does not exist', async () => {
    const result = await authService.logout(new mongoose.Types.ObjectId());

    expect(result).toBeNull();
  });
});

// ─── getCurrentUser ───────────────────────────────────────────────────────────

describe('AuthService.getCurrentUser', () => {
  it('returns user data without password', async () => {
    const created = await UserModel.create({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'hashed',
    });

    const user = await authService.getCurrentUser(created._id);

    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@test.com');
    expect(user.password).toBeUndefined();
  });

  it('throws NotFoundException for an unknown userId', async () => {
    await expect(
      authService.getCurrentUser(new mongoose.Types.ObjectId())
    ).rejects.toThrow(NotFoundException);
  });
});