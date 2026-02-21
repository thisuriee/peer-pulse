"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tutor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    responseFromTutor: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    flaggedForModeration: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ tutor: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });

const ReviewModel = mongoose.model("Review", reviewSchema);

module.exports = ReviewModel;
