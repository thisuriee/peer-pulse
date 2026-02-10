"use strict";

const { Router } = require("express");
const { requireTutor } = require("../../common/guards/role.guard");

const sessionRoutes = Router();

// ============================================
// Component 1: Session Orchestrator (Dahami)
// Booking & Scheduling for Peer-Tutoring
// ============================================

// All routes are protected by authenticateJWT in index.js

// GET /api/v1/sessions - Get all sessions for the current user
sessionRoutes.get("/", (req, res) => {
  res.json({ message: "Get all sessions - TODO: Implement" });
});

// GET /api/v1/sessions/:id - Get session by ID
sessionRoutes.get("/:id", (req, res) => {
  res.json({ message: "Get session by ID - TODO: Implement" });
});

// POST /api/v1/sessions - Create a new session request
sessionRoutes.post("/", (req, res) => {
  res.json({ message: "Create session - TODO: Implement" });
});

// PUT /api/v1/sessions/:id/accept - Accept a session (Tutor only)
sessionRoutes.put("/:id/accept", requireTutor, (req, res) => {
  res.json({ message: "Accept session - TODO: Implement" });
});

// PUT /api/v1/sessions/:id/decline - Decline a session (Tutor only)
sessionRoutes.put("/:id/decline", requireTutor, (req, res) => {
  res.json({ message: "Decline session - TODO: Implement" });
});

// PUT /api/v1/sessions/:id/complete - Mark session as completed
sessionRoutes.put("/:id/complete", (req, res) => {
  res.json({ message: "Complete session - TODO: Implement" });
});

// DELETE /api/v1/sessions/:id - Cancel a session
sessionRoutes.delete("/:id", (req, res) => {
  res.json({ message: "Cancel session - TODO: Implement" });
});

module.exports = sessionRoutes;
