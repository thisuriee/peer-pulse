const { describe, it, expect } = require('@jest/globals');
const SessionModel = require('../../../src/database/models/authSession.model');

// These tests inspect the Mongoose schema definition — no DB connection required.

describe('AuthSession Model - schema', () => {
  it('has a userId field', () => {
    const path = SessionModel.schema.path('userId');
    expect(path).toBeDefined();
  });

  it('marks userId as required', () => {
    const path = SessionModel.schema.path('userId');
    expect(path.isRequired).toBe(true);
  });

  it('userId references the User model', () => {
    const path = SessionModel.schema.path('userId');
    expect(path.options.ref).toBe('User');
  });

  it('has a userAgent field', () => {
    const path = SessionModel.schema.path('userAgent');
    expect(path).toBeDefined();
  });

  it('userAgent is optional', () => {
    const path = SessionModel.schema.path('userAgent');
    expect(path.isRequired).toBeFalsy();
  });

  it('has an expiredAt field with a default', () => {
    const path = SessionModel.schema.path('expiredAt');
    expect(path).toBeDefined();
    expect(path.defaultValue).toBeDefined();
  });

  it('default expiredAt is approximately 30 days from now', () => {
    const path = SessionModel.schema.path('expiredAt');
    const defaultDate = path.defaultValue();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const diff = Math.abs(defaultDate.getTime() - (Date.now() + thirtyDaysMs));
    expect(diff).toBeLessThan(5000);
  });

  it('has timestamps enabled', () => {
    expect(SessionModel.schema.options.timestamps).toBe(true);
  });
});
