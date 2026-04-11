'use strict';

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
});


