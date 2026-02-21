"use strict";

const { asyncHandler } = require("../../middlewares/helpers/async-handler.middleware");
const { HTTPSTATUS } = require("../../config/http.config");

class ReviewController {
  constructor(reviewService) {
    this.reviewService = reviewService;
  }

  createReview = asyncHandler(async (req, res) => {
    const user = req.user;
    const { bookingId, rating, comment } = req.body;

    const review = await this.reviewService.createReview(user, {
      bookingId,
      rating,
      comment,
    });

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: "Review created successfully",
      data: review,
    });
  });

  getReviewById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const review = await this.reviewService.getReviewById(id);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Review retrieved successfully",
      data: review,
    });
  });

  getTutorReviews = asyncHandler(async (req, res) => {
    const { tutorId } = req.params;

    const reviews = await this.reviewService.getTutorReviews(tutorId);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Tutor reviews retrieved successfully",
      data: reviews,
    });
  });

  getMyReviews = asyncHandler(async (req, res) => {
    const user = req.user;

    const reviews = await this.reviewService.getMyReviews(user);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Reviews retrieved successfully",
      data: reviews,
    });
  });

  updateReview = asyncHandler(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const { rating, comment } = req.body;

    const updated = await this.reviewService.updateReview(user, id, {
      rating,
      comment,
    });

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Review updated successfully",
      data: updated,
    });
  });

  deleteReview = asyncHandler(async (req, res) => {
    const user = req.user;
    const { id } = req.params;

    const deleted = await this.reviewService.deleteReview(user, id);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Review deleted successfully",
      data: deleted,
    });
  });
}

module.exports = { ReviewController };
