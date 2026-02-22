"use strict";

const { ThreadModel } = require("../../database/models/thread.model");
const UserModel = require("../../database/models/user.model");
const {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} = require("../../common/utils/errors-utils");
const { ErrorCode } = require("../../common/enums/error-code.enum");
const { logger } = require("../../common/utils/logger-utils");
const { ProfanityFilter } = require("../../common/utils/profanity-filter.utils");

class ThreadService {
  /**
   * Create a new thread
   */
  async createThread(authorId, threadData) {
    const { title, content, subject } = threadData;

    // Check for profanity
    const titleFlagged = await ProfanityFilter.shouldFlag(title);
    const contentFlagged = await ProfanityFilter.shouldFlag(content);
    const flaggedForReview = titleFlagged || contentFlagged;

    const thread = await ThreadModel.create({
      authorId,
      title,
      content,
      subject,
      flaggedForReview,
    });

    if (flaggedForReview) {
      logger.warn("Thread flagged for review", {
        threadId: thread._id,
        authorId,
      });
    }

    logger.info("Thread created", { threadId: thread._id, authorId });

    return await thread.populate("authorId", "name email role");
  }

  /**
   * Get threads with pagination and filtering
   */
  async getThreads(filters = {}) {
    const { page = 1, limit = 10, subject, sort = "latest" } = filters;

    const query = { isDeleted: false };

    if (subject) {
      query.subject = subject;
    }

    const skip = (page - 1) * limit;

    // Determine sort order
    let sortOption = {};
    if (sort === "mostUpvoted") {
      // Sort by number of upvotes (requires aggregation or virtual)
      // For simplicity, we'll use a workaround
      sortOption = { createdAt: -1 }; // Fallback to latest
    } else {
      sortOption = { createdAt: -1 };
    }

    const [threads, total] = await Promise.all([
      ThreadModel.find(query)
        .populate("authorId", "name email role")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      ThreadModel.countDocuments(query),
    ]);

    // If sorting by upvotes, do it in memory
    if (sort === "mostUpvoted") {
      threads.sort((a, b) => b.upvotes.length - a.upvotes.length);
    }

    return {
      threads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get thread by ID
   */
  async getThreadById(threadId) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    })
      .populate("authorId", "name email role")
      .populate("replies.userId", "name email role");

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    return thread;
  }

  /**
   * Update thread
   */
  async updateThread(threadId, userId, updateData) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    // Check ownership
    if (thread.authorId.toString() !== userId.toString()) {
      throw new ForbiddenException("Only the thread author can update this thread");
    }

    // Check for profanity if content is being updated
    let flaggedForReview = thread.flaggedForReview;

    if (updateData.title) {
      const titleFlagged = await ProfanityFilter.shouldFlag(updateData.title);
      if (titleFlagged) flaggedForReview = true;
      thread.title = updateData.title;
    }

    if (updateData.content) {
      const contentFlagged = await ProfanityFilter.shouldFlag(updateData.content);
      if (contentFlagged) flaggedForReview = true;
      thread.content = updateData.content;
    }

    if (updateData.subject !== undefined) {
      thread.subject = updateData.subject;
    }

    thread.flaggedForReview = flaggedForReview;
    await thread.save();

    logger.info("Thread updated", { threadId, userId });

    return await thread.populate("authorId", "name email role");
  }

  /**
   * Delete thread (soft delete)
   */
  async deleteThread(threadId, userId, userRole) {
    const thread = await ThreadModel.findById(threadId);

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    // Check if user is author or admin
    const isAuthor = thread.authorId.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        "Only the thread author or admin can delete this thread"
      );
    }

    thread.isDeleted = true;
    await thread.save();

    logger.info("Thread deleted", { threadId, userId, userRole });

    return { message: "Thread deleted successfully" };
  }

  /**
   * Toggle upvote on thread
   */
  async toggleUpvote(threadId, userId) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    const upvoteIndex = thread.upvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );

    if (upvoteIndex > -1) {
      // Remove upvote
      thread.upvotes.splice(upvoteIndex, 1);
      logger.info("Upvote removed", { threadId, userId });
    } else {
      // Add upvote
      thread.upvotes.push(userId);
      logger.info("Upvote added", { threadId, userId });
    }

    await thread.save();

    return {
      upvoted: upvoteIndex === -1,
      upvoteCount: thread.upvotes.length,
    };
  }

  /**
   * Add reply to thread
   */
  async addReply(threadId, userId, replyData) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    // Check for profanity
    const flaggedForReview = await ProfanityFilter.shouldFlag(replyData.text);

    const reply = {
      userId,
      text: replyData.text,
      isBestAnswer: false,
      flaggedForReview,
    };

    thread.replies.push(reply);
    await thread.save();

    if (flaggedForReview) {
      logger.warn("Reply flagged for review", { threadId, userId });
    }

    logger.info("Reply added", { threadId, userId });

    return await thread.populate([
      { path: "authorId", select: "name email role" },
      { path: "replies.userId", select: "name email role" },
    ]);
  }

  /**
   * Mark reply as best answer
   */
  async acceptBestAnswer(threadId, replyId, userId) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    // Check if user is thread author
    if (thread.authorId.toString() !== userId.toString()) {
      throw new ForbiddenException("Only the thread author can accept a best answer");
    }

    // Find the reply
    const reply = thread.replies.id(replyId);

    if (!reply) {
      throw new NotFoundException("Reply not found");
    }

    // Remove best answer from all other replies
    thread.replies.forEach((r) => {
      r.isBestAnswer = false;
    });

    // Set this reply as best answer
    reply.isBestAnswer = true;
    thread.isResolved = true;

    await thread.save();

    logger.info("Best answer accepted", { threadId, replyId, userId });

    return await thread.populate([
      { path: "authorId", select: "name email role" },
      { path: "replies.userId", select: "name email role" },
    ]);
  }
}

module.exports = { ThreadService };