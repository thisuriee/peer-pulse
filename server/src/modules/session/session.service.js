"use strict";

const { BookingModel, BookingStatus } = require("../../database/models/session.model");
const { AvailabilityModel } = require("../../database/models/availability.model");
const UserModel = require("../../database/models/user.model");
const {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} = require("../../common/utils/errors-utils");
const { ErrorCode } = require("../../common/enums/error-code.enum");
const { logger } = require("../../common/utils/logger-utils");
const { googleCalendarService } = require("../../integrations/google-calendar");

class BookingService {
  /**
   * Create a new booking request
   */
  async createBooking(studentId, bookingData) {
    const { tutor: tutorId, subject, description, scheduledAt, duration, notes } = bookingData;

    // Verify tutor exists and has tutor role
    const tutor = await UserModel.findById(tutorId);
    if (!tutor) {
      throw new NotFoundException("Tutor not found");
    }
    if (tutor.role !== "tutor" && tutor.role !== "admin") {
      throw new BadRequestException("Selected user is not a tutor");
    }

    // Check student is not booking themselves
    if (studentId.toString() === tutorId.toString()) {
      throw new BadRequestException("You cannot book a session with yourself");
    }

    const scheduledDate = new Date(scheduledAt);
    const endTime = new Date(scheduledDate.getTime() + duration * 60000);

    // Check if scheduled time is in the future
    if (scheduledDate <= new Date()) {
      throw new BadRequestException("Session must be scheduled in the future");
    }

    // Check tutor availability
    const isAvailable = await this.checkTutorAvailability(tutorId, scheduledDate, duration);
    if (!isAvailable) {
      throw new BadRequestException(
        "Tutor is not available at the requested time",
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Check for double-booking conflicts
    const hasConflict = await this.checkBookingConflict(tutorId, scheduledDate, endTime);
    if (hasConflict) {
      throw new BadRequestException(
        "This time slot is already booked",
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Create the booking
    const booking = await BookingModel.create({
      student: studentId,
      tutor: tutorId,
      subject,
      description,
      scheduledAt: scheduledDate,
      duration,
      notes,
      status: BookingStatus.PENDING,
    });

    logger.info("Booking created", { bookingId: booking._id, studentId, tutorId });

    return await booking.populate(["student", "tutor"]);
  }

  /**
   * Get all bookings for a user (student or tutor)
   */
  async getBookings(userId, role, filters = {}) {
    const query = {};

    // Filter by role
    if (role === "student") {
      query.student = userId;
    } else if (role === "tutor") {
      query.tutor = userId;
    } else {
      // Admin or viewing all own bookings
      query.$or = [{ student: userId }, { tutor: userId }];
    }

    // Apply status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      query.scheduledAt = {};
      if (filters.startDate) {
        query.scheduledAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.scheduledAt.$lte = new Date(filters.endDate);
      }
    }

    const bookings = await BookingModel.find(query)
      .populate("student", "name email")
      .populate("tutor", "name email skills")
      .sort({ scheduledAt: -1 });

    return bookings;
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId, userId) {
    const booking = await BookingModel.findById(bookingId)
      .populate("student", "name email")
      .populate("tutor", "name email skills");

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Check if user has access to this booking
    const isStudent = booking.student._id.toString() === userId.toString();
    const isTutor = booking.tutor._id.toString() === userId.toString();

    if (!isStudent && !isTutor) {
      throw new ForbiddenException("You don't have access to this booking");
    }

    return booking;
  }

  /**
   * Update a booking (only pending bookings can be updated)
   */
  async updateBooking(bookingId, userId, updateData) {
    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Only student who created the booking can update
    if (booking.student.toString() !== userId.toString()) {
      throw new ForbiddenException("Only the student can update this booking");
    }

    // Only pending bookings can be updated
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException("Only pending bookings can be updated");
    }

    // If rescheduling, validate the new time
    if (updateData.scheduledAt) {
      const newScheduledAt = new Date(updateData.scheduledAt);
      const duration = updateData.duration || booking.duration;
      const endTime = new Date(newScheduledAt.getTime() + duration * 60000);

      if (newScheduledAt <= new Date()) {
        throw new BadRequestException("Session must be scheduled in the future");
      }

      const isAvailable = await this.checkTutorAvailability(
        booking.tutor,
        newScheduledAt,
        duration
      );
      if (!isAvailable) {
        throw new BadRequestException("Tutor is not available at the requested time");
      }

      const hasConflict = await this.checkBookingConflict(
        booking.tutor,
        newScheduledAt,
        endTime,
        bookingId
      );
      if (hasConflict) {
        throw new BadRequestException("This time slot is already booked");
      }

      updateData.scheduledAt = newScheduledAt;
    }

    Object.assign(booking, updateData);
    await booking.save();

    logger.info("Booking updated", { bookingId, userId });

    return await booking.populate(["student", "tutor"]);
  }

  /**
   * Accept a booking (tutor only)
   */
  async acceptBooking(bookingId, tutorId, acceptData = {}) {
    const booking = await BookingModel.findById(bookingId)
      .populate("student", "name email")
      .populate("tutor", "name email");

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.tutor._id.toString() !== tutorId.toString()) {
      throw new ForbiddenException("Only the assigned tutor can accept this booking");
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException("Only pending bookings can be accepted");
    }

    // Update booking status
    booking.status = BookingStatus.ACCEPTED;
    if (acceptData.meetingLink) {
      booking.meetingLink = acceptData.meetingLink;
    }
    if (acceptData.notes) {
      booking.notes = acceptData.notes;
    }

    await booking.save();

    logger.info("Booking accepted", { bookingId, tutorId });

    // Try to sync with Google Calendar
    try {
      const calendarEvent = await googleCalendarService.createEvent(booking);
      if (calendarEvent) {
        booking.googleCalendarEventId = calendarEvent.id;
        booking.status = BookingStatus.CONFIRMED;

        // Use auto-generated Google Meet link if available
        if (calendarEvent.meetLink) {
          booking.meetingLink = calendarEvent.meetLink;
          logger.info("Auto-generated Google Meet link", { meetLink: calendarEvent.meetLink });
        }
        
        await booking.save();
        logger.info("Booking synced with Google Calendar", {
          bookingId,
          eventId: calendarEvent.id,
        });
      }
    } catch (error) {
      logger.warn("Failed to sync with Google Calendar", { bookingId, error: error.message });
      // Continue without calendar sync - booking is still accepted
    }

    return booking;
  }

  /**
   * Decline a booking (tutor only)
   */
  async declineBooking(bookingId, tutorId, reason) {
    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.tutor.toString() !== tutorId.toString()) {
      throw new ForbiddenException("Only the assigned tutor can decline this booking");
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException("Only pending bookings can be declined");
    }

    booking.status = BookingStatus.DECLINED;
    booking.cancelReason = reason;
    booking.cancelledBy = tutorId;
    await booking.save();

    logger.info("Booking declined", { bookingId, tutorId, reason });

    return await booking.populate(["student", "tutor"]);
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId, userId, reason) {
    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    const isStudent = booking.student.toString() === userId.toString();
    const isTutor = booking.tutor.toString() === userId.toString();

    if (!isStudent && !isTutor) {
      throw new ForbiddenException("You don't have access to cancel this booking");
    }

    const cancellableStatuses = [
      BookingStatus.PENDING,
      BookingStatus.ACCEPTED,
      BookingStatus.CONFIRMED,
    ];

    if (!cancellableStatuses.includes(booking.status)) {
      throw new BadRequestException("This booking cannot be cancelled");
    }

    // Remove from Google Calendar if synced
    if (booking.googleCalendarEventId) {
      try {
        await googleCalendarService.deleteEvent(booking.googleCalendarEventId);
        logger.info("Calendar event deleted", { eventId: booking.googleCalendarEventId });
      } catch (error) {
        logger.warn("Failed to delete calendar event", { error: error.message });
      }
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelReason = reason;
    booking.cancelledBy = userId;
    await booking.save();

    logger.info("Booking cancelled", { bookingId, userId, reason });

    return await booking.populate(["student", "tutor"]);
  }

  /**
   * Mark a booking as completed
   */
  async completeBooking(bookingId, userId) {
    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    const isStudent = booking.student.toString() === userId.toString();
    const isTutor = booking.tutor.toString() === userId.toString();

    if (!isStudent && !isTutor) {
      throw new ForbiddenException("You don't have access to complete this booking");
    }

    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestException("Only confirmed bookings can be marked as completed");
    }

    // Check if the scheduled time has passed
    if (new Date(booking.scheduledAt) > new Date()) {
      throw new BadRequestException("Cannot complete a booking before its scheduled time");
    }

    booking.status = BookingStatus.COMPLETED;
    booking.completedAt = new Date();
    await booking.save();

    logger.info("Booking completed", { bookingId, userId });

    return await booking.populate(["student", "tutor"]);
  }

