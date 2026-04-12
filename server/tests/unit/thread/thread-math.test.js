const { calculatePageOffset, calculateTotalPages, calculateVoteTotal } = require("../../../src/common/utils/math-utils");

describe("Math Utils for Pagination & Sorting", () => {
  describe("calculatePageOffset", () => {
    it("should correctly calculate skip offset for page 1", () => {
      expect(calculatePageOffset(1, 10)).toBe(0);
    });

    it("should correctly calculate skip offset for page 3", () => {
      expect(calculatePageOffset(3, 15)).toBe(30);
    });

    it("should handle invalid inputs gracefully", () => {
      expect(calculatePageOffset("abc", "foo")).toBe(0);
      expect(calculatePageOffset(-5, 0)).toBe(0);
    });
  });

  describe("calculateTotalPages", () => {
    it("should correctly calculate total pages given exact remainder", () => {
      expect(calculateTotalPages(50, 10)).toBe(5);
    });

    it("should correctly calculation total pages rounding up", () => {
      expect(calculateTotalPages(45, 10)).toBe(5);
    });

    it("should handle invalid input gracefully", () => {
      expect(calculateTotalPages(-10, null)).toBe(0);
    });
  });

  describe("calculateVoteTotal", () => {
    it("should return correct vote totals for array of upvote IDs", () => {
      const voteArray = ["user1", "user2", "user3"];
      expect(calculateVoteTotal(voteArray)).toBe(3);
    });

    it("should return 0 for an empty array", () => {
      expect(calculateVoteTotal([])).toBe(0);
    });

    it("should return 0 for non-array input", () => {
      expect(calculateVoteTotal(null)).toBe(0);
      expect(calculateVoteTotal(undefined)).toBe(0);
      expect(calculateVoteTotal("123")).toBe(0);
    });
  });
});
