const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../../src/database/models/session.model');
jest.mock('../../../src/database/models/review.model');
jest.mock('../../../src/database/models/thread.model');
jest.mock('../../../src/database/models/user.model');
jest.mock('../../../src/common/email/sendgrid.client', () => ({
  sendEmail: jest.fn().mockResolvedValue({ ok: true }),
}));
jest.mock('../../../src/modules/review/badge.service', () => ({
  computeBadgeFromReviewCount: jest.fn(),
}));

const mongoose = require('mongoose');
const { BookingModel, BookingStatus } = require('../../../src/database/models/session.model');
const ReviewModel = require('../../../src/database/models/review.model');
const { ThreadModel } = require('../../../src/database/models/thread.model');
const UserModel = require('../../../src/database/models/user.model');
const { sendEmail } = require('../../../src/common/email/sendgrid.client');
const { computeBadgeFromReviewCount } = require('../../../src/modules/review/badge.service');
const { ReviewService } = require('../../../src/modules/review/review.service');
const {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} = require('../../../src/common/utils/errors-utils');

const id = () => new mongoose.Types.ObjectId().toString();

describe('ReviewService', () => {
  let reviewRepository;
  let reputationService;
  let service;
  let studentId;
  let tutorId;
  let bookingId;
  let reviewId;

  beforeEach(() => {
    reviewRepository = {
      findByBookingId: jest.fn(),
      create: jest.fn(),
      updateById: jest.fn(),
      findActiveById: jest.fn(),
      findByTutor: jest.fn(),
      findReviewsByReviewer: jest.fn(),
    };
    reputationService = {
      recalculateTutorReputation: jest.fn().mockResolvedValue(undefined),
    };
    service = new ReviewService(reviewRepository, reputationService);

    studentId = id();
    tutorId = id();
    bookingId = id();
    reviewId = id();

    computeBadgeFromReviewCount.mockReturnValue('none');
    jest.clearAllMocks();
  });

  describe('validation helpers', () => {
    it('validateObjectId throws for invalid id', () => {
      expect(() => service.validateObjectId('bad-id', 'reviewId')).toThrow(BadRequestException);
    });

    it('validateRating allows only integers between 1 and 5', () => {
      expect(() => service.validateRating(1)).not.toThrow();
      expect(() => service.validateRating(5)).not.toThrow();
      expect(() => service.validateRating(0)).toThrow(BadRequestException);
      expect(() => service.validateRating(4.2)).toThrow(BadRequestException);
    });

    it('validateComment rejects non-string and too-long comment', () => {
      expect(() => service.validateComment(123)).toThrow(BadRequestException);
      expect(() => service.validateComment('a'.repeat(1001))).toThrow(BadRequestException);
      expect(() => service.validateComment(undefined)).not.toThrow();
    });
  });

  describe('canReviewBooking', () => {
    it('allows completed bookings', () => {
      const can = service.canReviewBooking({ status: BookingStatus.COMPLETED, scheduledAt: new Date() });
      expect(can).toBe(true);
    });

    it('allows accepted/confirmed only after scheduled time', () => {
      const past = new Date(Date.now() - 1000);
      const future = new Date(Date.now() + 60_000);
      expect(service.canReviewBooking({ status: BookingStatus.ACCEPTED, scheduledAt: past })).toBe(true);
      expect(service.canReviewBooking({ status: BookingStatus.CONFIRMED, scheduledAt: past })).toBe(true);
      expect(service.canReviewBooking({ status: BookingStatus.ACCEPTED, scheduledAt: future })).toBe(false);
    });

    it('rejects non-startable statuses', () => {
      expect(service.canReviewBooking({ status: BookingStatus.PENDING, scheduledAt: new Date() })).toBe(false);
      expect(service.canReviewBooking(null)).toBe(false);
    });
  });

  describe('createReview', () => {
    it('creates a review on valid input and recalculates reputation', async () => {
      BookingModel.findById.mockResolvedValue({
        _id: bookingId,
        student: studentId,
        tutor: tutorId,
        status: BookingStatus.COMPLETED,
        scheduledAt: new Date(Date.now() - 1000),
      });
      reviewRepository.findByBookingId.mockResolvedValue(null);
      reviewRepository.create.mockResolvedValue({ _id: reviewId, tutor: tutorId });
      UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      const created = await service.createReview(
        { id: studentId },
        { bookingId, rating: 5, comment: 'Excellent session' }
      );

      expect(reviewRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          booking: bookingId,
          reviewer: studentId,
          tutor: tutorId,
          rating: 5,
        })
      );
      expect(reputationService.recalculateTutorReputation).toHaveBeenCalledWith(tutorId);
      expect(created._id).toBe(reviewId);
    });

    it('throws when bookingId is missing', async () => {
      await expect(service.createReview({ id: studentId }, { rating: 5 })).rejects.toThrow(BadRequestException);
    });

    it('throws when booking not found', async () => {
      BookingModel.findById.mockResolvedValue(null);
      await expect(service.createReview({ id: studentId }, { bookingId, rating: 5 })).rejects.toThrow(
        NotFoundException
      );
    });

    it('throws when session has not started yet', async () => {
      BookingModel.findById.mockResolvedValue({
        student: studentId,
        tutor: tutorId,
        status: BookingStatus.ACCEPTED,
        scheduledAt: new Date(Date.now() + 60_000),
      });

      await expect(service.createReview({ id: studentId }, { bookingId, rating: 5 })).rejects.toThrow(
        BadRequestException
      );
    });

    it('throws when requester is not booking student', async () => {
      BookingModel.findById.mockResolvedValue({
        student: id(),
        tutor: tutorId,
        status: BookingStatus.COMPLETED,
        scheduledAt: new Date(Date.now() - 1000),
      });

      await expect(service.createReview({ id: studentId }, { bookingId, rating: 4 })).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('throws when an active review already exists', async () => {
      BookingModel.findById.mockResolvedValue({
        student: studentId,
        tutor: tutorId,
        status: BookingStatus.COMPLETED,
        scheduledAt: new Date(Date.now() - 1000),
      });
      reviewRepository.findByBookingId.mockResolvedValue({ _id: reviewId, isDeleted: false });

      await expect(service.createReview({ id: studentId }, { bookingId, rating: 4 })).rejects.toThrow(
        BadRequestException
      );
    });

    it('restores a soft-deleted review and recalculates reputation', async () => {
      BookingModel.findById.mockResolvedValue({
        student: studentId,
        tutor: tutorId,
        status: BookingStatus.COMPLETED,
        scheduledAt: new Date(Date.now() - 1000),
      });
      reviewRepository.findByBookingId.mockResolvedValue({ _id: reviewId, isDeleted: true });
      reviewRepository.updateById.mockResolvedValue({ _id: reviewId, tutor: tutorId });
      UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      const restored = await service.createReview(
        { id: studentId },
        { bookingId, rating: 3, comment: 'Rewritten review' }
      );

      expect(reviewRepository.updateById).toHaveBeenCalledWith(
        reviewId,
        expect.objectContaining({ isDeleted: false, rating: 3, comment: 'Rewritten review' })
      );
      expect(reputationService.recalculateTutorReputation).toHaveBeenCalledWith(tutorId);
      expect(restored._id).toBe(reviewId);
    });

    it('maps duplicate key error to BadRequestException', async () => {
      BookingModel.findById.mockResolvedValue({
        student: studentId,
        tutor: tutorId,
        status: BookingStatus.COMPLETED,
        scheduledAt: new Date(Date.now() - 1000),
      });
      reviewRepository.findByBookingId.mockResolvedValue(null);
      const duplicateError = new Error('dup');
      duplicateError.code = 11000;
      reviewRepository.create.mockRejectedValue(duplicateError);

      await expect(service.createReview({ id: studentId }, { bookingId, rating: 5 })).rejects.toThrow(
        BadRequestException
      );
    });

<<<<<<< HEAD
    it('rethrows non-duplicate errors from repository create', async () => {
      BookingModel.findById.mockResolvedValue({
        student: studentId,
        tutor: tutorId,
        status: BookingStatus.COMPLETED,
        scheduledAt: new Date(Date.now() - 1000),
      });
      reviewRepository.findByBookingId.mockResolvedValue(null);
      const unknownError = new Error('db-down');
      reviewRepository.create.mockRejectedValue(unknownError);

      await expect(service.createReview({ id: studentId }, { bookingId, rating: 5 })).rejects.toThrow(
        'db-down'
      );
    });

=======
>>>>>>> 182f9cf (feat: add review unit tests and update test documentation)
    it('updates tutor badge and sends badge email when badge changes from none', async () => {
      BookingModel.findById.mockResolvedValue({
        student: studentId,
        tutor: tutorId,
        status: BookingStatus.COMPLETED,
        scheduledAt: new Date(Date.now() - 1000),
      });
      reviewRepository.findByBookingId.mockResolvedValue(null);
      reviewRepository.create.mockResolvedValue({ _id: reviewId, tutor: tutorId });
      computeBadgeFromReviewCount.mockReturnValue('rookie');

      const tutorDoc = {
        email: 'tutor@test.com',
        name: 'Tutor',
        badge: 'none',
        reviewCount: 1,
        save: jest.fn().mockResolvedValue(true),
      };
      UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(tutorDoc) });

      await service.createReview({ id: studentId }, { bookingId, rating: 5 });

      expect(tutorDoc.save).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'tutor@test.com', subject: 'New Badge Unlocked' })
      );
    });
