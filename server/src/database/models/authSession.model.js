"use strict";

const mongoose = require("mongoose");
const { thirtyDaysFromNow } = require("../../common/utils/date-utils");

const authSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
    },
    expiredAt: {
      type: Date,
      default: thirtyDaysFromNow,
    },
  },
  { timestamps: true }
);

// Index for cleanup of expired sessions
authSessionSchema.index({ expiredAt: 1 }, { expireAfterSeconds: 0 });

const AuthSessionModel = mongoose.model("AuthSession", authSessionSchema);

module.exports = AuthSessionModel;