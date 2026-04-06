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

  // 🔹 Analyze text using Perspective API
  const titleAnalysis = await ProfanityFilter.analyzeText(title);
  const contentAnalysis = await ProfanityFilter.analyzeText(content);

  let flaggedForReview = false;
  let moderation = {};

  if (titleAnalysis || contentAnalysis) {
    const maxToxicity = Math.max(
      titleAnalysis?.toxicity || 0,
      contentAnalysis?.toxicity || 0
    );

    flaggedForReview =
      maxToxicity >= parseFloat(process.env.PERSPECTIVE_TOXICITY_THRESHOLD);

    moderation = {
      toxicityScore: maxToxicity,
    };
  }

  // BLOCK THREAD IF FLAGGED
  if (flaggedForReview) {
    logger.warn("Blocked thread due to toxic content", {
      authorId,
      moderation,
    });

    throw new BadRequestException(
      "Your content violates community guidelines. Please revise and try again."
    );
  }

  // ✅ Only create if safe
  const thread = await ThreadModel.create({
    authorId,
    title,
    content,
    subject,
    flaggedForReview: false,
    moderation,
  });

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
   * Toggle downvote on thread
   */
  async toggleDownvote(threadId, userId) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    // Remove from upvotes if exists (user can't upvote and downvote)
    const upvoteIndex = thread.upvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );
    if (upvoteIndex > -1) {
      thread.upvotes.splice(upvoteIndex, 1);
    }

    const downvoteIndex = thread.downvotes
      ? thread.downvotes.findIndex((id) => id.toString() === userId.toString())
      : -1;

    if (!thread.downvotes) {
      thread.downvotes = [];
    }

    if (downvoteIndex > -1) {
      // Remove downvote
      thread.downvotes.splice(downvoteIndex, 1);
      logger.info("Downvote removed", { threadId, userId });
    } else {
      // Add downvote
      thread.downvotes.push(userId);
      logger.info("Downvote added", { threadId, userId });
    }

    await thread.save();

    return {
      downvoted: downvoteIndex === -1,
      downvoteCount: thread.downvotes.length,
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

  async toggleReplyUpvote(threadId, replyId, userId) {
    const thread = await ThreadModel.findOne({ _id: threadId, isDeleted: false });
    if (!thread) {
      throw new NotFoundException("Thread not found");
    }
    const reply = thread.replies.id(replyId);
    if (!reply) {
      throw new NotFoundException("Reply not found");
    }

    if (!reply.upvotes) {
      reply.upvotes = [];
    }
    if (!reply.downvotes) {
      reply.downvotes = [];
    }

    const hasUpvoted = reply.upvotes.includes(userId);
    if (hasUpvoted) {
      reply.upvotes.pull(userId);
    } else {
      reply.upvotes.push(userId);
      reply.downvotes.pull(userId);
    }
    await thread.save();

    return {
      replyId: reply._id,
      upvoted: !hasUpvoted,
      upvoteCount: reply.upvotes.length,
      downvoteCount: reply.downvotes.length,
    };
  }

  async toggleReplyDownvote(threadId, replyId, userId) {
    const thread = await ThreadModel.findOne({ _id: threadId, isDeleted: false });
    if (!thread) {
      throw new NotFoundException("Thread not found");
    }
    const reply = thread.replies.id(replyId);
    if (!reply) {
      throw new NotFoundException("Reply not found");
    }

    if (!reply.upvotes) {
      reply.upvotes = [];
    }
    if (!reply.downvotes) {
      reply.downvotes = [];
    }

    const hasDownvoted = reply.downvotes.includes(userId);
    if (hasDownvoted) {
      reply.downvotes.pull(userId);
    } else {
      reply.downvotes.push(userId);
      reply.upvotes.pull(userId);
    }
    await thread.save();

    return {
      replyId: reply._id,
      downvoted: !hasDownvoted,
      upvoteCount: reply.upvotes.length,
      downvoteCount: reply.downvotes.length,
    };
  }

  // ============================================
  // Comment Methods
  // ============================================

  /**
   * Get comments for a thread with pagination
   */
  async getComments(threadId, filters = {}) {
    const { page = 1, limit = 20 } = filters;

    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    // Filter out deleted comments
    const allComments = thread.comments.filter((c) => !c.isDeleted);
    const total = allComments.length;

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedComments = allComments.slice(start, end);

    // Populate user info
    await ThreadModel.populate(thread, {
      path: "comments.userId",
      select: "name email role",
    });

    // Get paginated populated comments
    const comments = thread.comments
      .filter((c) => !c.isDeleted)
      .slice(start, end);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add comment to thread
   */
  async addComment(threadId, userId, commentData) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    // Check for profanity
    const flaggedForReview = await ProfanityFilter.shouldFlag(commentData.content);

    const comment = {
      userId,
      content: commentData.content,
      parentComment: commentData.parentComment || null,
      upvotes: [],
      downvotes: [],
      flaggedForReview,
    };

    thread.comments.push(comment);
    await thread.save();

    if (flaggedForReview) {
      logger.warn("Comment flagged for review", { threadId, userId });
    }

    logger.info("Comment added", { threadId, userId });

    // Get the newly added comment
    const newComment = thread.comments[thread.comments.length - 1];

    await ThreadModel.populate(thread, {
      path: "comments.userId",
      select: "name email role",
    });

    return thread.comments.id(newComment._id);
  }

  /**
   * Update comment
   */
  async updateComment(threadId, commentId, userId, updateData) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    const comment = thread.comments.id(commentId);

    if (!comment || comment.isDeleted) {
      throw new NotFoundException("Comment not found");
    }

    // Check ownership
    if (comment.userId.toString() !== userId.toString()) {
      throw new ForbiddenException("Only the comment author can update this comment");
    }

    // Check for profanity
    const flaggedForReview = await ProfanityFilter.shouldFlag(updateData.content);

    comment.content = updateData.content;
    comment.flaggedForReview = flaggedForReview;

    await thread.save();

    logger.info("Comment updated", { threadId, commentId, userId });

    await ThreadModel.populate(thread, {
      path: "comments.userId",
      select: "name email role",
    });

    return thread.comments.id(commentId);
  }

  /**
   * Delete comment (soft delete)
   */
  async deleteComment(threadId, commentId, userId, userRole) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    const comment = thread.comments.id(commentId);

    if (!comment || comment.isDeleted) {
      throw new NotFoundException("Comment not found");
    }

    // Check if user is author or admin
    const isAuthor = comment.userId.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        "Only the comment author or admin can delete this comment"
      );
    }

    comment.isDeleted = true;
    await thread.save();

    logger.info("Comment deleted", { threadId, commentId, userId, userRole });

    return { message: "Comment deleted successfully" };
  }

  /**
   * Toggle upvote on comment
   */
  async toggleCommentUpvote(threadId, commentId, userId) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    const comment = thread.comments.id(commentId);

    if (!comment || comment.isDeleted) {
      throw new NotFoundException("Comment not found");
    }

    // Remove from downvotes if exists
    const downvoteIndex = comment.downvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );
    if (downvoteIndex > -1) {
      comment.downvotes.splice(downvoteIndex, 1);
    }

    const upvoteIndex = comment.upvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );

    if (upvoteIndex > -1) {
      // Remove upvote
      comment.upvotes.splice(upvoteIndex, 1);
      logger.info("Comment upvote removed", { threadId, commentId, userId });
    } else {
      // Add upvote
      comment.upvotes.push(userId);
      logger.info("Comment upvoted", { threadId, commentId, userId });
    }

    await thread.save();

    return {
      upvoted: upvoteIndex === -1,
      upvoteCount: comment.upvotes.length,
      downvoteCount: comment.downvotes.length,
    };
  }

  /**
   * Toggle downvote on comment
   */
  async toggleCommentDownvote(threadId, commentId, userId) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    const comment = thread.comments.id(commentId);

    if (!comment || comment.isDeleted) {
      throw new NotFoundException("Comment not found");
    }

    // Remove from upvotes if exists
    const upvoteIndex = comment.upvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );
    if (upvoteIndex > -1) {
      comment.upvotes.splice(upvoteIndex, 1);
    }

    const downvoteIndex = comment.downvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );

    if (downvoteIndex > -1) {
      // Remove downvote
      comment.downvotes.splice(downvoteIndex, 1);
      logger.info("Comment downvote removed", { threadId, commentId, userId });
    } else {
      // Add downvote
      comment.downvotes.push(userId);
      logger.info("Comment downvoted", { threadId, commentId, userId });
    }

    await thread.save();

    return {
      downvoted: downvoteIndex === -1,
      upvoteCount: comment.upvotes.length,
      downvoteCount: comment.downvotes.length,
    };
  }
}

module.exports = { ThreadService };