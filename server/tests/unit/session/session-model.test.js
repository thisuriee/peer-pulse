const { describe, it, expect } = require('@jest/globals');
const { BookingModel, BookingStatus } = require('../../../src/database/models/session.model');

// These tests inspect the Mongoose schema definition — no DB connection required.

describe('BookingModel - schema', () => {
  it('has a student field that references User', () => {
    const path = BookingModel.schema.path('student');
    expect(path).toBeDefined();
    expect(path.options.ref).toBe('User');
  });

  it('marks student as required', () => {
    const path = BookingModel.schema.path('student');
    expect(path.isRequired).toBe(true);
  });

  it('has a tutor field that references User', () => {
    const path = BookingModel.schema.path('tutor');
    expect(path).toBeDefined();
    expect(path.options.ref).toBe('User');
  });

  it('marks tutor as required', () => {
    const path = BookingModel.schema.path('tutor');
    expect(path.isRequired).toBe(true);
  });

  it('has a subject field', () => {
    const path = BookingModel.schema.path('subject');
    expect(path).toBeDefined();
  });

  it('marks subject as required', () => {
    const path = BookingModel.schema.path('subject');
    expect(path.isRequired).toBe(true);
  });

  it('has a description field that is optional', () => {
    const path = BookingModel.schema.path('description');
    expect(path).toBeDefined();
    expect(path.isRequired).toBeFalsy();
  });

  it('limits description to 500 chars', () => {
    const path = BookingModel.schema.path('description');
    expect(path.options.maxlength).toBe(500);
  });

  it('has a scheduledAt field that is required', () => {
    const path = BookingModel.schema.path('scheduledAt');
    expect(path).toBeDefined();
    expect(path.isRequired).toBe(true);
  });

  it('has a duration field with min 15 and max 180', () => {
    const path = BookingModel.schema.path('duration');
    expect(path).toBeDefined();
    expect(path.options.min).toBe(15);
    expect(path.options.max).toBe(180);
  });

  it('has a default duration of 60 minutes', () => {
    const path = BookingModel.schema.path('duration');
    expect(path.options.default).toBe(60);
  });

  it('has a status field with valid BookingStatus values', () => {
    const path = BookingModel.schema.path('status');
    expect(path).toBeDefined();
    expect(path.options.enum).toEqual(Object.values(BookingStatus));
  });

  it('defaults status to PENDING', () => {
    const path = BookingModel.schema.path('status');
    expect(path.options.default).toBe(BookingStatus.PENDING);
  });

  it('has a meetingLink field that is optional', () => {
    const path = BookingModel.schema.path('meetingLink');
    expect(path).toBeDefined();
    expect(path.isRequired).toBeFalsy();
  });

  it('has a notes field with max 1000 chars', () => {
    const path = BookingModel.schema.path('notes');
    expect(path).toBeDefined();
    expect(path.options.maxlength).toBe(1000);
  });

  it('has a googleCalendarEventId field', () => {
    const path = BookingModel.schema.path('googleCalendarEventId');
    expect(path).toBeDefined();
  });

  it('has timestamps enabled', () => {
    expect(BookingModel.schema.options.timestamps).toBe(true);
  });

  it('has a virtual endTime field', () => {
    const virtual = BookingModel.schema.virtuals.endTime;
    expect(virtual).toBeDefined();
  });

  it('endTime virtual calculates correctly', () => {
    const doc = {
      scheduledAt: new Date('2025-01-01T10:00:00Z'),
      duration: 60,
    };
    const endTimeGetter = BookingModel.schema.virtuals.endTime.getters[0];
    const endTime = endTimeGetter.call(doc);
    const expectedEndTime = new Date('2025-01-01T11:00:00Z');
    expect(endTime.getTime()).toBe(expectedEndTime.getTime());
  });

  it('includes virtuals in toJSON output', () => {
    expect(BookingModel.schema.options.toJSON.virtuals).toBe(true);
  });

  it('includes virtuals in toObject output', () => {
    expect(BookingModel.schema.options.toObject.virtuals).toBe(true);
  });
});

describe('BookingStatus enum', () => {
  it('has all expected status values', () => {
    expect(BookingStatus.PENDING).toBe('pending');
    expect(BookingStatus.ACCEPTED).toBe('accepted');
    expect(BookingStatus.DECLINED).toBe('declined');
    expect(BookingStatus.CONFIRMED).toBe('confirmed');
    expect(BookingStatus.COMPLETED).toBe('completed');
    expect(BookingStatus.CANCELLED).toBe('cancelled');
  });
});
