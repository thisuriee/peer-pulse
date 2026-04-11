const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../../src/common/utils/token-utils');
jest.mock('../../../src/database/models/authSession.model');
jest.mock('../../../src/database/models/user.model');

const { verifyJwtToken } = require('../../../src/common/utils/token-utils');
const SessionModel = require('../../../src/database/models/authSession.model');
const UserModel = require('../../../src/database/models/user.model');
const { authenticateJWT, optionalAuth } = require('../../../src/common/middleware/auth.middleware');

const makeReq = (cookies = {}) => ({ cookies });
const makeRes = () => ({});

// ─── authenticateJWT ──────────────────────────────────────────────────────────

describe('authenticateJWT', () => {
  let req, res, next;

  beforeEach(() => {
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('calls next with UnauthorizedException when no accessToken cookie', async () => {
    req = makeReq({});

    await authenticateJWT(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with UnauthorizedException when token verification fails', async () => {
    req = makeReq({ accessToken: 'bad.token' });
    verifyJwtToken.mockReturnValue({ error: 'invalid signature' });

    await authenticateJWT(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with UnauthorizedException when session is not found', async () => {
    req = makeReq({ accessToken: 'valid.token' });
    verifyJwtToken.mockReturnValue({ payload: { userId: 'uid1', sessionId: 'sid1' } });
    SessionModel.findById = jest.fn().mockResolvedValue(null);

    await authenticateJWT(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with UnauthorizedException when session is expired', async () => {
    req = makeReq({ accessToken: 'valid.token' });
    verifyJwtToken.mockReturnValue({ payload: { userId: 'uid1', sessionId: 'sid1' } });
    SessionModel.findById = jest.fn().mockResolvedValue({
      expiredAt: new Date(Date.now() - 1000),
    });

    await authenticateJWT(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with UnauthorizedException when user is not found', async () => {
    req = makeReq({ accessToken: 'valid.token' });
    verifyJwtToken.mockReturnValue({ payload: { userId: 'uid1', sessionId: 'sid1' } });
    SessionModel.findById = jest.fn().mockResolvedValue({
      expiredAt: new Date(Date.now() + 60_000),
    });
    UserModel.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await authenticateJWT(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('attaches req.user and req.sessionId and calls next with no error on success', async () => {
    req = makeReq({ accessToken: 'valid.token' });
    verifyJwtToken.mockReturnValue({ payload: { userId: 'uid1', sessionId: 'sid1' } });
    SessionModel.findById = jest.fn().mockResolvedValue({
      expiredAt: new Date(Date.now() + 60_000),
    });
    UserModel.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: 'student' }),
    });

    await authenticateJWT(req, res, next);

    expect(req.user).toEqual({ id: 'uid1', role: 'student' });
    expect(req.sessionId).toBe('sid1');
    expect(next).toHaveBeenCalledWith();
  });

  it('attaches correct role from user record', async () => {
    req = makeReq({ accessToken: 'valid.token' });
    verifyJwtToken.mockReturnValue({ payload: { userId: 'uid2', sessionId: 'sid2' } });
    SessionModel.findById = jest.fn().mockResolvedValue({
      expiredAt: new Date(Date.now() + 60_000),
    });
    UserModel.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: 'tutor' }),
    });

    await authenticateJWT(req, res, next);

    expect(req.user).toEqual({ id: 'uid2', role: 'tutor' });
  });
});

// ─── optionalAuth ─────────────────────────────────────────────────────────────

describe('optionalAuth', () => {
  let req, res, next;

  beforeEach(() => {
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('calls next without attaching user when no accessToken cookie', async () => {
    req = makeReq({});

    await optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('attaches user info when token is valid and session is active', async () => {
    req = makeReq({ accessToken: 'valid.token' });
    verifyJwtToken.mockReturnValue({ payload: { userId: 'uid1', sessionId: 'sid1' } });
    SessionModel.findById = jest.fn().mockResolvedValue({
      expiredAt: new Date(Date.now() + 60_000),
    });
    UserModel.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: 'tutor' }),
    });

    await optionalAuth(req, res, next);

    expect(req.user).toEqual({ id: 'uid1', role: 'tutor' });
    expect(req.sessionId).toBe('sid1');
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next silently without attaching user when token is invalid', async () => {
    req = makeReq({ accessToken: 'bad.token' });
    verifyJwtToken.mockReturnValue({ error: 'jwt malformed' });

    await optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next silently without attaching user when session is expired', async () => {
    req = makeReq({ accessToken: 'valid.token' });
    verifyJwtToken.mockReturnValue({ payload: { userId: 'uid1', sessionId: 'sid1' } });
    SessionModel.findById = jest.fn().mockResolvedValue({
      expiredAt: new Date(Date.now() - 1000),
    });

    await optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next silently when session is not found', async () => {
    req = makeReq({ accessToken: 'valid.token' });
    verifyJwtToken.mockReturnValue({ payload: { userId: 'uid1', sessionId: 'sid1' } });
    SessionModel.findById = jest.fn().mockResolvedValue(null);

    await optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });
});
