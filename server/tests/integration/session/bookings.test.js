'use strict';

/**
 * Integration tests — Session Bookings
 *
 *   POST   /api/v1/bookings            createBooking
 *   GET    /api/v1/bookings            getBookings
 *   GET    /api/v1/bookings/:id        getBookingById
 *   PUT    /api/v1/bookings/:id        updateBooking
 *   GET    /api/v1/bookings/slots      getAvailableSlots
 *   GET    /api/v1/bookings/tutors     getTutorsWithAvailability
 *
 * These tests exercise the full HTTP stack (supertest → Express → in-memory
 * MongoDB) with no mocks. Real JWT tokens are signed, real sessions are
 * created, real availability/conflict checks run against the DB.
 *
 * Contrast with unit tests (session.service.test.js) which mock models and
 * external services to test business logic in isolation. Here we verify:
 *   - Zod validation layer in the controller
 *   - Role guards (requireStudent, requireTutor)
 *   - Full availability + conflict check pipeline
 *   - Database persistence and populate behaviour
 *   - Cookie-based auth flows carry through to session endpoints
 *
 * Key assumptions / setup:
 *   - MongoDB Memory Server is used (no real DB required)
 *   - .env.test provides JWT_SECRET, JWT_REFRESH_SECRET etc.
 *   - Tutor availability must be ACTIVE and cover the scheduled time for
 *     createBooking to succeed. Every test that creates a booking calls
 *     setupTutorAvailability() first.
 *   - getFutureDate() picks 10:00 local time 7 days from now, well inside the
 *     09:00–17:00 availability window used in setupTutorAvailability().
 */

const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const request = require('supertest');
const app     = require('../../helpers/app.helper');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');

const REGISTER = '/api/v1/auth/register';
const LOGIN    = '/api/v1/auth/login';
const BOOKINGS = '/api/v1/bookings';

// ─── lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ─── helpers ───────────────────────────────────────────────────────────────────

/**
 * Register a user and return a logged-in supertest agent plus the user's _id.
 * Uses fixed emails — safe because clearTestDB() wipes the DB between tests.
 */
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

/**
 * Returns an ISO datetime string for a date daysAhead from now,
 * at the given local hour:minute. Defaults to 10:00 local time, 7 days out —
 * which falls comfortably inside the 09:00–17:00 availability window.
 */
function getFutureDate(daysAhead = 7, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * Weekly schedule covering all seven days, 09:00–17:00 local time.
 * Passed to PUT /api/v1/bookings/availability before booking tests.
 */
const ALL_DAYS_SCHEDULE = Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => [
    i.toString(),
    [{ startTime: '09:00', endTime: '17:00' }],
  ])
);

/** Activate tutor availability via the API (must be called as the tutor agent). */
async function setupTutorAvailability(tutorAgent) {
  const res = await tutorAgent.put(`${BOOKINGS}/availability`).send({
    weeklySchedule: ALL_DAYS_SCHEDULE,
    timezone:       'UTC',
    isActive:       true,
  });
  expect(res.status).toBe(200); // Fail fast if setup itself breaks
}

/**
 * Full two-user setup used by most booking tests:
 *   1. Register + login a student
 *   2. Register + login a tutor
 *   3. Activate tutor availability
 *
 * Returns { studentAgent, tutorAgent, tutorId, studentId }
 */
async function setupStudentAndTutor() {
  const student = await registerAndLogin({
    name:  'Alice Student',
    email: 'alice@example.com',
    role:  'student',
  });
  const tutor = await registerAndLogin({
    name:  'Bob Tutor',
    email: 'bob@example.com',
    role:  'tutor',
  });
  await setupTutorAvailability(tutor.agent);
  return {
    studentAgent: student.agent,
    tutorAgent:   tutor.agent,
    tutorId:      tutor.userId,
    studentId:    student.userId,
  };
}

// ─── POST /api/v1/bookings — create booking ────────────────────────────────────

