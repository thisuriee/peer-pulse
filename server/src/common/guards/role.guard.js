"use strict";

const { ForbiddenException } = require("../utils/errors-utils");
const { ErrorCode } = require("../enums/error-code.enum");
const UserModel = require("../../database/models/user.model");

/**
 * Middleware factory to require specific roles
 * IMPORTANT: Must be used AFTER authenticateJWT middleware
 * @param  {...string} allowedRoles - Roles that are allowed to access the route
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    // Role is already cached by aithenticateJWT
    if (!req.user?.id) {
      throw new ForbiddenException(
        "Authentication required",
        ErrorCode.ACCESS_UNAUTHORIZED
      );
    }

    if (!req.user.role) {
      throw new ForbiddenException(
        "User role not found",
        ErrorCode.ACCESS_FORBIDDEN
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenException(
        "You do not have permission to perform this action",
        ErrorCode.ACCESS_FORBIDDEN
      );
    }
    
    next();

  }
};


/**
 * Require tutor or admin role
 */
const requireTutor = requireRole("tutor", "admin");

/**
 * Require student, tutor, or admin role (any authenticated user)
 */
const requireStudent = requireRole("student", "tutor", "admin");

/**
 * Require admin role only
 */
const requireAdmin = requireRole("admin");

module.exports = {
  requireRole,
  requireTutor,
  requireStudent,
  requireAdmin,
};
