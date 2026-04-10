'use strict';

/**
 * Integration tests — POST /api/v1/auth/login
 *                     GET  /api/v1/auth/refresh
 *                     POST /api/v1/auth/logout
 *
 * These tests exercise the full HTTP stack (supertest → Express → in-memory
 * MongoDB).  No mocks are used; real JWT tokens are signed, real sessions are
 * created, and cookie headers are inspected directly.
 *
 * Contrast with unit tests (auth.service.test.js) which mock UserModel and
 * token-utils to test business logic in isolation.  Here we test:
 *   - The Zod validation layer in the controller
 *   - Cookie-setting behaviour of setAuthenticationCookies
 *   - Real bcrypt password comparison via the User model pre-save hook
 *   - Token round-tripping: login → refresh → access protected resource
 */

const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../helpers/app.helper');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');

const REGISTER = '/api/v1/auth/register';
const LOGIN    = '/api/v1/auth/login';
const REFRESH  = '/api/v1/auth/refresh';
const LOGOUT   = '/api/v1/auth/logout';
const ME       = '/api/v1/auth/me';

// ─── lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── helpers ───────────────────────────────────────────────────────────────────

/** Register a user and return the supertest agent with cookies set after login */
async function registerAndLogin(overrides = {}) {
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
  await agent.post(LOGIN).send({
    email: credentials.email,
    password: credentials.password,
  });

  return { agent, credentials };
}

/** Extract a named cookie string from a set-cookie header array */
function extractCookie(setCookieHeaders, name) {
  if (!setCookieHeaders) return null;
  const match = setCookieHeaders.find((c) => c.startsWith(`${name}=`));
  return match ? match.split(';')[0] : null; // e.g. "accessToken=eyJ..."
}

// ─── login — success ───────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login — success', () => {
  it('returns 200 with a success message', async () => {
    await request(app).post(REGISTER).send({
      name: 'Alice', email: 'alice@example.com',
      password: 'password123', confirmPassword: 'password123',
    });

    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User login successfully');
  });

  it('sets an httpOnly accessToken cookie', async () => {
    await request(app).post(REGISTER).send({
      name: 'Alice', email: 'alice@example.com',
      password: 'password123', confirmPassword: 'password123',
    });

    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'alice@example.com', password: 'password123' });

    const cookies = res.headers['set-cookie'] || [];
    const accessCookie = extractCookie(cookies, 'accessToken');

    expect(accessCookie).not.toBeNull();
    expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
  });

  it('sets a refreshToken cookie', async () => {
    await request(app).post(REGISTER).send({
      name: 'Alice', email: 'alice@example.com',
      password: 'password123', confirmPassword: 'password123',
    });

    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'alice@example.com', password: 'password123' });

    const cookies = res.headers['set-cookie'] || [];
    const refreshCookie = extractCookie(cookies, 'refreshToken');

    expect(refreshCookie).not.toBeNull();
  });

  it('returns user data in the response body without the password', async () => {
    await request(app).post(REGISTER).send({
      name: 'Alice', email: 'alice@example.com',
      password: 'password123', confirmPassword: 'password123',
    });

    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns mfaRequired: false', async () => {
    await request(app).post(REGISTER).send({
      name: 'Alice', email: 'alice@example.com',
      password: 'password123', confirmPassword: 'password123',
    });

    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.body.mfaRequired).toBe(false);
  });

  it('returns the correct role for a tutor account', async () => {
    await request(app).post(REGISTER).send({
      name: 'Bob', email: 'bob@example.com',
      password: 'password123', confirmPassword: 'password123', role: 'tutor',
    });

    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'bob@example.com', password: 'password123' });

    expect(res.body.user.role).toBe('tutor');
  });
});

// ─── login — failures ──────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login — failures', () => {
  it('returns 400 for an unregistered email', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for a wrong password', async () => {
    await request(app).post(REGISTER).send({
      name: 'Alice', email: 'alice@example.com',
      password: 'password123', confirmPassword: 'password123',
    });

    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'alice@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(400);
  });

  it('does not set auth cookies on a failed login', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'nobody@example.com', password: 'password123' });

    const cookies = res.headers['set-cookie'] || [];
    expect(extractCookie(cookies, 'accessToken')).toBeNull();
    expect(extractCookie(cookies, 'refreshToken')).toBeNull();
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for a malformed email', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is shorter than 6 characters', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'alice@example.com', password: 'abc' });

    expect(res.status).toBe(400);
  });

  it('returns a "Validation failed" message and an errors array for schema failures', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('returns 400 when request body is entirely empty', async () => {
    const res = await request(app).post(LOGIN).send({});

    expect(res.status).toBe(400);
  });
});

// ─── refresh token ─────────────────────────────────────────────────────────────

describe('GET /api/v1/auth/refresh', () => {
  it('returns 200 and sets a new accessToken cookie with a valid refresh token', async () => {
    const { agent } = await registerAndLogin();

    const res = await agent.get(REFRESH);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Refresh access token successfully');

    const cookies = res.headers['set-cookie'] || [];
    expect(extractCookie(cookies, 'accessToken')).not.toBeNull();
  });

  it('returns 401 when no refreshToken cookie is present', async () => {
    // Plain request — no cookies
    const res = await request(app).get(REFRESH);

    expect(res.status).toBe(401);
  });

  it('returns 401 for a tampered / invalid refresh token', async () => {
    const res = await request(app)
      .get(REFRESH)
      .set('Cookie', 'refreshToken=this.is.not.a.valid.jwt');

    expect(res.status).toBe(401);
  });

  it('new accessToken allows access to protected routes', async () => {
    const { agent } = await registerAndLogin();

    // Refresh to get a fresh access token
    await agent.get(REFRESH);

    // The agent now holds the refreshed accessToken cookie
    const meRes = await agent.get(ME);
    expect(meRes.status).toBe(200);
  });
});

// ─── logout ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('returns 200 and a success message', async () => {
    const { agent } = await registerAndLogin();

    const res = await agent.post(LOGOUT);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User logout successfully');
  });

  it('clears the accessToken cookie on logout', async () => {
    const { agent } = await registerAndLogin();

    const res = await agent.post(LOGOUT);

    const cookies = res.headers['set-cookie'] || [];
    // Express clears a cookie by setting it with an immediate expiry;
    // the header will still contain the cookie name but with an empty value.
    const accessCookie = cookies.find((c) => c.startsWith('accessToken='));
    expect(accessCookie).toBeDefined();
    // Value should be empty (cleared)
    expect(accessCookie.startsWith('accessToken=;')).toBe(true);
  });

  it('clears the refreshToken cookie on logout', async () => {
    const { agent } = await registerAndLogin();

    const res = await agent.post(LOGOUT);

    const cookies = res.headers['set-cookie'] || [];
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie.startsWith('refreshToken=;')).toBe(true);
  });

  it('returns 401 when called without authentication', async () => {
    const res = await request(app).post(LOGOUT);

    expect(res.status).toBe(401);
  });

  it('prevents accessing protected routes after logout', async () => {
    const { agent } = await registerAndLogin();

    await agent.post(LOGOUT);

    // The agent's cookies are cleared — /me should now reject the request
    const meRes = await agent.get(ME);
    expect(meRes.status).toBe(401);
  });

  it('prevents using the refresh token after logout', async () => {
    const { agent } = await registerAndLogin();

    await agent.post(LOGOUT);

    // Session is deleted — refresh must fail
    const refreshRes = await agent.get(REFRESH);
    expect(refreshRes.status).toBe(401);
  });
});
