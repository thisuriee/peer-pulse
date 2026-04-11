const { describe, it, expect } = require('@jest/globals');

jest.mock('../../../src/modules/review/review.controller', () => ({
  ReviewController: jest.fn().mockImplementation(() => ({
    getTutorReviews: (req, res) => res.status(200).json({ route: 'getTutorReviews' }),
    getLeaderboard: (req, res) => res.status(200).json({ route: 'getLeaderboard' }),
    getReviewById: (req, res) => res.status(200).json({ route: 'getReviewById' }),
    getMyReviews: (req, res) => res.status(200).json({ route: 'getMyReviews' }),
    createReview: (req, res) => res.status(201).json({ route: 'createReview' }),
    updateReview: (req, res) => res.status(200).json({ route: 'updateReview' }),
    deleteReview: (req, res) => res.status(200).json({ route: 'deleteReview' }),
  })),
}));

const express = require('express');
const request = require('supertest');
const reviewRoutes = require('../../../src/modules/review/review.routes');

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/reviews', reviewRoutes);
  return app;
};

describe('review.routes', () => {
  it('GET /reviews/tutor/:tutorId maps to getTutorReviews', async () => {
    const res = await request(makeApp()).get('/reviews/tutor/123');
    expect(res.body.route).toBe('getTutorReviews');
  });

  it('GET /reviews/leaderboard maps to getLeaderboard', async () => {
    const res = await request(makeApp()).get('/reviews/leaderboard');
    expect(res.body.route).toBe('getLeaderboard');
  });

  it('GET /reviews/:id maps to getReviewById', async () => {
    const res = await request(makeApp()).get('/reviews/abc');
    expect(res.body.route).toBe('getReviewById');
  });

  it('GET /reviews maps to getMyReviews', async () => {
    const res = await request(makeApp()).get('/reviews');
    expect(res.body.route).toBe('getMyReviews');
  });

  it('POST /reviews maps to createReview', async () => {
    const res = await request(makeApp()).post('/reviews').send({});
    expect(res.status).toBe(201);
    expect(res.body.route).toBe('createReview');
  });

  it('PUT /reviews/:id maps to updateReview', async () => {
    const res = await request(makeApp()).put('/reviews/abc').send({});
    expect(res.body.route).toBe('updateReview');
  });

  it('DELETE /reviews/:id maps to deleteReview', async () => {
    const res = await request(makeApp()).delete('/reviews/abc');
    expect(res.body.route).toBe('deleteReview');
  });
});
