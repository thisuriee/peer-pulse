"use strict";

const { z } = require("zod");

const timeSlotSchema = z.object({
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format. Use HH:mm"),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format. Use HH:mm"),
});

const createBookingSchema = z.object({
  tutor: z.string().min(1, "Tutor ID is required"),
  subject: z.string().min(1, "Subject is required").max(100),
  description: z.string().max(500).optional(),
  scheduledAt: z.string().datetime("Invalid date format"),
  duration: z.number().min(15).max(180).default(60),
  notes: z.string().max(1000).optional(),
});

const updateBookingSchema = z.object({
  subject: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().min(15).max(180).optional(),
  notes: z.string().max(1000).optional(),
});

const acceptBookingSchema = z.object({
  meetingLink: z.string().url("Invalid meeting link").optional(),
  notes: z.string().max(1000).optional(),
});

const declineBookingSchema = z.object({
  reason: z.string().min(1, "Decline reason is required").max(500),
});

const cancelBookingSchema = z.object({
  reason: z.string().min(1, "Cancel reason is required").max(500),
});

const availabilitySchema = z.object({
  timezone: z.string().optional(),
  weeklySchedule: z.record(z.array(timeSlotSchema)).optional(),
  subjects: z.array(z.string()).optional(),
  sessionDurations: z.array(z.number().min(15).max(180)).optional(),
  isActive: z.boolean().optional(),
});

const dateOverrideSchema = z.object({
  date: z.string().datetime("Invalid date format"),
  available: z.boolean(),
  slots: z.array(timeSlotSchema).optional(),
});

const getAvailableSlotsSchema = z.object({
  tutorId: z.string().min(1, "Tutor ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
  duration: z.coerce.number().min(15).max(180).optional().default(60),
});

module.exports = {
  createBookingSchema,
  updateBookingSchema,
  acceptBookingSchema,
  declineBookingSchema,
  cancelBookingSchema,
  availabilitySchema,
  dateOverrideSchema,
  getAvailableSlotsSchema,
  timeSlotSchema,
};