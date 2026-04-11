'use strict';

/**
 * Integration tests — Review & reputation API (`/api/v1/reviews`)
 *
 *   GET    /api/v1/reviews/tutor/:tutorId   — list reviews for a tutor (auth required)
 *   GET    /api/v1/reviews/leaderboard      — community leaderboard
 *   GET    /api/v1/reviews/:id              — single review by id
 *   GET    /api/v1/reviews                  — my reviews (tutor vs student semantics)
 *   POST   /api/v1/reviews                  — create review for a booking
 *   PUT    /api/v1/reviews/:id              — update own review
 *   DELETE /api/v1/reviews/:id              — soft-delete (reviewer or admin)
 *
 * Stack: supertest → Express → authenticateJWT → controller → service → MongoDB (memory).
 * SendGrid is mocked so badge emails never hit the network (integration focuses on HTTP + DB).
 *
 * Contrast with `tests/unit/review/*.test.js`, which mock models and isolate branch logic.
 */

jest.mock('../../../src/common/email/sendgrid.client', () => ({
  sendEmail: jest.fn().mockResolvedValue({ ok: true }),
}));

const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../helpers/app.helper');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');
const { BookingModel, BookingStatus } = require('../../../src/database/models/session.model');
const UserModel = require('../../../src/database/models/user.model');
const ReviewModel = require('../../../src/database/models/review.model');

const REGISTER = '/api/v1/auth/register';
const LOGIN = '/api/v1/auth/login';
const REVIEWS = '/api/v1/reviews';

// ─── lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── helpers ───────────────────────────────────────────────────────────────────

async function registerAndLogin(overrides = {}) {
  const credentials = {
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'student',
    ...overrides,
  };
  await request(app).post(REGISTER).send(credentials);
  const agent = request.agent(app);
  const loginRes = await agent.post(LOGIN).send({
    email: credentials.email,
    password: credentials.password,
  });
  return { agent, credentials, userId: loginRes.body?.user?._id };
}

function getPastDate(daysBack = 1) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(10, 0, 0, 0);
  return d;
}

function getFutureDate(daysAhead = 7) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(10, 0, 0, 0);
  return d;
}

/**
 * Inserts a booking directly so review eligibility can be controlled without
 * calendar / availability setup (same idea as `seedBookingInDB` in booking lifecycle tests).
 */
async function seedBooking(studentId, tutorId, overrides = {}) {
  const doc = await BookingModel.create({
    student: studentId,
    tutor: tutorId,
    subject: 'Integration Subject',
    scheduledAt: getPastDate(),
    duration: 60,
    status: BookingStatus.COMPLETED,
    ...overrides,
  });
  return doc._id.toString();
}

async function promoteToAdmin(userId) {
  await UserModel.findByIdAndUpdate(userId, { role: 'admin' });
}

/** Student + tutor pair; returns ids and agents (tutor availability not required for seeded bookings). */
async function setupStudentAndTutor() {
  const student = await registerAndLogin({
    name: 'Alice Student',
    email: 'alice@example.com',
    role: 'student',
  });
  const tutor = await registerAndLogin({
    name: 'Bob Tutor',
    email: 'bob@example.com',
    role: 'tutor',
  });
  return {
    studentAgent: student.agent,
    tutorAgent: tutor.agent,
    studentId: student.userId,
    tutorId: tutor.userId,
  };
}

// ─── POST /api/v1/reviews — create ─────────────────────────────────────────────

