"use strict";

const { ReviewRepository } = require("./review.repository");
const { ReviewService } = require("./review.service");
const { ReviewController } = require("./review.controller");

const reviewRepository = new ReviewRepository();
const reviewService = new ReviewService(reviewRepository);
const reviewController = new ReviewController(reviewService);

module.exports = { reviewRepository, reviewService, reviewController };
