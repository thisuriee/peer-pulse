"use strict";

const { Router } = require("express");
const { authenticateJWT } = require("../../common/middleware/auth.middleware");
const { requireTutor } = require("../../common/guards/role.guard");
const { bookingController } = require("./session.module");

const bookingRoutes = Router();

// ============================================
// Component 1: Session Orchestrator (Dahami)
// Booking & Scheduling for Peer-Tutoring
// ============================================

// All routes require authentication
bookingRoutes.use(authenticateJWT);

// ============================================
// Public routes (any authenticated user)
// ============================================

// GET /api/v1/bookings/slots - Get available slots for a tutor (must be before /:id)
bookingRoutes.get("/slots", bookingController.getAvailableSlots);

// GET /api/v1/bookings/tutors - Get tutors with availability
bookingRoutes.get("/tutors", bookingController.getTutorsWithAvailability);

// GET /api/v1/bookings - Get all bookings for current user
bookingRoutes.get("/", bookingController.getBookings);

// POST /api/v1/bookings - Create a new booking request
bookingRoutes.post("/", bookingController.createBooking);

// GET /api/v1/bookings/:id - Get booking by ID
bookingRoutes.get("/:id", bookingController.getBookingById);

// PUT /api/v1/bookings/:id - Update a booking (student only, pending bookings)
bookingRoutes.put("/:id", bookingController.updateBooking);

// PUT /api/v1/bookings/:id/complete - Mark booking as completed
bookingRoutes.put("/:id/complete", bookingController.completeBooking);

// DELETE /api/v1/bookings/:id - Cancel a booking
bookingRoutes.delete("/:id", bookingController.cancelBooking);


// ============================================
// Tutor-only routes (requireTutor guard)
// ============================================

// GET /api/v1/bookings/availability - Get current user's availability (tutor)
bookingRoutes.get("/availability", requireTutor, bookingController.getAvailability);

// PUT /api/v1/bookings/availability - Update availability (tutor)
bookingRoutes.put("/availability", requireTutor, bookingController.updateAvailability);

// POST /api/v1/bookings/availability/override - Add date override (tutor)
bookingRoutes.post("/availability/override", requireTutor, bookingController.addDateOverride);

// DELETE /api/v1/bookings/availability/override - Remove date override (tutor)
bookingRoutes.delete("/availability/override", requireTutor, bookingController.removeDateOverride);

// PUT /api/v1/bookings/:id/accept - Accept a booking (tutor only)
bookingRoutes.put("/:id/accept", requireTutor, bookingController.acceptBooking);

// PUT /api/v1/bookings/:id/decline - Decline a booking (tutor only)
bookingRoutes.put("/:id/decline", requireTutor, bookingController.declineBooking);





module.exports = bookingRoutes;