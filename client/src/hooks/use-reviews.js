import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReview,
  deleteReview,
  getLeaderboard,
  getMyReviews,
  updateReview,
} from '@/lib/review-api';
import { bookingKeys } from '@/hooks/use-bookings';

export const reviewKeys = {
  all: ['reviews'],
  mine: ['reviews', 'mine'],
  leaderboard: ['reviews', 'leaderboard'],
};

export const useMyReviews = (enabled = true) =>
  useQuery({
    queryKey: reviewKeys.mine,
    queryFn: getMyReviews,
    enabled,
  });

export const useLeaderboard = (enabled = true) =>
  useQuery({
    queryKey: reviewKeys.leaderboard,
    queryFn: getLeaderboard,
    enabled,
    staleTime: 60_000,
  });

export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createReview(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

export const useUpdateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, payload }) => updateReview(reviewId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId) => deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

