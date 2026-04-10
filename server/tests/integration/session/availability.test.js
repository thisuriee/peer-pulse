'use strict';

/**
 * Integration tests — Tutor Availability Management
 *
 *   GET    /api/v1/bookings/availability             getAvailability     (requireTutor)
 *   PUT    /api/v1/bookings/availability             updateAvailability  (requireTutor)
 *   POST   /api/v1/bookings/availability/override    addDateOverride     (requireTutor)
 *   DELETE /api/v1/bookings/availability/override    removeDateOverride  (requireTutor)
 *
 * These tests exercise the full HTTP stack (supertest → Express → in-memory
 * MongoDB) with no mocks.
 *
 * Key differences from unit tests (availability.service.test.js):
 *   - Role guards are tested at the HTTP level: students receive 403 before
 *     the service is ever called
 *   - Real Mongoose persistence is verified: update → re-fetch returns updated data
 *   - Cookie-based JWT auth is part of every request
 *
 * Assumptions / setup:
 *   - clearTestDB() runs between every test → each test starts with a clean DB
 *   - Tutors are registered with role: 'tutor'; students with role: 'student'
 *   - updateAvailability creates the record if none exists yet
 */

const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const request = require('supertest');
const app     = require('../../helpers/app.helper');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../../helpers/db.helper');

const REGISTER     = '/api/v1/auth/register';
const LOGIN        = '/api/v1/auth/login';
const AVAILABILITY = '/api/v1/bookings/availability';
const OVERRIDE     = '/api/v1/bookings/availability/override';

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

/** Full 7-day schedule, 09:00–17:00 local time. */
const ALL_DAYS_SCHEDULE = Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => [
    i.toString(),
    [{ startTime: '09:00', endTime: '17:00' }],
  ])
);

/**
 * Returns a date string (YYYY-MM-DD) for a date daysAhead from now, in UTC.
 * Used for date override tests.
 */
function futureDateString(daysAhead = 7) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Returns a full ISO datetime for 00:00:00 UTC on a date daysAhead from now.
 * Used for the dateOverrideSchema which requires a datetime string.
 */
function futureDateISO(daysAhead = 7) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── GET /api/v1/bookings/availability ────────────────────────────────────────

describe('GET /api/v1/bookings/availability — get tutor availability', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app).get(AVAILABILITY);
    expect(res.status).toBe(401);
  });

  it('returns 403 when called by a student', async () => {
    const student = await registerAndLogin({
      name:  'Alice',
      email: 'alice@example.com',
      role:  'student',
    });

    const res = await student.agent.get(AVAILABILITY);

    expect(res.status).toBe(403);
  });

  it('creates and returns a default (inactive) availability record for a new tutor', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.get(AVAILABILITY);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Availability retrieved successfully');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.isActive).toBe(false); // default is inactive
  });

  it('returns the existing availability record on subsequent fetches', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    // Activate availability
    await tutor.agent.put(AVAILABILITY).send({
      weeklySchedule: ALL_DAYS_SCHEDULE,
      isActive:       true,
    });

    const res = await tutor.agent.get(AVAILABILITY);

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);
  });
});

// ─── PUT /api/v1/bookings/availability ────────────────────────────────────────

