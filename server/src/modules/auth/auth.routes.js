"use strict";

const { Router } = require("express");
const passport = require("passport");
const { authController } = require("./auth.module");
const { authenticateJWT } = require("../../common/middleware/auth.middleware");
const { authRateLimiter } = require("../../middlewares/core/rate-limit.middleware");
const SessionModel = require("../../database/models/authSession.model");
const { asyncHandler } = require("../../middlewares/helpers/async-handler.middleware");
const { HTTPSTATUS } = require("../../config/http.config");

const authRoutes = Router();

// Public routes (with rate limiting for security)
authRoutes.post("/register", authRateLimiter, authController.register);
authRoutes.post("/login", authRateLimiter, authController.login);

// Refresh token route
authRoutes.get("/refresh", authController.refreshToken);

// Protected routes (require authentication)
authRoutes.post("/logout", authenticateJWT, authController.logout);
authRoutes.get("/me", authenticateJWT, authController.getCurrentUser);

// ── Auth Session routes (used by the Sessions page) ───────────────────────────
// GET /api/v1/auth/sessions — list all sessions for the current user
authRoutes.get(
  "/sessions",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const currentSessionId = req.sessionId;

    const sessions = await SessionModel.find({ userId }).sort({ createdAt: -1 }).lean();

    const withCurrent = sessions.map((s) => ({
      ...s,
      isCurrent: String(s._id) === String(currentSessionId),
      // map expiredAt → expiresAt so the client SessionItem component is happy
      expiresAt: s.expiredAt,
    }));

    return res.status(HTTPSTATUS.OK).json({
      message: "Sessions retrieved",
      sessions: withCurrent,
    });
  })
);

// DELETE /api/v1/auth/sessions/:id — revoke a specific session
authRoutes.delete(
  "/sessions/:id",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    await SessionModel.findOneAndDelete({ _id: id, userId });

    return res.status(HTTPSTATUS.OK).json({ message: "Session revoked" });
  })
);

// Google OAuth routes
authRoutes.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

authRoutes.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  authController.googleCallback
);

module.exports = authRoutes;
