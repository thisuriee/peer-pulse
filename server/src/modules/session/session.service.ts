// import { NotFoundException } from "../../common/utils/errors-utils";
// import SessionModel from "../../database/models/session.model";
// import { logger } from "../../common/utils/logger-utils";

// export class SessionService {
//   public async getAllSession(userId: string) {
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
//   public async logGetAllSessions(userId: string) {
//     logger.info("Fetching all sessions for user", { userId });
//   }

//   public async getSessionById(sessionId: string) {
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

//   public async deleteSession(sessionId: string, userId: string) {
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
