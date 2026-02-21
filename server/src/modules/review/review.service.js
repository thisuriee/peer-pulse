'use strict';

const { BookingModel, BookingStatus } = require('../../database/models/session.model');
const mongoose = require('mongoose');
const {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} = require('../../common/utils/errors-utils');

class ReviewService {
  constructor(reviewRepository) {
    this.reviewRepository = reviewRepository;
  }

  validateObjectId(value, fieldName) {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${fieldName} must be a valid id`);
    }
  }

  validateRating(rating) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be an integer between 1 and 5');
    }
  }

  validateComment(comment) {
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== 'string') {
        throw new BadRequestException('comment must be a string');
      }
      if (comment.length > 1000) {
        throw new BadRequestException('comment must be 1000 characters or less');
      }
    }
  }

  async createReview(user, { bookingId, rating, comment }) {
    if (!bookingId) {
      throw new BadRequestException('bookingId is required');
    }

    this.validateObjectId(bookingId, 'bookingId');
    this.validateRating(rating);
    this.validateComment(comment);

    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('You can only review a completed booking');
    }

    if (booking.student.toString() !== user.id.toString()) {
      throw new UnauthorizedException('Only the booking student can submit a review');
    }

    const existing = await this.reviewRepository.findByBookingId(bookingId);
    if (existing) {
      if (!existing.isDeleted) {
        throw new BadRequestException('A review already exists for this booking');
      }

      const restored = await this.reviewRepository.updateById(existing._id, {
        rating,
        comment,
        isDeleted: false,
        deletedAt: undefined,
        editedAt: new Date(),
      });

      return restored;
    }

    try {
      const created = await this.reviewRepository.create({
        booking: bookingId,
        reviewer: user.id,
        tutor: booking.tutor,
        rating,
        comment,
        isDeleted: false,
        flaggedForModeration: false,
      });

      return created;
    } catch (err) {
      if (err && err.code === 11000) {
        throw new BadRequestException('A review already exists for this booking');
      }
      throw err;
    }
  }

  async getReviewById(id) {
    this.validateObjectId(id, 'reviewId');
    const review = await this.reviewRepository.findActiveById(id);
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  async getTutorReviews(tutorId) {
    this.validateObjectId(tutorId, 'tutorId');
    return this.reviewRepository.findByTutor(tutorId);
  }

  async getMyReviews(user) {
    if (user.role === 'tutor') {
      return this.reviewRepository.findByTutor(user.id);
    }
    return this.reviewRepository.findReviewsByReviewer(user.id);
  }

  async updateReview(user, reviewId, { rating, comment }) {
    this.validateObjectId(reviewId, 'reviewId');
    if (rating !== undefined) {
      this.validateRating(rating);
    }
    if (comment !== undefined) {
      this.validateComment(comment);
    }

    const review = await this.reviewRepository.findActiveById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewer.toString() !== user.id.toString()) {
      throw new UnauthorizedException('Only the reviewer can update this review');
    }

    const update = {
      editedAt: new Date(),
      ...(rating !== undefined ? { rating } : {}),
      ...(comment !== undefined ? { comment } : {}),
    };

    const updated = await this.reviewRepository.updateById(reviewId, update);
    if (!updated) {
      throw new NotFoundException('Review not found');
    }

    return updated;
  }

  async deleteReview(user, reviewId) {
    this.validateObjectId(reviewId, 'reviewId');

    const review = await this.reviewRepository.findActiveById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const isAdmin = user.role === 'admin';
    const isReviewer = review.reviewer.toString() === user.id.toString();

    if (!isAdmin && !isReviewer) {
      throw new UnauthorizedException('You are not allowed to delete this review');
    }

    const deleted = await this.reviewRepository.updateById(reviewId, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    return deleted;
  }
}

module.exports = { ReviewService };
