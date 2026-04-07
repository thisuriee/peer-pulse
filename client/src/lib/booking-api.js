import apiClient from './api-client';

// ============================================================
// Tutor Discovery
// ============================================================

/**
 * GET /bookings/tutors
 * @param {Object} params
 * @param {string}  [params.subject]    - Filter tutors by subject/skill
 * @param {boolean} [params.activeOnly] - When true, only return tutors with active availability
 * @returns {Promise<Array>} Array of tutor objects, each with an `availability` field
 */
export const getTutors = async (params = {}) => {
  const response = await apiClient.get('/bookings/tutors', { params });
  return response.data.data;
};

// ============================================================
// Slot Availability
// ============================================================

/**
 * GET /bookings/slots
 * @param {string} tutorId  - MongoDB ObjectId of the tutor
 * @param {string} date     - Target date in YYYY-MM-DD format (backend regex-validates this)
 * @param {number} [duration=60] - Session length in minutes (15–180)
 * @returns {Promise<Array>} Array of available slot objects: { startTime, endTime, duration }
 *                           startTime/endTime are ISO 8601 strings
 */
export const getAvailableSlots = async (tutorId, date, duration = 60) => {
  const response = await apiClient.get('/bookings/slots', {
    params: { tutorId, date, duration },
  });
  return response.data.data;
};

// ============================================================
// Booking CRUD
// ============================================================

/**
 * GET /bookings
 * Returns all bookings for the authenticated user (role-filtered server-side).
 * @param {Object} params
 * @param {string} [params.status]    - Filter by status: pending | accepted | confirmed | completed | cancelled | declined
 * @param {string} [params.startDate] - ISO date string — lower bound for scheduledAt
 * @param {string} [params.endDate]   - ISO date string — upper bound for scheduledAt
 * @returns {Promise<Array>} Array of populated booking objects
 */
export const getBookings = async (params = {}) => {
  const response = await apiClient.get('/bookings', { params });
  return response.data.data;
};

/**
 * GET /bookings/:id
 * @param {string} id - MongoDB ObjectId of the booking
 * @returns {Promise<Object>} Single populated booking (student + tutor fields)
 */
export const getBookingById = async (id) => {
  const response = await apiClient.get(`/bookings/${id}`);
  return response.data.data;
};

/**
 * POST /bookings  (students only)
 * @param {Object} data
 * @param {string} data.tutor        - Tutor's MongoDB ObjectId
 * @param {string} data.subject      - Subject string (max 100 chars)
 * @param {string} data.scheduledAt  - ISO 8601 datetime string (must be in the future)
 * @param {number} [data.duration=60]    - Session length in minutes (15–180)
 * @param {string} [data.description]    - Optional description (max 500 chars)
 * @param {string} [data.notes]          - Optional notes (max 1000 chars)
 * @returns {Promise<Object>} Created booking with populated student + tutor
 */
export const createBooking = async (data) => {
  const response = await apiClient.post('/bookings', data);
  return response.data.data;
};

// ============================================================
// Booking Lifecycle Actions
// ============================================================

/**
 * PUT /bookings/:id/accept  (tutors only)
 * Accepts a pending booking. If Google Calendar is configured the booking
 * status will advance from ACCEPTED → CONFIRMED server-side.
 * @param {string} id   - Booking ObjectId
 * @param {Object} [data]
 * @param {string} [data.meetingLink] - Valid URL for the video call (optional;
 *                                      server may auto-generate a Google Meet link)
 * @param {string} [data.notes]       - Optional notes for the student (max 1000 chars)
 * @returns {Promise<Object>} Updated booking
 */
export const acceptBooking = async (id, data = {}) => {
  const response = await apiClient.put(`/bookings/${id}/accept`, data);
  return response.data.data;
};

/**
 * PUT /bookings/:id/decline  (tutors only)
 * @param {string} id
 * @param {Object} data
 * @param {string} data.reason - Required decline reason (1–500 chars)
 * @returns {Promise<Object>} Updated booking
 */
