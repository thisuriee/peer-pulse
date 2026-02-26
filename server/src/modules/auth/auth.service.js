"use strict";

/**
 * AuthService - Handles all authentication operations
 * 
 * Methods:
 * - register(data)       - Create new user account
 * - login(data)          - Authenticate user, create session
 * - refreshToken(token)  - Refresh access token
 * - logout(sessionId)    - End user session
 * - getCurrentUser(id)   - Get authenticated user data
 */

const { ErrorCode } = require("../../common/enums/error-code.enum");
const {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} = require("../../common/utils/errors-utils");
const {
  calculateExpirationDate,
  ONE_DAY_IN_MS,
} = require("../../common/utils/date-utils");
const SessionModel = require("../../database/models/authSession.model");
const UserModel = require("../../database/models/user.model");
const { config } = require("../../config/app.config");
const {
  refreshTokenSignOptions,
  signJwtToken,
  verifyJwtToken,
} = require("../../common/utils/token-utils");
const { logger } = require("../../common/utils/logger-utils");

class AuthService {
  /**
   * Register a new user
   */
  async register(registerData) {
    const { name, email, password, role = "student" } = registerData;

    const existingUser = await UserModel.exists({ email });

    if (existingUser) {
      throw new BadRequestException(
        "User already exists with this email",
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS
      );
    }

    const newUser = await UserModel.create({
      name,
      email,
      password,
      role,
    });

    logger.info("New user registered", { userId: newUser._id, email: newUser.email });

    return {
      user: newUser.omitPassword(),
    };
  }

  /**
   * Login user
   */
  async login(loginData) {
    const { email, password, userAgent } = loginData;

    logger.info(`Login attempt for email: ${email}`);
    const user = await UserModel.findOne({ email });

    if (!user) {
      logger.warn(`Login failed: User with email ${email} not found`);
      throw new BadRequestException(
        "Invalid email or password provided",
        ErrorCode.AUTH_USER_NOT_FOUND
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn(`Login failed: Invalid password for email: ${email}`);
      throw new BadRequestException(
        "Invalid email or password provided",
        ErrorCode.AUTH_USER_NOT_FOUND
      );
    }


    logger.info(`Creating session for user ID: ${user._id}`);
    const session = await SessionModel.create({
      userId: user._id,
      userAgent,
    });

    logger.info(`Signing tokens for user ID: ${user._id}`);
    const accessToken = signJwtToken({
      userId: user._id,
      sessionId: session._id,
    });

    const refreshToken = signJwtToken(
      { sessionId: session._id },
      refreshTokenSignOptions
    );

    logger.info(`Login successful for user ID: ${user._id}`);
    return {
      user: user.omitPassword(),
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    const { payload } = verifyJwtToken(refreshToken, {
      secret: refreshTokenSignOptions.secret,
    });

    if (!payload) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const session = await SessionModel.findById(payload.sessionId);
    const now = Date.now();

    if (!session) {
      throw new UnauthorizedException("Session does not exist");
    }

    if (session.expiredAt.getTime() <= now) {
      throw new UnauthorizedException("Session expired");
    }

    const sessionRequireRefresh =
      session.expiredAt.getTime() - now <= ONE_DAY_IN_MS;

    if (sessionRequireRefresh) {
      session.expiredAt = calculateExpirationDate(config.JWT.REFRESH_EXPIRES_IN);
      await session.save();
    }

    const newRefreshToken = sessionRequireRefresh
      ? signJwtToken({ sessionId: session._id }, refreshTokenSignOptions)
      : undefined;

    const accessToken = signJwtToken({
      userId: session.userId,
      sessionId: session._id,
    });

    return {
      accessToken,
      newRefreshToken,
    };
  }

  /**
   * Logout user
   */
  async logout(sessionId) {
    return await SessionModel.findByIdAndDelete(sessionId);
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(userId) {
    const user = await UserModel.findById(userId).select("-password");
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }
}

module.exports = { AuthService };
