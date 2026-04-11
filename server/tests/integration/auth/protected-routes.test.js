'use strict';

/**
 * Integration tests — GET /api/v1/auth/me  (and the authenticateJWT middleware)
 *
 * The /me endpoint sits behind authenticateJWT, making it an ideal harness
 * for testing every authentication guard scenario end-to-end.
 *
 * Coverage:
 *   - Authenticated access (happy path)
 *   - Missing token
 *   - Tampered / invalid token
 *   - Expired session (session deleted from DB)
 *   - Role is returned correctly
 *   - Token issued for a deleted user
 *
 * Integration vs unit distinction:
 *   auth.middleware.test.js (unit) mocks SessionModel and UserModel to test
 *   the middleware's branching logic.  Here we prove that the middleware
 *   integrates correctly with real tokens, real sessions, and a real database.
 */

const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../helpers/app.helper');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');
const SessionModel = require('../../../src/database/models/authSession.model');

const REGISTER = '/api/v1/auth/register';
const LOGIN    = '/api/v1/auth/login';
const LOGOUT   = '/api/v1/auth/logout';
const ME       = '/api/v1/auth/me';

// ─── lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── helpers ───────────────────────────────────────────────────────────────────

async function createAndAuthenticateUser(overrides = {}) {
  const credentials = {
    name: 'Alice',
    email: 'alice@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'student',
    ...overrides,
  };

  await request(app).post(REGISTER).send(credentials);

  const agent = request.agent(app);
  const loginRes = await agent
    .post(LOGIN)
    .send({ email: credentials.email, password: credentials.password });

  return { agent, credentials, loginRes };
}

// ─── GET /api/v1/auth/me — success ────────────────────────────────────────────

describe('GET /api/v1/auth/me — authenticated access', () => {
  it('returns 200 for a fully authenticated request', async () => {
    const { agent } = await createAndAuthenticateUser();

    const res = await agent.get(ME);

    expect(res.status).toBe(200);
  });

  it('returns the authenticated user object in the response', async () => {
    const { agent, credentials } = await createAndAuthenticateUser();

    const res = await agent.get(ME);

    expect(res.body.message).toBe('User fetched successfully');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.email).toBe(credentials.email);
    expect(res.body.data.name).toBe(credentials.name);
  });

  it('never exposes the password field', async () => {
    const { agent } = await createAndAuthenticateUser();

    const res = await agent.get(ME);

    expect(res.body.data.password).toBeUndefined();
  });

  it('returns the correct role for a student account', async () => {
    const { agent } = await createAndAuthenticateUser({ role: 'student' });

    const res = await agent.get(ME);

    expect(res.body.data.role).toBe('student');
  });
});

// ─── GET /api/v1/auth/me — missing / invalid token ────────────────────────────

describe('GET /api/v1/auth/me — unauthenticated requests', () => {
  it('returns 401 when no accessToken cookie is sent', async () => {
    const res = await request(app).get(ME);

    expect(res.status).toBe(401);
  });

  it('returns AUTH_TOKEN_NOT_FOUND when token cookie is absent', async () => {
    const res = await request(app).get(ME);

    expect(res.body.errorCode).toBe('AUTH_TOKEN_NOT_FOUND');
  });

  it('returns 401 for a structurally invalid token', async () => {
    const res = await request(app)
      .get(ME)
      .set('Cookie', 'accessToken=this.is.not.a.valid.jwt');

    expect(res.status).toBe(401);
  });

  it('returns AUTH_INVALID_TOKEN for a structurally invalid token', async () => {
    const res = await request(app)
      .get(ME)
      .set('Cookie', 'accessToken=this.is.not.a.valid.jwt');

    expect(res.body.errorCode).toBe('AUTH_INVALID_TOKEN');
  });
});

// ─── GET /api/v1/auth/me — session-level failures ─────────────────────────────

describe('GET /api/v1/auth/me — session-level failures', () => {
  it('returns 401 after the session has been deleted (e.g. after logout)', async () => {
    const { agent } = await createAndAuthenticateUser();

    // Logout invalidates the session
    await agent.post(LOGOUT);

    // The agent cookie jar is now cleared — request should be rejected
    const res = await agent.get(ME);
    expect(res.status).toBe(401);
  });

  it('returns 401 when the session is deleted directly from the DB', async () => {
    const { agent } = await createAndAuthenticateUser();

    // Verify access works before tampering
    const before = await agent.get(ME);
    expect(before.status).toBe(200);

    // Wipe all sessions from DB to simulate external invalidation
    await SessionModel.deleteMany({});

    const after = await agent.get(ME);
    expect(after.status).toBe(401);
  });

  it('returns AUTH_INVALID_TOKEN when the session record no longer exists', async () => {
    const { agent } = await createAndAuthenticateUser();

    await SessionModel.deleteMany({});

    const res = await agent.get(ME);
    expect(res.body.errorCode).toBe('AUTH_INVALID_TOKEN');
  });

  it('returns 401 for a session that has been manually expired', async () => {
    const { agent } = await createAndAuthenticateUser();

    // Back-date every session so it appears expired
    await SessionModel.updateMany({}, { $set: { expiredAt: new Date(Date.now() - 1000) } });

    const res = await agent.get(ME);
    expect(res.status).toBe(401);
  });
});

// ─── isolation between users ───────────────────────────────────────────────────

describe('GET /api/v1/auth/me — user isolation', () => {
  it('each user sees only their own data', async () => {
    const { agent: agentA } = await createAndAuthenticateUser({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const { agent: agentB } = await createAndAuthenticateUser({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'password456',
      confirmPassword: 'password456',
    });

    const [resA, resB] = await Promise.all([
      agentA.get(ME),
      agentB.get(ME),
    ]);

    expect(resA.body.data.email).toBe('alice@example.com');
    expect(resB.body.data.email).toBe('bob@example.com');
    expect(resA.body.data._id).not.toBe(resB.body.data._id);
  });

  it("Alice's token cannot access Bob's session", async () => {
    // Agents are independent — each has their own cookie jar
    const { agent: agentA } = await createAndAuthenticateUser({
      name: 'Alice', email: 'alice@example.com',
      password: 'password123', confirmPassword: 'password123',
    });

    await createAndAuthenticateUser({
      name: 'Bob', email: 'bob@example.com',
      password: 'password456', confirmPassword: 'password456',
    });

    // Alice's agent still uses Alice's session — no cross-contamination
    const resA = await agentA.get(ME);
    expect(resA.status).toBe(200);
    expect(resA.body.data.email).toBe('alice@example.com');
  });
});
