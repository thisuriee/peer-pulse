"use strict";

const { Router } = require("express");
const { authenticateJWT, optionalAuth } = require("../../common/middleware/auth.middleware");

const threadRoutes = Router();

// ============================================
// Component 4: Study-Hub (Thisuri)
// Community & Discussion
// ============================================

// GET /api/v1/threads - Get all threads (public)
threadRoutes.get("/", optionalAuth, (req, res) => {
  res.json({ message: "Get all threads - TODO: Implement" });
});

// GET /api/v1/threads/:id - Get thread by ID
threadRoutes.get("/:id", optionalAuth, (req, res) => {
  res.json({ message: "Get thread by ID - TODO: Implement" });
});

// POST /api/v1/threads - Create a new thread (authenticated)
threadRoutes.post("/", authenticateJWT, (req, res) => {
  res.json({ message: "Create thread - TODO: Implement" });
});

// POST /api/v1/threads/:id/replies - Add a reply to a thread (authenticated)
threadRoutes.post("/:id/replies", authenticateJWT, (req, res) => {
  res.json({ message: "Add reply - TODO: Implement" });
});

// PUT /api/v1/threads/:id/resolve - Mark thread as resolved (author only)
threadRoutes.put("/:id/resolve", authenticateJWT, (req, res) => {
  res.json({ message: "Resolve thread - TODO: Implement" });
});

// PUT /api/v1/threads/:id/replies/:replyId/best - Mark reply as best answer (author only)
threadRoutes.put("/:id/replies/:replyId/best", authenticateJWT, (req, res) => {
  res.json({ message: "Mark best answer - TODO: Implement" });
});

// POST /api/v1/threads/:id/upvote - Upvote a thread (authenticated)
threadRoutes.post("/:id/upvote", authenticateJWT, (req, res) => {
  res.json({ message: "Upvote thread - TODO: Implement" });
});

// DELETE /api/v1/threads/:id - Delete thread (author/admin only)
threadRoutes.delete("/:id", authenticateJWT, (req, res) => {
  res.json({ message: "Delete thread - TODO: Implement" });
});

module.exports = threadRoutes;
