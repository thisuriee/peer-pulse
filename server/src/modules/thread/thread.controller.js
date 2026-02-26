"use strict";

const { asyncHandler } = require("../../middlewares/helpers/async-handler.middleware");
const { HTTPSTATUS } = require("../../config/http.config");
const {
  createThreadSchema,
  updateThreadSchema,
  createReplySchema,
  threadQuerySchema,
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
}

module.exports = { ThreadController };