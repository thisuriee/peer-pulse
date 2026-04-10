'use strict';

/**
 * Integration tests — POST /api/v1/auth/register
 *
 * Unlike unit tests (which mock UserModel and token utilities), these tests
 * exercise the full request → middleware → controller → service → in-memory
 * MongoDB stack via supertest.  Every assertion targets observable HTTP
 * behaviour: status codes, response bodies, and cookie headers.
 */

const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../helpers/app.helper');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');

const BASE = '/api/v1/auth/register';

// ─── shared test data ──────────────────────────────────────────────────────────

const validStudent = {
  name: 'Alice',
  email: 'alice@example.com',
  password: 'password123',
  confirmPassword: 'password123',
  role: 'student',
};

const validTutor = {
  name: 'Bob',
  email: 'bob@example.com',
  password: 'securepass',
  confirmPassword: 'securepass',
  role: 'tutor',
};

// ─── lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── success cases ─────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register — success', () => {
  it('returns 201 and the created user object', async () => {
    const res = await request(app).post(BASE).send(validStudent);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User registered successfully');
    expect(res.body.data).toBeDefined();
  });

  it('never returns the password field', async () => {
    const res = await request(app).post(BASE).send(validStudent);

    expect(res.body.data.password).toBeUndefined();
  });

  it('defaults role to "student" when role is omitted', async () => {
    const { role: _omitted, ...withoutRole } = validStudent;
    const res = await request(app).post(BASE).send(withoutRole);

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('student');
  });

  it('creates a user with role "student" when explicitly provided', async () => {
    const res = await request(app).post(BASE).send(validStudent);

    expect(res.body.data.role).toBe('student');
  });

  it('creates a user with role "tutor" when provided', async () => {
    const res = await request(app).post(BASE).send(validTutor);

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('tutor');
  });

  it('returns the correct name and email in the response', async () => {
    const res = await request(app).post(BASE).send(validStudent);

    expect(res.body.data.name).toBe(validStudent.name);
    expect(res.body.data.email).toBe(validStudent.email);
  });

  it('returns a MongoDB _id in the user object', async () => {
    const res = await request(app).post(BASE).send(validStudent);

    expect(res.body.data._id).toBeDefined();
  });
});

// ─── duplicate email ───────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register — duplicate email', () => {
  it('returns 400 when the email is already registered', async () => {
    await request(app).post(BASE).send(validStudent);           // first registration
    const res = await request(app).post(BASE).send(validStudent); // duplicate

    expect(res.status).toBe(400);
  });

  it('returns AUTH_EMAIL_ALREADY_EXISTS error code on duplicate', async () => {
    await request(app).post(BASE).send(validStudent);
    const res = await request(app).post(BASE).send(validStudent);

    expect(res.body.errorCode).toBe('AUTH_EMAIL_ALREADY_EXISTS');
  });

  it('is case-insensitive for email uniqueness', async () => {
    await request(app).post(BASE).send(validStudent);
    const res = await request(app)
      .post(BASE)
      .send({ ...validStudent, email: 'ALICE@EXAMPLE.COM' });

    // Mongoose stores lowercase — the second attempt should still fail
    expect(res.status).toBe(400);
  });
});

// ─── validation failures ───────────────────────────────────────────────────────

describe('POST /api/v1/auth/register — Zod validation failures', () => {
  it('returns 400 when name is missing', async () => {
    const { name: _n, ...body } = validStudent;
    const res = await request(app).post(BASE).send(body);

    expect(res.status).toBe(400);
  });

  it('returns 400 when name is an empty string', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ ...validStudent, name: '' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const { email: _e, ...body } = validStudent;
    const res = await request(app).post(BASE).send(body);

    expect(res.status).toBe(400);
  });

  it('returns 400 for a malformed email address', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ ...validStudent, email: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const { password: _p, confirmPassword: _c, ...body } = validStudent;
    const res = await request(app).post(BASE).send(body);

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is shorter than 6 characters', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ ...validStudent, password: 'abc', confirmPassword: 'abc' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when passwords do not match', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ ...validStudent, confirmPassword: 'differentpassword' });

    expect(res.status).toBe(400);
  });

  it('returns a "Validation failed" message and an errors array for schema failures', async () => {
    const { name: _n, ...body } = validStudent;
    const res = await request(app).post(BASE).send(body);

    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('returns 400 when role is not "student" or "tutor"', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ ...validStudent, role: 'admin' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when the request body is entirely empty', async () => {
    const res = await request(app).post(BASE).send({});

    expect(res.status).toBe(400);
  });
});
