const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../../src/database/models/session.model');
jest.mock('../../../src/database/models/availability.model');
jest.mock('../../../src/database/models/user.model');
jest.mock('../../../src/integrations/google-calendar');
jest.mock('../../../src/common/email/sendgrid.client');

const { BookingModel, BookingStatus } = require('../../../src/database/models/session.model');
const { AvailabilityModel } = require('../../../src/database/models/availability.model');
const UserModel = require('../../../src/database/models/user.model');
const { googleCalendarService } = require('../../../src/integrations/google-calendar');
const { sendEmail } = require('../../../src/common/email/sendgrid.client');
const { BookingService } = require('../../../src/modules/session/session.service');
const {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} = require('../../../src/common/utils/errors-utils');

let bookingService;

beforeEach(() => {
  bookingService = new BookingService();
  jest.clearAllMocks();
});

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeTutor = (overrides = {}) => ({
  _id: 'tutor-id',
  name: 'John Tutor',
  email: 'john@test.com',
  role: 'tutor',
  skills: ['Math', 'Physics'],
  ...overrides,
});

const makeStudent = (overrides = {}) => ({
  _id: 'student-id',
  name: 'Alice Student',
  email: 'alice@test.com',
  role: 'student',
  ...overrides,
});

const makeBooking = (overrides = {}) => ({
  _id: 'booking-id',
  student: 'student-id',
  tutor: 'tutor-id',
  subject: 'Mathematics',
  description: 'Algebra tutorial',
  scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  duration: 60,
  status: BookingStatus.PENDING,
  notes: 'Please prepare notes',
  populate: jest.fn().mockResolvedValue(this),
  save: jest.fn().mockResolvedValue(this),
  ...overrides,
});

const makeAvailability = (overrides = {}) => ({
  _id: 'avail-id',
  tutor: 'tutor-id',
  timezone: 'UTC',
  isActive: true,
  weeklySchedule: new Map([
    ['1', [{ startTime: '09:00', endTime: '17:00' }]], // Monday
  ]),
  dateOverrides: [],
  ...overrides,
});

// ─── createBooking ───────────────────────────────────────────────────────────

describe('BookingService.createBooking', () => {
  it('creates a booking and returns populated data', async () => {
    const tutor = makeTutor();
    const booking = makeBooking();

    UserModel.findById.mockResolvedValue(tutor);
    AvailabilityModel.findOne.mockResolvedValue(makeAvailability({
      weeklySchedule: new Map([
        // Monday = 1, so a Monday 7 days from now should work
        ['1', [{ startTime: '00:00', endTime: '23:59' }]],
        ['0', [{ startTime: '00:00', endTime: '23:59' }]],
        ['2', [{ startTime: '00:00', endTime: '23:59' }]],
        ['3', [{ startTime: '00:00', endTime: '23:59' }]],
        ['4', [{ startTime: '00:00', endTime: '23:59' }]],
        ['5', [{ startTime: '00:00', endTime: '23:59' }]],
        ['6', [{ startTime: '00:00', endTime: '23:59' }]],
      ]),
    }));
    BookingModel.findOne.mockResolvedValue(null); // No conflicts
    BookingModel.create.mockResolvedValue(booking);

    const result = await bookingService.createBooking('student-id', {
      tutor: 'tutor-id',
      subject: 'Mathematics',
      description: 'Algebra tutorial',
      scheduledAt: booking.scheduledAt.toISOString(),
      duration: 60,
      notes: 'Please prepare notes',
    });

    expect(result).toBeDefined();
    expect(BookingModel.create).toHaveBeenCalled();
  });

  it('throws NotFoundException when tutor does not exist', async () => {
    UserModel.findById.mockResolvedValue(null);

    await expect(
      bookingService.createBooking('student-id', {
        tutor: 'nonexistent-tutor',
        subject: 'Math',
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 60,
      })
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when user is not a tutor', async () => {
    UserModel.findById.mockResolvedValue(makeStudent());

    await expect(
      bookingService.createBooking('student-id', {
        tutor: 'not-a-tutor',
        subject: 'Math',
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 60,
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when student books themselves', async () => {
    const tutor = makeTutor({ _id: 'student-id' }); // Same as student
    UserModel.findById.mockResolvedValue(tutor);

    await expect(
      bookingService.createBooking('student-id', {
        tutor: 'student-id',
        subject: 'Math',
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 60,
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when session is in the past', async () => {
    const tutor = makeTutor();
    const pastDate = new Date(Date.now() - 1000);

    UserModel.findById.mockResolvedValue(tutor);

    await expect(
      bookingService.createBooking('student-id', {
        tutor: 'tutor-id',
        subject: 'Math',
        scheduledAt: pastDate.toISOString(),
        duration: 60,
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when tutor is not available', async () => {
    const tutor = makeTutor();

    UserModel.findById.mockResolvedValue(tutor);
    AvailabilityModel.findOne.mockResolvedValue(null); // No availability set

    await expect(
      bookingService.createBooking('student-id', {
        tutor: 'tutor-id',
        subject: 'Math',
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 60,
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when time slot is already booked', async () => {
    const tutor = makeTutor();
    const booking = makeBooking();

    UserModel.findById.mockResolvedValue(tutor);
    AvailabilityModel.findOne.mockResolvedValue(makeAvailability());
    BookingModel.findOne.mockResolvedValue(booking); // Conflict exists

    await expect(
      bookingService.createBooking('student-id', {
        tutor: 'tutor-id',
        subject: 'Math',
        scheduledAt: booking.scheduledAt.toISOString(),
        duration: 60,
      })
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── getBookings ──────────────────────────────────────────────────────────────

describe('BookingService.getBookings', () => {
  it('returns student bookings with pagination', async () => {
    const booking = makeBooking();

    BookingModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([booking]),
            }),
          }),
        }),
      }),
    });
    BookingModel.countDocuments.mockResolvedValue(1);

    const result = await bookingService.getBookings('student-id', 'student');

    expect(result.bookings).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('filters bookings by status', async () => {
    const booking = makeBooking({ status: BookingStatus.ACCEPTED });

    BookingModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([booking]),
            }),
          }),
        }),
      }),
    });
    BookingModel.countDocuments.mockResolvedValue(1);

    const result = await bookingService.getBookings('student-id', 'student', { status: BookingStatus.ACCEPTED });

    expect(result.bookings[0].status).toBe(BookingStatus.ACCEPTED);
  });

  it('returns tutor bookings', async () => {
    const booking = makeBooking();

    BookingModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([booking]),
            }),
          }),
        }),
      }),
    });
    BookingModel.countDocuments.mockResolvedValue(1);

    const result = await bookingService.getBookings('tutor-id', 'tutor');

    expect(result.bookings).toHaveLength(1);
  });
});

