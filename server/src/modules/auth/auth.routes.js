"use strict";

const { Router } = require("express");
const passport = require("passport");
const { authController } = require("./auth.module");
const { authenticateJWT } = require("../../common/middleware/auth.middleware");
const { authRateLimiter } = require("../../middlewares/core/rate-limit.middleware");

const authRoutes = Router();

// Public routes (with rate limiting for security)
authRoutes.post("/register", authRateLimiter, authController.register);
authRoutes.post("/login", authRateLimiter, authController.login);

// Refresh token route
authRoutes.get("/refresh", authController.refreshToken);

// Protected routes (require authentication)
authRoutes.post("/logout", authenticateJWT, authController.logout);
authRoutes.get("/me", authenticateJWT, authController.getCurrentUser);

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
