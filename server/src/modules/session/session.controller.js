"use strict";

const { asyncHandler } = require("../../middlewares/helpers/async-handler.middleware");
const { HTTPSTATUS } = require("../../config/http.config");
const {
  createBookingSchema,
  updateBookingSchema,
  acceptBookingSchema,
  declineBookingSchema,
  cancelBookingSchema,
  availabilitySchema,
  dateOverrideSchema,
  getAvailableSlotsSchema,
} = require("../../common/validators/session.validator");

class BookingController {
  constructor(bookingService, availabilityService) {
    this.bookingService = bookingService;
    this.availabilityService = availabilityService;
  }

  /**
   * Create a new booking
   * POST /api/v1/bookings
   */
  createBooking = asyncHandler(async (req, res) => {
    const studentId = req.user.id;
    const body = createBookingSchema.parse(req.body);

    const booking = await this.bookingService.createBooking(studentId, body);

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: "Booking request created successfully",
      data: booking,
    });
  });

  /**
   * Get all bookings for current user
   * GET /api/v1/bookings
   */
  getBookings = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, startDate, endDate } = req.query;

    const bookings = await this.bookingService.getBookings(userId, role, {
      status,
      startDate,
      endDate,
    });

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Bookings retrieved successfully",
      data: bookings,
    });
  });

  /**
   * Get booking by ID
   * GET /api/v1/bookings/:id
   */
  getBookingById = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const bookingId = req.params.id;

    const booking = await this.bookingService.getBookingById(bookingId, userId);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Booking retrieved successfully",
      data: booking,
    });
  });

  /**
   * Update a booking
   * PUT /api/v1/bookings/:id
   */
  updateBooking = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const bookingId = req.params.id;
    const body = updateBookingSchema.parse(req.body);

    const booking = await this.bookingService.updateBooking(bookingId, userId, body);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Booking updated successfully",
      data: booking,
    });
  });

  /**
   * Accept a booking (tutor only)
   * PUT /api/v1/bookings/:id/accept
   */
  acceptBooking = asyncHandler(async (req, res) => {
    const tutorId = req.user.id;
    const bookingId = req.params.id;
    const body = acceptBookingSchema.parse(req.body);

    const booking = await this.bookingService.acceptBooking(bookingId, tutorId, body);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Booking accepted successfully",
      data: booking,
    });
  });

  /**
   * Decline a booking (tutor only)
   * PUT /api/v1/bookings/:id/decline
   */
  declineBooking = asyncHandler(async (req, res) => {
    const tutorId = req.user.id;
    const bookingId = req.params.id;
    const { reason } = declineBookingSchema.parse(req.body);

    const booking = await this.bookingService.declineBooking(bookingId, tutorId, reason);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Booking declined",
      data: booking,
    });
  });

  /**
   * Cancel a booking
   * DELETE /api/v1/bookings/:id
   */
  cancelBooking = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const bookingId = req.params.id;
    const { reason } = cancelBookingSchema.parse(req.body);

    const booking = await this.bookingService.cancelBooking(bookingId, userId, reason);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  });

  /**
   * Complete a booking
   * PUT /api/v1/bookings/:id/complete
   */
  completeBooking = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const bookingId = req.params.id;

    const booking = await this.bookingService.completeBooking(bookingId, userId);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Booking marked as completed",
      data: booking,
    });
  });

  /**
   * Get available slots for a tutor
   * GET /api/v1/bookings/slots
   */
  getAvailableSlots = asyncHandler(async (req, res) => {
    const { tutorId, date, duration } = getAvailableSlotsSchema.parse(req.query);

    const slots = await this.bookingService.getAvailableSlots(tutorId, date, duration);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Available slots retrieved successfully",
      data: slots,
    });
  });

  /**
   * Get current user's availability
   * GET /api/v1/bookings/availability
   */
  getAvailability = asyncHandler(async (req, res) => {
    const tutorId = req.user.id;

    const availability = await this.availabilityService.getAvailability(tutorId);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Availability retrieved successfully",
      data: availability,
    });
  });

  /**
   * Update current user's availability
   * PUT /api/v1/bookings/availability
   */
  updateAvailability = asyncHandler(async (req, res) => {
    const tutorId = req.user.id;
    const body = availabilitySchema.parse(req.body);

    const availability = await this.availabilityService.updateAvailability(tutorId, body);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Availability updated successfully",
      data: availability,
    });
  });

  /**
   * Add a date override
   * POST /api/v1/bookings/availability/override
   */
  addDateOverride = asyncHandler(async (req, res) => {
    const tutorId = req.user.id;
    const body = dateOverrideSchema.parse(req.body);

    const availability = await this.availabilityService.addDateOverride(tutorId, body);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Date override added successfully",
      data: availability,
    });
  });

  /**
   * Remove a date override
   * DELETE /api/v1/bookings/availability/override
   */
  removeDateOverride = asyncHandler(async (req, res) => {
    const tutorId = req.user.id;
    const { date } = req.query;

    const availability = await this.availabilityService.removeDateOverride(tutorId, date);

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Date override removed successfully",
      data: availability,
    });
  });

  /**
   * Get tutors with availability
   * GET /api/v1/bookings/tutors
   */
  getTutorsWithAvailability = asyncHandler(async (req, res) => {
    const { subject, activeOnly } = req.query;

    const tutors = await this.availabilityService.getTutorsWithAvailability({
      subject,
      activeOnly: activeOnly === "true",
    });

    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Tutors retrieved successfully",
      data: tutors,
    });
  });
}

module.exports = { BookingController };