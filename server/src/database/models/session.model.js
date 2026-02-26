"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

const BookingStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const bookingSchema = new Schema(
  {
    student: {
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
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
      min: 15,
      max: 180,
      default: 60,
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
      index: true,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    googleCalendarEventId: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    cancelReason: {
      type: String,
      trim: true,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
bookingSchema.index({ tutor: 1, scheduledAt: 1 });
bookingSchema.index({ student: 1, scheduledAt: 1 });
bookingSchema.index({ status: 1, scheduledAt: 1 });

// Virtual to calculate end time
bookingSchema.virtual("endTime").get(function () {
  if (this.scheduledAt && this.duration) {
    return new Date(this.scheduledAt.getTime() + this.duration * 60000);
  }
  return null;
});

// Ensure virtuals are included in JSON output
bookingSchema.set("toJSON", { virtuals: true });
bookingSchema.set("toObject", { virtuals: true });

const BookingModel = mongoose.model("Booking", bookingSchema);

module.exports = { BookingModel, BookingStatus };