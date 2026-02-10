"use strict";

const { ForbiddenException } = require("../utils/errors-utils");
const { ErrorCode } = require("../enums/error-code.enum");
const UserModel = require("../../database/models/user.model");

/**
 * Middleware factory to require specific roles
 * @param  {...string} allowedRoles - Roles that are allowed to access the route
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        throw new ForbiddenException(
          "Authentication required",
          ErrorCode.ACCESS_UNAUTHORIZED
        );
      }

      const user = await UserModel.findById(req.user.id).select("role");

      if (!user) {
        throw new ForbiddenException(
          "User not found",
          ErrorCode.AUTH_USER_NOT_FOUND
        );
      }

      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenException(
          "You do not have permission to perform this action",
          ErrorCode.ACCESS_FORBIDDEN
        );
      }

      req.user.role = user.role;
      next();
    } catch (error) {
      next(error);
    }
  };
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