describe('POST /api/v1/reviews — create review', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app).post(REVIEWS).send({
      bookingId: '507f1f77bcf86cd799439011',
      rating: 5,
      comment: 'Great',
    });
    expect(res.status).toBe(401);
  });

  it('returns 201 and persists review when student reviews a completed booking', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId, { status: BookingStatus.COMPLETED });

    const res = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 5,
      comment: 'Excellent tutor',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Review created successfully');
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.comment).toBe('Excellent tutor');

    const inDb = await ReviewModel.findOne({ booking: bookingId, isDeleted: false });
    expect(inDb).not.toBeNull();
    expect(inDb.rating).toBe(5);

    const tutor = await UserModel.findById(tutorId).select('reviewCount reputationScore');
    expect(tutor.reviewCount).toBe(1);
    expect(tutor.reputationScore).toBe(5);
  });

  it('allows review when booking is accepted and scheduled time is in the past', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId, {
      status: BookingStatus.ACCEPTED,
      scheduledAt: getPastDate(2),
    });

    const res = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 4,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.rating).toBe(4);
  });

  it('returns 400 when session has not started (accepted but future scheduledAt)', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId, {
      status: BookingStatus.ACCEPTED,
      scheduledAt: getFutureDate(7),
    });

    const res = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 5,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('session has started');
  });

  it('returns 401 when the authenticated user is not the booking student', async () => {
    const { studentAgent, tutorAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);

    const res = await tutorAgent.post(REVIEWS).send({
      bookingId,
      rating: 5,
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Only the booking student');
  });

  it('returns 400 when a second review is submitted for the same booking', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);

    const first = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 5,
      comment: 'First',
    });
    expect(first.status).toBe(201);

    const second = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 4,
      comment: 'Duplicate attempt',
    });
    expect(second.status).toBe(400);
    expect(second.body.message).toContain('already exists');
  });

  it('returns 404 when booking id does not exist', async () => {
    const { studentAgent } = await setupStudentAndTutor();
    const fakeId = '507f1f77bcf86cd799439011';

    const res = await studentAgent.post(REVIEWS).send({
      bookingId: fakeId,
      rating: 3,
    });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Booking not found');
  });

  it('returns 400 for invalid bookingId format', async () => {
    const { studentAgent } = await setupStudentAndTutor();

    const res = await studentAgent.post(REVIEWS).send({
      bookingId: 'not-a-valid-id',
      rating: 3,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('valid id');
  });

  it('restores a soft-deleted review when student posts again for the same booking', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);

    const created = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 3,
      comment: 'Original',
    });
    expect(created.status).toBe(201);
    const reviewId = created.body.data._id;

    await studentAgent.delete(`${REVIEWS}/${reviewId}`);
    const soft = await ReviewModel.findById(reviewId);
    expect(soft.isDeleted).toBe(true);

    const restored = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 5,
      comment: 'After restore',
    });

    expect(restored.status).toBe(201);
    expect(restored.body.data.rating).toBe(5);
    const again = await ReviewModel.findById(reviewId);
    expect(again.isDeleted).toBe(false);
  });
});

// ─── GET /api/v1/reviews — my reviews ─────────────────────────────────────────

describe('GET /api/v1/reviews — my reviews', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(REVIEWS);
    expect(res.status).toBe(401);
  });

  it('returns empty list for a student who has not written any reviews', async () => {
    const { agent: studentAgent } = await registerAndLogin({
      name: 'Solo',
      email: 'solo@example.com',
      role: 'student',
    });

    const res = await studentAgent.get(REVIEWS);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('student sees only reviews they authored', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);
    await studentAgent.post(REVIEWS).send({ bookingId, rating: 5, comment: 'Mine' });

    const res = await studentAgent.get(REVIEWS);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].comment).toBe('Mine');
  });

  it('tutor sees reviews received on their profile', async () => {
    const { studentAgent, tutorAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);
    await studentAgent.post(REVIEWS).send({ bookingId, rating: 4, comment: 'For tutor' });

    const res = await tutorAgent.get(REVIEWS);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].tutor.toString()).toBe(tutorId.toString());
  });
});

// ─── GET /api/v1/reviews/tutor/:tutorId ───────────────────────────────────────

