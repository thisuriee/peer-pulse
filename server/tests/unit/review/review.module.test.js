const { describe, it, expect } = require('@jest/globals');

const {
  reviewRepository,
  reviewService,
  reviewController,
} = require('../../../src/modules/review/review.module');
const { ReviewRepository } = require('../../../src/modules/review/review.repository');
const { ReviewService } = require('../../../src/modules/review/review.service');
const { ReviewController } = require('../../../src/modules/review/review.controller');

describe('review.module wiring', () => {
  it('exports instantiated repository, service, and controller', () => {
    expect(reviewRepository).toBeInstanceOf(ReviewRepository);
    expect(reviewService).toBeInstanceOf(ReviewService);
    expect(reviewController).toBeInstanceOf(ReviewController);
  });
});