<<<<<<< HEAD

    it('does not send badge email when badge remains unchanged', async () => {
      BookingModel.findById.mockResolvedValue({
        student: studentId,
        tutor: tutorId,
        status: BookingStatus.COMPLETED,
        scheduledAt: new Date(Date.now() - 1000),
      });
      reviewRepository.findByBookingId.mockResolvedValue({ _id: reviewId, isDeleted: true });
      reviewRepository.updateById.mockResolvedValue({ _id: reviewId, tutor: tutorId });
      computeBadgeFromReviewCount.mockReturnValue('rookie');

      const tutorDoc = {
        email: 'tutor@test.com',
        name: 'Tutor',
        badge: 'rookie',
        reviewCount: 2,
        save: jest.fn().mockResolvedValue(true),
      };
      UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(tutorDoc) });

      await service.createReview({ id: studentId }, { bookingId, rating: 5 });

      expect(tutorDoc.save).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });
=======
>>>>>>> 182f9cf (feat: add review unit tests and update test documentation)
  });

  describe('read operations', () => {
    it('getReviewById returns active review', async () => {
      reviewRepository.findActiveById.mockResolvedValue({ _id: reviewId });
      const result = await service.getReviewById(reviewId);
      expect(result._id).toBe(reviewId);
    });

    it('getReviewById throws for missing review', async () => {
      reviewRepository.findActiveById.mockResolvedValue(null);
      await expect(service.getReviewById(reviewId)).rejects.toThrow(NotFoundException);
    });

    it('getTutorReviews validates id and delegates to repository', async () => {
      reviewRepository.findByTutor.mockResolvedValue([]);
      await service.getTutorReviews(tutorId);
      expect(reviewRepository.findByTutor).toHaveBeenCalledWith(tutorId);
    });

    it('getMyReviews returns tutor-owned reviews for tutor role', async () => {
      UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ role: 'tutor' }) });
      reviewRepository.findByTutor.mockResolvedValue([{ _id: reviewId }]);

      const reviews = await service.getMyReviews({ id: tutorId });
      expect(reviews).toHaveLength(1);
      expect(reviewRepository.findByTutor).toHaveBeenCalledWith(tutorId);
    });

    it('getMyReviews returns submitted reviews for student role', async () => {
      UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ role: 'student' }) });
      reviewRepository.findReviewsByReviewer.mockResolvedValue([{ _id: reviewId }]);

      const reviews = await service.getMyReviews({ id: studentId });
      expect(reviews).toHaveLength(1);
      expect(reviewRepository.findReviewsByReviewer).toHaveBeenCalledWith(studentId);
    });

    it('getMyReviews throws when user is not found', async () => {
      UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      await expect(service.getMyReviews({ id: studentId })).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateReview', () => {
    it('updates own review and recalculates reputation when rating changes', async () => {
      reviewRepository.findActiveById.mockResolvedValue({
        _id: reviewId,
        reviewer: studentId,
        tutor: tutorId,
        rating: 2,
      });
      reviewRepository.updateById.mockResolvedValue({
        _id: reviewId,
        reviewer: studentId,
        tutor: tutorId,
        rating: 5,
      });
      UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      const updated = await service.updateReview({ id: studentId }, reviewId, { rating: 5, comment: 'Better' });

      expect(updated.rating).toBe(5);
      expect(reputationService.recalculateTutorReputation).toHaveBeenCalledWith(tutorId);
    });

    it('does not recalculate reputation when only comment changes', async () => {
      reviewRepository.findActiveById.mockResolvedValue({
        _id: reviewId,
        reviewer: studentId,
        tutor: tutorId,
        rating: 4,
      });
      reviewRepository.updateById.mockResolvedValue({
        _id: reviewId,
        reviewer: studentId,
        tutor: tutorId,
        rating: 4,
      });

      await service.updateReview({ id: studentId }, reviewId, { comment: 'text edit' });

      expect(reputationService.recalculateTutorReputation).not.toHaveBeenCalled();
    });

    it('throws when user is not the reviewer', async () => {
      reviewRepository.findActiveById.mockResolvedValue({ _id: reviewId, reviewer: id(), tutor: tutorId, rating: 5 });
      await expect(service.updateReview({ id: studentId }, reviewId, { rating: 3 })).rejects.toThrow(
        UnauthorizedException
      );
    });
<<<<<<< HEAD

    it('throws NotFoundException when review disappears on updateById', async () => {
      reviewRepository.findActiveById.mockResolvedValue({
        _id: reviewId,
        reviewer: studentId,
        tutor: tutorId,
        rating: 4,
      });
      reviewRepository.updateById.mockResolvedValue(null);

      await expect(service.updateReview({ id: studentId }, reviewId, { comment: 'x' })).rejects.toThrow(
        NotFoundException
      );
    });

    it('updates badge and sends email when rating change causes badge transition', async () => {
      reviewRepository.findActiveById.mockResolvedValue({
        _id: reviewId,
        reviewer: studentId,
        tutor: tutorId,
        rating: 2,
      });
      reviewRepository.updateById.mockResolvedValue({
        _id: reviewId,
        reviewer: studentId,
        tutor: tutorId,
        rating: 5,
      });
      computeBadgeFromReviewCount.mockReturnValue('rookie');

      const tutorDoc = {
        email: 'tutor@test.com',
        name: 'Tutor',
        badge: 'none',
        reviewCount: 1,
        save: jest.fn().mockResolvedValue(true),
      };
      UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(tutorDoc) });

      await service.updateReview({ id: studentId }, reviewId, { rating: 5 });

      expect(tutorDoc.save).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'tutor@test.com', subject: 'New Badge Unlocked' })
      );
    });
