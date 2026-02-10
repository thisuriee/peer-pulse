"use strict";

const { asyncHandler } = require("../../middlewares/helpers/async-handler.middleware");
const { HTTPSTATUS } = require("../../config/http.config");
const {
  loginSchema,
  registerSchema,
} = require("../../common/validators/auth.validator");
const {
  clearAuthenticationCookies,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthenticationCookies,
} = require("../../common/utils/cookie-utils");
const {
  NotFoundException,
  UnauthorizedException,
} = require("../../common/utils/errors-utils");
const SessionModel = require("../../database/models/authSession.model");
const { signJwtToken, refreshTokenSignOptions } = require("../../common/utils/token-utils");
const { config } = require("../../config/app.config");

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  register = asyncHandler(async (req, res) => {
    const body = registerSchema.parse({
      ...req.body,
    });
    const { user } = await this.authService.register(body);
    return res.status(HTTPSTATUS.CREATED).json({
      message: "User registered successfully",
      data: user,
    });
  });

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  login = asyncHandler(async (req, res) => {
    const userAgent = req.headers["user-agent"];
    const body = loginSchema.parse({
      ...req.body,
      userAgent,
    });

    const { user, accessToken, refreshToken, mfaRequired } =
      await this.authService.login(body);

    if (mfaRequired) {
      return res.status(HTTPSTATUS.OK).json({
        message: "Verify MFA authentication",
        mfaRequired,
        user,
      });
    }

    return setAuthenticationCookies({
      res,
      accessToken,
      refreshToken,
    })
      .status(HTTPSTATUS.OK)
      .json({
        message: "User login successfully",
        mfaRequired,
        user,
      });
  });

  /**
   * Refresh access token
   * GET /api/v1/auth/refresh
   */
  refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }

    const { accessToken, newRefreshToken } =
      await this.authService.refreshToken(refreshToken);

    if (newRefreshToken) {
      res.cookie(
        "refreshToken",
        newRefreshToken,
        getRefreshTokenCookieOptions()
      );
    }

    return res
      .status(HTTPSTATUS.OK)
      .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
      .json({
        message: "Refresh access token successfully",
      });
  });

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req, res) => {
    const sessionId = req.sessionId;
    if (!sessionId) {
      throw new NotFoundException("Session is invalid.");
    }
    await this.authService.logout(sessionId);
    return clearAuthenticationCookies(res).status(HTTPSTATUS.OK).json({
      message: "User logout successfully",
    });
  });

  /**
   * Get current user
   * GET /api/v1/auth/me
   */
  getCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const user = await this.authService.getCurrentUser(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "User fetched successfully",
      data: user,
    });
  });

  /**
   * Google OAuth Callback
   * GET /api/v1/auth/google/callback
   */
  googleCallback = asyncHandler(async (req, res) => {
    const user = req.user;
    
    const session = await SessionModel.create({
      userId: user._id,
      userAgent: req.headers["user-agent"],
    });

    const accessToken = signJwtToken({
      userId: user._id,
      sessionId: session._id,
    });

    const refreshToken = signJwtToken(
      { sessionId: session._id },
      refreshTokenSignOptions
    );

    // Set cookies and redirect to frontend
    setAuthenticationCookies({ res, accessToken, refreshToken });
    
    return res.redirect(`${config.APP_ORIGIN}/home`);
  });
}

module.exports = { AuthController };
