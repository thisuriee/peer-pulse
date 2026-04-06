const fs = require('fs');
let code = fs.readFileSync('thread.service.js', 'utf8');

const injectionCode = `
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

    reply.text = updateData.text;
    reply.flaggedForReview = flaggedForReview;

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
    const downvoteIndex = reply.downvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );
    if (downvoteIndex > -1) {
      reply.downvotes.splice(downvoteIndex, 1);
    }

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
    const upvoteIndex = reply.upvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );
    if (upvoteIndex > -1) {
      reply.upvotes.splice(upvoteIndex, 1);
    }

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
`;

code = code.replace('  async addComment', injectionCode + '\\n  async addComment');
fs.writeFileSync('thread.service.js', code);

code = code.replace('  async addComment', injectionCode + '\\n  async addComment');
fs.writeFileSync('thread.service.js', code);
