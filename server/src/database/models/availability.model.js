"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

const DayOfWeek = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const timeSlotSchema = new Schema(
  {
    startTime: {
      type: String, // Format: "HH:mm" (24-hour)
      required: true,
    },
    endTime: {
      type: String, // Format: "HH:mm" (24-hour)
      required: true,
    },
  },
  { _id: false }
);

const availabilitySchema = new Schema(
  {
    tutor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    weeklySchedule: {
      type: Map,
      of: [timeSlotSchema],
      default: new Map(),
    },
    // Specific date overrides (for holidays, special availability)
    dateOverrides: [
      {
        date: {
          type: Date,
          required: true,
        },
        available: {
          type: Boolean,
          default: false,
        },
        slots: [timeSlotSchema],
      },
    ],
    // Subjects the tutor can teach
    subjects: [
      {
        type: String,
        trim: true,
      },
    ],
    // Session duration options offered by tutor
    sessionDurations: {
      type: [Number],
      default: [30, 60],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const AvailabilityModel = mongoose.model("Availability", availabilitySchema);

module.exports = { AvailabilityModel, DayOfWeek };