"use strict";

// const { NotFoundException } = require("../../common/utils/errors-utils");
// const SessionModel = require("../../database/models/session.model");
// const { logger } = require("../../common/utils/logger-utils");

// class SessionService {
//   async getAllSession(userId) {
//     const sessions = await SessionModel.find(
//       {
//         userId,
//         expiredAt: { $gt: Date.now() },
//       },
//       {
//         _id: 1,
//         userId: 1,
//         userAgent: 1,
//         createdAt: 1,
//         expiredAt: 1,
//       },
//       {
//         sort: {
//           createdAt: -1,
//         },
//       }
//     );

//     return {
//       sessions,
//     };
//   }

//   // Consider logging at controller level; small service-level logs for auditing
//   async logGetAllSessions(userId) {
//     logger.info("Fetching all sessions for user", { userId });
//   }

//   async getSessionById(sessionId) {
//     const session = await SessionModel.findById(sessionId)
//       .populate("userId")
//       .select("-expiresAt");

//     if (!session) {
//       logger.warn("Session not found", { sessionId });
//       throw new NotFoundException("Session not found");
//     }
//     const { userId: user } = session;

//     return {
//       user,
//     };
//   }

//   async deleteSession(sessionId, userId) {
//     const deletedSession = await SessionModel.findByIdAndDelete({
//       _id: sessionId,
//       userId: userId,
//     });
//     if (!deletedSession) {
//       logger.warn("Attempted to delete non-existing session", { sessionId, userId });
//       throw new NotFoundException("Session not found");
//     }
//     logger.info("Session deleted", { sessionId, userId });
//     return;
//   }
// }

// module.exports = { SessionService };

module.exports = {};
