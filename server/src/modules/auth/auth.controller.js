"use strict";

// import { Request, Response } from "express";
// import { asyncHandler } from "../../middlewares/helpers/async-handler.middleware";
// import { AuthService } from "./auth.service";
// import { HTTPSTATUS } from "../../config/http.config";
// import {
//   emailSchema,
//   loginSchema,
//   registerSchema,
//   resetPasswordSchema,
//   verificationEmailSchema,
// } from "../../common/validators/auth.validator";
// import {
//   clearAuthenticationCookies,
//   getAccessTokenCookieOptions,
//   getRefreshTokenCookieOptions,
//   setAuthenticationCookies,
// } from "../../common/utils/cookie-utils";
// import {
//   NotFoundException,
//   UnauthorizedException,
// } from "../../common/utils/errors-utils";

// class AuthController {
//   constructor(authService) {
//     this.authService = authService;
//   }

//   register = asyncHandler(
//     async (req, res) => {
//       const body = registerSchema.parse({
//         ...req.body,
//       });
//       const { user } = await this.authService.register(body);
//       return res.status(HTTPSTATUS.CREATED).json({
//         message: "User registered successfully",
//         data: user,
//       });
//     }
//   );

//   login = asyncHandler(
//     async (req, res) => {
//       const userAgent = req.headers["user-agent"];
//       const body = loginSchema.parse({
//         ...req.body,
//         userAgent,
//       });

//       const { user, accessToken, refreshToken, mfaRequired } =
//         await this.authService.login(body);

//       if (mfaRequired) {
//         return res.status(HTTPSTATUS.OK).json({
//           message: "Verify MFA authentication",
//           mfaRequired,
//           user,
//         });
//       }

//       return setAuthenticationCookies({
//         res,
//         accessToken,
//         refreshToken,
//       })
//         .status(HTTPSTATUS.OK)
//         .json({
//           message: "User login successfully",
//           mfaRequired,
//           user,
//         });
//     }
//   );

//   refreshToken = asyncHandler(
//     async (req, res) => {
//       const refreshToken = req.cookies.refreshToken;
//       if (!refreshToken) {
//         throw new UnauthorizedException("Missing refresh token");
//       }

//       const { accessToken, newRefreshToken } =
//         await this.authService.refreshToken(refreshToken);

//       if (newRefreshToken) {
//         res.cookie(
//           "refreshToken",
//           newRefreshToken,
//           getRefreshTokenCookieOptions()
//         );
//       }

//       return res
//         .status(HTTPSTATUS.OK)
//         .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
//         .json({
//           message: "Refresh access token successfully",
//         });
//     }
//   );

//   verifyEmail = asyncHandler(
//     async (req, res) => {
//       const { code } = verificationEmailSchema.parse(req.body);
//       await this.authService.verifyEmail(code);

//       return res.status(HTTPSTATUS.OK).json({
//         message: "Email verified successfully",
//       });
//     }
//   );

//   forgotPassword = asyncHandler(
//     async (req, res) => {
//       const email = emailSchema.parse(req.body.email);
//       await this.authService.forgotPassword(email);

//       return res.status(HTTPSTATUS.OK).json({
//         message: "Password reset email sent",
//       });
//     }
//   );

//   resetPassword = asyncHandler(
//     async (req, res) => {
//       const body = resetPasswordSchema.parse(req.body);

//       await this.authService.resePassword(body);

//       return clearAuthenticationCookies(res).status(HTTPSTATUS.OK).json({
//         message: "Reset Password successfully",
//       });
//     }
//   );

//   logout = asyncHandler(
//     async (req, res) => {
//       const sessionId = req.sessionId;
//       if (!sessionId) {
//         throw new NotFoundException("Session is invalid.");
//       }
//       await this.authService.logout(sessionId);
//       return clearAuthenticationCookies(res).status(HTTPSTATUS.OK).json({
//         message: "User logout successfully",
//       });
//     }
//   );
// }

// module.exports = { AuthController };

module.exports = {};
