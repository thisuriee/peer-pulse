const { describe, it, expect } = require('@jest/globals');
const { registerSchema, loginSchema } = require('../../../src/common/validators/auth.validator');

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    expect(registerSchema.safeParse({
      name: 'Alice', email: 'alice@test.com',
      password: 'pass123', confirmPassword: 'pass123',
    }).success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    expect(registerSchema.safeParse({
      name: 'Alice', email: 'alice@test.com',
      password: 'pass123', confirmPassword: 'different',
    }).success).toBe(false);
  });

  it('rejects invalid email format', () => {
    expect(registerSchema.safeParse({
      name: 'Alice', email: 'not-an-email',
      password: 'pass123', confirmPassword: 'pass123',
    }).success).toBe(false);
  });

  it('rejects password shorter than 6 characters', () => {
    expect(registerSchema.safeParse({
      name: 'Alice', email: 'alice@test.com',
      password: '12', confirmPassword: '12',
    }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({
      email: 'alice@test.com', password: 'pass123',
    }).success).toBe(true);
  });
});