export const declineBooking = async (id, data) => {
  const response = await apiClient.put(`/bookings/${id}/decline`, data);
  return response.data.data;
};

/**
 * DELETE /bookings/:id
 * Cancels a booking. Cancellable from PENDING, ACCEPTED, or CONFIRMED states.
 * Also removes the Google Calendar event if one was synced.
 * NOTE: Axios requires `{ data: body }` to send a request body with DELETE.
 * @param {string} id
 * @param {Object} data
 * @param {string} data.reason - Required cancel reason (1–500 chars)
 * @returns {Promise<Object>} Updated booking
 */
export const cancelBooking = async (id, data) => {
  const response = await apiClient.delete(`/bookings/${id}`, { data });
  return response.data.data;
};

/**
 * PUT /bookings/:id/complete
 * Marks a CONFIRMED or ACCEPTED booking as COMPLETED.
 * Can only be called after the scheduled time has passed.
 * Triggers a review-request email to the student server-side.
 * @param {string} id - Booking ObjectId
 * @returns {Promise<Object>} Updated booking
 */
export const completeBooking = async (id) => {
  const response = await apiClient.put(`/bookings/${id}/complete`);
  return response.data.data;
};

// ============================================================
// Tutor Availability Management  (tutors only)
// ============================================================

/**
 * GET /bookings/availability
 * Returns the authenticated tutor's availability record.
 * If no record exists the server creates a default (isActive: false) one.
 * @returns {Promise<Object>} Availability object:
 *   { timezone, weeklySchedule (Map<dayIndex, TimeSlot[]>),
 *     dateOverrides, subjects, sessionDurations, isActive }
 */
export const getAvailability = async () => {
  const response = await apiClient.get('/bookings/availability');
  return response.data.data;
};

/**
 * PUT /bookings/availability  (tutors only)
 * Partial update — only supplied fields are changed.
 * weeklySchedule keys are day-of-week indices as strings ("0"=Sun … "6"=Sat).
 * Each slot must have startTime < endTime in "HH:mm" format.
 * @param {Object} data
 * @param {string}                [data.timezone]         - IANA timezone string
 * @param {Record<string, Array>} [data.weeklySchedule]   - e.g. { "1": [{startTime:"09:00", endTime:"12:00"}] }
 * @param {string[]}              [data.subjects]         - Subjects the tutor teaches
 * @param {number[]}              [data.sessionDurations] - Offered durations in minutes (15–180)
 * @param {boolean}               [data.isActive]         - Enable/disable availability
 * @returns {Promise<Object>} Updated availability record
 */
export const updateAvailability = async (data) => {
  const response = await apiClient.put('/bookings/availability', data);
  return response.data.data;
};

/**
 * POST /bookings/availability/override  (tutors only)
 * Adds (or replaces) a date-specific availability override.
 * If an override for the same date already exists it is replaced.
 * @param {Object}  data
 * @param {string}  data.date       - ISO 8601 datetime string for the target date
 * @param {boolean} data.available  - false = block the entire day
 * @param {Array}   [data.slots]    - Custom time slots for this date: [{ startTime, endTime }]
 *                                    Required when available is true and custom hours are needed
 * @returns {Promise<Object>} Updated availability record
 */
export const addDateOverride = async (data) => {
  const response = await apiClient.post('/bookings/availability/override', data);
  return response.data.data;
};

/**
 * DELETE /bookings/availability/override  (tutors only)
 * Removes the date override for the given date.
 * NOTE: backend reads `date` from req.query, so it is sent as a query param (not body).
 * @param {string} date - The date to remove in any format the server's Date constructor accepts
 * @returns {Promise<Object>} Updated availability record
 */
export const removeDateOverride = async (date) => {
  const response = await apiClient.delete('/bookings/availability/override', {
    params: { date },
  });
  return response.data.data;
};
