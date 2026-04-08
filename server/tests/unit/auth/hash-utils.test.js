const { describe, it, expect } = require('@jest/globals');
const { hashValue, compareValue } = require('../../../src/common/utils/hash-utils');

describe('hash-utils', () => {
  it('hashes a plain text password', async () => {
    const hash = await hashValue('secret123');
    expect(hash).not.toBe('secret123');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('returns true when comparing correct password to hash', async () => {
    const hash = await hashValue('mypassword');
    expect(await compareValue('mypassword', hash)).toBe(true);
  });

  it('returns false for incorrect password', async () => {
    const hash = await hashValue('correctpass');
    expect(await compareValue('wrongpass', hash)).toBe(false);
  });
});