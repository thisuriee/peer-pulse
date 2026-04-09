import apiClient from './api-client';

export const getMyReviews = async () => {
  const response = await apiClient.get('/reviews');
  return response.data.data;
};

export const createReview = async (data) => {
  const response = await apiClient.post('/reviews', data);
  return response.data.data;
};

export const updateReview = async (reviewId, data) => {
  const response = await apiClient.put(`/reviews/${reviewId}`, data);
  return response.data.data;
};

export const deleteReview = async (reviewId) => {
  const response = await apiClient.delete(`/reviews/${reviewId}`);
  return response.data.data;
};

export const getLeaderboard = async () => {
  const response = await apiClient.get('/reviews/leaderboard');
  return response.data.data;
};