describe('POST /api/v1/bookings — create booking', () => {
  it('returns 201 and PENDING booking when student books an available tutor', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const res = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Booking request created successfully');
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.subject).toBe('Mathematics');
    expect(res.body.data.tutor._id).toBe(tutorId);
  });

  it('populates student and tutor objects in the response', async () => {
    const { studentAgent, tutorId, studentId } = await setupStudentAndTutor();

    const res = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Physics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.student._id).toBe(studentId);
    expect(res.body.data.student.email).toBe('alice@example.com');
    expect(res.body.data.tutor.email).toBe('bob@example.com');
    expect(res.body.data.student.password).toBeUndefined();
  });

  it('returns 401 when called without authentication', async () => {
    const { tutorId } = await setupStudentAndTutor();

    const res = await request(app).post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Chemistry',
      scheduledAt: getFutureDate(),
      duration:    60,
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 when tutor field is missing', async () => {
    const { studentAgent } = await setupStudentAndTutor();

    const res = await studentAgent.post(BOOKINGS).send({
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when subject is missing', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const res = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      scheduledAt: getFutureDate(),
      duration:    60,
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when scheduledAt is not a valid ISO datetime', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const res = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: 'not-a-date',
      duration:    60,
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when duration is below the 15-minute minimum', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const res = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    10,
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when duration exceeds the 180-minute maximum', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const res = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    200,
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when scheduledAt is in the past', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const res = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: pastDate.toISOString(),
      duration:    60,
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when a student tries to book themselves', async () => {
    // Register user as tutor so they pass the tutor-role check, then try self-booking
    const tutor = await registerAndLogin({
      name:  'Self Tutor',
      email: 'self@example.com',
      role:  'tutor',
    });
    await setupTutorAvailability(tutor.agent);

    const res = await tutor.agent.post(BOOKINGS).send({
      tutor:       tutor.userId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when the tutor has no active availability', async () => {
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
    // Deliberately skip setupTutorAvailability — tutor has no active record

    const res = await student.agent.post(BOOKINGS).send({
      tutor:       tutor.userId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 on a double-booking conflict for the same tutor + time slot', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();
    const scheduledAt = getFutureDate();

    // First booking — must succeed
    const first = await studentAgent.post(BOOKINGS).send({
      tutor:    tutorId,
      subject:  'Mathematics',
      scheduledAt,
      duration: 60,
    });
    expect(first.status).toBe(201);

    // Register a second student to attempt the conflicting booking
    const student2 = await registerAndLogin({
      name:  'Carol',
      email: 'carol@example.com',
      role:  'student',
    });

    const second = await student2.agent.post(BOOKINGS).send({
      tutor:    tutorId,
      subject:  'Physics',
      scheduledAt, // same time slot
      duration: 60,
    });

    expect(second.status).toBe(400);
  });

  it('stores optional description and notes fields', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const res = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Biology',
      description: 'Need help with cell division',
      scheduledAt: getFutureDate(),
      duration:    45,
      notes:       'Please bring practice problems',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe('Need help with cell division');
    expect(res.body.data.notes).toBe('Please bring practice problems');
    expect(res.body.data.duration).toBe(45);
  });
});

// ─── GET /api/v1/bookings — list bookings ──────────────────────────────────────

describe('GET /api/v1/bookings — list bookings', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app).get(BOOKINGS);
    expect(res.status).toBe(401);
  });

  it('returns an empty list when the student has no bookings', async () => {
    const { studentAgent } = await setupStudentAndTutor();

    const res = await studentAgent.get(BOOKINGS);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('student sees only their own bookings', async () => {
    const { studentAgent, tutorAgent, tutorId, studentId } = await setupStudentAndTutor();

    // Create a booking as the student
    await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });

    // Register a second student and create a separate booking
    const student2 = await registerAndLogin({
      name:  'Carol',
      email: 'carol@example.com',
      role:  'student',
    });
    await student2.agent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Physics',
      scheduledAt: getFutureDate(14), // different time to avoid conflict
      duration:    60,
    });

    const res = await studentAgent.get(BOOKINGS);

    expect(res.status).toBe(200);
    // Alice should only see her own booking (Mathematics)
    expect(res.body.data.bookings).toHaveLength(1);
    expect(res.body.data.bookings[0].subject).toBe('Mathematics');
  });

  it('tutor sees all bookings assigned to them', async () => {
    const { studentAgent, tutorAgent, tutorId } = await setupStudentAndTutor();

    await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(7),
      duration:    60,
    });

    const student2 = await registerAndLogin({
      name:  'Carol',
      email: 'carol@example.com',
      role:  'student',
    });
    await student2.agent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Physics',
      scheduledAt: getFutureDate(14),
      duration:    60,
    });

    const res = await tutorAgent.get(BOOKINGS);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
  });

  it('returns pagination metadata', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });

    const res = await studentAgent.get(BOOKINGS);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('currentPage');
    expect(res.body.data).toHaveProperty('totalPages');
    expect(res.body.data.currentPage).toBe(1);
  });

  it('filters bookings by status query parameter', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });

    const res = await studentAgent.get(`${BOOKINGS}?status=pending`);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(1);
    expect(res.body.data.bookings[0].status).toBe('pending');
  });

  it('returns empty list when filtering by a status that has no matching bookings', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });

    const res = await studentAgent.get(`${BOOKINGS}?status=completed`);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(0);
  });
});

