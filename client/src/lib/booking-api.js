import apiClient from './api-client';

// Booking-related API functions
export const getTutors = async (params = {}) => {
  const response = await apiClient.get('/bookings/tutors', { params });
  return response.data.data;
};

export const getAvailableSlots = async (tutorId, date, duration = 60) => {
  const response = await apiClient.get('/bookings/slots', {
    params: { tutorId, date, duration },
  });
  return response.data.data;
};

export const getBookings = async (params = {}) => {
  const response = await apiClient.get('/bookings', { params });
  return response.data.data;
};

export const getBookingById = async (id) => {
  const response = await apiClient.get(`/bookings/${id}`);
  return response.data.data;
};

export const createBooking = async (data) => {
  const response = await apiClient.post('/bookings', data);
  return response.data.data;
};

export const acceptBooking = async (id, data = {}) => {
  const response = await apiClient.put(`/bookings/${id}/accept`, data);
  return response.data.data;
};

export const declineBooking = async (id, data) => {
  const response = await apiClient.put(`/bookings/${id}/decline`, data);
  return response.data.data;
};

export const cancelBooking = async (id, data) => {
  const response = await apiClient.delete(`/bookings/${id}`, { data });
  return response.data.data;
};

export const completeBooking = async (id) => {
  const response = await apiClient.put(`/bookings/${id}/complete`);
  return response.data.data;
};

// Availability endpoints (tutors only)
export const getAvailability = async () => {
  const response = await apiClient.get('/bookings/availability');
  return response.data.data;
};

export const updateAvailability = async (data) => {
  const response = await apiClient.put('/bookings/availability', data);
  return response.data.data;
};

export const addDateOverride = async (data) => {
  const response = await apiClient.post('/bookings/availability/override', data);
  return response.data.data;
};

export const removeDateOverride = async (date) => {
  const response = await apiClient.delete('/bookings/availability/override', {
    params: { date },
  });
  return response.data.data;
};
