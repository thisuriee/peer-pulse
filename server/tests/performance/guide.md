## Requires Live Server

## One terminal runs the server; another runs Artillery.

## Terminal 1 — start server in test mode:

cd server
set NODE_ENV=development && set PORT=5001 && node src/index.js

## Wait until you see "Database connected" in the log

## Terminal 2 — create the Artillery YAML files

## Run per-module performance tests (each member runs their own)

cd server

# Member 1

npx artillery run tests/performance/scenarios/auth-load.yml
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

# Member 4

npx artillery run tests/performance/scenarios/thread-load.yml
