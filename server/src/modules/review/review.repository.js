"use strict";

const ReviewModel = require("../../database/models/review.model");

class ReviewRepository {
  async create(data) {
    return ReviewModel.create(data);
  }

  async findById(id) {
    return ReviewModel.findById(id);
  }

  async findActiveById(id) {
    return ReviewModel.findOne({ _id: id, isDeleted: false });
  }

  async findByBookingId(bookingId) {
    return ReviewModel.findOne({ booking: bookingId });
  }

  async findActiveByBookingId(bookingId) {
    return ReviewModel.findOne({ booking: bookingId, isDeleted: false });
  }

  async findByTutor(tutorId) {
    return ReviewModel.find({ tutor: tutorId, isDeleted: false }).sort({ createdAt: -1 });
  }

  async findReviewsByReviewer(reviewerId) {
    return ReviewModel.find({ reviewer: reviewerId, isDeleted: false }).sort({ createdAt: -1 });
  }

  async updateById(id, update) {
    return ReviewModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
  }
}

module.exports = { ReviewRepository };