// ─── GET /api/v1/bookings/:id — get single booking ─────────────────────────────

describe('GET /api/v1/bookings/:id — get booking by ID', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app).get(`${BOOKINGS}/000000000000000000000001`);
    expect(res.status).toBe(401);
  });

  it('returns the booking for the student who created it', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const createRes = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });
    const bookingId = createRes.body.data._id;

    const res = await studentAgent.get(`${BOOKINGS}/${bookingId}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(bookingId);
    expect(res.body.data.subject).toBe('Mathematics');
  });

  it('returns the booking for the assigned tutor', async () => {
    const { studentAgent, tutorAgent, tutorId } = await setupStudentAndTutor();

    const createRes = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });
    const bookingId = createRes.body.data._id;

    const res = await tutorAgent.get(`${BOOKINGS}/${bookingId}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(bookingId);
  });

  it('returns 403 for a user who is neither the student nor the tutor', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const createRes = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });
    const bookingId = createRes.body.data._id;

    // Third user — no relation to this booking
    const intruder = await registerAndLogin({
      name:  'Intruder',
      email: 'intruder@example.com',
      role:  'student',
    });

    const res = await intruder.agent.get(`${BOOKINGS}/${bookingId}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent booking ID', async () => {
    const { studentAgent } = await setupStudentAndTutor();

    const res = await studentAgent.get(`${BOOKINGS}/000000000000000000000001`);

    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/v1/bookings/:id — update booking ─────────────────────────────────

describe('PUT /api/v1/bookings/:id — update booking', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app)
      .put(`${BOOKINGS}/000000000000000000000001`)
      .send({ subject: 'Physics' });
    expect(res.status).toBe(401);
  });

  it('student can update the subject of a PENDING booking', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const createRes = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });
    const bookingId = createRes.body.data._id;

    const res = await studentAgent.put(`${BOOKINGS}/${bookingId}`).send({
      subject: 'Advanced Mathematics',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.subject).toBe('Advanced Mathematics');
  });

  it('student can reschedule a PENDING booking to a non-conflicting future slot', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const createRes = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(7),
      duration:    60,
    });
    const bookingId = createRes.body.data._id;
    const newDate   = getFutureDate(8); // different day, no conflict

    const res = await studentAgent.put(`${BOOKINGS}/${bookingId}`).send({
      scheduledAt: newDate,
    });

    expect(res.status).toBe(200);
    // scheduledAt in response should match the new date (compare date strings)
    expect(new Date(res.body.data.scheduledAt).toDateString())
      .toBe(new Date(newDate).toDateString());
  });

  it('returns 403 when a different user tries to update the booking', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const createRes = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });
    const bookingId = createRes.body.data._id;

    const other = await registerAndLogin({
      name:  'Other Student',
      email: 'other@example.com',
      role:  'student',
    });

    const res = await other.agent.put(`${BOOKINGS}/${bookingId}`).send({
      subject: 'Physics',
    });

    expect(res.status).toBe(403);
  });

  it('returns 400 when rescheduling to a past date', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const createRes = await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: getFutureDate(),
      duration:    60,
    });
    const bookingId = createRes.body.data._id;

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const res = await studentAgent.put(`${BOOKINGS}/${bookingId}`).send({
      scheduledAt: pastDate.toISOString(),
    });

    expect(res.status).toBe(400);
  });

  it('returns 404 for a non-existent booking ID', async () => {
    const { studentAgent } = await setupStudentAndTutor();

    const res = await studentAgent
      .put(`${BOOKINGS}/000000000000000000000001`)
      .send({ subject: 'Physics' });

    expect(res.status).toBe(404);
  });
});

// ─── GET /api/v1/bookings/slots — available time slots ─────────────────────────

describe('GET /api/v1/bookings/slots — available time slots', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app).get(`${BOOKINGS}/slots?tutorId=x&date=2099-01-01`);
    expect(res.status).toBe(401);
  });

  it('returns an array of available slots for a tutor with active availability', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    // Pick a date 7 days from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const res = await studentAgent.get(
      `${BOOKINGS}/slots?tutorId=${tutorId}&date=${dateStr}&duration=60`
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    // Each slot should have startTime, endTime, duration
    expect(res.body.data[0]).toHaveProperty('startTime');
    expect(res.body.data[0]).toHaveProperty('endTime');
    expect(res.body.data[0]).toHaveProperty('duration');
  });

  it('returns an empty array when the tutor has no active availability', async () => {
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
    // No availability set → no slots

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const dateStr = targetDate.toISOString().split('T')[0];

    const res = await student.agent.get(
      `${BOOKINGS}/slots?tutorId=${tutor.userId}&date=${dateStr}`
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('returns 400 when tutorId query parameter is missing', async () => {
    const { studentAgent } = await setupStudentAndTutor();

    const res = await studentAgent.get(`${BOOKINGS}/slots?date=2099-01-01`);

    expect(res.status).toBe(400);
  });

  it('returns 400 when date is not in YYYY-MM-DD format', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    const res = await studentAgent.get(
      `${BOOKINGS}/slots?tutorId=${tutorId}&date=01/01/2099`
    );

    expect(res.status).toBe(400);
  });

  it('excludes already-booked slots from the results', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    // Book a slot at 10:00 local time, 7 days out
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    targetDate.setHours(10, 0, 0, 0);
    const dateStr = targetDate.toISOString().split('T')[0];

    await studentAgent.post(BOOKINGS).send({
      tutor:       tutorId,
      subject:     'Mathematics',
      scheduledAt: targetDate.toISOString(),
      duration:    60,
    });

    const res = await studentAgent.get(
      `${BOOKINGS}/slots?tutorId=${tutorId}&date=${dateStr}&duration=60`
    );

    expect(res.status).toBe(200);
    // The 10:00 slot should no longer appear
    const slot1000 = res.body.data.find((s) => {
      const start = new Date(s.startTime);
      return start.getHours() === 10 && start.getMinutes() === 0;
    });
    expect(slot1000).toBeUndefined();
  });
});

// ─── GET /api/v1/bookings/tutors — list tutors ─────────────────────────────────

describe('GET /api/v1/bookings/tutors — list tutors with availability', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app).get(`${BOOKINGS}/tutors`);
    expect(res.status).toBe(401);
  });

  it('returns an array of tutor user objects', async () => {
    const { studentAgent } = await setupStudentAndTutor();

    const res = await studentAgent.get(`${BOOKINGS}/tutors`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('does not include student accounts in the tutors list', async () => {
    const { studentAgent } = await setupStudentAndTutor();

    const res = await studentAgent.get(`${BOOKINGS}/tutors`);

    expect(res.status).toBe(200);
    // Every item in the list should have an availability field (tutors only)
    // Student accounts are filtered out at the UserModel query level (role: 'tutor')
    res.body.data.forEach((t) => {
      expect(t.email).not.toBe('alice@example.com'); // alice is a student
    });
  });

  it('filters tutors by subject when subject query param is provided', async () => {
    const { studentAgent } = await setupStudentAndTutor();

    // Give the tutor a subject/skill via availability update
    const tutor2 = await registerAndLogin({
      name:  'Carol Tutor',
      email: 'carol@example.com',
      role:  'tutor',
    });
    // Update carol's availability with a specific subject
    await tutor2.agent.put(`${BOOKINGS}/availability`).send({
      weeklySchedule: ALL_DAYS_SCHEDULE,
      subjects:       ['Chemistry'],
      isActive:       true,
    });

    const res = await studentAgent.get(`${BOOKINGS}/tutors?subject=Chemistry`);

    expect(res.status).toBe(200);
    // Carol should appear; Bob (who has no 'Chemistry' skill) should not
    const emails = res.body.data.map((t) => t.email);
    expect(emails).toContain('carol@example.com');
  });

  it('returns only tutors with active availability when activeOnly=true', async () => {
    const { studentAgent, tutorId } = await setupStudentAndTutor();

    // Register a second tutor with NO availability
    const inactiveTutor = await registerAndLogin({
      name:  'Inactive Tutor',
      email: 'inactive@example.com',
      role:  'tutor',
    });

    const res = await studentAgent.get(`${BOOKINGS}/tutors?activeOnly=true`);

    expect(res.status).toBe(200);
    const emails = res.body.data.map((t) => t.email);
    expect(emails).toContain('bob@example.com');       // has active availability
    expect(emails).not.toContain('inactive@example.com'); // no availability set
  });
});