describe('PUT /api/v1/bookings/availability — update tutor availability', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app).put(AVAILABILITY).send({ isActive: true });
    expect(res.status).toBe(401);
  });

  it('returns 403 when called by a student', async () => {
    const student = await registerAndLogin({
      name:  'Alice',
      email: 'alice@example.com',
      role:  'student',
    });

    const res = await student.agent.put(AVAILABILITY).send({ isActive: true });

    expect(res.status).toBe(403);
  });

  it('tutor can activate availability and set a weekly schedule', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.put(AVAILABILITY).send({
      weeklySchedule: ALL_DAYS_SCHEDULE,
      isActive:       true,
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Availability updated successfully');
    expect(res.body.data.isActive).toBe(true);
  });

  it('updates the timezone field', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.put(AVAILABILITY).send({
      timezone: 'America/New_York',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.timezone).toBe('America/New_York');
  });

  it('updates the subjects list', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.put(AVAILABILITY).send({
      subjects: ['Mathematics', 'Physics'],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.subjects).toContain('Mathematics');
    expect(res.body.data.subjects).toContain('Physics');
  });

  it('updates the sessionDurations list', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.put(AVAILABILITY).send({
      sessionDurations: [30, 60, 90],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.sessionDurations).toContain(30);
    expect(res.body.data.sessionDurations).toContain(60);
    expect(res.body.data.sessionDurations).toContain(90);
  });

  it('can deactivate an active availability record', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    // Activate first
    await tutor.agent.put(AVAILABILITY).send({ isActive: true });

    // Now deactivate
    const res = await tutor.agent.put(AVAILABILITY).send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('returns 400 when a time slot has an invalid time format', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.put(AVAILABILITY).send({
      weeklySchedule: {
        '1': [{ startTime: '9:00', endTime: '17:00' }], // invalid — needs zero-padded HH:mm
      },
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when a time slot start >= end', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.put(AVAILABILITY).send({
      weeklySchedule: {
        '1': [{ startTime: '17:00', endTime: '09:00' }],
      },
    });

    expect(res.status).toBe(400);
  });

  it('persists the weekly schedule so it is returned by GET', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    await tutor.agent.put(AVAILABILITY).send({
      weeklySchedule: {
        '1': [{ startTime: '10:00', endTime: '14:00' }],
      },
      isActive: true,
    });

    const getRes = await tutor.agent.get(AVAILABILITY);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.isActive).toBe(true);
  });
});

// ─── POST /api/v1/bookings/availability/override ──────────────────────────────

