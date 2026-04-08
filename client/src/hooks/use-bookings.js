import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBookings,
  getBookingById,
  getTutors,
  getAvailableSlots,
  getAvailability,
  createBooking,
  acceptBooking,
  declineBooking,
  cancelBooking,
  completeBooking,
  updateAvailability,
  addDateOverride,
  removeDateOverride,
} from '../lib/booking-api';


export const bookingKeys = {
  all: ['bookings'],
  list: (params) => ['bookings', params],
  detail: (id) => ['booking', id],
  tutors: (params) => ['tutors', params],
  slots: (tutorId, date, duration) => ['slots', tutorId, date, duration],
  availability: () => ['my-availability'],
};


export const useBookings = (params = {}) => {
  return useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: () => getBookings(params),
  });
};

export const useBookingById = (id) => {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => getBookingById(id),
    enabled: !!id,
  });
};

export const useTutors = (params = {}) => {
  return useQuery({
    queryKey: bookingKeys.tutors(params),
    queryFn: () => getTutors(params),
  });
};

export const useAvailableSlots = (tutorId, date, duration) => {
  return useQuery({
    queryKey: bookingKeys.slots(tutorId, date, duration),
    queryFn: () => getAvailableSlots(tutorId, date, duration),
    enabled: !!tutorId && !!date && !!duration,
  });
};

export const useAvailability = () => {
  return useQuery({
    queryKey: bookingKeys.availability(),
    queryFn: getAvailability,
  });
};



export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createBooking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
};

export const useAcceptBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data = {} }) => acceptBooking(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
    },
  });
};

export const useDeclineBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => declineBooking(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
    },
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => cancelBooking(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
    },
  });
};

export const useCompleteBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => completeBooking(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
    },
  });
};

export const useUpdateAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateAvailability(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.availability() });
    },
  });
};

export const useAddDateOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => addDateOverride(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.availability() });
    },
  });
};

export const useRemoveDateOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date) => removeDateOverride(date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.availability() });
    },
  });
};
