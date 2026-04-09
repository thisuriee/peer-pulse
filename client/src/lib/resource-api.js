import apiClient from './api-client';

export const resourceApi = {
  /**
   * Fetch resources with dynamic filters
   * @param {Object} params - { type, tutorId, search, limit, skip }
   */
  getAll: async (params = {}) => {
    // Filter out undefined/null/empty string values to clean up the query url
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== ''),
    );

    // Using apiClient setup in lib/api-client.js
    const response = await apiClient.get('/resources', { params: cleanParams });
    return response.data; // { message, data, total }
  },

  /**
   * Get a single resource by ID
   */
  getById: async (id) => {
    const response = await apiClient.get(`/resources/${id}`);
    return response.data;
  },

  /**
   * Upload a new resource
   * Form data string fields: title, description, type
   * Form data file field: file
   */
  create: async (formData) => {
    const response = await apiClient.post('/resources', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // essential for file uploads
      },
    });
    return response.data;
  },

  /**
   * Update an existing resource
   * Re-sends metadata. Optionally a new 'file'.
   */
  update: async (id, formData) => {
    const response = await apiClient.put(`/resources/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Delete a resource
   */
  delete: async (id) => {
    const response = await apiClient.delete(`/resources/${id}`);
    return response.data;
  },
};
