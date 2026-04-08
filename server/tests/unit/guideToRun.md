# Unit Testing Guide

## Running Individual Test Suites

### Run Auth Tests
```bash
cd server
npm run test:unit:auth
```

### Run Session Tests
```bash
cd server
npm run test:unit:session
```

## Test Structure

### Auth Tests (`tests/unit/auth/`)
- **auth-session.model.test.js** - Tests AuthSession Mongoose schema
- **auth.service.test.js** - Tests authentication service (register, login, logout, token refresh)
- **auth.middleware.test.js** - Tests JWT authentication middleware

### Session Tests (`tests/unit/session/`)
- **session-model.test.js** - Tests Booking Model schema and BookingStatus enum
- **availability-model.test.js** - Tests Availability Model schema and DayOfWeek enum
- **session-validator.test.js** - Tests Zod validation schemas for bookings and availability
- **session.service.test.js** - Tests BookingService (create, update, accept, decline, cancel bookings)
- **availability.service.test.js** - Tests AvailabilityService (manage tutor availability)

## Running All Unit Tests

```bash
cd server
npm run test:unit
```

This will run:
- All Auth tests
- All Session tests
- Any other unit tests in the `tests/unit/` directory

## Test Coverage

**Auth Coverage:**
- User registration and validation
- Login with password verification
- JWT token generation and refresh
- Session management
- Authentication middleware

**Session Coverage:**
- Booking creation with availability checks
- Double-booking conflict detection
- Booking status transitions (pending → accepted → completed)
- Booking cancellation and decline
- Tutor availability scheduling
- Date overrides for special availability
- Available time slot generation
- Input validation for all operations

## Important Notes

- All tests use Jest mocks for database models and external services
- No actual database connection is required
- Tests follow the same patterns established in auth tests
- Validation is tested with both valid and invalid inputs
- Edge cases are covered (past dates, conflicts, unauthorized access)

All unit tests must pass before proceeding to Phase 2.