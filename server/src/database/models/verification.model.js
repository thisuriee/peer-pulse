"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;
const { VerificationEnum } = require("../../common/enums/verification-code.enum");
const { generateUniqueCode } = require("../../common/utils/id-utils");

const verificationCodeSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
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

const VerificationCodeModel = mongoose.model(
  "VerificationCode",
  verificationCodeSchema,
  "verification_codes"
);

module.exports = VerificationCodeModel;
