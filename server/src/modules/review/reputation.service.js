"use strict";

const mongoose = require("mongoose");
const ReviewModel = require("../../database/models/review.model");
const UserModel = require("../../database/models/user.model");

class ReputationService {
  async recalculateTutorReputation(tutorId) {
    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return;
    }

    const tutorObjectId = new mongoose.Types.ObjectId(tutorId);

    const result = await ReviewModel.aggregate([
      {
        $match: {
          tutor: tutorObjectId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$tutor",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          rating1: {
            $sum: {
              $cond: [{ $eq: ["$rating", 1] }, 1, 0],
            },
          },
          rating2: {
            $sum: {
              $cond: [{ $eq: ["$rating", 2] }, 1, 0],
            },
          },
          rating3: {
            $sum: {
              $cond: [{ $eq: ["$rating", 3] }, 1, 0],
            },
          },
          rating4: {
            $sum: {
              $cond: [{ $eq: ["$rating", 4] }, 1, 0],
            },
          },
          rating5: {
            $sum: {
              $cond: [{ $eq: ["$rating", 5] }, 1, 0],
            },
          },
        },
      },
    ]);

    const stats = result && result.length > 0 ? result[0] : null;

    const average = stats?.averageRating ? Number(stats.averageRating) : 0;
    const roundedAverage = Math.round(average * 10) / 10;

    const reviewCount = stats?.totalReviews ? Number(stats.totalReviews) : 0;

    const ratingDistribution = {
      "1": stats?.rating1 ? Number(stats.rating1) : 0,
      "2": stats?.rating2 ? Number(stats.rating2) : 0,
      "3": stats?.rating3 ? Number(stats.rating3) : 0,
      "4": stats?.rating4 ? Number(stats.rating4) : 0,
      "5": stats?.rating5 ? Number(stats.rating5) : 0,
    };

    await UserModel.findByIdAndUpdate(tutorId, {
      reputationScore: roundedAverage,
      reviewCount,
      ratingDistribution,
    });
  }
}

module.exports = { ReputationService };
