"use strict";

const mongoose = require("mongoose");
const { VerificationEnum } = require("../../common/enums/verification-code.enum");
const { generateUniqueCode } = require("../../common/utils/id-utils");

const verificationCodeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
    required: true,
  },
  code: {
    type: String,
    unique: true,
    required: true,
    default: generateUniqueCode,
  },
  type: {
    type: String,
    required: true,
    enum: Object.values(VerificationEnum),
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// Index for faster lookups
verificationCodeSchema.index({ code: 1, type: 1 });
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const VerificationCodeModel = mongoose.model("VerificationCode", verificationCodeSchema);

module.exports = VerificationCodeModel;
