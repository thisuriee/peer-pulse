const fs = require('fs');
let code = fs.readFileSync('thread.service.js', 'utf8');

const getThreadByIdPatch = \sync getThreadById(threadId) {
    const thread = await ThreadModel.findOne({
      _id: threadId,
      isDeleted: false,
    })
      .populate("authorId", "name email role avatar")
      .populate("replies.userId", "name email role avatar");

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    const threadObj = thread.toObject();
    
    // Filter out deleted replies
    if (threadObj.replies) {
      threadObj.replies = threadObj.replies.filter(r => !r.isDeleted);
    }
    
    return threadObj;
  }\;

code = code.replace(
    /async getThreadById\(threadId\) \{[\s\S]*?return thread;\s*?\}/,
    getThreadByIdPatch
);

fs.writeFileSync('thread.service.js', code);
