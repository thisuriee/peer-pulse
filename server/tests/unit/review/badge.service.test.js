const { describe, it, expect } = require('@jest/globals');

const { computeBadgeFromReviewCount } = require('../../../src/modules/review/badge.service');

describe('computeBadgeFromReviewCount', () => {
  it('returns none when count is zero', () => {
    expect(computeBadgeFromReviewCount(0)).toBe('none');
  });

  it('returns rookie when count is between 1 and 9', () => {
    expect(computeBadgeFromReviewCount(1)).toBe('rookie');
    expect(computeBadgeFromReviewCount(9)).toBe('rookie');
  });

  it('returns bronze when count is between 10 and 19', () => {
    expect(computeBadgeFromReviewCount(10)).toBe('bronze');
    expect(computeBadgeFromReviewCount(19)).toBe('bronze');
  });

  it('returns silver when count is between 20 and 39', () => {
    expect(computeBadgeFromReviewCount(20)).toBe('silver');
    expect(computeBadgeFromReviewCount(39)).toBe('silver');
  });

  it('returns gold when count is 40 or more', () => {
    expect(computeBadgeFromReviewCount(40)).toBe('gold');
    expect(computeBadgeFromReviewCount(200)).toBe('gold');
  });
});