=======
>>>>>>> 182f9cf (feat: add review unit tests and update test documentation)
  });

  describe('deleteReview', () => {
    it('allows reviewer to soft-delete and recalculate reputation', async () => {
      reviewRepository.findActiveById.mockResolvedValue({ _id: reviewId, reviewer: studentId, tutor: tutorId });
      UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ role: 'student' }) });
      reviewRepository.updateById.mockResolvedValue({ _id: reviewId, tutor: tutorId, isDeleted: true });
      UserModel.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'student' }) });
      UserModel.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValue(null) });

      const deleted = await service.deleteReview({ id: studentId }, reviewId);

      expect(reviewRepository.updateById).toHaveBeenCalledWith(
        reviewId,
        expect.objectContaining({ isDeleted: true })
      );
      expect(reputationService.recalculateTutorReputation).toHaveBeenCalledWith(tutorId);
      expect(deleted.isDeleted).toBe(true);
    });

    it('allows admin to delete non-owned review', async () => {
      reviewRepository.findActiveById.mockResolvedValue({ _id: reviewId, reviewer: id(), tutor: tutorId });
      UserModel.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'admin' }) });
      reviewRepository.updateById.mockResolvedValue({ _id: reviewId, tutor: tutorId, isDeleted: true });
      UserModel.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValue(null) });

      await service.deleteReview({ id: id() }, reviewId);
      expect(reviewRepository.updateById).toHaveBeenCalled();
    });

    it('throws UnauthorizedException for non-admin non-reviewer', async () => {
      reviewRepository.findActiveById.mockResolvedValue({ _id: reviewId, reviewer: id(), tutor: tutorId });
      UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ role: 'student' }) });

      await expect(service.deleteReview({ id: studentId }, reviewId)).rejects.toThrow(UnauthorizedException);
    });

    it('throws NotFoundException when review does not exist', async () => {
      reviewRepository.findActiveById.mockResolvedValue(null);
      await expect(service.deleteReview({ id: studentId }, reviewId)).rejects.toThrow(NotFoundException);
    });
