# Performance Testing Guide — PeerPulse

## Overview
This guide explains how to run performance and load tests using Artillery.js on the PeerPulse API.

## Prerequisites
- **Artillery CLI**: `npm install -g artillery` (or use `npx artillery`)
- **Node.js**: v16+ required
- **Live Server**: One terminal runs the server, another runs tests
- **MongoDB**: Running (in-memory for test mode)

## Setup Instructions

### Terminal 1: Start Test Server
## Requires live server

Use **two terminals**. Artillery sends real HTTP requests; nothing runs in Jest here.

### Terminal 1 — start the API (test config, port 5001)

```bash
cd server
NODE_ENV=test PORT=5001 node src/index.js
```

Wait until you see **"Database connected"** in the log before proceeding to Terminal 2.

### Terminal 2: Run Performance Tests
Wait until you see **Database connected** (or equivalent) before running Artillery.

### Terminal 2 — run load tests

```bash
cd server
```

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
Per-module scenarios (each member maintains their own YAML under `tests/performance/scenarios/`):

```bash
# Member 1 — auth
npx artillery run tests/performance/scenarios/auth-load.yml

# Member 1 — bookings / sessions
npx artillery run tests/performance/scenarios/booking-load.yml

# Member 2 — resources
npx artillery run tests/performance/scenarios/resource-load.yml

# Member 3 — reviews & reputation (you)
npx artillery run tests/performance/scenarios/review-load.yml
# or:
npm run test:perf:review

# Member 4 — threads
npx artillery run tests/performance/scenarios/thread-load.yml
```

Optional: write JSON for reports:

```bash
npx artillery run tests/performance/scenarios/review-load.yml \
  --output tests/performance/results/review-perf-$(date +%s).json

npx artillery report tests/performance/results/review-perf-*.json
```

Create `tests/performance/results/` if it does not exist.

---

## Member 3 — `review-load.yml` (reviews & reputation)

**What it exercises**

- **Leaderboard read load** — `GET /api/v1/reviews/leaderboard` after register + login (hits aggregation + tutor queries).
- **My reviews + tutor listing** — `GET /api/v1/reviews` and `GET /api/v1/reviews/tutor/:tutorId` (authenticated read paths).
- **Review create stress** — `POST /api/v1/reviews` with a valid ObjectId that is **not** a real booking → **404** (still runs auth + validation + `BookingModel.findById`).

**Why not always POST a real review?**

Creating a review requires a booking owned by the student in a **started/completed** state. That needs tutor availability, booking create, accept, and often complete — multiple actors and cookies. This file keeps the scenario **simple and stable** while still load-testing the review module’s hot paths. You can extend it later with an Artillery `processor` if you need a full happy-path write.

**Metrics to watch**

- p50 / p95 / p99 latency on `GET .../leaderboard` and `GET .../reviews`
- HTTP error rate (expect ~0% for the read scenarios when the server is healthy)
- 404 rate on the POST scenario should be **100%** (by design)

**Common issues**

- **ECONNREFUSED** — server not running on `http://localhost:5001`
- **429** — lower `arrivalRate` or raise auth/global rate limits in `.env` for local tuning
- **401 on review routes** — login must succeed so `Set-Cookie` is stored for the same virtual user flow

---

## References

- [Artillery documentation](https://www.artillery.io/docs)
- `tests/performance/scenarios/review-load.yml` — Member 3 scenario definitions
