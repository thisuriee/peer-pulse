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

  it('returns the correct name and email in the response', async () => {
    const res = await request(app).post(BASE).send(validStudent);

    expect(res.body.data.name).toBe(validStudent.name);
    expect(res.body.data.email).toBe(validStudent.email);
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

  it('returns 400 when email is missing', async () => {
    const { email: _e, ...body } = validStudent;
    const res = await request(app).post(BASE).send(body);

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const { password: _p, confirmPassword: _c, ...body } = validStudent;
    const res = await request(app).post(BASE).send(body);

    expect(res.status).toBe(400);
  });

  it('returns 400 when passwords do not match', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ ...validStudent, confirmPassword: 'differentpassword' });

    expect(res.status).toBe(400);
  });
});
