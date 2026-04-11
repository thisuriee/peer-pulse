## Requires live server

Use **two terminals**. Artillery sends real HTTP requests; nothing runs in Jest here.

### Terminal 1 — start the API (test config, port 5001)

```bash
cd server
NODE_ENV=test PORT=5001 node src/index.js
```

Wait until you see **Database connected** (or equivalent) before running Artillery.

### Terminal 2 — run load tests

```bash
cd server
```

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