describe('POST /api/v1/bookings/availability/override — add date override', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app).post(OVERRIDE).send({
      date:      futureDateISO(),
      available: false,
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when called by a student', async () => {
    const student = await registerAndLogin({
      name:  'Alice',
      email: 'alice@example.com',
      role:  'student',
    });

    const res = await student.agent.post(OVERRIDE).send({
      date:      futureDateISO(),
      available: false,
    });

    expect(res.status).toBe(403);
  });

  it('tutor can block a specific date', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.post(OVERRIDE).send({
      date:      futureDateISO(10),
      available: false,
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Date override added successfully');
    const overrides = res.body.data.dateOverrides;
    expect(Array.isArray(overrides)).toBe(true);
    expect(overrides.length).toBeGreaterThan(0);
    expect(overrides.some((o) => o.available === false)).toBe(true);
  });

  it('tutor can add custom slots for a specific date', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.post(OVERRIDE).send({
      date:      futureDateISO(10),
      available: true,
      slots:     [{ startTime: '08:00', endTime: '10:00' }],
    });

    expect(res.status).toBe(200);
    const override = res.body.data.dateOverrides[0];
    expect(override.available).toBe(true);
    expect(override.slots).toHaveLength(1);
    expect(override.slots[0].startTime).toBe('08:00');
  });

  it('replaces an existing override for the same date', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const targetDate = futureDateISO(10);

    // First override: blocked
    await tutor.agent.post(OVERRIDE).send({
      date:      targetDate,
      available: false,
    });

    // Second override: same date, now available with custom slots
    const res = await tutor.agent.post(OVERRIDE).send({
      date:      targetDate,
      available: true,
      slots:     [{ startTime: '09:00', endTime: '12:00' }],
    });

    expect(res.status).toBe(200);
    // Only one override should exist for that date
    const overrides = res.body.data.dateOverrides;
    expect(overrides).toHaveLength(1);
    expect(overrides[0].available).toBe(true);
  });

  it('returns 400 when date is not a valid ISO datetime', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.post(OVERRIDE).send({
      date:      'not-a-date',
      available: false,
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when available field is missing', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.post(OVERRIDE).send({
      date: futureDateISO(10),
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when a slot has an invalid time format', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.post(OVERRIDE).send({
      date:      futureDateISO(10),
      available: true,
      slots:     [{ startTime: '8:00', endTime: '10:00' }], // not zero-padded
    });

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/v1/bookings/availability/override ────────────────────────────

describe('DELETE /api/v1/bookings/availability/override — remove date override', () => {
  it('returns 401 when called without authentication', async () => {
    const res = await request(app).delete(
      `${OVERRIDE}?date=${futureDateString()}`
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when called by a student', async () => {
    const student = await registerAndLogin({
      name:  'Alice',
      email: 'alice@example.com',
      role:  'student',
    });

    const res = await student.agent.delete(
      `${OVERRIDE}?date=${futureDateString()}`
    );

    expect(res.status).toBe(403);
  });

  it('tutor can remove an existing date override', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const targetDate    = futureDateISO(10);
    const targetDateStr = futureDateString(10);

    // Add override first
    await tutor.agent.post(OVERRIDE).send({
      date:      targetDate,
      available: false,
    });

    // Remove it
    const res = await tutor.agent.delete(`${OVERRIDE}?date=${targetDateStr}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Date override removed successfully');
    // Override list should now be empty for this tutor
    expect(res.body.data.dateOverrides).toHaveLength(0);
  });

  it('only removes the targeted override, leaving others intact', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const date1    = futureDateISO(10);
    const date2    = futureDateISO(15);
    const date1Str = futureDateString(10);

    await tutor.agent.post(OVERRIDE).send({ date: date1, available: false });
    await tutor.agent.post(OVERRIDE).send({ date: date2, available: false });

    const res = await tutor.agent.delete(`${OVERRIDE}?date=${date1Str}`);

    expect(res.status).toBe(200);
    // One override should remain (date2)
    expect(res.body.data.dateOverrides).toHaveLength(1);
  });

  it('returns 404 when trying to remove an override that does not exist', async () => {
    const tutor = await registerAndLogin({
      name:  'Bob',
      email: 'bob@example.com',
      role:  'tutor',
    });

    const res = await tutor.agent.delete(
      `${OVERRIDE}?date=${futureDateString(99)}`
    );

    expect(res.status).toBe(404);
  });
});

// ─── Availability effect on bookings ──────────────────────────────────────────

describe('Availability effect on booking creation', () => {
  /**
   * These tests confirm that the availability record is enforced end-to-end:
   * the booking service reads the live DB record, so changes made via the
   * availability API immediately affect whether a booking can be created.
   */

  it('booking fails when availability is deactivated between registration and booking', async () => {
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

    // Activate, then immediately deactivate
    await tutor.agent.put(AVAILABILITY).send({
      weeklySchedule: ALL_DAYS_SCHEDULE,
      isActive:       true,
    });
    await tutor.agent.put(AVAILABILITY).send({ isActive: false });

    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(10, 0, 0, 0);

    const res = await student.agent.post('/api/v1/bookings').send({
      tutor:       tutor.userId,
      subject:     'Mathematics',
      scheduledAt: d.toISOString(),
      duration:    60,
    });

    expect(res.status).toBe(400);
  });

  it('booking fails for a date that is blocked by a date override', async () => {
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

    // Activate availability for all days
    await tutor.agent.put(AVAILABILITY).send({
      weeklySchedule: ALL_DAYS_SCHEDULE,
      isActive:       true,
    });

    // Block the specific day we intend to book
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    targetDate.setHours(0, 0, 0, 0); // midnight — used for the override date

    await tutor.agent.post(OVERRIDE).send({
      date:      targetDate.toISOString(),
      available: false,
    });

    // Try to book at 10:00 on that blocked date
    targetDate.setHours(10, 0, 0, 0);

    const res = await student.agent.post('/api/v1/bookings').send({
      tutor:       tutor.userId,
      subject:     'Mathematics',
      scheduledAt: targetDate.toISOString(),
      duration:    60,
    });

    expect(res.status).toBe(400);
  });
});
