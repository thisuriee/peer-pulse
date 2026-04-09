'use strict';

const { BookingModel, BookingStatus } = require('../../database/models/session.model');
const UserModel = require('../../database/models/user.model');
const mongoose = require('mongoose');
const { ReputationService } = require('./reputation.service');
const { computeBadgeFromReviewCount } = require('./badge.service');
const { sendEmail } = require('../../common/email/sendgrid.client');
const {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} = require('../../common/utils/errors-utils');

class ReviewService {
  constructor(reviewRepository, reputationService = new ReputationService()) {
    this.reviewRepository = reviewRepository;
    this.reputationService = reputationService;
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

  canReviewBooking(booking) {
    if (!booking) return false;

    if (booking.status === BookingStatus.COMPLETED) {
      return true;
    }

    const startableStatuses = [BookingStatus.ACCEPTED, BookingStatus.CONFIRMED];
    if (!startableStatuses.includes(booking.status)) {
      return false;
    }

    // Session is considered started once scheduled time is reached.
    return new Date(booking.scheduledAt) <= new Date();
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

    if (!this.canReviewBooking(booking)) {
      throw new BadRequestException(
        'You can review only after the session has started'
      );
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

      await this.reputationService.recalculateTutorReputation(restored.tutor.toString());

      const tutorAfterRestore = await UserModel.findById(restored.tutor).select(
        'email name badge reviewCount'
      );
      if (tutorAfterRestore) {
        const nextBadge = computeBadgeFromReviewCount(tutorAfterRestore.reviewCount || 0);
        if (nextBadge !== tutorAfterRestore.badge) {
          tutorAfterRestore.badge = nextBadge;
          tutorAfterRestore.badgeUpdatedAt = new Date();
          await tutorAfterRestore.save();

          if (nextBadge !== 'none') {
            await sendEmail({
              to: tutorAfterRestore.email,
              subject: 'New Badge Unlocked',
              text: `Congrats ${tutorAfterRestore.name}! You earned the ${nextBadge} badge.`,
            });
          }
        }
      }

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

      await this.reputationService.recalculateTutorReputation(created.tutor.toString());

      const tutorAfterCreate = await UserModel.findById(created.tutor).select(
        'email name badge reviewCount'
      );
      if (tutorAfterCreate) {
        const nextBadge = computeBadgeFromReviewCount(tutorAfterCreate.reviewCount || 0);
        if (nextBadge !== tutorAfterCreate.badge) {
          tutorAfterCreate.badge = nextBadge;
          tutorAfterCreate.badgeUpdatedAt = new Date();
          await tutorAfterCreate.save();

          if (nextBadge !== 'none') {
            await sendEmail({
              to: tutorAfterCreate.email,
              subject: 'New Badge Unlocked',
              text: `Congrats ${tutorAfterCreate.name}! You earned the ${nextBadge} badge.`,
            });
          }
        }
      }

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
    const dbUser = await UserModel.findById(user.id).select('role');
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    if (dbUser.role === 'tutor') {
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

    const oldRating = review.rating;

    const update = {
      editedAt: new Date(),
      ...(rating !== undefined ? { rating } : {}),
      ...(comment !== undefined ? { comment } : {}),
    };

    const updated = await this.reviewRepository.updateById(reviewId, update);
    if (!updated) {
      throw new NotFoundException('Review not found');
    }

    if (rating !== undefined && rating !== oldRating) {
      await this.reputationService.recalculateTutorReputation(updated.tutor.toString());

      const tutorAfterUpdate = await UserModel.findById(updated.tutor).select(
        'email name badge reviewCount'
      );
      if (tutorAfterUpdate) {
        const nextBadge = computeBadgeFromReviewCount(tutorAfterUpdate.reviewCount || 0);
        if (nextBadge !== tutorAfterUpdate.badge) {
          tutorAfterUpdate.badge = nextBadge;
          tutorAfterUpdate.badgeUpdatedAt = new Date();
          await tutorAfterUpdate.save();

          if (nextBadge !== 'none') {
            await sendEmail({
              to: tutorAfterUpdate.email,
              subject: 'New Badge Unlocked',
              text: `Congrats ${tutorAfterUpdate.name}! You earned the ${nextBadge} badge.`,
            });
          }
        }
      }
    }

    return updated;
  }

  async deleteReview(user, reviewId) {
    this.validateObjectId(reviewId, 'reviewId');

    const review = await this.reviewRepository.findActiveById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const dbUser = await UserModel.findById(user.id).select('role');
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    const isAdmin = dbUser.role === 'admin';
    const isReviewer = review.reviewer.toString() === user.id.toString();

    if (!isAdmin && !isReviewer) {
      throw new UnauthorizedException('You are not allowed to delete this review');
    }

    const deleted = await this.reviewRepository.updateById(reviewId, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    if (deleted) {
      await this.reputationService.recalculateTutorReputation(deleted.tutor.toString());

      const tutorAfterDelete = await UserModel.findById(deleted.tutor).select(
        'email name badge reviewCount'
      );
      if (tutorAfterDelete) {
        const nextBadge = computeBadgeFromReviewCount(tutorAfterDelete.reviewCount || 0);
        if (nextBadge !== tutorAfterDelete.badge) {
          tutorAfterDelete.badge = nextBadge;
          tutorAfterDelete.badgeUpdatedAt = new Date();
          await tutorAfterDelete.save();

          if (nextBadge !== 'none') {
            await sendEmail({
              to: tutorAfterDelete.email,
              subject: 'New Badge Unlocked',
              text: `Congrats ${tutorAfterDelete.name}! You earned the ${nextBadge} badge.`,
            });
          }
        }
      }
    }

    return deleted;
  }
}

module.exports = { ReviewService };
