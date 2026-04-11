const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../../src/database/models/user.model');
jest.mock('../../../src/database/models/authSession.model');
jest.mock('../../../src/common/utils/token-utils', () => {
  const actual = jest.requireActual('../../../src/common/utils/token-utils');
  return { ...actual, signJwtToken: jest.fn(), verifyJwtToken: jest.fn() };
});

const UserModel = require('../../../src/database/models/user.model');
const SessionModel = require('../../../src/database/models/authSession.model');
const { signJwtToken, verifyJwtToken } = require('../../../src/common/utils/token-utils');
const { AuthService } = require('../../../src/modules/auth/auth.service');
const {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} = require('../../../src/common/utils/errors-utils');

let authService;

beforeEach(() => {
  authService = new AuthService();
  jest.clearAllMocks();
});

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeUser = (overrides = {}) => ({
  _id: 'uid1',
  email: 'alice@test.com',
  role: 'student',
  comparePassword: jest.fn().mockResolvedValue(true),
  omitPassword: jest.fn().mockReturnValue({ _id: 'uid1', email: 'alice@test.com', role: 'student' }),
  ...overrides,
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('AuthService.register', () => {
  it('creates a user and returns data without password', async () => {
    UserModel.exists.mockResolvedValue(null);
    UserModel.create.mockResolvedValue(makeUser());

    const { user } = await authService.register({
      name: 'Alice', email: 'alice@test.com', password: 'password123',
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('alice@test.com');
    expect(user.password).toBeUndefined();
  });

  it('defaults role to student', async () => {
    UserModel.exists.mockResolvedValue(null);
    UserModel.create.mockResolvedValue(makeUser());

    const { user } = await authService.register({
      name: 'Alice', email: 'alice@test.com', password: 'pass123',
    });

    expect(user.role).toBe('student');
  });

  it('throws BadRequestException for a duplicate email', async () => {
    UserModel.exists.mockResolvedValue({ _id: 'existing-id' });

    await expect(
      authService.register({ name: 'Alice', email: 'alice@test.com', password: 'pass123' })
    ).rejects.toThrow(BadRequestException);
  });

  it('calls UserModel.create with the provided data', async () => {
    UserModel.exists.mockResolvedValue(null);
    UserModel.create.mockResolvedValue(makeUser({ role: 'tutor' }));

    await authService.register({ name: 'Bob', email: 'bob@test.com', password: 'pass123', role: 'tutor' });

    expect(UserModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Bob', email: 'bob@test.com', role: 'tutor' })
    );
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('AuthService.login', () => {
  it('returns user, accessToken and refreshToken on success', async () => {
    UserModel.findOne.mockResolvedValue(makeUser());
    SessionModel.create.mockResolvedValue({ _id: 'sid1' });
    signJwtToken.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

    const result = await authService.login({
      email: 'alice@test.com', password: 'password123', userAgent: 'jest',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.mfaRequired).toBe(false);
    expect(result.user.password).toBeUndefined();
  });

  it('creates a session with the provided userAgent', async () => {
    UserModel.findOne.mockResolvedValue(makeUser());
    SessionModel.create.mockResolvedValue({ _id: 'sid1' });
    signJwtToken.mockReturnValue('token');

    await authService.login({ email: 'alice@test.com', password: 'password123', userAgent: 'chrome' });

    expect(SessionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ userAgent: 'chrome' })
    );
  });

  it('throws BadRequestException for an unregistered email', async () => {
    UserModel.findOne.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'nobody@test.com', password: 'pass', userAgent: 'jest' })
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for a wrong password', async () => {
    UserModel.findOne.mockResolvedValue(
      makeUser({ comparePassword: jest.fn().mockResolvedValue(false) })
    );

    await expect(
      authService.login({ email: 'alice@test.com', password: 'wrong', userAgent: 'jest' })
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── refreshToken ─────────────────────────────────────────────────────────────

describe('AuthService.refreshToken', () => {
  const activeSession = () => ({
    _id: 'sid1',
    userId: 'uid1',
    expiredAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days — no rotation
    save: jest.fn(),
  });

  it('returns a new accessToken for a valid token', async () => {
    verifyJwtToken.mockReturnValue({ payload: { sessionId: 'sid1' } });
    SessionModel.findById.mockResolvedValue(activeSession());
    signJwtToken.mockReturnValue('new-access-token');

    const result = await authService.refreshToken('valid-refresh-token');

    expect(result.accessToken).toBe('new-access-token');
  });

  it('does not rotate refresh token when session is not near expiry', async () => {
    verifyJwtToken.mockReturnValue({ payload: { sessionId: 'sid1' } });
    SessionModel.findById.mockResolvedValue(activeSession());
    signJwtToken.mockReturnValue('token');

    const result = await authService.refreshToken('valid-token');

    expect(result.newRefreshToken).toBeUndefined();
  });

  it('rotates the refresh token when session is within one day of expiry', async () => {
    verifyJwtToken.mockReturnValue({ payload: { sessionId: 'sid1' } });
    SessionModel.findById.mockResolvedValue({
      _id: 'sid1',
      userId: 'uid1',
      expiredAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      save: jest.fn(),
    });
    signJwtToken.mockReturnValueOnce('rotated-refresh').mockReturnValueOnce('new-access');

    const result = await authService.refreshToken('valid-token');

    expect(result.newRefreshToken).toBe('rotated-refresh');
    expect(result.accessToken).toBe('new-access');
  });

  it('throws UnauthorizedException when payload is null', async () => {
    verifyJwtToken.mockReturnValue({ payload: null });

    await expect(authService.refreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when session does not exist', async () => {
    verifyJwtToken.mockReturnValue({ payload: { sessionId: 'sid1' } });
    SessionModel.findById.mockResolvedValue(null);

    await expect(authService.refreshToken('valid-token')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for an expired session', async () => {
    verifyJwtToken.mockReturnValue({ payload: { sessionId: 'sid1' } });
    SessionModel.findById.mockResolvedValue({
      expiredAt: new Date(Date.now() - 1000),
      save: jest.fn(),
    });

    await expect(authService.refreshToken('valid-token')).rejects.toThrow(UnauthorizedException);
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('AuthService.logout', () => {
  it('calls findByIdAndDelete with the sessionId', async () => {
    SessionModel.findByIdAndDelete.mockResolvedValue({ _id: 'sid1' });

    await authService.logout('sid1');

    expect(SessionModel.findByIdAndDelete).toHaveBeenCalledWith('sid1');
  });

  it('returns null when session does not exist', async () => {
    SessionModel.findByIdAndDelete.mockResolvedValue(null);

    const result = await authService.logout('nonexistent-id');

    expect(result).toBeNull();
  });
});

// ─── getCurrentUser ───────────────────────────────────────────────────────────

describe('AuthService.getCurrentUser', () => {
  it('returns the user data', async () => {
    const mockUser = { _id: 'uid1', name: 'Alice', email: 'alice@test.com' };
    UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

    const user = await authService.getCurrentUser('uid1');

    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@test.com');
  });

  it('throws NotFoundException for an unknown userId', async () => {
    UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await expect(authService.getCurrentUser('unknown-id')).rejects.toThrow(NotFoundException);
  });
});