describe('GET /api/v1/reviews/tutor/:tutorId — list by tutor', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(`${REVIEWS}/tutor/507f1f77bcf86cd799439011`);
    expect(res.status).toBe(401);
  });

  it('returns reviews left for that tutor', async () => {
    const { studentAgent, tutorAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);
    await studentAgent.post(REVIEWS).send({ bookingId, rating: 5, comment: 'Public list' });

    const res = await tutorAgent.get(`${REVIEWS}/tutor/${tutorId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].rating).toBe(5);
  });
});

// ─── GET /api/v1/reviews/leaderboard ──────────────────────────────────────────

describe('GET /api/v1/reviews/leaderboard', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(`${REVIEWS}/leaderboard`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with leaderboard payload shape', async () => {
    const { agent: tutorAgent } = await registerAndLogin({
      name: 'Lonely Tutor',
      email: 'lonely@example.com',
      role: 'tutor',
    });

    const res = await tutorAgent.get(`${REVIEWS}/leaderboard`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.topTutors).toBeDefined();
    expect(res.body.data.risingTutors).toBeDefined();
    expect(res.body.data.mostHelpfulStudents).toBeDefined();
    expect(typeof res.body.data.generatedAt).toBe('string');
  });
});

// ─── GET /api/v1/reviews/:id ──────────────────────────────────────────────────

describe('GET /api/v1/reviews/:id — by id', () => {
  it('returns 400 for malformed review id', async () => {
    const { agent: studentAgent } = await registerAndLogin({
      name: 'R',
      email: 'r@example.com',
      role: 'student',
    });

    const res = await studentAgent.get(`${REVIEWS}/not-a-valid-id`);
    expect(res.status).toBe(400);
  });

  it('returns 404 when review does not exist', async () => {
    const { agent: studentAgent } = await registerAndLogin({
      name: 'R2',
      email: 'r2@example.com',
      role: 'student',
    });

    const res = await studentAgent.get(`${REVIEWS}/507f1f77bcf86cd799439011`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with review payload', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);
    const created = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 5,
      comment: 'Fetch me',
    });
    const reviewId = created.body.data._id;

    const res = await studentAgent.get(`${REVIEWS}/${reviewId}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(reviewId);
    expect(res.body.data.comment).toBe('Fetch me');
  });
});

// ─── PUT /api/v1/reviews/:id — update ─────────────────────────────────────────

describe('PUT /api/v1/reviews/:id — update', () => {
  it('returns 401 when another user tries to update the review', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);
    const created = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 4,
      comment: 'Original',
    });
    const reviewId = created.body.data._id;

    const other = await registerAndLogin({
      name: 'Other',
      email: 'other@example.com',
      role: 'student',
    });

    const res = await other.agent.put(`${REVIEWS}/${reviewId}`).send({
      rating: 1,
      comment: 'Hacked',
    });
    expect(res.status).toBe(401);
  });

  it('returns 200 and updates comment for the reviewer', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);
    const created = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 4,
      comment: 'Before',
    });
    const reviewId = created.body.data._id;

    const res = await studentAgent.put(`${REVIEWS}/${reviewId}`).send({
      comment: 'After edit',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.comment).toBe('After edit');

    const inDb = await ReviewModel.findById(reviewId);
    expect(inDb.comment).toBe('After edit');
  });

  it('returns 400 when rating is out of range', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);
    const created = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 3,
    });
    const reviewId = created.body.data._id;

    const res = await studentAgent.put(`${REVIEWS}/${reviewId}`).send({ rating: 10 });
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/v1/reviews/:id — soft delete ────────────────────────────────

describe('DELETE /api/v1/reviews/:id — delete', () => {
  it('returns 401 when a non-reviewer non-admin tries to delete', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);
    const created = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 5,
    });
    const reviewId = created.body.data._id;

    const intruder = await registerAndLogin({
      name: 'Intruder',
      email: 'intruder@example.com',
      role: 'student',
    });

    const res = await intruder.agent.delete(`${REVIEWS}/${reviewId}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 and soft-deletes when the reviewer deletes', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);
    const created = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 5,
    });
    const reviewId = created.body.data._id;

    const res = await studentAgent.delete(`${REVIEWS}/${reviewId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isDeleted).toBe(true);

    const inDb = await ReviewModel.findById(reviewId);
    expect(inDb.isDeleted).toBe(true);
  });

  it('allows an admin to delete another user review', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);
    const created = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 5,
    });
    const reviewId = created.body.data._id;

    const admin = await registerAndLogin({
      name: 'Admin User',
      email: 'adminuser@example.com',
      role: 'student',
    });
    await promoteToAdmin(admin.userId);

    const res = await admin.agent.delete(`${REVIEWS}/${reviewId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isDeleted).toBe(true);
  });

  it('returns 404 when fetching a soft-deleted review by id', async () => {
    const { studentAgent, studentId, tutorId } = await setupStudentAndTutor();
    const bookingId = await seedBooking(studentId, tutorId);
    const created = await studentAgent.post(REVIEWS).send({
      bookingId,
      rating: 5,
    });
    const reviewId = created.body.data._id;
    await studentAgent.delete(`${REVIEWS}/${reviewId}`);

    const res = await studentAgent.get(`${REVIEWS}/${reviewId}`);
    expect(res.status).toBe(404);
  });
});
