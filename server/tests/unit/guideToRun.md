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

### Run Review Tests
```bash
cd server
npm run test:unit:review
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

### Review Tests (`tests/unit/review/`)

Run review unit tests:
```bash
cd server
npm run test:unit:review
```

Run review tests with coverage:
```bash
cd server
NODE_ENV=test npx jest tests/unit/review --coverage
```

Run review-only module coverage (`src/modules/review` only):
```bash
cd server
NODE_ENV=test npx jest tests/unit/review --coverage --collectCoverageFrom="src/modules/review/**/*.js"
```

- **badge.service.test.js** - Tests badge thresholds (`none`, `rookie`, `bronze`, `silver`, `gold`)
- **reputation.service.test.js** - Tests tutor reputation recalculation and zero-state defaults
- **review.repository.test.js** - Tests repository query/update behavior
- **review.controller.test.js** - Tests controller responses and error forwarding
- **review.service.test.js** - Tests core review module logic (create/update/delete/read/leaderboard)
- **review.routes.test.js** - Tests route-to-controller mapping
- **review.module.test.js** - Tests module wiring/instantiation

## Running All Unit Tests

```bash
cd server
npm run test:unit
```

This will run:
- All Auth tests
- All Session tests
- All Review tests
- Any other unit tests in the `tests/unit/` directory

## Open Coverage Report

After running any coverage command, Jest generates:
- `server/coverage/lcov-report/index.html`

Open it from the `server` directory:

```bash
# Linux desktop
xdg-open coverage/lcov-report/index.html
```

```bash
# macOS
open coverage/lcov-report/index.html
```

```bash
# WSL (open in Windows default browser)
explorer.exe coverage\\lcov-report\\index.html
```

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