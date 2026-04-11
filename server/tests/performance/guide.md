<<<<<<< HEAD
# Performance Testing Guide — PeerPulse
=======
## Requires Live Server

## One terminal runs the server; another runs Artillery.

## Terminal 1 — start server in test mode:
>>>>>>> origin/testing/study-hub

## Overview
This guide explains how to run performance and load tests using Artillery.js on the PeerPulse API.

## Prerequisites
- **Artillery CLI**: `npm install -g artillery` (or use `npx artillery`)
- **Node.js**: v16+ required
- **Live Server**: One terminal runs the server, another runs tests
- **MongoDB**: Running (in-memory for test mode)

## Setup Instructions

### Terminal 1: Start Test Server
```bash
cd server
<<<<<<< HEAD
NODE_ENV=test PORT=5001 node src/index.js
```
=======
set NODE_ENV=development && set PORT=5001 && node src/index.js
>>>>>>> origin/testing/study-hub

Wait until you see **"Database connected"** in the log before proceeding to Terminal 2.

<<<<<<< HEAD
### Terminal 2: Run Performance Tests
```bash
cd server

# Run individual performance test suites:

# Auth Performance Tests (Registration, Login, Refresh, Logout, /me)
npx artillery run tests/performance/scenarios/auth-performance.yml \
  --output tests/performance/results/auth-perf-$(date +%s).json

# Session/Booking Performance Tests (Bookings, Availability, Status Transitions)
npx artillery run tests/performance/scenarios/session-performance.yml \
  --output tests/performance/results/session-perf-$(date +%s).json

# Generate HTML reports from results
npx artillery report tests/performance/results/auth-perf-*.json
npx artillery report tests/performance/results/session-perf-*.json
```

## Performance Test Scenarios

### 1. Auth Performance Tests (`auth-performance.yml`)

Tests the authentication system under load with multiple concurrent scenarios.

**Scenarios:**
- **Registration Load Test**: 50→100 users ramping up and sustaining
  - Tests: User registration with unique emails under load
  - Measures: Registration latency, throughput
  
- **Login Flow Test**: Complete auth cycle (register → login → refresh → /me)
  - Tests: Login performance, token refresh, protected endpoint access
  - Measures: Login latency, JWT handling, cookie management
  
- **Concurrent Auth Stress Test**: 200 simultaneous login attempts
  - Tests: Rate limit behavior, system resilience
  - Measures: Error rates, rate limit triggers (429 responses)
  
- **Logout Flow Test**: Login → access protected resource → logout → verify 401
  - Tests: Session invalidation, cookie clearing
  - Measures: Logout latency, session cleanup

**Key Metrics:**
- Response time (p50, p95, p99)
- Success rate (should be >99%)
- Rate limit hits (429 responses)
- Error rate (should be <1%)

**Success Criteria:**
- p95 response time < 500ms
- p99 response time < 2000ms
- Error rate < 1%
- Successful rate limit at threshold

---

### 2. Session/Booking Performance Tests (`session-performance.yml`)

Tests the session and booking management system under realistic load patterns.

**Scenarios:**
- **Booking Creation Load Test**: 50 concurrent students creating bookings
  - Tests: Booking creation performance, database writes
  - Measures: Creation latency, throughput, write pressure
  
- **Availability Query Test**: 100 users querying availability
  - Tests: Read-heavy operations (slots, tutors, availability queries)
  - Measures: Query latency, database read performance
  
- **Booking Status Transitions**: 30 tutors accepting/declining/completing bookings
  - Tests: Concurrent updates, data consistency
  - Measures: Update latency, conflict handling
  
- **Complex Workflow**: Real-world scenario with tutors and students
  - Tests: Full user journey (setup availability → browse tutors → create booking)
  - Measures: End-to-end latency, realistic performance

**Key Metrics:**
- Response time percentiles
- Concurrent operation success rate
- Data consistency under concurrent updates
- Database connection pool efficiency

**Success Criteria:**
- p95 response time < 800ms for booking operations
- p99 response time < 2000ms
- Data consistency maintained across concurrent updates
- No connection pool exhaustion

---

## Analyzing Results

### View Summary in Terminal
Online JSON detailed results while test runs:
```bash
npx artillery run tests/performance/scenarios/auth-performance.yml
```

