'use strict';

/**
 * Integration tests — Booking Status Lifecycle
 *
 *   PUT    /api/v1/bookings/:id/accept    acceptBooking  (requireTutor)
 *   PUT    /api/v1/bookings/:id/decline   declineBooking (requireTutor)
 *   DELETE /api/v1/bookings/:id           cancelBooking
 *   PUT    /api/v1/bookings/:id/complete  completeBooking
 *
 * These tests drive the full PENDING → ACCEPTED/DECLINED/CANCELLED/COMPLETED
 * status-machine through the HTTP layer against an in-memory MongoDB instance.
 *
 * Key differences from unit tests (session.service.test.js):
 *   - No mocks: real BookingModel, real UserModel, real JWT middleware
 *   - Role-guard enforcement is tested at the HTTP level (403 vs service-level 400)
 *   - Cookie-based auth flows are part of every request
 *   - The "complete" happy-path inserts a booking directly into the DB with a
 *     past scheduledAt, bypassing the service's future-date guard on *creation*
 *     while keeping the HTTP endpoint itself unmocked
 *
 * Assumptions:
 *   - Tutor availability is activated before any booking is created
 *   - getFutureDate() returns 10:00 local time 7 days out (within 09:00–17:00
 *     availability window)
 *   - getPastDate() returns a date that has already passed, used to seed
 *     bookings that are ready for completion
 */

const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const request = require('supertest');
const app     = require('../../helpers/app.helper');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');
const { BookingModel, BookingStatus } = require('../../../src/database/models/session.model');

const REGISTER = '/api/v1/auth/register';
const LOGIN    = '/api/v1/auth/login';
const BOOKINGS = '/api/v1/bookings';

// ─── lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── helpers ───────────────────────────────────────────────────────────────────

async function registerAndLogin(overrides = {}) {
  const credentials = {
    name:            'Test User',
    email:           'testuser@example.com',
    password:        'password123',
    confirmPassword: 'password123',
    role:            'student',
    ...overrides,
  };
  await request(app).post(REGISTER).send(credentials);
  const agent    = request.agent(app);
  const loginRes = await agent.post(LOGIN).send({
    email:    credentials.email,
    password: credentials.password,
  });
  return { agent, credentials, userId: loginRes.body?.user?._id };
}

function getFutureDate(daysAhead = 7, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function getPastDate(daysBack = 1, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const ALL_DAYS_SCHEDULE = Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => [
    i.toString(),
    [{ startTime: '09:00', endTime: '17:00' }],
  ])
);

async function setupTutorAvailability(tutorAgent) {
  const res = await tutorAgent.put(`${BOOKINGS}/availability`).send({
    weeklySchedule: ALL_DAYS_SCHEDULE,
    timezone:       'UTC',
    isActive:       true,
  });
  expect(res.status).toBe(200);
}

/**
 * Creates a student + tutor pair with active availability, then makes
 * a booking as the student. Returns agents, user IDs, and the booking ID.
 */
async function setupBooking() {
  const student = await registerAndLogin({
    name:  'Alice',
    email: 'alice@example.com',
    role:  'student',
  });
  const tutor = await registerAndLogin({
    name:  'Bob',
    email: 'bob@example.com',
    role:  'tutor',
  });
  await setupTutorAvailability(tutor.agent);

  const createRes = await student.agent.post(BOOKINGS).send({
    tutor:       tutor.userId,
    subject:     'Mathematics',
    scheduledAt: getFutureDate(),
    duration:    60,
  });
  expect(createRes.status).toBe(201);

  return {
    studentAgent: student.agent,
    tutorAgent:   tutor.agent,
    tutorId:      tutor.userId,
    studentId:    student.userId,
    bookingId:    createRes.body.data._id,
  };
}

/**
 * Seeds a booking directly into MongoDB with the given status and a past
 * scheduledAt. Used for testing complete and cancel on non-PENDING bookings
 * without going through the service creation guards.
 */
async function seedBookingInDB(studentId, tutorId, overrides = {}) {
  const booking = await BookingModel.create({
    student:     studentId,
    tutor:       tutorId,
    subject:     'Seeded Subject',
    scheduledAt: getPastDate(),
    duration:    60,
    status:      BookingStatus.ACCEPTED,
    ...overrides,
  });
  return booking._id.toString();
}


// ─── DELETE /api/v1/bookings/:id — cancel booking ─────────────────────────────

describe('DELETE /api/v1/bookings/:id — cancel booking', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app)
      .delete(`${BOOKINGS}/000000000000000000000001`)
      .send({ reason: 'Changed my mind' });
    expect(res.status).toBe(401);
  });

  it('student can cancel a PENDING booking — status becomes CANCELLED', async () => {
    const { studentAgent, bookingId } = await setupBooking();

    const res = await studentAgent.delete(`${BOOKINGS}/${bookingId}`).send({
      reason: 'Plans changed',
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Booking cancelled successfully');
    expect(res.body.data.status).toBe('cancelled');
  });

  it('tutor can cancel a PENDING booking', async () => {
    const { tutorAgent, bookingId } = await setupBooking();

    const res = await tutorAgent.delete(`${BOOKINGS}/${bookingId}`).send({
      reason: 'Emergency',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('student can cancel an ACCEPTED booking', async () => {
    const { studentAgent, tutorAgent, bookingId } = await setupBooking();

    // Tutor accepts first
    await tutorAgent.put(`${BOOKINGS}/${bookingId}/accept`).send({});

    const res = await studentAgent.delete(`${BOOKINGS}/${bookingId}`).send({
      reason: 'Emergency',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });
});

// ─── PUT /api/v1/bookings/:id/complete — complete booking ──────────────────────

describe('PUT /api/v1/bookings/:id/complete — complete booking', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app).put(
      `${BOOKINGS}/000000000000000000000001/complete`
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when trying to complete a PENDING (future) booking', async () => {
    const { studentAgent, bookingId } = await setupBooking();

    // Booking is still PENDING and scheduled in the future
    const res = await studentAgent.put(`${BOOKINGS}/${bookingId}/complete`);

    expect(res.status).toBe(400);
  });

  it('student can complete an ACCEPTED booking with past scheduledAt', async () => {
    const { studentAgent, studentId, tutorId } = await setupBooking();

    // Seed a past ACCEPTED booking directly into the DB
    const pastBookingId = await seedBookingInDB(studentId, tutorId, {
      status: BookingStatus.ACCEPTED,
    });

    const res = await studentAgent.put(`${BOOKINGS}/${pastBookingId}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Booking marked as completed');
    expect(res.body.data.status).toBe('completed');
  });

  it('tutor can complete an ACCEPTED booking with past scheduledAt', async () => {
    const { tutorAgent, studentId, tutorId } = await setupBooking();

    const pastBookingId = await seedBookingInDB(studentId, tutorId, {
      status: BookingStatus.ACCEPTED,
    });

    const res = await tutorAgent.put(`${BOOKINGS}/${pastBookingId}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });
});