  /**
   * Check if tutor is available at the given time
   */
  async checkTutorAvailability(tutorId, scheduledAt, duration) {
    const availability = await AvailabilityModel.findOne({ tutor: tutorId });

    if (!availability || !availability.isActive) {
      // If no availability set, assume not available
      return false;
    }

    const date = new Date(scheduledAt);
    const dayOfWeek = date.getDay().toString();
    const timeStr = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    const endTime = new Date(date.getTime() + duration * 60000);
    const endTimeStr = `${endTime.getHours().toString().padStart(2, "0")}:${endTime.getMinutes().toString().padStart(2, "0")}`;

    // Check date overrides first
    const dateStr = date.toISOString().split("T")[0];
    const override = availability.dateOverrides.find(
      (o) => o.date.toISOString().split("T")[0] === dateStr
    );

    if (override) {
      if (!override.available) {
        return false;
      }
      if (override.slots && override.slots.length > 0) {
        return override.slots.some(
          (slot) => timeStr >= slot.startTime && endTimeStr <= slot.endTime
        );
      }
    }

    // Check weekly schedule
    const daySlots = availability.weeklySchedule.get(dayOfWeek);
    if (!daySlots || daySlots.length === 0) {
      return false;
    }

    return daySlots.some(
      (slot) => timeStr >= slot.startTime && endTimeStr <= slot.endTime
    );
  }

