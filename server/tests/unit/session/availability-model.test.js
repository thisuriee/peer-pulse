const { describe, it, expect } = require('@jest/globals');
const { AvailabilityModel, DayOfWeek } = require('../../../src/database/models/availability.model');

// These tests inspect the Mongoose schema definition — no DB connection required.

describe('AvailabilityModel - schema', () => {
  it('has a tutor field that references User', () => {
    const path = AvailabilityModel.schema.path('tutor');
    expect(path).toBeDefined();
    expect(path.options.ref).toBe('User');
  });

  it('marks tutor as required and unique', () => {
    const path = AvailabilityModel.schema.path('tutor');
    expect(path.isRequired).toBe(true);
    expect(path.options.unique).toBe(true);
  });

  it('has a timezone field with default UTC', () => {
    const path = AvailabilityModel.schema.path('timezone');
    expect(path).toBeDefined();
    expect(path.options.default).toBe('UTC');
  });

  it('has a weeklySchedule field of type Map', () => {
    const path = AvailabilityModel.schema.path('weeklySchedule');
    expect(path).toBeDefined();
  });

  it('weeklySchedule is initialized as empty Map', () => {
    const path = AvailabilityModel.schema.path('weeklySchedule');
    const defaultValue = path.options.default;
    expect(defaultValue).toBeDefined();
    expect(defaultValue).toEqual(new Map());
  });

  it('has a dateOverrides array', () => {
    const path = AvailabilityModel.schema.path('dateOverrides');
    expect(path).toBeDefined();
  });

  it('dateOverride has date, available, and slots fields', () => {
    const path = AvailabilityModel.schema.path('dateOverrides.0.date');
    expect(path).toBeDefined();

    const availablePath = AvailabilityModel.schema.path('dateOverrides.0.available');
    expect(availablePath).toBeDefined();
    expect(availablePath.options.default).toBe(false);

    const slotsPath = AvailabilityModel.schema.path('dateOverrides.0.slots');
    expect(slotsPath).toBeDefined();
  });

  it('has a subjects array', () => {
    const path = AvailabilityModel.schema.path('subjects');
    expect(path).toBeDefined();
  });

  it('has a sessionDurations array with default [30, 60]', () => {
    const path = AvailabilityModel.schema.path('sessionDurations');
    expect(path).toBeDefined();
    expect(path.options.default).toEqual([30, 60]);
  });

  it('has an isActive field with default true', () => {
    const path = AvailabilityModel.schema.path('isActive');
    expect(path).toBeDefined();
    expect(path.options.default).toBe(true);
  });

  it('has timestamps enabled', () => {
    expect(AvailabilityModel.schema.options.timestamps).toBe(true);
  });
});

describe('DayOfWeek enum', () => {
  it('has all expected day values', () => {
    expect(DayOfWeek.SUNDAY).toBe(0);
    expect(DayOfWeek.MONDAY).toBe(1);
    expect(DayOfWeek.TUESDAY).toBe(2);
    expect(DayOfWeek.WEDNESDAY).toBe(3);
    expect(DayOfWeek.THURSDAY).toBe(4);
    expect(DayOfWeek.FRIDAY).toBe(5);
    expect(DayOfWeek.SATURDAY).toBe(6);
  });
});
