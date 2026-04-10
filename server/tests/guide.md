## Phase 4: Full Suite Run + Coverage Report

cd server

# Step 1 — all unit tests
npm run test:unit

# Step 2 — all integration tests
npm run test:integration

# Step 3 — full suite with coverage
npm run test:coverage`


The coverage report prints to the console and writes server/coverage/lcov-report/index.html. Open that file in a browser to see the per-file breakdown.