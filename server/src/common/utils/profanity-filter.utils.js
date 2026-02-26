"use strict";

const { logger } = require("./logger-utils");

/**
 * Check content for profanity/toxicity
 * This is a placeholder implementation. In production, integrate with:
 * - Perspective API (Google)
 * - Azure Content Moderator
 * - Or other moderation services
 */
class ProfanityFilter {
  /**
   * Simple keyword-based filter (placeholder)
   * Replace with actual API integration in production
   */
  static TOXIC_KEYWORDS = [
    "spam",
    "scam",
    // Add more keywords or use external service
  ];

  static TOXICITY_THRESHOLD = 0.7;

  /**
   * Check if text contains toxic content
   * @param {string} text - Text to analyze
   * @returns {Promise<{isToxic: boolean, score: number}>}
   */
  static async checkToxicity(text) {
    try {
      // Placeholder implementation
      // In production, call Perspective API or similar service
      
      const lowerText = text.toLowerCase();
      let matchCount = 0;

      for (const keyword of this.TOXIC_KEYWORDS) {
        if (lowerText.includes(keyword)) {
          matchCount++;
        }
      }

      const score = matchCount > 0 ? matchCount / 10 : 0;
      const isToxic = score >= this.TOXICITY_THRESHOLD;

      if (isToxic) {
        logger.warn("Toxic content detected", { score, textLength: text.length });
      }

      return {
        isToxic,
        score,
      };
    } catch (error) {
      logger.error("Profanity filter error", { error: error.message });
      // Don't block on filter failure
      return {
        isToxic: false,
        score: 0,
      };
    }
  }

  /**
   * Check and flag content if toxic
   * @param {string} text
   * @returns {Promise<boolean>} - true if flagged
   */
  static async shouldFlag(text) {
    const { isToxic } = await this.checkToxicity(text);
    return isToxic;
  }
}

module.exports = { ProfanityFilter };