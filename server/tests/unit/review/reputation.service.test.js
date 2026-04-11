const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../../src/database/models/review.model');
jest.mock('../../../src/database/models/user.model');

const mongoose = require('mongoose');
const ReviewModel = require('../../../src/database/models/review.model');
const UserModel = require('../../../src/database/models/user.model');
const { ReputationService } = require('../../../src/modules/review/reputation.service');

describe('ReputationService.recalculateTutorReputation', () => {
  let service;

  beforeEach(() => {
    service = new ReputationService();
    jest.clearAllMocks();
  });

  it('returns early for invalid tutor id', async () => {
    await service.recalculateTutorReputation('not-an-id');

    expect(ReviewModel.aggregate).not.toHaveBeenCalled();
    expect(UserModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('updates tutor with rounded average, review count and distribution', async () => {
    const tutorId = new mongoose.Types.ObjectId().toString();

    ReviewModel.aggregate.mockResolvedValue([
      {
        _id: tutorId,
        averageRating: 4.666,
        totalReviews: 6,
        rating1: 0,
        rating2: 1,
        rating3: 1,
        rating4: 1,
        rating5: 3,
      },
    ]);

    await service.recalculateTutorReputation(tutorId);

    expect(ReviewModel.aggregate).toHaveBeenCalled();
    expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(tutorId, {
      reputationScore: 4.7,
      reviewCount: 6,
      ratingDistribution: { 1: 0, 2: 1, 3: 1, 4: 1, 5: 3 },
    });
  });

  it('sets all metrics to zero when tutor has no active reviews', async () => {
    const tutorId = new mongoose.Types.ObjectId().toString();
    ReviewModel.aggregate.mockResolvedValue([]);

    await service.recalculateTutorReputation(tutorId);

    expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(tutorId, {
      reputationScore: 0,
      reviewCount: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });
});
