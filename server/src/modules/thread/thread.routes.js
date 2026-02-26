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

// POST /api/v1/threads/:id/replies - Add a reply (authenticated)
threadRoutes.post("/:id/replies", authenticateJWT, threadController.addReply);

// PATCH /api/v1/threads/:threadId/replies/:replyId/accept - Mark best answer (author only)
threadRoutes.patch(
  "/:threadId/replies/:replyId/accept",
  authenticateJWT,
  threadController.acceptBestAnswer
);

module.exports = threadRoutes;