"use strict";

const { Router } = require("express");
const {
  authenticateJWT,
  optionalAuth,
} = require("../../common/middleware/auth.middleware");
const { threadController } = require("./thread.module");

const threadRoutes = Router();

// ============================================
// Component 4: Study-Hub (Thisuri)
// Community & Discussion
// ============================================

// GET /api/v1/threads - Get all threads (public, optional auth)
threadRoutes.get("/", optionalAuth, threadController.getThreads);

// GET /api/v1/threads/:id - Get thread by ID (public, optional auth)
threadRoutes.get("/:id", optionalAuth, threadController.getThreadById);

// POST /api/v1/threads - Create a new thread (authenticated)
threadRoutes.post("/", authenticateJWT, threadController.createThread);

// PUT /api/v1/threads/:id - Update thread (authenticated, author only)
threadRoutes.put("/:id", authenticateJWT, threadController.updateThread);

// DELETE /api/v1/threads/:id - Delete thread (author/admin only)
threadRoutes.delete("/:id", authenticateJWT, threadController.deleteThread);

// PATCH /api/v1/threads/:id/upvote - Toggle upvote (authenticated)
threadRoutes.patch("/:id/upvote", authenticateJWT, threadController.toggleUpvote);

// POST /api/v1/threads/:id/downvote - Toggle downvote (authenticated)
threadRoutes.post("/:id/downvote", authenticateJWT, threadController.toggleDownvote);

// POST /api/v1/threads/:id/replies - Add a reply (authenticated)
threadRoutes.post("/:id/replies", authenticateJWT, threadController.addReply);

// PATCH /api/v1/threads/:threadId/replies/:replyId/accept - Mark best answer (author only)
threadRoutes.patch(
  "/:threadId/replies/:replyId/accept",
  authenticateJWT,
  threadController.acceptBestAnswer
);

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

// ============================================
// Comment Routes
// ============================================

// GET /api/v1/threads/:id/comments - Get comments for a thread
threadRoutes.get("/:id/comments", optionalAuth, threadController.getComments);

// POST /api/v1/threads/:id/comments - Add a comment (authenticated)
threadRoutes.post("/:id/comments", authenticateJWT, threadController.addComment);

// PUT /api/v1/threads/:threadId/comments/:commentId - Update a comment (authenticated)
threadRoutes.put(
  "/:threadId/comments/:commentId",
  authenticateJWT,
  threadController.updateComment
);

// DELETE /api/v1/threads/:threadId/comments/:commentId - Delete a comment (authenticated)
threadRoutes.delete(
  "/:threadId/comments/:commentId",
  authenticateJWT,
  threadController.deleteComment
);

// POST /api/v1/threads/:threadId/comments/:commentId/upvote - Upvote a comment (authenticated)
threadRoutes.post(
  "/:threadId/comments/:commentId/upvote",
  authenticateJWT,
  threadController.upvoteComment
);

// POST /api/v1/threads/:threadId/comments/:commentId/downvote - Downvote a comment (authenticated)
threadRoutes.post(
  "/:threadId/comments/:commentId/downvote",
  authenticateJWT,
  threadController.downvoteComment
);

module.exports = threadRoutes;