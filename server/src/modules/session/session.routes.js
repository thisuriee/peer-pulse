"use strict";

const { Router } = require("express");
const { authenticateJWT } = require("../../common/middleware/auth.middleware");
const { requireTutor, requireStudent } = require("../../common/guards/role.guard");
const { bookingController } = require("./session.module");

const bookingRoutes = Router();

// ============================================
// Component 1: Session Orchestrator (Dahami)
// Booking & Scheduling for Peer-Tutoring
// ============================================

// All routes require authentication
bookingRoutes.use(authenticateJWT);

// ============================================
// Fixed routes FIRST (non-ID paths)
// ============================================
bookingRoutes.get("/slots", bookingController.getAvailableSlots);
bookingRoutes.get("/tutors", bookingController.getTutorsWithAvailability);
bookingRoutes.get("/", bookingController.getBookings);
bookingRoutes.post("/", requireStudent, bookingController.createBooking);

// Availability routes (fixed paths — must come before /:id)
bookingRoutes.get("/availability", requireTutor, bookingController.getAvailability);
bookingRoutes.put("/availability", requireTutor, bookingController.updateAvailability);
bookingRoutes.post("/availability/override", requireTutor, bookingController.addDateOverride);
bookingRoutes.delete("/availability/override", requireTutor, bookingController.removeDateOverride);

// ============================================
// Dynamic routes LAST (ID-based)
// ============================================
bookingRoutes.get("/:id", bookingController.getBookingById);
bookingRoutes.put("/:id", bookingController.updateBooking);
bookingRoutes.put("/:id/complete", bookingController.completeBooking);
bookingRoutes.delete("/:id", bookingController.cancelBooking);
bookingRoutes.put("/:id/accept", requireTutor, bookingController.acceptBooking);
bookingRoutes.put("/:id/decline", requireTutor, bookingController.declineBooking);

module.exports = bookingRoutes;