"use strict";

const { google } = require("googleapis");
const { config } = require("../config/app.config");
const { logger } = require("../common/utils/logger-utils");

class GoogleCalendarService {
  constructor() {
    this.calendar = null;
    this.isConfigured = false;
    this.initialize();
  }

  initialize() {
    try {
      // Check if Google Calendar credentials are configured
      if (
        !config.GOOGLE_CLIENT_ID ||
        !config.GOOGLE_CLIENT_SECRET ||
        !config.GOOGLE_REFRESH_TOKEN
      ) {
        logger.warn("Google Calendar API not configured - calendar sync disabled");
        return;
      }

      const oauth2Client = new google.auth.OAuth2(
        config.GOOGLE_CLIENT_ID,
        config.GOOGLE_CLIENT_SECRET,
        config.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        refresh_token: config.GOOGLE_REFRESH_TOKEN,
      });

      this.calendar = google.calendar({ version: "v3", auth: oauth2Client });
      this.isConfigured = true;
      logger.info("Google Calendar service initialized");
    } catch (error) {
      logger.error("Failed to initialize Google Calendar service", { error: error.message });
    }
  }

  /**
   * Create a calendar event for a booking
   */
  async createEvent(booking) {
    if (!this.isConfigured) {
      logger.warn("Google Calendar not configured, skipping event creation");
      return null;
    }

    try {
      const startTime = new Date(booking.scheduledAt);
      const endTime = new Date(startTime.getTime() + booking.duration * 60000);

      const event = {
        summary: `Tutoring Session: ${booking.subject}`,
        description: `
Peer Tutoring Session

Subject: ${booking.subject}
${booking.description ? `Description: ${booking.description}` : ""}

Student: ${booking.student.name} (${booking.student.email})
Tutor: ${booking.tutor.name} (${booking.tutor.email})

${booking.notes ? `Notes: ${booking.notes}` : ""}
        `.trim(),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: "UTC",
        },
        attendees: [
          { email: booking.student.email },
          { email: booking.tutor.email },
        ],
        // AUTO-GENERATE GOOGLE MEET LINK
        conferenceData: {
          createRequest: {
            requestId: `booking-${booking._id}-${Date.now()}`,
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 1 day before
            { method: "popup", minutes: 30 }, // 30 minutes before
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: "primary",
        resource: event,
        sendUpdates: "all",
        conferenceDataVersion: 1, 
      });

      logger.info("Google Calendar event created", { eventId: response.data.id ,  meetLink: response.data.hangoutLink });
      return {
        ...response.data,
         meetLink: response.data.hangoutLink 

      };
    } catch (error) {
      logger.error("Failed to create Google Calendar event", { error: error.message });
      throw error;
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(eventId, booking) {
    if (!this.isConfigured || !eventId) {
      return null;
    }

    try {
      const startTime = new Date(booking.scheduledAt);
      const endTime = new Date(startTime.getTime() + booking.duration * 60000);

      const event = {
        summary: `Tutoring Session: ${booking.subject}`,
        description: `
Peer Tutoring Session

Subject: ${booking.subject}
${booking.description ? `Description: ${booking.description}` : ""}
${booking.meetingLink ? `Meeting Link: ${booking.meetingLink}` : ""}

${booking.notes ? `Notes: ${booking.notes}` : ""}
        `.trim(),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: "UTC",
        },
      };

      const response = await this.calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        resource: event,
        sendUpdates: "all",
      });

      logger.info("Google Calendar event updated", { eventId });
      return response.data;
    } catch (error) {
      logger.error("Failed to update Google Calendar event", { error: error.message });
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId) {
    if (!this.isConfigured || !eventId) {
      return null;
    }

    try {
      await this.calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
        sendUpdates: "all",
      });

      logger.info("Google Calendar event deleted", { eventId });
      return true;
    } catch (error) {
      logger.error("Failed to delete Google Calendar event", { error: error.message });
      throw error;
    }
  }

  /**
   * Get OAuth URL for user authorization
   */
  getAuthUrl() {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );

    const scopes = ["https://www.googleapis.com/auth/calendar.events"];

    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code) {
    const oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }
}

const googleCalendarService = new GoogleCalendarService();

module.exports = { googleCalendarService, GoogleCalendarService };