// ─── getBookingById ───────────────────────────────────────────────────────────

describe('BookingService.getBookingById', () => {
  it('returns booking when user is the student', async () => {
    const mockPopulate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 'booking-id',
        student: { _id: 'student-id' },
        tutor: { _id: 'tutor-id' },
      }),
    });

    BookingModel.findById.mockReturnValue({
      populate: mockPopulate,
    });

    const result = await bookingService.getBookingById('booking-id', 'student-id');

    expect(result._id).toBe('booking-id');
  });

  it('returns booking when user is the tutor', async () => {
    const mockPopulate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 'booking-id',
        student: { _id: 'student-id' },
        tutor: { _id: 'tutor-id' },
      }),
    });

    BookingModel.findById.mockReturnValue({
      populate: mockPopulate,
    });

    const result = await bookingService.getBookingById('booking-id', 'tutor-id');

    expect(result._id).toBe('booking-id');
  });

  it('throws NotFoundException when booking does not exist', async () => {
    const mockPopulate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    BookingModel.findById.mockReturnValue({
      populate: mockPopulate,
    });

    await expect(bookingService.getBookingById('nonexistent', 'user-id')).rejects.toThrow(
      NotFoundException
    );
  });

  it('throws ForbiddenException when user is not involved in booking', async () => {
    const mockPopulate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 'booking-id',
        student: { _id: 'student-id' },
        tutor: { _id: 'tutor-id' },
      }),
    });

    BookingModel.findById.mockReturnValue({
      populate: mockPopulate,
    });

    await expect(bookingService.getBookingById('booking-id', 'unauthorized-user')).rejects.toThrow(
      ForbiddenException
    );
  });
});

// ─── acceptBooking ───────────────────────────────────────────────────────────