  /**
   * Check for booking conflicts
   */
  async checkBookingConflict(tutorId, startTime, endTime, excludeBookingId = null) {
    const query = {
      tutor: tutorId,
      status: { $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED, BookingStatus.CONFIRMED] },
      $or: [
        {
          scheduledAt: { $lt: endTime },
          $expr: {
            $gt: [
              { $add: ["$scheduledAt", { $multiply: ["$duration", 60000] }] },
              startTime,
            ],
          },
        },
      ],
    };

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    const conflictingBooking = await BookingModel.findOne(query);
    return !!conflictingBooking;
  }

  /**
   * Get available time slots for a tutor on a specific date
   */
  async getAvailableSlots(tutorId, date, duration = 60) {
    const tutor = await UserModel.findById(tutorId);
    if (!tutor || (tutor.role !== "tutor" && tutor.role !== "admin")) {
      throw new NotFoundException("Tutor not found");
    }

    const availability = await AvailabilityModel.findOne({ tutor: tutorId });
    if (!availability || !availability.isActive) {
      return [];
    }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay().toString();

    // Get slots for this day
    let daySlots = [];
    const dateStr = targetDate.toISOString().split("T")[0];
    const override = availability.dateOverrides.find(
      (o) => o.date.toISOString().split("T")[0] === dateStr
    );

    if (override) {
      if (!override.available) {
        return [];
      }
      daySlots = override.slots || [];
    } else {
      daySlots = availability.weeklySchedule.get(dayOfWeek) || [];
    }

    // Generate available time slots
    const availableSlots = [];
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    for (const slot of daySlots) {
      const [startHour, startMin] = slot.startTime.split(":").map(Number);
      const [endHour, endMin] = slot.endTime.split(":").map(Number);

      let currentSlot = new Date(startOfDay);
      currentSlot.setHours(startHour, startMin, 0, 0);

      const slotEnd = new Date(startOfDay);
      slotEnd.setHours(endHour, endMin, 0, 0);

      while (currentSlot.getTime() + duration * 60000 <= slotEnd.getTime()) {
        const slotEndTime = new Date(currentSlot.getTime() + duration * 60000);

        // Check if slot is in the future
        if (currentSlot > new Date()) {
          // Check for conflicts
          const hasConflict = await this.checkBookingConflict(
            tutorId,
            currentSlot,
            slotEndTime
          );

          if (!hasConflict) {
            availableSlots.push({
              startTime: currentSlot.toISOString(),
              endTime: slotEndTime.toISOString(),
              duration,
            });
          }
        }

        // Move to next slot (30-minute intervals)
        currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
      }
    }

    return availableSlots;
  }
}

module.exports = { BookingService };