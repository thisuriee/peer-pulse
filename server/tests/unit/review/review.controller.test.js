const { describe, it, expect, beforeEach } = require('@jest/globals');

const { HTTPSTATUS } = require('../../../src/config/http.config');
const { ReviewController } = require('../../../src/modules/review/review.controller');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ReviewController', () => {
  let reviewService;
  let controller;

  beforeEach(() => {
    reviewService = {
      createReview: jest.fn(),
      getReviewById: jest.fn(),
      getTutorReviews: jest.fn(),
      getMyReviews: jest.fn(),
      getLeaderboard: jest.fn(),
      updateReview: jest.fn(),
      deleteReview: jest.fn(),
    };
    controller = new ReviewController(reviewService);
    jest.clearAllMocks();
  });

  it('createReview returns 201 with review data', async () => {
    const req = { user: { id: 'u1' }, body: { bookingId: 'b1', rating: 5, comment: 'Great' } };
    const res = makeRes();
    const next = jest.fn();
    reviewService.createReview.mockResolvedValue({ _id: 'r1' });

    await controller.createReview(req, res, next);

    expect(reviewService.createReview).toHaveBeenCalledWith(req.user, req.body);
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.CREATED);
    expect(next).not.toHaveBeenCalled();
  });

  it('getReviewById returns 200 with review', async () => {
    const req = { params: { id: 'r1' } };
    const res = makeRes();
    const next = jest.fn();
    reviewService.getReviewById.mockResolvedValue({ _id: 'r1' });

    await controller.getReviewById(req, res, next);

    expect(reviewService.getReviewById).toHaveBeenCalledWith('r1');
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
  });

  it('getTutorReviews returns 200 with list', async () => {
    const req = { params: { tutorId: 't1' } };
    const res = makeRes();
    const next = jest.fn();
    reviewService.getTutorReviews.mockResolvedValue([{ _id: 'r1' }]);

    await controller.getTutorReviews(req, res, next);

    expect(reviewService.getTutorReviews).toHaveBeenCalledWith('t1');
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
  });

  it('getMyReviews returns 200 with list', async () => {
    const req = { user: { id: 'u1' } };
    const res = makeRes();
    const next = jest.fn();
    reviewService.getMyReviews.mockResolvedValue([{ _id: 'r1' }]);

    await controller.getMyReviews(req, res, next);

    expect(reviewService.getMyReviews).toHaveBeenCalledWith(req.user);
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
  });

  it('getLeaderboard returns 200 with data', async () => {
    const req = {};
    const res = makeRes();
    const next = jest.fn();
    reviewService.getLeaderboard.mockResolvedValue({ topTutors: [] });

    await controller.getLeaderboard(req, res, next);

    expect(reviewService.getLeaderboard).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
  });

  it('updateReview returns 200 with updated review', async () => {
    const req = { user: { id: 'u1' }, params: { id: 'r1' }, body: { rating: 4, comment: 'Updated' } };
    const res = makeRes();
    const next = jest.fn();
    reviewService.updateReview.mockResolvedValue({ _id: 'r1', rating: 4 });

    await controller.updateReview(req, res, next);

    expect(reviewService.updateReview).toHaveBeenCalledWith(req.user, 'r1', req.body);
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
  });

  it('deleteReview returns 200 with deleted review', async () => {
    const req = { user: { id: 'u1' }, params: { id: 'r1' } };
    const res = makeRes();
    const next = jest.fn();
    reviewService.deleteReview.mockResolvedValue({ _id: 'r1', isDeleted: true });

    await controller.deleteReview(req, res, next);

    expect(reviewService.deleteReview).toHaveBeenCalledWith(req.user, 'r1');
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
  });

  it('passes thrown errors to next via asyncHandler', async () => {
    const req = { params: { id: 'r404' } };
    const res = makeRes();
    const next = jest.fn();
    const error = new Error('boom');
    reviewService.getReviewById.mockRejectedValue(error);

    await controller.getReviewById(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