describe('BookingService.acceptBooking', () => {
  it('accepts a pending booking', async () => {
    const booking = {
      _id: 'booking-id',
      tutor: { _id: 'tutor-id' },
      student: { _id: 'student-id', email: 'alice@test.com' },
      status: BookingStatus.PENDING,
      meetingLink: null,
      notes: '',
      save: jest.fn().mockResolvedValue(true),
      populate: jest.fn().mockResolvedValue({
        student: { email: 'alice@test.com' },
        tutor: { name: 'John' },
      }),
    };

    const mockPopulate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(booking),
    });

    BookingModel.findById.mockReturnValue({
      populate: mockPopulate,
    });

    googleCalendarService.createEvent.mockResolvedValue(null);

    const result = await bookingService.acceptBooking('booking-id', 'tutor-id', {
      meetingLink: 'https://meet.google.com/abc',
    });

    expect(booking.status).toBe(BookingStatus.ACCEPTED);
    expect(booking.meetingLink).toBe('https://meet.google.com/abc');
  });

  it('throws ForbiddenException when non-tutor accepts', async () => {
    const booking = {
      _id: 'booking-id',
      tutor: { _id: 'tutor-id' },
      student: { _id: 'student-id' },
      status: BookingStatus.PENDING,
    };

    const mockPopulate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(booking),
    });

    BookingModel.findById.mockReturnValue({
      populate: mockPopulate,
    });

    await expect(bookingService.acceptBooking('booking-id', 'other-user')).rejects.toThrow(
      ForbiddenException
    );
  });

  it('throws BadRequestException when booking is not pending', async () => {
    const booking = {
      _id: 'booking-id',
      tutor: { _id: 'tutor-id' },
      student: { _id: 'student-id' },
      status: BookingStatus.ACCEPTED,
    };

    const mockPopulate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(booking),
    });

    BookingModel.findById.mockReturnValue({
      populate: mockPopulate,
    });

    await expect(bookingService.acceptBooking('booking-id', 'tutor-id')).rejects.toThrow(
      BadRequestException
    );
  });

  it('syncs with Google Calendar when accepting', async () => {
    const booking = {
      _id: 'booking-id',
      tutor: { _id: 'tutor-id' },
      student: { _id: 'student-id', email: 'alice@test.com' },
      status: BookingStatus.PENDING,
      meetingLink: null,
      notes: '',
      save: jest.fn().mockResolvedValue(true),
      populate: jest.fn().mockResolvedValue({
        student: { email: 'alice@test.com' },
        tutor: { name: 'John' },
      }),
    };

    const mockPopulate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(booking),
    });

    BookingModel.findById.mockReturnValue({
      populate: mockPopulate,
    });

    googleCalendarService.createEvent.mockResolvedValue({
      id: 'event-123',
      meetLink: 'https://meet.google.com/generated',
    });

    await bookingService.acceptBooking('booking-id', 'tutor-id');

    expect(googleCalendarService.createEvent).toHaveBeenCalledWith(booking);
  });
});

// ─── declineBooking ───────────────────────────────────────────────────────────

