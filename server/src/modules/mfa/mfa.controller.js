"use strict";

// const { asyncHandler } = require("../../middlewares/helpers/async-handler.middleware");
// const { HTTPSTATUS } = require("../../config/http.config");
// const {
//   verifyMfaForLoginSchema,
//   verifyMfaSchema,
// } = require("../../common/validators/mfa.validator");
// const { setAuthenticationCookies } = require("../../common/utils/cookie-utils");

// class MfaController {
//   constructor(mfaService) {
//     this.mfaService = mfaService;
//   }

//   generateMFASetup = asyncHandler(
//     async (req, res) => {
//       const { secret, qrImageUrl, message } =
//         await this.mfaService.generateMFASetup(req);
//       return res.status(HTTPSTATUS.OK).json({
//         message,
//         secret,
//         qrImageUrl,
//       });
//     }
//   );

//   verifyMFASetup = asyncHandler(async (req, res) => {
//     const { code, secretKey } = verifyMfaSchema.parse({
//       ...req.body,
//     });
//     const { userPreferences, message } = await this.mfaService.verifyMFASetup(
//       req,
//       code,
//       secretKey
//     );
//     return res.status(HTTPSTATUS.OK).json({
//       message: message,
//       userPreferences: userPreferences,
//     });
//   });

//   revokeMFA = asyncHandler(async (req, res) => {
//     const { message, userPreferences } = await this.mfaService.revokeMFA(req);
//     return res.status(HTTPSTATUS.OK).json({
//       message,
//       userPreferences,
//     });
//   });

//   verifyMFAForLogin = asyncHandler(
//     async (req, res) => {
//       const { code, email, userAgent } = verifyMfaForLoginSchema.parse({
//         ...req.body,
//         userAgent: req.headers["user-agent"],
//       });

//       const { accessToken, refreshToken, user } =
//         await this.mfaService.verifyMFAForLogin(code, email, userAgent);

//       return setAuthenticationCookies({
//         res,
//         accessToken,
//         refreshToken,
//       })
//         .status(HTTPSTATUS.OK)
//         .json({
//           message: "Verified & login successfully",
//           user,
//         });
//     }
//   );
// }

// module.exports = { MfaController };

module.exports = {};
