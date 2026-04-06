const fs = require('fs');
let code = fs.readFileSync('thread.routes.js', 'utf8');

const injectionCode = 
// PUT /api/v1/threads/:id/replies/:replyId - Update a reply (authenticated)
threadRoutes.put(
  "/:id/replies/:replyId",
  authenticateJWT,
  threadController.updateReply
);

// DELETE /api/v1/threads/:id/replies/:replyId - Delete a reply (authenticated)
threadRoutes.delete(
  "/:id/replies/:replyId",
  authenticateJWT,
  threadController.deleteReply
);

// POST /api/v1/threads/:id/replies/:replyId/upvote - Upvote a reply (authenticated)
threadRoutes.post(
  "/:id/replies/:replyId/upvote",
  authenticateJWT,
  threadController.upvoteReply
);

// POST /api/v1/threads/:id/replies/:replyId/downvote - Downvote a reply (authenticated)
threadRoutes.post(
  "/:id/replies/:replyId/downvote",
  authenticateJWT,
  threadController.downvoteReply
);
;

code = code.replace('// ============================================', injectionCode + '\\n\\n// ============================================');
fs.writeFileSync('thread.routes.js', code);
