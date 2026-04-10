const { describe, it, expect } = require('@jest/globals');
const {
  createBookingSchema,
  updateBookingSchema,
  acceptBookingSchema,
  declineBookingSchema,
  cancelBookingSchema,
  availabilitySchema,
  dateOverrideSchema,
  getAvailableSlotsSchema,
  timeSlotSchema,
} = require('../../../src/common/validators/session.validator');

describe('timeSlotSchema', () => {
  it('accepts valid time slot', () => {
    const result = timeSlotSchema.safeParse({
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid time format in startTime', () => {
    const result = timeSlotSchema.safeParse({
      startTime: '25:00',
      endTime: '10:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing startTime', () => {
    const result = timeSlotSchema.safeParse({
      endTime: '10:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing endTime', () => {
    const result = timeSlotSchema.safeParse({
      startTime: '09:00',
    });
    expect(result.success).toBe(false);
  });

  it('accepts various valid hours', () => {
    const times = ['00:00', '06:30', '12:45', '23:59'];
    times.forEach((time) => {
      const result = timeSlotSchema.safeParse({
        startTime: time,
        endTime: '23:59',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('createBookingSchema', () => {
  const validBooking = {
    tutor: 'tutor-id-123',
    subject: 'Mathematics',
    description: 'Algebra basics',
    scheduledAt: '2025-12-01T14:00:00Z',
    duration: 60,
    notes: 'Please be on time',
  };

  it('accepts valid booking', () => {
    const result = createBookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it('requires tutor', () => {
    const { tutor, ...rest } = validBooking;
    const result = createBookingSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('requires subject', () => {
    const { subject, ...rest } = validBooking;
    const result = createBookingSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('requires scheduledAt', () => {
    const { scheduledAt, ...rest } = validBooking;
    const result = createBookingSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('allows optional description', () => {
    const { description, ...rest } = validBooking;
    const result = createBookingSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('defaults duration to 60', () => {
    const { duration, ...rest } = validBooking;
    const result = createBookingSchema.safeParse(rest);
    expect(result.success).toBe(true);
    expect(result.data.duration).toBe(60);
  });

  it('rejects duration less than 15', () => {
    const result = createBookingSchema.safeParse({ ...validBooking, duration: 10 });
    expect(result.success).toBe(false);
  });

  it('rejects duration greater than 180', () => {
    const result = createBookingSchema.safeParse({ ...validBooking, duration: 200 });
    expect(result.success).toBe(false);
  });

  it('rejects subject longer than 100 chars', () => {
    const longSubject = 'a'.repeat(101);
    const result = createBookingSchema.safeParse({ ...validBooking, subject: longSubject });
    expect(result.success).toBe(false);
  });

  it('rejects description longer than 500 chars', () => {
    const longDesc = 'a'.repeat(501);
    const result = createBookingSchema.safeParse({ ...validBooking, description: longDesc });
    expect(result.success).toBe(false);
  });

  it('rejects notes longer than 1000 chars', () => {
    const longNotes = 'a'.repeat(1001);
    const result = createBookingSchema.safeParse({ ...validBooking, notes: longNotes });
    expect(result.success).toBe(false);
  });
});

describe('updateBookingSchema', () => {
  it('accepts all fields as optional', () => {
    const result = updateBookingSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with subject only', () => {
    const result = updateBookingSchema.safeParse({ subject: 'Physics' });
    expect(result.success).toBe(true);
  });

  it('accepts partial update with scheduledAt only', () => {
    const result = updateBookingSchema.safeParse({ scheduledAt: '2025-12-01T15:00:00Z' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid duration', () => {
    const result = updateBookingSchema.safeParse({ duration: 10 });
    expect(result.success).toBe(false);
  });
});

describe('acceptBookingSchema', () => {
  it('accepts valid acceptance with only meetingLink', () => {
    const result = acceptBookingSchema.safeParse({
      meetingLink: 'https://meet.google.com/abc-defg-hij',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid acceptance with notes only', () => {
    const result = acceptBookingSchema.safeParse({
      notes: 'Room 101',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty acceptance', () => {
    const result = acceptBookingSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid URL for meetingLink', () => {
    const result = acceptBookingSchema.safeParse({
      meetingLink: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects notes longer than 1000 chars', () => {
    const longNotes = 'a'.repeat(1001);
    const result = acceptBookingSchema.safeParse({ notes: longNotes });
    expect(result.success).toBe(false);
  });
});

describe('declineBookingSchema', () => {
  it('accepts valid decline reason', () => {
    const result = declineBookingSchema.safeParse({
      reason: 'Already booked at that time',
    });
    expect(result.success).toBe(true);
  });

  it('requires reason', () => {
    const result = declineBookingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty reason', () => {
    const result = declineBookingSchema.safeParse({ reason: '' });
    expect(result.success).toBe(false);
  });

  it('rejects reason longer than 500 chars', () => {
    const longReason = 'a'.repeat(501);
    const result = declineBookingSchema.safeParse({ reason: longReason });
    expect(result.success).toBe(false);
  });
});

describe('cancelBookingSchema', () => {
  it('accepts valid cancel reason', () => {
    const result = cancelBookingSchema.safeParse({
      reason: 'Emergency came up',
    });
    expect(result.success).toBe(true);
  });

  it('requires reason', () => {
    const result = cancelBookingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty reason', () => {
    const result = cancelBookingSchema.safeParse({ reason: '' });
    expect(result.success).toBe(false);
  });

  it('rejects reason longer than 500 chars', () => {
    const longReason = 'a'.repeat(501);
    const result = cancelBookingSchema.safeParse({ reason: longReason });
    expect(result.success).toBe(false);
  });
});

describe('availabilitySchema', () => {
  it('accepts empty availability update', () => {
    const result = availabilitySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts timezone', () => {
    const result = availabilitySchema.safeParse({
      timezone: 'America/New_York',
    });
    expect(result.success).toBe(true);
  });

  it('accepts weeklySchedule', () => {
    const result = availabilitySchema.safeParse({
      weeklySchedule: {
        '0': [{ startTime: '09:00', endTime: '17:00' }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts array of subjects', () => {
    const result = availabilitySchema.safeParse({
      subjects: ['Math', 'Physics', 'Chemistry'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts session durations', () => {
    const result = availabilitySchema.safeParse({
      sessionDurations: [30, 60, 120],
    });
    expect(result.success).toBe(true);
  });

  it('accepts isActive boolean', () => {
    const result = availabilitySchema.safeParse({
      isActive: true,
    });
    expect(result.success).toBe(true);
  });
});

describe('dateOverrideSchema', () => {
  const validOverride = {
    date: '2025-12-25T00:00:00Z',
    available: false,
    slots: [{ startTime: '10:00', endTime: '12:00' }],
  };

  it('accepts valid date override', () => {
    const result = dateOverrideSchema.safeParse(validOverride);
    expect(result.success).toBe(true);
  });

  it('requires date', () => {
    const { date, ...rest } = validOverride;
    const result = dateOverrideSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('requires available boolean', () => {
    const { available, ...rest } = validOverride;
    const result = dateOverrideSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('allows optional slots', () => {
    const { slots, ...rest } = validOverride;
    const result = dateOverrideSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = dateOverrideSchema.safeParse({
      ...validOverride,
      date: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });
});

describe('getAvailableSlotsSchema', () => {
  const validQuery = {
    tutorId: 'tutor-123',
    date: '2025-12-01',
    duration: 60,
  };

  it('accepts valid query', () => {
    const result = getAvailableSlotsSchema.safeParse(validQuery);
    expect(result.success).toBe(true);
  });

  it('requires tutorId', () => {
    const { tutorId, ...rest } = validQuery;
    const result = getAvailableSlotsSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('requires date in YYYY-MM-DD format', () => {
    const { date, ...rest } = validQuery;
    const result = getAvailableSlotsSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = getAvailableSlotsSchema.safeParse({
      ...validQuery,
      date: '2025/12/01',
    });
    expect(result.success).toBe(false);
  });

  it('defaults duration to 60', () => {
    const { duration, ...rest } = validQuery;
    const result = getAvailableSlotsSchema.safeParse(rest);
    expect(result.success).toBe(true);
    expect(result.data.duration).toBe(60);
  });

  it('rejects duration less than 15', () => {
    const result = getAvailableSlotsSchema.safeParse({
      ...validQuery,
      duration: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration greater than 180', () => {
    const result = getAvailableSlotsSchema.safeParse({
      ...validQuery,
      duration: 200,
    });
    expect(result.success).toBe(false);
  });
});