<<<<<<< HEAD

    it('throws NotFoundException when deleting user cannot be found', async () => {
      reviewRepository.findActiveById.mockResolvedValue({ _id: reviewId, reviewer: studentId, tutor: tutorId });
      UserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await expect(service.deleteReview({ id: studentId }, reviewId)).rejects.toThrow(NotFoundException);
    });

    it('updates badge and sends email when delete changes badge', async () => {
      reviewRepository.findActiveById.mockResolvedValue({ _id: reviewId, reviewer: studentId, tutor: tutorId });
      UserModel.findById
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'student' }) })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            email: 'tutor@test.com',
            name: 'Tutor',
            badge: 'none',
            reviewCount: 1,
            save: jest.fn().mockResolvedValue(true),
          }),
        });
      reviewRepository.updateById.mockResolvedValue({ _id: reviewId, tutor: tutorId, isDeleted: true });
      computeBadgeFromReviewCount.mockReturnValue('rookie');

      await service.deleteReview({ id: studentId }, reviewId);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'tutor@test.com', subject: 'New Badge Unlocked' })
      );
    });
=======
>>>>>>> 182f9cf (feat: add review unit tests and update test documentation)
  });

  describe('getLeaderboard', () => {
    it('returns top tutors, rising tutors and most helpful students', async () => {
      const tutorA = { _id: id(), name: 'Tutor A', email: 'a@test.com', reputationScore: 4.8, reviewCount: 30 };
      const tutorB = { _id: id(), name: 'Tutor B', email: 'b@test.com', reputationScore: 4.3, reviewCount: 5 };

      UserModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([tutorB, tutorA]),
      });

      ReviewModel.aggregate
        .mockResolvedValueOnce([
          { _id: tutorA._id, avg: 4.9, count: 10 },
          { _id: tutorB._id, avg: 4.4, count: 8 },
        ])
        .mockResolvedValueOnce([
          { _id: tutorA._id, avg: 4.4, count: 6 },
          { _id: tutorB._id, avg: 4.2, count: 5 },
        ])
        .mockResolvedValueOnce([{ _id: studentId, submitted: 3 }]);

      ThreadModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          {
            authorId: studentId,
            upvotes: [id(), id()],
            replies: [{ userId: studentId, isBestAnswer: true }],
          },
        ]),
      });

      UserModel.findById.mockImplementation((lookupId) => ({
        select: jest.fn().mockResolvedValue(
          [tutorA._id, tutorB._id].includes(lookupId.toString())
            ? {
                _id: lookupId,
                name: lookupId === tutorA._id ? 'Tutor A' : 'Tutor B',
                email: `${lookupId}@mail.test`,
                reputationScore: lookupId === tutorA._id ? 4.8 : 4.3,
                reviewCount: lookupId === tutorA._id ? 30 : 5,
                badge: 'none',
                role: 'tutor',
              }
            : { _id: lookupId, name: 'Student', email: 's@test.com', role: 'student' }
        ),
      }));

      const result = await service.getLeaderboard();

      expect(result.topTutors.length).toBeGreaterThan(0);
      expect(result.risingTutors.length).toBeGreaterThan(0);
      expect(result.mostHelpfulStudents.length).toBeGreaterThan(0);
      expect(typeof result.generatedAt).toBe('string');
    });
