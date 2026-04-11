npm run test:integration -- --testPathPattern=auth
npm run test:integration -- --testPathPattern=session
npm run test:integration:review

### Review integration tests (`tests/integration/review/`)

```bash
cd server
npm run test:integration:review
```

- **review.test.js** — Full HTTP stack for `/api/v1/reviews` (auth cookies, MongoDB memory server, seeded bookings). SendGrid is mocked so tests stay offline.

Uses the same lifecycle as `sharedPattern.md`: `connectTestDB` → `afterEach(clearTestDB)` → `disconnectTestDB`.

**Note:** `.env.test` sets `RATE_LIMIT_AUTH_MAX` high so repeated register/login in integration suites is not blocked by the default auth rate limit (10).

### Phase 02 verification

cd server
npm run test:integration

## All integration tests must pass before Phase 3.