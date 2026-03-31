import API from "./axios-client";

// ============================================================
// Study-Hub Thread API Service
// ============================================================

/**
 * Get paginated threads with optional filtering & sorting
 * @param {{ page?: number, limit?: number, subject?: string, sort?: 'latest' | 'mostUpvoted' }} params
 */
export const getThreadsQueryFn = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page);
  if (params.limit) query.set("limit", params.limit);
  if (params.subject) query.set("subject", params.subject);
  if (params.sort) query.set("sort", params.sort);

  const response = await API.get(`/threads?${query.toString()}`);
  return response.data;
};

/**
 * Get a single thread by ID (includes replies)
 * @param {string} id
 */
export const getThreadByIdQueryFn = async (id) => {
  const response = await API.get(`/threads/${id}`);
  return response.data;
};

/**
 * Create a new thread
 * @param {{ title: string, content: string, subject: string }} data
 */
export const createThreadMutationFn = async (data) => {
  const response = await API.post("/threads", data);
  return response.data;
};

/**
 * Update an existing thread (author only)
 * @param {{ id: string, title?: string, content?: string, subject?: string }} data
 */
export const updateThreadMutationFn = async ({ id, ...data }) => {
  const response = await API.put(`/threads/${id}`, data);
  return response.data;
};

/**
 * Soft-delete a thread (author / admin only)
 * @param {string} id
 */
export const deleteThreadMutationFn = async (id) => {
  const response = await API.delete(`/threads/${id}`);
  return response.data;
};

/**
 * Toggle upvote on a thread
 * @param {string} id
 */
export const upvoteThreadMutationFn = async (id) => {
  const response = await API.patch(`/threads/${id}/upvote`);
  return response.data;
};

/**
 * Toggle downvote on a thread
 * @param {string} id
 */
export const downvoteThreadMutationFn = async (id) => {
  const response = await API.post(`/threads/${id}/downvote`);
  return response.data;
};

/**
 * Add a reply to a thread
 * @param {{ threadId: string, text: string }} data
 */
export const addReplyMutationFn = async ({ threadId, text }) => {
  const response = await API.post(`/threads/${threadId}/replies`, { text });
  return response.data;
};

/**
 * Mark a reply as the best answer (thread author only)
 * @param {{ threadId: string, replyId: string }} data
 */
export const acceptReplyMutationFn = async ({ threadId, replyId }) => {
  const response = await API.patch(
    `/threads/${threadId}/replies/${replyId}/accept`
  );
  return response.data;
};

/**
 * Get comments for a thread (paginated)
 * @param {{ threadId: string, page?: number, limit?: number }} params
 */
export const getCommentsQueryFn = async ({ threadId, page = 1, limit = 20 }) => {
  const response = await API.get(
    `/threads/${threadId}/comments?page=${page}&limit=${limit}`
  );
  return response.data;
};

/**
 * Add a comment to a thread
 * @param {{ threadId: string, content: string, parentComment?: string }} data
 */
export const addCommentMutationFn = async ({ threadId, content, parentComment }) => {
  const response = await API.post(`/threads/${threadId}/comments`, {
    content,
    parentComment,
  });
  return response.data;
};

/**
 * Upvote a comment
 * @param {{ threadId: string, commentId: string }} data
 */
export const upvoteCommentMutationFn = async ({ threadId, commentId }) => {
  const response = await API.post(
    `/threads/${threadId}/comments/${commentId}/upvote`
  );
  return response.data;
};
