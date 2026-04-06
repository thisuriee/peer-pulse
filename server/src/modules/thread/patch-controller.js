const fs = require('fs');
let code = fs.readFileSync('thread.controller.js', 'utf8');

const injectionCode =
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
  ;

code = code.replace('  addComment =', injectionCode + '\\n  addComment =');
fs.writeFileSync('thread.controller.js', code);
