"use strict";

const { asyncHandler } = require("../../middlewares/helpers/async-handler.middleware");
const { HTTPSTATUS } = require("../../config/http.config");
const {
  createThreadSchema,
  updateThreadSchema,
  createReplySchema,
  threadQuerySchema,
  createCommentSchema,
  updateCommentSchema,
  commentQuerySchema,
} = require("../../common/validators/thread.validator");

class ThreadController {
  constructor(threadService) {
    this.threadService = threadService;
  }

  /**
   * Create a new thread
   * POST /api/v1/threads
   */
  createThread = asyncHandler(async (req, res) => {
    const authorId = req.user.id;
    const body = createThreadSchema.parse(req.body);

    const thread = await this.threadService.createThread(authorId, body);

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: "Thread created successfully",
      data: thread,
    });
  });

  /**
   * Get all threads with pagination
   * GET /api/v1/threads
   */
  getThreads = asyncHandler(async (req, res) => {
    const filters = threadQuerySchema.parse(req.query);

    const result = await this.threadService.getThreads(filters);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Threads retrieved successfully",
      data: result.threads,
      pagination: result.pagination,
    });
  });

  /**
   * Get thread by ID
   * GET /api/v1/threads/:id
   */
  getThreadById = asyncHandler(async (req, res) => {
    const threadId = req.params.id;

    const thread = await this.threadService.getThreadById(threadId);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Thread retrieved successfully",
      data: thread,
    });
  });

  /**
   * Update thread
   * PUT /api/v1/threads/:id
   */
  updateThread = asyncHandler(async (req, res) => {
    const threadId = req.params.id;
    const userId = req.user.id;
    const body = updateThreadSchema.parse(req.body);

    const thread = await this.threadService.updateThread(threadId, userId, body);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Thread updated successfully",
      data: thread,
    });
  });

  /**
   * Delete thread
   * DELETE /api/v1/threads/:id
   */
  deleteThread = asyncHandler(async (req, res) => {
    const threadId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await this.threadService.deleteThread(threadId, userId, userRole);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Toggle upvote on thread
   * PATCH /api/v1/threads/:id/upvote
   */
  toggleUpvote = asyncHandler(async (req, res) => {
    const threadId = req.params.id;
    const userId = req.user.id;

    const result = await this.threadService.toggleUpvote(threadId, userId);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: result.upvoted ? "Thread upvoted" : "Upvote removed",
      data: result,
    });
  });

  /**
   * Toggle downvote on thread
   * POST /api/v1/threads/:id/downvote
   */
  toggleDownvote = asyncHandler(async (req, res) => {
    const threadId = req.params.id;
    const userId = req.user.id;

    const result = await this.threadService.toggleDownvote(threadId, userId);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: result.downvoted ? "Thread downvoted" : "Downvote removed",
      data: result,
    });
  });

  /**
   * Add reply to thread
   * POST /api/v1/threads/:id/replies
   */
  addReply = asyncHandler(async (req, res) => {
    const threadId = req.params.id;
    const userId = req.user.id;
    const body = createReplySchema.parse(req.body);

    const thread = await this.threadService.addReply(threadId, userId, body);

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: "Reply added successfully",
      data: thread,
    });
  });

  /**
   * Accept best answer
   * PATCH /api/v1/threads/:threadId/replies/:replyId/accept
   */
  acceptBestAnswer = asyncHandler(async (req, res) => {
    const { threadId, replyId } = req.params;
    const userId = req.user.id;

    const thread = await this.threadService.acceptBestAnswer(
      threadId,
      replyId,
      userId
    );

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Best answer accepted",
      data: thread,
    });
  });

  // ============================================
  // Comment Handlers
  // ============================================

  /**
   * Get comments for a thread
   * GET /api/v1/threads/:id/comments
   */
  getComments = asyncHandler(async (req, res) => {
    const threadId = req.params.id;
    const filters = commentQuerySchema.parse(req.query);

    const result = await this.threadService.getComments(threadId, filters);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Comments retrieved successfully",
      data: result.comments,
      pagination: result.pagination,
    });
  });

  /**
   * Add a comment to a thread
   * POST /api/v1/threads/:id/comments
   */
  updateReply = asyncHandler(async (req, res) => {
    const threadId = req.params.id;
    const replyId = req.params.replyId;
    const userId = req.user.id;

    const thread = await this.threadService.updateReply(
      threadId,
      replyId,
      userId,
      req.body
    );

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Reply updated successfully",
      data: thread,
    });
  });

  deleteReply = asyncHandler(async (req, res) => {
    const threadId = req.params.id;
    const replyId = req.params.replyId;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await this.threadService.deleteReply(
      threadId,
      replyId,
      userId,
      userRole
    );

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: result.message,
    });
  });

  upvoteReply = asyncHandler(async (req, res) => {
    const threadId = req.params.id;
    const replyId = req.params.replyId;
    const userId = req.user.id;

    const result = await this.threadService.toggleReplyUpvote(
      threadId,
      replyId,
      userId
    );

    return res.status(HTTPSTATUS.OK).json(result);
  });

  downvoteReply = asyncHandler(async (req, res) => {
    const threadId = req.params.id;
    const replyId = req.params.replyId;
    const userId = req.user.id;

    const result = await this.threadService.toggleReplyDownvote(
      threadId,
      replyId,
      userId
    );

    return res.status(HTTPSTATUS.OK).json(result);
  });

  addComment = asyncHandler(async (req, res) => {
    const threadId = req.params.id;
    const userId = req.user.id;
    const body = createCommentSchema.parse(req.body);

    const comment = await this.threadService.addComment(threadId, userId, body);

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  });

  /**
   * Update a comment
   * PUT /api/v1/threads/:threadId/comments/:commentId
   */
  updateComment = asyncHandler(async (req, res) => {
    const { threadId, commentId } = req.params;
    const userId = req.user.id;
    const body = updateCommentSchema.parse(req.body);

    const comment = await this.threadService.updateComment(
      threadId,
      commentId,
      userId,
      body
    );

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Comment updated successfully",
      data: comment,
    });
  });

  /**
   * Delete a comment
   * DELETE /api/v1/threads/:threadId/comments/:commentId
   */
  deleteComment = asyncHandler(async (req, res) => {
    const { threadId, commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await this.threadService.deleteComment(
      threadId,
      commentId,
      userId,
      userRole
    );

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Upvote a comment
   * POST /api/v1/threads/:threadId/comments/:commentId/upvote
   */
  upvoteComment = asyncHandler(async (req, res) => {
    const { threadId, commentId } = req.params;
    const userId = req.user.id;

    const result = await this.threadService.toggleCommentUpvote(
      threadId,
      commentId,
      userId
    );

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: result.upvoted ? "Comment upvoted" : "Upvote removed",
      data: result,
    });
  });

  /**
   * Downvote a comment
   * POST /api/v1/threads/:threadId/comments/:commentId/downvote
   */
  downvoteComment = asyncHandler(async (req, res) => {
    const { threadId, commentId } = req.params;
    const userId = req.user.id;

    const result = await this.threadService.toggleCommentDownvote(
      threadId,
      commentId,
      userId
    );

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: result.downvoted ? "Comment downvoted" : "Downvote removed",
      data: result,
    });
  });
}

module.exports = { ThreadController };