"use strict";

function computeBadgeFromReviewCount(count) {
  if (count >= 40) return "gold";
  if (count >= 20) return "silver";
  if (count >= 10) return "bronze";
  if (count >= 1) return "rookie";
  return "none";
}

module.exports = { computeBadgeFromReviewCount };
