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
  const { title, content, subject, assignedTutor } = threadData;

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
    assignedTutor: assignedTutor || null,
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
    const { page = 1, limit = 10, subject, search, sort = "latest", assignedTutor } = filters;

    const query = { isDeleted: false };

    if (subject) {
      query.subject = subject;
    }
    
    if (assignedTutor !== undefined) {
      if (assignedTutor === 'unassigned') {
        query.assignedTutor = null;
      } else {
        query.assignedTutor = assignedTutor;
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    let threads = [];
    let total = 0;

    if (sort === "mostUpvoted") {
      // Use aggregation for sorting by array length
      const pipeline = [
        { $match: query },
        { $addFields: { upvoteCount: { $size: { $ifNull: ["$upvotes", []] } } } },
        { $sort: { upvoteCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ];

      const [aggResults, countResult] = await Promise.all([
        ThreadModel.aggregate(pipeline),
        ThreadModel.countDocuments(query)
      ]);
      
      threads = await ThreadModel.populate(aggResults, [
        { path: "authorId", select: "name email role" },
        { path: "assignedTutor", select: "name email" }
      ]);
      total = countResult;
    } else {
      // Default latest
      const sortOption = { createdAt: -1 };
      const [findResults, countResult] = await Promise.all([
        ThreadModel.find(query)
          .populate("authorId", "name email role")
          .populate("assignedTutor", "name email")
          .sort(sortOption)
          .skip(skip)
          .limit(limit)
          .lean(),
        ThreadModel.countDocuments(query),
      ]);
      threads = findResults;
      total = countResult;
    }

    return {
      threads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
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

    const threadObj = thread.toObject();

    if (threadObj.replies) {
      threadObj.replies = threadObj.replies.filter(r => !r.isDeleted);
    }
    if (threadObj.comments) {
      threadObj.comments = threadObj.comments.filter(c => !c.isDeleted);
    }

    return threadObj;
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
      if (titleFlagged) throw new BadRequestException("Your content violates community guidelines. Please revise and try again.");
      thread.title = updateData.title;
    }

    if (updateData.content) {
      const contentFlagged = await ProfanityFilter.shouldFlag(updateData.content);
      if (contentFlagged) throw new BadRequestException("Your content violates community guidelines. Please revise and try again.");
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
    if (flaggedForReview) throw new BadRequestException("This is violating the community guideline and disable the post.");

    const reply = {
      userId,
      text: replyData.text,
      isBestAnswer: false,
      flaggedForReview: false,
      upvotes: [],
      downvotes: []
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
   * Update reply
   */
  async updateReply(threadId, replyId, userId, updateData) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const reply = thread.replies.id(replyId);

    if (!reply || reply.isDeleted) {
      throw new NotFoundException('Reply not found');
    }

    // Check ownership
    if (reply.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('Only the reply author can update this reply');
    }

    // Check for profanity
    const flaggedForReview = await ProfanityFilter.shouldFlag(updateData.text);
    if (flaggedForReview) throw new BadRequestException("This is violating the community guideline and disable the post.");

    reply.text = updateData.text;
    reply.flaggedForReview = false;

    await thread.save();

    logger.info('Reply updated', { threadId, replyId, userId });

    return await thread.populate([
      { path: 'authorId', select: 'name email role' },
      { path: 'replies.userId', select: 'name email role' },
    ]);
  }

  /**
   * Delete reply (soft delete)
   */
  async deleteReply(threadId, replyId, userId, userRole) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const reply = thread.replies.id(replyId);

    if (!reply || reply.isDeleted) {
      throw new NotFoundException('Reply not found');
    }

    // Check if user is author or admin
    const isAuthor = reply.userId.toString() === userId.toString();
    const isAdmin = userRole === 'admin';

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        'Only the reply author or admin can delete this reply'
      );
    }

    reply.isDeleted = true;
    await thread.save();

    logger.info('Reply deleted', { threadId, replyId, userId, userRole });

    return { message: 'Reply deleted successfully' };
  }

  /**
   * Toggle upvote on reply
   */
  async toggleReplyUpvote(threadId, replyId, userId) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const reply = thread.replies.id(replyId);

    if (!reply || reply.isDeleted) {
      throw new NotFoundException('Reply not found');
    }

    // Remove from downvotes if exists
    if (!reply.downvotes) reply.downvotes = [];
    if (!reply.downvotes) reply.downvotes = [];
    const downvoteIndex = reply.downvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );
    if (downvoteIndex > -1) {
      reply.downvotes.splice(downvoteIndex, 1);
    }

    if (!reply.upvotes) reply.upvotes = [];
    if (!reply.upvotes) reply.upvotes = [];
    const upvoteIndex = reply.upvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );

    if (upvoteIndex > -1) {
      // Remove upvote
      reply.upvotes.splice(upvoteIndex, 1);
      logger.info('Reply upvote removed', { threadId, replyId, userId });
    } else {
      // Add upvote
      reply.upvotes.push(userId);
      logger.info('Reply upvoted', { threadId, replyId, userId });
    }

    await thread.save();

    return {
      success: true,
      message: upvoteIndex > -1 ? 'Reply upvote removed' : 'Reply upvoted',
      data: {
        upvoted: upvoteIndex === -1,
        downvoted: false,
        upvoteCount: reply.upvotes.length,
        downvoteCount: reply.downvotes.length,
      }
    };
  }

  /**
   * Toggle downvote on reply
   */
  async toggleReplyDownvote(threadId, replyId, userId) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const reply = thread.replies.id(replyId);

    if (!reply || reply.isDeleted) {
      throw new NotFoundException('Reply not found');
    }

    // Remove from upvotes if exists
    if (!reply.upvotes) reply.upvotes = [];
    if (!reply.upvotes) reply.upvotes = [];
    const upvoteIndex = reply.upvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );
    if (upvoteIndex > -1) {
      reply.upvotes.splice(upvoteIndex, 1);
    }

    if (!reply.downvotes) reply.downvotes = [];
    if (!reply.downvotes) reply.downvotes = [];
    const downvoteIndex = reply.downvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );

    if (downvoteIndex > -1) {
      // Remove downvote
      reply.downvotes.splice(downvoteIndex, 1);
      logger.info('Reply downvote removed', { threadId, replyId, userId });
    } else {
      // Add downvote
      reply.downvotes.push(userId);
      logger.info('Reply downvoted', { threadId, replyId, userId });
    }

    await thread.save();

    return {
      success: true,
      message: downvoteIndex > -1 ? 'Reply downvote removed' : 'Reply downvoted',
      data: {
        upvoted: false,
        downvoted: downvoteIndex === -1,
        upvoteCount: reply.upvotes.length,
        downvoteCount: reply.downvotes.length,
      }
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
    if (flaggedForReview) throw new BadRequestException("Your content violates community guidelines. Please revise and try again.");

    const comment = {
      userId,
      content: commentData.content,
      parentComment: commentData.parentComment || null,
      upvotes: [],
      downvotes: [],
      flaggedForReview: false,
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
    if (flaggedForReview) throw new BadRequestException("Your content violates community guidelines. Please revise and try again.");

    comment.content = updateData.content;
    comment.flaggedForReview = false;

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