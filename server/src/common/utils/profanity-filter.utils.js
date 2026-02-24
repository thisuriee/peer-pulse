"use strict";

const axios = require("axios");
const { logger } = require("./logger-utils");

const API_KEY = process.env.PERSPECTIVE_API_KEY;
const THRESHOLD = parseFloat(process.env.PERSPECTIVE_TOXICITY_THRESHOLD) || 0.75;

class ProfanityFilter {
  static async analyzeText(text) {
    try {
      const response = await axios.post(
        `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${API_KEY}`,
        {
          comment: { text },
          languages: ["en"],
          requestedAttributes: {
            TOXICITY: {},
            INSULT: {},
            THREAT: {},
          },
        }
      );

      const scores = response.data.attributeScores;

      return {
        toxicity: scores.TOXICITY.summaryScore.value,
        insult: scores.INSULT.summaryScore.value,
        threat: scores.THREAT.summaryScore.value,
      };
    } catch (error) {
      logger.error("Perspective API error", {
        message: error.message,
      });

      // Fail-safe: do NOT block content if API fails
      return null;
    }
  }

  static async shouldFlag(text) {
    const result = await this.analyzeText(text);

    if (!result) return false;

    const { toxicity, insult, threat } = result;

    return (
      toxicity >= THRESHOLD ||
      insult >= THRESHOLD ||
      threat >= THRESHOLD
    );
  }
}

module.exports = { ProfanityFilter };