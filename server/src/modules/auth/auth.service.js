"use strict";

const { ErrorCode } = require("../../common/enums/error-code.enum");
const { VerificationEnum } = require("../../common/enums/verification-code.enum");
const {
  BadRequestException,
  HttpException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} = require("../../common/utils/errors-utils");
const {
  anHourFromNow,
  calculateExpirationDate,
  fortyFiveMinutesFromNow,
  ONE_DAY_IN_MS,
  threeMinutesAgo,
} = require("../../common/utils/date-utils");
const SessionModel = require("../../database/models/session.model");
const VerificationCodeModel = require("../../database/models/verification.model");
const UserModel = require("../../database/models/user.model");
const { config } = require("../../config/app.config");
const {
  refreshTokenSignOptions,
  signJwtToken,
  verifyJwtToken,
} = require("../../common/utils/token-utils");
const { sendEmail } = require("../../mailers/mailer");
const {
  passwordResetTemplate,
  verifyEmailTemplate,
} = require("../../mailers/templates/template");
const { HTTPSTATUS } = require("../../config/http.config");
const { hashValue } = require("../../common/utils/hash-utils");
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

    const userId = newUser._id;

    // Create email verification code
    const verification = await VerificationCodeModel.create({
      userId,
      type: VerificationEnum.EMAIL_VERIFICATION,
      expiresAt: fortyFiveMinutesFromNow(),
    });

    logger.info("Email verification created", { userId, code: verification.code });

    // Send verification email
    const verificationUrl = `${config.APP_ORIGIN}/confirm-account?code=${verification.code}`;
    const { data, error } = await sendEmail({
      to: newUser.email,
      ...verifyEmailTemplate(verificationUrl),
    });

    if (!data?.id) {
      logger.error("Failed to send verification email", { userId, error });
    } else {
      logger.info("Verification email sent", { userId, email: newUser.email, messageId: data.id });
    }

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

    // Check if user has 2FA enabled
    if (user.userPreferences.enable2FA) {
      logger.info(`2FA required for user ID: ${user._id}`);
      return {
        user: null,
        mfaRequired: true,
        accessToken: "",
        refreshToken: "",
      };
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
   * Verify email address
   */
  async verifyEmail(code) {
    const validCode = await VerificationCodeModel.findOne({
      code: code,
      type: VerificationEnum.EMAIL_VERIFICATION,
      expiresAt: { $gt: new Date() },
    });

    if (!validCode) {
      throw new BadRequestException("Invalid or expired verification code");
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      validCode.userId,
      { isEmailVerified: true },
      { new: true }
    );

    if (!updatedUser) {
      throw new BadRequestException(
        "Unable to verify email address",
        ErrorCode.VALIDATION_ERROR
      );
    }

    await validCode.deleteOne();
    return {
      user: updatedUser.omitPassword(),
    };
  }

  /**
   * Send password reset email
   */
  async forgotPassword(email) {
    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check rate limit: 2 emails per 3 minutes
    const timeAgo = threeMinutesAgo();
    const maxAttempts = 2;

    const count = await VerificationCodeModel.countDocuments({
      userId: user._id,
      type: VerificationEnum.PASSWORD_RESET,
      createdAt: { $gt: timeAgo },
    });

    if (count >= maxAttempts) {
      throw new HttpException(
        "Too many requests, try again later",
        HTTPSTATUS.TOO_MANY_REQUESTS,
        ErrorCode.AUTH_TOO_MANY_ATTEMPTS
      );
    }

    const expiresAt = anHourFromNow();
    const validCode = await VerificationCodeModel.create({
      userId: user._id,
      type: VerificationEnum.PASSWORD_RESET,
      expiresAt,
    });

    const resetLink = `${config.APP_ORIGIN}/reset-password?code=${validCode.code}&exp=${expiresAt.getTime()}`;

    const { data, error } = await sendEmail({
      to: user.email,
      ...passwordResetTemplate(resetLink),
    });

    if (!data?.id) {
      throw new InternalServerException(`${error?.name} ${error?.message}`);
    }

    return {
      url: resetLink,
      emailId: data.id,
    };
  }

  /**
   * Reset password
   */
  async resetPassword({ password, verificationCode }) {
    const validCode = await VerificationCodeModel.findOne({
      code: verificationCode,
      type: VerificationEnum.PASSWORD_RESET,
      expiresAt: { $gt: new Date() },
    });

    if (!validCode) {
      throw new NotFoundException("Invalid or expired verification code");
    }

    const hashedPassword = await hashValue(password);

    const updatedUser = await UserModel.findByIdAndUpdate(validCode.userId, {
      password: hashedPassword,
    });

    if (!updatedUser) {
      throw new BadRequestException("Failed to reset password!");
    }

    await validCode.deleteOne();

    // Invalidate all sessions
    await SessionModel.deleteMany({
      userId: updatedUser._id,
    });

    return {
      user: updatedUser.omitPassword(),
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