describe('BookingService.declineBooking', () => {
  it('declines a pending booking', async () => {
    const booking = {
      _id: 'booking-id',
      tutor: 'tutor-id',
      student: 'student-id',
      status: BookingStatus.PENDING,
      cancelReason: null,
      cancelledBy: null,
      save: jest.fn().mockResolvedValue(true),
      populate: jest.fn().mockResolvedValue({
        tutor: 'tutor-id',
        student: 'student-id',
      }),
    };

    BookingModel.findById.mockResolvedValue(booking);

    const result = await bookingService.declineBooking('booking-id', 'tutor-id', 'Not available');

    expect(booking.status).toBe(BookingStatus.DECLINED);
    expect(booking.cancelReason).toBe('Not available');
    expect(booking.cancelledBy).toBe('tutor-id');
  });

  it('throws ForbiddenException when non-tutor declines', async () => {
    const booking = {
      _id: 'booking-id',
      tutor: 'tutor-id',
      student: 'student-id',
      status: BookingStatus.PENDING,
    };

    BookingModel.findById.mockResolvedValue(booking);

    await expect(
      bookingService.declineBooking('booking-id', 'other-user', 'reason')
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when booking is not pending', async () => {
    const booking = {
      _id: 'booking-id',
      tutor: 'tutor-id',
      student: 'student-id',
      status: BookingStatus.ACCEPTED,
    };

    BookingModel.findById.mockResolvedValue(booking);

    await expect(
      bookingService.declineBooking('booking-id', 'tutor-id', 'reason')
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── cancelBooking ────────────────────────────────────────────────────────────

describe('BookingService.cancelBooking', () => {
  it('cancels a pending booking', async () => {
    const booking = {
      _id: 'booking-id',
      student: 'student-id',
      tutor: 'tutor-id',
      status: BookingStatus.PENDING,
      googleCalendarEventId: null,
      cancelReason: null,
      cancelledBy: null,
      save: jest.fn().mockResolvedValue(true),
      populate: jest.fn().mockResolvedValue({
        student: 'student-id',
        tutor: 'tutor-id',
      }),
    };

    BookingModel.findById.mockResolvedValue(booking);

    const result = await bookingService.cancelBooking('booking-id', 'student-id', 'Emergency');

    expect(booking.status).toBe(BookingStatus.CANCELLED);
    expect(booking.cancelReason).toBe('Emergency');
  });

  it('throws ForbiddenException when unauthorized user cancels', async () => {
    const booking = {
      _id: 'booking-id',
      student: 'student-id',
      tutor: 'tutor-id',
      status: BookingStatus.PENDING,
    };

    BookingModel.findById.mockResolvedValue(booking);

    await expect(
      bookingService.cancelBooking('booking-id', 'other-user', 'reason')
    ).rejects.toThrow(ForbiddenException);
  });

  it('removes from Google Calendar when canceling', async () => {
    const booking = {
      _id: 'booking-id',
      student: 'student-id',
      tutor: 'tutor-id',
      status: BookingStatus.PENDING,
      googleCalendarEventId: 'event-123',
      cancelReason: null,
      cancelledBy: null,
      save: jest.fn().mockResolvedValue(true),
      populate: jest.fn().mockResolvedValue({
        student: 'student-id',
        tutor: 'tutor-id',
      }),
    };

    BookingModel.findById.mockResolvedValue(booking);
    googleCalendarService.deleteEvent.mockResolvedValue(true);

    await bookingService.cancelBooking('booking-id', 'student-id', 'reason');

    expect(googleCalendarService.deleteEvent).toHaveBeenCalledWith('event-123');
  });
});

// ─── completeBooking ──────────────────────────────────────────────────────────

// describe('BookingService.completeBooking', () => {
//   it('marks a confirmed booking as completed', async () => {
//     const booking = {
//       _id: 'booking-id',
//       student: 'student-id',
//       tutor: 'tutor-id',
//       status: BookingStatus.CONFIRMED,
//       scheduledAt: new Date(Date.now() - 1000), // Past
//       save: jest.fn().mockResolvedValue(true),
//       populate: jest.fn().mockResolvedValue({
//         student: { _id: 'student-id', email: 'alice@test.com' },
//         tutor: { _id: 'tutor-id', name: 'John' },
//       }),
//     };

//     BookingModel.findById.mockResolvedValue(booking);
//     sendEmail.mockResolvedValue(true);

//     const result = await bookingService.completeBooking('booking-id', 'student-id');

//     expect(booking.status).toBe(BookingStatus.COMPLETED);
//     expect(booking.completedAt).toBeDefined();
//   });

//   it('throws BadRequestException when booking is not in past', async () => {
//     const booking = {
//       _id: 'booking-id',
//       student: 'student-id',
//       tutor: 'tutor-id',
//       status: BookingStatus.CONFIRMED,
//       scheduledAt: new Date(Date.now() + 1000), // Future
//     };

//     BookingModel.findById.mockResolvedValue(booking);

//     await expect(bookingService.completeBooking('booking-id', 'student-id')).rejects.toThrow(
//       BadRequestException
//     );
//   });

//   it('sends review request email on completion', async () => {
//     const booking = {
//       _id: 'booking-id',
//       student: 'student-id',
//       tutor: 'tutor-id',
//       status: BookingStatus.CONFIRMED,
//       scheduledAt: new Date(Date.now() - 1000),
//       save: jest.fn().mockResolvedValue(true),
//       populate: jest.fn().mockResolvedValue({
//         student: { _id: 'student-id', email: 'alice@test.com' },
//         tutor: { _id: 'tutor-id', name: 'John' },
//       }),
//     };

//     BookingModel.findById.mockResolvedValue(booking);
//     sendEmail.mockResolvedValue(true);

//     await bookingService.completeBooking('booking-id', 'student-id');

//     expect(sendEmail).toHaveBeenCalled();
//   });
// });

// ─── getAvailableSlots ────────────────────────────────────────────────────────

describe('BookingService.getAvailableSlots', () => {
  it('returns available slots for a tutor on a specific date', async () => {
    const tutor = makeTutor();
    const availability = makeAvailability({
      weeklySchedule: new Map([
        ['1', [{ startTime: '09:00', endTime: '17:00' }]], // Monday
      ]),
    });

    UserModel.findById.mockResolvedValue(tutor);
    AvailabilityModel.findOne.mockResolvedValue(availability);
    BookingModel.findOne.mockResolvedValue(null); // No conflicts

    const futureMonday = new Date();
    futureMonday.setDate(futureMonday.getDate() + ((1 - futureMonday.getDay() + 7) % 7) || 7); // Next Monday

    const slots = await bookingService.getAvailableSlots('tutor-id', futureMonday.toISOString().split('T')[0], 60);

    expect(Array.isArray(slots)).toBe(true);
  });

  it('throws NotFoundException when tutor does not exist', async () => {
    UserModel.findById.mockResolvedValue(null);

    await expect(
      bookingService.getAvailableSlots('nonexistent-tutor', '2025-12-01', 60)
    ).rejects.toThrow(NotFoundException);
  });

  it('returns empty array when tutor has no active availability', async () => {
    const tutor = makeTutor();

    UserModel.findById.mockResolvedValue(tutor);
    AvailabilityModel.findOne.mockResolvedValue(null);

    const slots = await bookingService.getAvailableSlots('tutor-id', '2025-12-01', 60);

    expect(slots).toEqual([]);
  });
});
