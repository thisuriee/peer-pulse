const { describe, it, expect } = require('@jest/globals');
const { signJwtToken, verifyJwtToken } = require('../../../src/common/utils/token-utils');

describe('token-utils', () => {
  const payload = { userId: 'abc123', role: 'student' };

  it('signs and verifies a valid JWT', () => {
    const token = signJwtToken(payload);
    const decoded = verifyJwtToken(token);
    expect(decoded.userId).toBe('abc123');
  });

  it('throws on a tampered token', () => {
    const token = signJwtToken(payload);
    expect(() => verifyJwtToken(token + 'tampered')).toThrow();
  });

  it('throws on an expired token', async () => {
    const token = signJwtToken(payload, { expiresIn: '1ms' });
    await new Promise(r => setTimeout(r, 10));
    expect(() => verifyJwtToken(token)).toThrow();
  });
});