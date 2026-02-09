"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;
const { thirtyDaysFromNow } = require("../../common/utils/date-utils");

const sessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    index: true,
    required: true,
  },
  userAgent: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiredAt: {
    type: Date,
    required: true,
    default: thirtyDaysFromNow,
  },
});

const SessionModel = mongoose.model("Session", sessionSchema);

module.exports = SessionModel;
