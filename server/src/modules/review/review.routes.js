"use strict";

const { Router } = require("express");

const reviewRoutes = Router();

// ============================================
// Component 3: Reputation Engine (Aman)
// Gamification & Reviews
// ============================================

// All routes are protected by authenticateJWT in index.js

// GET /api/v1/reviews - Get all reviews for the current user
reviewRoutes.get("/", (req, res) => {
  res.json({ message: "Get all reviews - TODO: Implement" });
});

// GET /api/v1/reviews/tutor/:tutorId - Get reviews for a specific tutor
reviewRoutes.get("/tutor/:tutorId", (req, res) => {
  res.json({ message: "Get reviews for tutor - TODO: Implement" });
});

// GET /api/v1/reviews/:id - Get review by ID
reviewRoutes.get("/:id", (req, res) => {
  res.json({ message: "Get review by ID - TODO: Implement" });
});

// POST /api/v1/reviews - Submit a new review
reviewRoutes.post("/", (req, res) => {
  res.json({ message: "Submit review - TODO: Implement" });
});

// PUT /api/v1/reviews/:id - Edit a review (reviewer only)
reviewRoutes.put("/:id", (req, res) => {
  res.json({ message: "Edit review - TODO: Implement" });
});

// DELETE /api/v1/reviews/:id - Delete a review (admin/moderator only)
reviewRoutes.delete("/:id", (req, res) => {
  res.json({ message: "Delete review - TODO: Implement" });
});

module.exports = reviewRoutes;
