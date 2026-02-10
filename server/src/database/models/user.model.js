"use strict";

const mongoose = require("mongoose");
const { compareValue, hashValue } = require("../../common/utils/hash-utils");

const userPreferencesSchema = new mongoose.Schema({
  enable2FA: { type: Boolean, default: false },
  emailNotification: { type: Boolean, default: true },
  twoFactorSecret: { type: String },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "tutor", "admin"],
      default: "student",
    },
    bio: { type: String },
    skills: [{ type: String }], // Subjects they can tutor
    reputationScore: { type: Number, default: 0 },
    isEmailVerified: { type: Boolean, default: false },
    userPreferences: { type: userPreferencesSchema, default: {} },
  },
  { timestamps: true }
);

// Index for faster lookups
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await hashValue(this.password);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (value) {
  return compareValue(value, this.password);
};

// Return user without password
userSchema.methods.omitPassword = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
