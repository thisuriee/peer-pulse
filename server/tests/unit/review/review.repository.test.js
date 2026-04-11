const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../../src/database/models/review.model');

const ReviewModel = require('../../../src/database/models/review.model');
const { ReviewRepository } = require('../../../src/modules/review/review.repository');

describe('ReviewRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new ReviewRepository();
    jest.clearAllMocks();
  });

  it('create delegates to ReviewModel.create', async () => {
    const payload = { rating: 5 };
    ReviewModel.create.mockResolvedValue({ _id: 'r1' });

    const result = await repository.create(payload);

    expect(ReviewModel.create).toHaveBeenCalledWith(payload);
    expect(result._id).toBe('r1');
  });

  it('findById delegates to ReviewModel.findById', async () => {
    await repository.findById('r1');
    expect(ReviewModel.findById).toHaveBeenCalledWith('r1');
  });

  it('findActiveById filters by isDeleted=false', async () => {
    await repository.findActiveById('r1');
    expect(ReviewModel.findOne).toHaveBeenCalledWith({ _id: 'r1', isDeleted: false });
  });

  it('findByBookingId looks up by booking id', async () => {
    await repository.findByBookingId('b1');
    expect(ReviewModel.findOne).toHaveBeenCalledWith({ booking: 'b1' });
  });

  it('findActiveByBookingId filters deleted records', async () => {
    await repository.findActiveByBookingId('b1');
    expect(ReviewModel.findOne).toHaveBeenCalledWith({ booking: 'b1', isDeleted: false });
  });

  it('findByTutor returns sorted active tutor reviews', async () => {
    const sort = jest.fn().mockResolvedValue([]);
    ReviewModel.find.mockReturnValue({ sort });

    await repository.findByTutor('t1');

    expect(ReviewModel.find).toHaveBeenCalledWith({ tutor: 't1', isDeleted: false });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('findReviewsByReviewer returns sorted active reviewer reviews', async () => {
    const sort = jest.fn().mockResolvedValue([]);
    ReviewModel.find.mockReturnValue({ sort });

    await repository.findReviewsByReviewer('u1');

    expect(ReviewModel.find).toHaveBeenCalledWith({ reviewer: 'u1', isDeleted: false });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('updateById enables validators and returns updated doc', async () => {
    await repository.updateById('r1', { rating: 4 });
    expect(ReviewModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'r1',
      { rating: 4 },
      { new: true, runValidators: true }
    );
  });
});
