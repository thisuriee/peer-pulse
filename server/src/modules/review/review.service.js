'use strict';

const { BookingModel, BookingStatus } = require('../../database/models/session.model');
const ReviewModel = require('../../database/models/review.model');
const { ThreadModel } = require('../../database/models/thread.model');
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

  async getLeaderboard() {
    // 1) Top tutors: weighted by reputation and review volume.
    const tutors = await UserModel.find({ role: 'tutor' }).select(
      'name email reputationScore reviewCount badge skills'
    );
    const topTutors = tutors
      .map((t) => {
        const rep = Number(t.reputationScore || 0);
        const reviews = Number(t.reviewCount || 0);
        return {
          _id: t._id,
          name: t.name,
          email: t.email,
          reputationScore: rep,
          reviewCount: reviews,
          badge: t.badge || 'none',
          skills: t.skills || [],
          weightedScore: Math.round((rep * 20 + Math.log10(reviews + 1) * 15) * 10) / 10,
        };
      })
      .sort((a, b) => b.weightedScore - a.weightedScore || b.reputationScore - a.reputationScore)
      .slice(0, 15);

    // 2) Rising tutors: compare last 30 days avg with previous 30 days avg.
    const now = Date.now();
    const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now - 60 * 24 * 60 * 60 * 1000);

    const recentAgg = await ReviewModel.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: d30 } } },
      { $group: { _id: '$tutor', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const prevAgg = await ReviewModel.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: d60, $lt: d30 } } },
      { $group: { _id: '$tutor', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    const prevByTutor = new Map(prevAgg.map((p) => [p._id.toString(), p]));
    const risingTutorsRaw = recentAgg
      .map((r) => {
        const prev = prevByTutor.get(r._id.toString());
        const recentAvg = Number(r.avg || 0);
        const prevAvg = Number(prev?.avg || 0);
        return {
          tutorId: r._id.toString(),
          growth: Math.round((recentAvg - prevAvg) * 10) / 10,
          recentAvg: Math.round(recentAvg * 10) / 10,
          previousAvg: Math.round(prevAvg * 10) / 10,
          recentReviews: Number(r.count || 0),
          previousReviews: Number(prev?.count || 0),
        };
      })
      .filter((x) => x.recentReviews > 0)
      .sort((a, b) => b.growth - a.growth || b.recentReviews - a.recentReviews)
      .slice(0, 15);

    const risingTutors = await Promise.all(
      risingTutorsRaw.map(async (item) => {
        const tutor = await UserModel.findById(item.tutorId).select(
          'name email reputationScore reviewCount badge'
        );
        if (!tutor) return null;
        return {
          ...item,
          _id: tutor._id,
          name: tutor.name,
          email: tutor.email,
          reputationScore: tutor.reputationScore || 0,
          reviewCount: tutor.reviewCount || 0,
          badge: tutor.badge || 'none',
        };
      })
    ).then((arr) => arr.filter(Boolean));

    // 3) Most helpful students: replies + upvotes received + reviews submitted.
    const threads = await ThreadModel.find({ isDeleted: false }).select('authorId upvotes replies');
    const studentStats = new Map();
    const bump = (id, key, by = 1) => {
      const k = id.toString();
      const row = studentStats.get(k) || {
        userId: k,
        upvotesReceived: 0,
        replies: 0,
        bestAnswers: 0,
        reviewsSubmitted: 0,
      };
      row[key] += by;
      studentStats.set(k, row);
    };

    for (const t of threads) {
      if (t.authorId) {
        bump(t.authorId, 'upvotesReceived', Array.isArray(t.upvotes) ? t.upvotes.length : 0);
      }
      for (const reply of t.replies || []) {
        if (!reply?.userId) continue;
        bump(reply.userId, 'replies', 1);
        if (reply.isBestAnswer) bump(reply.userId, 'bestAnswers', 1);
      }
    }

    const reviewByReviewer = await ReviewModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$reviewer', submitted: { $sum: 1 } } },
    ]);
    for (const x of reviewByReviewer) {
      bump(x._id, 'reviewsSubmitted', Number(x.submitted || 0));
    }

    const helpfulStudentsRaw = Array.from(studentStats.values())
      .map((s) => ({
        ...s,
        helpfulScore:
          s.replies * 2 + s.upvotesReceived * 3 + s.bestAnswers * 5 + s.reviewsSubmitted * 2,
      }))
      .sort((a, b) => b.helpfulScore - a.helpfulScore)
      .slice(0, 20);

    const helpfulStudents = await Promise.all(
      helpfulStudentsRaw.map(async (item) => {
        const user = await UserModel.findById(item.userId).select('name email role');
        if (!user || user.role !== 'student') return null;
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          ...item,
        };
      })
    ).then((arr) => arr.filter(Boolean).slice(0, 15));

    return {
      topTutors,
      risingTutors,
      mostHelpfulStudents: helpfulStudents,
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = { ReviewService };
