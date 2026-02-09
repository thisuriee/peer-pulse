"use strict";

// import {
//   ExtractJwt,
//   Strategy as JwtStrategy,
//   StrategyOptionsWithRequest,
// } from "passport-jwt";
// import { UnauthorizedException } from "../utils/errors-utils";
// import { ErrorCode } from "../enums/error-code.enum";
// import { config } from "../../config/app.config";
// import passport, { PassportStatic } from "passport";

// const options = {
//   jwtFromRequest: ExtractJwt.fromExtractors([
//     (req) => {
//       const accessToken = req.cookies.accessToken;
//       if (!accessToken) {
//         throw new UnauthorizedException(
//           "Unauthorized access token",
//           ErrorCode.AUTH_TOKEN_NOT_FOUND
//         );
//       }
//       return accessToken;
//     },
//   ]),
//   secretOrKey: config.JWT.SECRET,
//   audience: ["user"],
//   algorithms: ["HS256"],
//   passReqToCallback: true,
// };

// const setupJwtStrategy = (passport) => {
//   passport.use(
//     new JwtStrategy(options, async (req, payload, done) => {
//       try {
//         const user = await userService.findUserById(payload.userId);
//         if (!user) {
//           return done(null, false);
//         }
//         req.sessionId = payload.sessionId;
//         return done(null, user);
//       } catch (error) {
//         return done(error, false);
//       }
//     })
//   );
// };

// const authenticateJWT = passport.authenticate("jwt", { session: false });

module.exports = {};
