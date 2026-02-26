"use strict";

const mongoose = require("mongoose");
const { compareValue, hashValue } = require("../../common/utils/hash-utils");

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true,
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { 
      type: String,
    },
    googleId: { 
      type: String,
      sparse: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["student", "tutor", "admin"],
      default: "student",
    },
    bio: { 
      type: String,
      maxlength: 500,
    },
    skills: [{ 
      type: String,
      trim: true,
    }],
    reputationScore: { 
      type: Number, 
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Indexes for faster lookups
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ skills: 1 });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.password && this.isModified("password")) {
    this.password = await hashValue(this.password);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (value) {
  if (!this.password) return false;
  return compareValue(value, this.password);
};

// Return user without password
userSchema.methods.omitPassword = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Check if user is OAuth-only
userSchema.methods.isOAuthUser = function () {
  return !!this.googleId && !this.password;
};

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;