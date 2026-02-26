"use strict";

function computeBadgeFromReviewCount(count) {
  if (count >= 40) return "gold";
  if (count >= 20) return "silver";
  if (count >= 10) return "bronze";
  return "none";
}

module.exports = { computeBadgeFromReviewCount };
