"use strict";

const { verifyJwtToken } = require("../utils/token-utils");
const { UnauthorizedException } = require("../utils/errors-utils");
const { ErrorCode } = require("../enums/error-code.enum");
const SessionModel = require("../../database/models/authSession.model");

/**
 * Middleware to authenticate JWT tokens from cookies
 * Attaches user info to req.user and session ID to req.sessionId
 */
const authenticateJWT = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      throw new UnauthorizedException(
        "Access token is missing",
        ErrorCode.AUTH_TOKEN_NOT_FOUND
      );
    }

    const { payload, error } = verifyJwtToken(accessToken);

    if (error || !payload) {
      throw new UnauthorizedException(
        "Invalid or expired token",
        ErrorCode.AUTH_INVALID_TOKEN
      );
    }

    const session = await SessionModel.findById(payload.sessionId);

    if (!session) {
      throw new UnauthorizedException(
        "Session not found",
        ErrorCode.AUTH_INVALID_TOKEN
      );
    }

    if (session.expiredAt < new Date()) {
      throw new UnauthorizedException(
        "Session expired",
        ErrorCode.AUTH_INVALID_TOKEN
      );
    }

    req.user = { id: payload.userId };
    req.sessionId = payload.sessionId;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Doesn't throw if no token is present, but attaches user info if token is valid
 */
const optionalAuth = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (accessToken) {
      const { payload } = verifyJwtToken(accessToken);
      if (payload) {
        const session = await SessionModel.findById(payload.sessionId);
        if (session && session.expiredAt > new Date()) {
          req.user = { id: payload.userId };
          req.sessionId = payload.sessionId;
        }
      }
    }
    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

module.exports = { authenticateJWT, optionalAuth };
