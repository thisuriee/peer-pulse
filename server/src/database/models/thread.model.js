"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

const replySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isBestAnswer: {
      type: Boolean,
      default: false,
    },
    flaggedForReview: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const threadSchema = new Schema(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    subject: {
      type: String,
      trim: true,
      index: true,
    },
    upvotes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    replies: [replySchema],
    isResolved: {
      type: Boolean,
      default: false,
    },
    flaggedForReview: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for performance
threadSchema.index({ createdAt: -1 });
threadSchema.index({ subject: 1, createdAt: -1 });
threadSchema.index({ isDeleted: 1 });

// Virtual for upvote count
threadSchema.virtual("upvoteCount").get(function () {
  return this.upvotes ? this.upvotes.length : 0;
});

// Virtual for reply count
threadSchema.virtual("replyCount").get(function () {
  return this.replies ? this.replies.length : 0;
});

// Ensure virtuals are included in JSON output
threadSchema.set("toJSON", { virtuals: true });
threadSchema.set("toObject", { virtuals: true });

const ThreadModel = mongoose.model("Thread", threadSchema);

module.exports = { ThreadModel };