### Generate HTML Report
```bash
npx artillery report tests/performance/results/auth-perf-1234567890.json
# Opens in browser with graphs, metrics, and detailed analytics
```

### Key Metrics to Watch
- **Response Time**: How fast endpoints respond (aim for p95 < 500ms for auth)
- **Throughput**: Requests/second the system handles
- **Error Rate**: % of failed requests (should be <1%)
- **Latency Distribution**: p50, p95, p99 percentiles
- **Rate Limit Behavior**: How system responds under stress

---

## Troubleshooting

### "Connection refused" error
- Ensure server is running in Terminal 1
- Check that server started successfully with "Database connected" message
- Verify PORT=5001 is not in use

### "Rate limit exceeded" (429 errors)
- Expected during stress tests
- Review rate limit configuration in `.env.test`
- May need to adjust `RATE_LIMIT_MAX` for tuning

### Memory issues during tests
- Run tests in phases rather than all at once
- Monitor server memory usage: `top` or Task Manager
- Consider using soak testing with longer durations, lower arrival rates

### Authentication failures
- Verify `.env.test` has valid `JWT_SECRET`
- Ensure MongoDB is running and accessible
- Check server logs for detailed error messages

---

## Advanced Configuration

### Modify Load Phases
Edit `phases:` in YAML files to adjust:
- `duration`: How long phase runs (seconds)
- `arrivalRate`: Users/second entering the scenario
- `ramp`: Gradual increase from 0 to arrivalRate (optional)

### Add Custom Processor
Create `processor.js` in scenarios folder for dynamic data generation:
```javascript
module.exports = {
  generateEmail: function(context, ee, next) {
    context.vars.email = `user${Date.now()}@test.com`;
    return next();
  }
};
```

### Environment Variables
Configure in `.env.test`:
- `JWT_SECRET`: Must match server config
- `RATE_LIMIT_MAX`: Requests per minute
- `NODE_ENV`: Must be `test`

---

## Run All Performance Tests (Sequential)

```bash
#!/bin/bash
cd server

echo "Running Auth Performance Tests..."
npx artillery run tests/performance/scenarios/auth-performance.yml \
  --output tests/performance/results/auth-perf.json

echo "Waiting 30 seconds between tests..."
sleep 30

echo "Running Session Performance Tests..."
npx artillery run tests/performance/scenarios/session-performance.yml \
  --output tests/performance/results/session-perf.json

echo "Generating reports..."
npx artillery report tests/performance/results/auth-perf.json
npx artillery report tests/performance/results/session-perf.json

echo "All tests completed! Check results in tests/performance/results/"
```

---

## References
- [Artillery Documentation](https://artillery.io/docs)
- [Artillery CLI Reference](https://artillery.io/docs/guides/tools/cli)
- [Load Testing Best Practices](https://en.wikipedia.org/wiki/Load_testing)
=======
## Terminal 2 — create the Artillery YAML files

## Run per-module performance tests (each member runs their own)

cd server

# Member 1

npx artillery run tests/performance/scenarios/auth-load.yml

# Member 1 — bookings / sessions
npx artillery run tests/performance/scenarios/booking-load.yml

# Member 2

npx artillery run tests/performance/scenarios/resource-load.yml

## Resource load test notes

- This scenario expects pre-authenticated tutor data from: tests/performance/data/resource-users.csv
- Required CSV columns: accessToken,tutorId
- It covers create (link upload), list, search, metadata update, and delete.
- Use a valid cookie token value (the raw accessToken cookie value) for each row.
- If you want higher load without 429 responses, raise RATE_LIMIT_MAX in env for the perf run.

## How to prepare resource-users.csv quickly

1. Register a tutor via API (or UI).
2. Login with that tutor and copy the accessToken cookie value.
3. Copy tutor \_id from login response user object.
4. Put both values in tests/performance/data/resource-users.csv.

## Run the resource load test

cd server
npx artillery run tests/performance/scenarios/resource-load.yml

# Member 3

npx artillery run tests/performance/scenarios/review-load.yml
# or:
npm run test:perf:review

# Member 4

npx artillery run tests/performance/scenarios/thread-load.yml
>>>>>>> origin/testing/study-hub
