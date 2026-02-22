"use strict";

const { Router } = require("express");
const { ReviewController } = require("./review.controller");
const { ReviewService } = require("./review.service");
const { ReviewRepository } = require("./review.repository");

const reviewRoutes = Router();

const reviewRepository = new ReviewRepository();
const reviewService = new ReviewService(reviewRepository);
const reviewController = new ReviewController(reviewService);

// Public
reviewRoutes.get("/tutor/:tutorId", reviewController.getTutorReviews);
reviewRoutes.get("/:id", reviewController.getReviewById);

// Protected (expects authenticateJWT to be applied at mount level)
reviewRoutes.get("/", reviewController.getMyReviews);
reviewRoutes.post("/", reviewController.createReview);
reviewRoutes.put("/:id", reviewController.updateReview);
reviewRoutes.delete("/:id", reviewController.deleteReview);

module.exports = reviewRoutes;
