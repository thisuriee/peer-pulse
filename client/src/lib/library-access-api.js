import apiClient from './api-client';

export const libraryAccessApi = {
  getTutorDirectory: async (params = {}) => {
    const response = await apiClient.get('/library-access/tutors', { params });
    return response.data;
  },

  getTutorRequests: async (params = {}) => {
    const response = await apiClient.get('/library-access/tutor-requests', { params });
    return response.data;
  },

  getStudentAccesses: async (params = {}) => {
    const response = await apiClient.get('/library-access/student-accesses', { params });
    return response.data;
  },

  requestAccess: async (tutorId) => {
    const response = await apiClient.post(`/library-access/${tutorId}/request`);
    return response.data;
  },

  updateAccessStatus: async ({ requestId, status }) => {
    const response = await apiClient.patch(`/library-access/${requestId}/status`, { status });
    return response.data;
  },
};
