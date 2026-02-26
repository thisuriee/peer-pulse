"use strict";

const { AvailabilityModel } = require("../../database/models/availability.model");
const UserModel = require("../../database/models/user.model");
const {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} = require("../../common/utils/errors-utils");
const { logger } = require("../../common/utils/logger-utils");

class AvailabilityService {
  /**
   * Get or create availability for a tutor
   * NOTE: Role check is handled at route level via requireTutor guard
   */
  async getAvailability(tutorId) {
    let availability = await AvailabilityModel.findOne({ tutor: tutorId });

    if (!availability) {
      // Check if user is a tutor
      const user = await UserModel.findById(tutorId);

      // Create default availability
      availability = await AvailabilityModel.create({
        tutor: tutorId,
        weeklySchedule: new Map(),
        subjects: user.skills || [],
        isActive: false,
      });
    }

    return availability;
  }

  /**
   * Update availability settings
   */
  async updateAvailability(tutorId, updateData) {
    // Verify tutor role
    const user = await UserModel.findById(tutorId);
    if (!user || (user.role !== "tutor" && user.role !== "admin")) {
      throw new ForbiddenException("Only tutors can update availability settings");
    }

    let availability = await AvailabilityModel.findOne({ tutor: tutorId });

    if (!availability) {
      availability = new AvailabilityModel({
        tutor: tutorId,
        ...updateData,
      });
    } else {
      // Update weekly schedule if provided
      if (updateData.weeklySchedule) {
        for (const [day, slots] of Object.entries(updateData.weeklySchedule)) {
          // Validate time slots
          for (const slot of slots) {
            if (slot.startTime >= slot.endTime) {
              throw new BadRequestException(
                `Invalid time slot for day ${day}: start time must be before end time`
              );
            }
          }
          availability.weeklySchedule.set(day, slots);
        }
      }

      // Update other fields
      if (updateData.timezone) availability.timezone = updateData.timezone;
      if (updateData.subjects) availability.subjects = updateData.subjects;
      if (updateData.sessionDurations) availability.sessionDurations = updateData.sessionDurations;
      if (typeof updateData.isActive === "boolean") availability.isActive = updateData.isActive;
    }

    await availability.save();
    logger.info("Availability updated", { tutorId });

    return availability;
  }

  /**
   * Add a date override
   */
  async addDateOverride(tutorId, overrideData) {
    const availability = await this.getAvailability(tutorId);

    const overrideDate = new Date(overrideData.date);
    overrideDate.setHours(0, 0, 0, 0);

    // Check if override already exists for this date
    const existingIndex = availability.dateOverrides.findIndex(
      (o) => o.date.toISOString().split("T")[0] === overrideDate.toISOString().split("T")[0]
    );

    const override = {
      date: overrideDate,
      available: overrideData.available,
      slots: overrideData.slots || [],
    };

    if (existingIndex >= 0) {
      availability.dateOverrides[existingIndex] = override;
    } else {
      availability.dateOverrides.push(override);
    }

    await availability.save();
    logger.info("Date override added", { tutorId, date: overrideDate });

    return availability;
  }

  /**
   * Remove a date override
   */
  async removeDateOverride(tutorId, date) {
    const availability = await this.getAvailability(tutorId);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const initialLength = availability.dateOverrides.length;
    availability.dateOverrides = availability.dateOverrides.filter(
      (o) => o.date.toISOString().split("T")[0] !== targetDate.toISOString().split("T")[0]
    );

    if (availability.dateOverrides.length === initialLength) {
      throw new NotFoundException("Date override not found");
    }

    await availability.save();
    logger.info("Date override removed", { tutorId, date: targetDate });

    return availability;
  }

  /**
   * Get all tutors with their availability
   */
  async getTutorsWithAvailability(filters = {}) {
    const query = { role: "tutor" };

    if (filters.subject) {
      query.skills = { $in: [filters.subject] };
    }

    const tutors = await UserModel.find(query).select("name email skills bio reputationScore");

    const tutorsWithAvailability = await Promise.all(
      tutors.map(async (tutor) => {
        const availability = await AvailabilityModel.findOne({
          tutor: tutor._id,
          isActive: true,
        });

        return {
          ...tutor.toObject(),
          availability: availability
            ? {
                timezone: availability.timezone,
                subjects: availability.subjects,
                sessionDurations: availability.sessionDurations,
                isActive: availability.isActive,
              }
            : null,
        };
      })
    );

    // Filter out tutors without active availability if requested
    if (filters.activeOnly) {
      return tutorsWithAvailability.filter((t) => t.availability?.isActive);
    }

    return tutorsWithAvailability;
  }
}

module.exports = { AvailabilityService };