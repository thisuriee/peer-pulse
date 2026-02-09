"use strict";

// const { asyncHandler } = require("../../middlewares/helpers/async-handler.middleware");
// const { HTTPSTATUS } = require("../../config/http.config");
// const { NotFoundException } = require("../../common/utils/errors-utils");
// const { z } = require("zod");

// class SessionController {
//   constructor(sessionService) {
//     this.sessionService = sessionService;
//   }

//   getAllSession = asyncHandler(async (req, res) => {
//     const userId = req.user?.id;
//     const sessionId = req.sessionId;

//     const { sessions } = await this.sessionService.getAllSession(userId);

//     const modifySessions = sessions.map((session) => ({
//       ...session.toObject(),
//       ...(session.id === sessionId && {
//         isCurrent: true,
//       }),
//     }));

//     return res.status(HTTPSTATUS.OK).json({
//       message: "Retrieved all session successfully",
//       sessions: modifySessions,
//     });
//   });

//   getSession = asyncHandler(async (req, res) => {
//     const sessionId = req?.sessionId;

//     if (!sessionId) {
//       throw new NotFoundException("Session ID not found. Please log in.");
//     }

//     const { user } = await this.sessionService.getSessionById(sessionId);

//     return res.status(HTTPSTATUS.OK).json({
//       message: "Session retrieved successfully",
//       user,
//     });
//   });

//   deleteSession = asyncHandler(async (req, res) => {
//     const sessionId = z.string().parse(req.params.id);
//     const userId = req.user?.id;
//     await this.sessionService.deleteSession(sessionId, userId);

//     return res.status(HTTPSTATUS.OK).json({
//       message: "Session remove successfully",
//     });
//   });
// }

// module.exports = { SessionController };

module.exports = {};
