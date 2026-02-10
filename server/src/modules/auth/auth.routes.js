"use strict";

const { Router } = require("express");
const { authController } = require("./auth.module");
const { authenticateJWT } = require("../../common/middleware/auth.middleware");
const { authRateLimiter } = require("../../middlewares/core/rate-limit.middleware");

const authRoutes = Router();

// Public routes (with rate limiting for security)
authRoutes.post("/register", authRateLimiter, authController.register);
authRoutes.post("/login", authRateLimiter, authController.login);
authRoutes.post("/verify/email", authController.verifyEmail);
authRoutes.post("/password/forgot", authRateLimiter, authController.forgotPassword);
authRoutes.post("/password/reset", authController.resetPassword);

// Refresh token route
authRoutes.get("/refresh", authController.refreshToken);

// Protected routes (require authentication)
authRoutes.post("/logout", authenticateJWT, authController.logout);
authRoutes.get("/me", authenticateJWT, authController.getCurrentUser);

module.exports = authRoutes;
