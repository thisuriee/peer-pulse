import api from './api';

export const threadService = {
  getThreads: async (params) => {
    const response = await api.get('/threads', { params });
    return response.data;
  },
  getThreadById: async (id) => {
    const response = await api.get(`/threads/${id}`);
    return response.data;
  },
  createThread: async (data) => {
    const response = await api.post('/threads', data);
    return response.data;
  },
  updateThread: async (id, data) => {
    const response = await api.put(`/threads/${id}`, data);
    return response.data;
  },
  deleteThread: async (id) => {
    const response = await api.delete(`/threads/${id}`);
    return response.data;
  },
  upvoteThread: async (id) => {
    const response = await api.patch(`/threads/${id}/upvote`);
    return response.data;
  },
  addReply: async (threadId, data) => {
    // Check if it's meant to be replies or comments based on routes.
    // Based on thread routes, both /replies and /comments exist
    const response = await api.post(`/threads/${threadId}/replies`, data);
    return response.data;
  },
  acceptReply: async (threadId, replyId) => {
    const response = await api.patch(`/threads/${threadId}/replies/${replyId}/accept`);
    return response.data;
  },
  deleteReply: async (threadId, replyId) => {
    const response = await api.delete(`/threads/${threadId}/replies/${replyId}`);
    return response.data;
  },
  updateReply: async (threadId, replyId, data) => {
    const response = await api.put(`/threads/${threadId}/replies/${replyId}`, data);
    return response.data;
  },
  upvoteReply: async (threadId, replyId) => {
    const response = await api.post(`/threads/${threadId}/replies/${replyId}/upvote`);
    return response.data;
  },
  downvoteReply: async (threadId, replyId) => {
    const response = await api.post(`/threads/${threadId}/replies/${replyId}/downvote`);
    return response.data;
  }
};