<<<<<<< HEAD

    it('applies rising tutor tie-break by recentReviews when growth is equal', async () => {
      const tutorA = { _id: id(), name: 'Tutor A', email: 'a@test.com', reputationScore: 4.8, reviewCount: 30 };
      const tutorB = { _id: id(), name: 'Tutor B', email: 'b@test.com', reputationScore: 4.3, reviewCount: 5 };

      UserModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue([tutorA, tutorB]) });
      ReviewModel.aggregate
        .mockResolvedValueOnce([
          { _id: tutorA._id, avg: 4.5, count: 3 },
          { _id: tutorB._id, avg: 4.5, count: 8 },
        ])
        .mockResolvedValueOnce([
          { _id: tutorA._id, avg: 4.0, count: 2 },
          { _id: tutorB._id, avg: 4.0, count: 2 },
        ])
        .mockResolvedValueOnce([]);
      ThreadModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
      UserModel.findById.mockImplementation((lookupId) => ({
        select: jest.fn().mockResolvedValue({
          _id: lookupId,
          name: lookupId === tutorA._id ? 'Tutor A' : 'Tutor B',
          email: 'x@test.com',
          reputationScore: 4.2,
          reviewCount: 2,
          badge: 'none',
          role: 'tutor',
        }),
      }));

      const result = await service.getLeaderboard();
      expect(result.risingTutors[0]._id.toString()).toBe(tutorB._id.toString());
    });

    it('filters out non-students and null users from mostHelpfulStudents', async () => {
      const tutorA = { _id: id(), name: 'Tutor A', email: 'a@test.com', reputationScore: 4.8, reviewCount: 30 };
      const helperId = id();
      const tutorUserId = id();
      const nullUserId = id();

      UserModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue([tutorA]) });
      ReviewModel.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { _id: helperId, submitted: 2 },
          { _id: tutorUserId, submitted: 2 },
          { _id: nullUserId, submitted: 2 },
        ]);
      ThreadModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { authorId: helperId, upvotes: [id()], replies: [] },
          { authorId: tutorUserId, upvotes: [id()], replies: [] },
        ]),
      });
      UserModel.findById.mockImplementation((lookupId) => ({
        select: jest.fn().mockResolvedValue(
          lookupId.toString() === helperId
            ? { _id: helperId, name: 'Student 1', email: 's1@test.com', role: 'student' }
            : lookupId.toString() === tutorUserId
            ? { _id: tutorUserId, name: 'TutorUser', email: 't@test.com', role: 'tutor' }
            : null
        ),
      }));

      const result = await service.getLeaderboard();
      expect(result.mostHelpfulStudents).toHaveLength(1);
      expect(result.mostHelpfulStudents[0].name).toBe('Student 1');
    });

    it('filters out null tutors from risingTutors lookup', async () => {
      const tutorA = { _id: id(), name: 'Tutor A', email: 'a@test.com', reputationScore: 4.8, reviewCount: 30 };
      const missingTutorId = id();
      const existingTutorId = id();

      UserModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue([tutorA]) });
      ReviewModel.aggregate
        .mockResolvedValueOnce([
          { _id: missingTutorId, avg: 4.9, count: 5 },
          { _id: existingTutorId, avg: 4.8, count: 5 },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      ThreadModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
      UserModel.findById.mockImplementation((lookupId) => ({
        select: jest.fn().mockResolvedValue(
          lookupId.toString() === existingTutorId
            ? {
                _id: existingTutorId,
                name: 'Existing Tutor',
                email: 'et@test.com',
                reputationScore: 4.8,
                reviewCount: 5,
                badge: 'none',
                role: 'tutor',
              }
            : null
        ),
      }));

      const result = await service.getLeaderboard();
      expect(result.risingTutors).toHaveLength(1);
      expect(result.risingTutors[0].name).toBe('Existing Tutor');
    });
=======
>>>>>>> 182f9cf (feat: add review unit tests and update test documentation)
  });
});
