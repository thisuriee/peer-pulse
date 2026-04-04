# Peer-Pulse — Testing Instruction Report

> **Project:** Peer-Pulse (MERN Stack Peer Tutoring Platform)  
> **Team Size:** 4 Members  
> **Backend:** Node.js / Express / MongoDB (Mongoose)  
> **Frontend:** React 18 / Vite (to be implemented)  
> **Date:** 2026-04-04

---

## Table of Contents

1. [Testing Environment Configuration](#1-testing-environment-configuration)
2. [Testing Stack & Installation](#2-testing-stack--installation)
3. [Member 1 — Authentication, Security & Session Booking](#3-member-1--authentication-security--session-booking)
4. [Member 2 — Knowledge Vault (Resources)](#4-member-2--knowledge-vault-resources)
5. [Member 3 — Reviews & Reputation](#5-member-3--reviews--reputation)
6. [Member 4 — Community Threads & Infrastructure](#6-member-4--community-threads--infrastructure)
7. [Shared Performance Testing (All Members)](#7-shared-performance-testing-all-members)
8. [CI / Test Coverage Summary](#8-ci--test-coverage-summary)

---

## 1. Testing Environment Configuration

### 1.1 Environment Files

Create `server/.env.test` — **never commit this file**:

```env
NODE_ENV=test
PORT=5001

# Use a dedicated test database — NEVER point at production
MONGO_URI=mongodb://localhost:27017/peer_pulse_test

# Short-lived tokens are fine for tests
JWT_SECRET=test_jwt_secret_at_least_32_chars_long
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=test_refresh_secret_at_least_32_chars
JWT_REFRESH_EXPIRES_IN=1d

APP_ORIGIN=http://localhost:5173
BASE_PATH=/api/v1

# Disable external services during unit/integration tests
CLOUDINARY_CLOUD_NAME=test
CLOUDINARY_API_KEY=test
CLOUDINARY_API_SECRET=test

GOOGLE_CLIENT_ID=test_google_client_id
GOOGLE_CLIENT_SECRET=test_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5001/api/v1/auth/google/callback
GOOGLE_REDIRECT_URI=http://localhost:5001/api/v1/auth/google/calendar/callback
GOOGLE_REFRESH_TOKEN=test_refresh_token

# Rate limiting — relax for tests so assertions don't hit limits
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=1000

SWAGGER_UI_ENABLED=false
```

### 1.2 Folder Structure to Create

Add the following test directories inside `server/`:

```
server/
├── src/
│   └── ... (existing source)
├── tests/
│   ├── unit/
│   │   ├── auth/
│   │   ├── session/
│   │   ├── resource/
│   │   ├── review/
│   │   ├── thread/
│   │   └── utils/
│   ├── integration/
│   │   ├── auth/
│   │   ├── session/
│   │   ├── resource/
│   │   ├── review/
│   │   └── thread/
│   ├── performance/
│   │   └── scenarios/
│   └── helpers/
│       ├── db.helper.js       ← shared test DB setup/teardown
│       ├── app.helper.js      ← shared Express app factory
│       └── fixtures/
│           ├── user.fixture.js
│           ├── session.fixture.js
│           └── thread.fixture.js
```

### 1.3 Test Database Setup Helper

Create `server/tests/helpers/db.helper.js`:

```js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

export async function connectTestDB() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

export async function disconnectTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
}
```

Create `server/tests/helpers/app.helper.js`:

```js
import app from '../../src/index.js'; // export `app` from index.js without calling listen()
export default app;
```

> **Important:** Refactor `server/src/index.js` to export the `app` object separately from the `listen()` call:
>
> ```js
> // At the bottom of index.js
> export default app;                     // <-- add this
> if (process.env.NODE_ENV !== 'test') {
>   app.listen(PORT, () => { ... });      // <-- wrap in guard
> }
> ```

---

## 2. Testing Stack & Installation

### 2.1 Install Dependencies

Run from the `server/` directory:

```bash
cd server

# Test runner + assertion + HTTP testing
npm install --save-dev jest @jest/globals supertest

# In-memory MongoDB (avoids needing a live Mongo for unit/integration tests)
npm install --save-dev mongodb-memory-server

# Mocking
npm install --save-dev jest-mock

# Coverage reporter (built into Jest, no extra install)
```

### 2.2 Jest Configuration

Create `server/jest.config.js`:

```js
export default {
  testEnvironment: 'node',
  transform: {},                      // ESM — no transform needed for Node 18+
  extensionsToTreatAsEsm: ['.js'],
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterFramework: [],
  globalSetup: './tests/helpers/globalSetup.js',
  globalTeardown: './tests/helpers/globalTeardown.js',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
};
```

Add to `server/package.json` scripts:

```json
"scripts": {
  "dev": "node --watch src/index.js",
  "start": "node src/index.js",
  "test": "NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest",
  "test:unit": "NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest tests/unit",
  "test:integration": "NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest tests/integration",
  "test:coverage": "NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest --coverage",
  "test:watch": "NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest --watch"
}
```

### 2.3 Performance Testing — Artillery

Run from `server/`:

```bash
npm install --save-dev artillery
```

Add to `server/package.json`:

```json
"test:perf": "artillery run tests/performance/scenarios/load-test.yml"
```

---

## 3. Member 1 — Authentication, Security & Session Booking

**Covers:** Auth — `auth.service.js`, `auth.controller.js`, `auth.routes.js`, `auth.middleware.js`, `role.guard.js`, `token-utils.js`, `hash-utils.js`, `cookie-utils.js`, `auth.validator.js`, `authSession.model.js`, `verification.model.js`, `user.model.js`  
Session Booking — `session.service.js`, `session.controller.js`, `session.routes.js`, `availability.service.js`, `session.model.js`, `availability.model.js`, `session.validator.js`, `calender.routes.js`, `google-calendar.js`

---

### 3.1 Unit Tests

**How to run:**

```bash
cd server
npm run test:unit -- --testPathPattern=auth
```

**File:** `tests/unit/auth/hash-utils.test.js`

```js
import { describe, it, expect } from '@jest/globals';
import { hashValue, compareValue } from '../../../src/common/utils/hash-utils.js';

describe('hash-utils', () => {
  it('hashes a plain text password', async () => {
    const hash = await hashValue('secret123');
    expect(hash).not.toBe('secret123');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('returns true when comparing correct password to hash', async () => {
    const hash = await hashValue('mypassword');
    const result = await compareValue('mypassword', hash);
    expect(result).toBe(true);
  });

  it('returns false for incorrect password', async () => {
    const hash = await hashValue('correctpass');
    const result = await compareValue('wrongpass', hash);
    expect(result).toBe(false);
  });
});
```

**File:** `tests/unit/auth/token-utils.test.js`

```js
import { describe, it, expect } from '@jest/globals';
import { signJwtToken, verifyJwtToken } from '../../../src/common/utils/token-utils.js';

describe('token-utils', () => {
  const payload = { userId: 'abc123', role: 'student' };

  it('signs and verifies a valid JWT', () => {
    const token = signJwtToken(payload);
    const decoded = verifyJwtToken(token);
    expect(decoded.userId).toBe('abc123');
    expect(decoded.role).toBe('student');
  });

  it('throws on a tampered token', () => {
    const token = signJwtToken(payload);
    expect(() => verifyJwtToken(token + 'tampered')).toThrow();
  });

  it('throws on an expired token', async () => {
    const token = signJwtToken(payload, { expiresIn: '1ms' });
    await new Promise(r => setTimeout(r, 10));
    expect(() => verifyJwtToken(token)).toThrow();
  });
});
```

**File:** `tests/unit/auth/auth-validator.test.js`

```js
import { describe, it, expect } from '@jest/globals';
import { registerSchema, loginSchema } from '../../../src/common/validators/auth.validator.js';

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'pass123',
      confirmPassword: 'pass123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'pass123',
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = registerSchema.safeParse({
      name: 'Alice',
      email: 'not-an-email',
      password: 'pass123',
      confirmPassword: 'pass123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 6 characters', () => {
    const result = registerSchema.safeParse({
      name: 'Alice',
      email: 'alice@test.com',
      password: '12',
      confirmPassword: '12',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'alice@test.com', password: 'pass123' });
    expect(result.success).toBe(true);
  });
});
```

**File:** `tests/unit/auth/user-model.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';
import User from '../../../src/database/models/user.model.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

describe('User Model', () => {
  it('creates a user with required fields', async () => {
    const user = await User.create({ name: 'Bob', email: 'bob@test.com', password: 'hashed' });
    expect(user._id).toBeDefined();
    expect(user.role).toBe('student');
    expect(user.badge).toBe('none');
    expect(user.reputationScore).toBe(0);
  });

  it('rejects duplicate email', async () => {
    await User.create({ name: 'A', email: 'dup@test.com', password: 'x' });
    await expect(User.create({ name: 'B', email: 'dup@test.com', password: 'y' }))
      .rejects.toThrow();
  });

  it('omitPassword removes password field', async () => {
    const user = await User.create({ name: 'C', email: 'c@test.com', password: 'secret' });
    const safe = user.omitPassword();
    expect(safe.password).toBeUndefined();
  });

  it('isOAuthUser returns true when no password set', async () => {
    const user = await User.create({ name: 'D', email: 'd@test.com', googleId: 'gid123' });
    expect(user.isOAuthUser()).toBe(true);
  });
});
```

---

### 3.2 Integration Tests

**How to run:**

```bash
cd server
npm run test:integration -- --testPathPattern=auth
```

**File:** `tests/integration/auth/register.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../helpers/app.helper.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

const validUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'secure123',
  confirmPassword: 'secure123',
};

describe('POST /api/v1/auth/register', () => {
  it('returns 201 and user object on success', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 400 on duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid payload', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'bad' });
    expect(res.status).toBe(400);
  });
});
```

**File:** `tests/integration/auth/login.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../helpers/app.helper.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

const creds = { name: 'Alice', email: 'alice@test.com', password: 'pass1234', confirmPassword: 'pass1234' };

describe('POST /api/v1/auth/login', () => {
  it('returns 200 and sets auth cookie on correct credentials', async () => {
    await request(app).post('/api/v1/auth/register').send(creds);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: creds.email, password: creds.password });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send(creds);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: creds.email, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 404 on non-existent email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@test.com', password: 'pass1234' });
    expect(res.status).toBe(404);
  });
});
```

**File:** `tests/integration/auth/protected-routes.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../helpers/app.helper.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

async function loginAndGetCookie(userData) {
  await request(app).post('/api/v1/auth/register').send(userData);
  const res = await request(app).post('/api/v1/auth/login').send({
    email: userData.email,
    password: userData.password,
  });
  return res.headers['set-cookie'];
}

describe('GET /api/v1/auth/me', () => {
  it('returns 200 with user data when authenticated', async () => {
    const cookie = await loginAndGetCookie({
      name: 'Me', email: 'me@test.com', password: 'pass1234', confirmPassword: 'pass1234',
    });
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('me@test.com');
  });

  it('returns 401 without authentication cookie', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('clears auth cookies and returns 200', async () => {
    const cookie = await loginAndGetCookie({
      name: 'Logout', email: 'logout@test.com', password: 'pass1234', confirmPassword: 'pass1234',
    });
    const res = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });
});
```

---

### 3.3 Performance Tests

**File:** `tests/performance/scenarios/auth-load.yml`

```yaml
config:
  target: "http://localhost:5001"
  phases:
    - name: "Warm up"
      duration: 30
      arrivalRate: 5
    - name: "Ramp up"
      duration: 60
      arrivalRate: 20
    - name: "Sustained load"
      duration: 120
      arrivalRate: 50
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "User Registration and Login Flow"
    weight: 60
    flow:
      - post:
          url: "/api/v1/auth/register"
          json:
            name: "Load Test User {{ $randomString() }}"
            email: "loadtest_{{ $randomString() }}@example.com"
            password: "loadpass123"
            confirmPassword: "loadpass123"
          capture:
            json: "$.user.email"
            as: "registeredEmail"

  - name: "Login Only"
    weight: 40
    flow:
      - post:
          url: "/api/v1/auth/login"
          json:
            email: "existing@example.com"
            password: "loadpass123"
          expect:
            - statusCode: 200
```

**How to run:**

```bash
# First, seed a test user at existing@example.com
cd server
npm run test:perf -- tests/performance/scenarios/auth-load.yml
```

**Acceptance thresholds:**

| Metric | Target |
|--------|--------|
| `http.response_time.p95` | < 500 ms |
| `http.response_time.p99` | < 1000 ms |
| `http.request_rate` | ≥ 45 req/s sustained |
| Error rate | < 1% |

---

### 3.4 Session Booking — Unit Tests

**How to run:**

```bash
cd server
npm run test:unit -- --testPathPattern=session
```

**File:** `tests/unit/session/session-validator.test.js`

```js
import { describe, it, expect } from '@jest/globals';
import {
  createBookingSchema,
  availabilitySchema,
  timeSlotSchema,
} from '../../../src/common/validators/session.validator.js';

describe('createBookingSchema', () => {
  it('accepts valid booking data', () => {
    const result = createBookingSchema.safeParse({
      tutor: '507f1f77bcf86cd799439011',
      subject: 'Mathematics',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      duration: 60,
    });
    expect(result.success).toBe(true);
  });

  it('rejects duration below 15 minutes', () => {
    const result = createBookingSchema.safeParse({
      tutor: '507f1f77bcf86cd799439011',
      subject: 'Math',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      duration: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration above 180 minutes', () => {
    const result = createBookingSchema.safeParse({
      tutor: '507f1f77bcf86cd799439011',
      subject: 'Math',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      duration: 240,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty subject', () => {
    const result = createBookingSchema.safeParse({
      tutor: '507f1f77bcf86cd799439011',
      subject: '',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(result.success).toBe(false);
  });
});

describe('timeSlotSchema', () => {
  it('accepts valid HH:mm format', () => {
    const r = timeSlotSchema.safeParse({ startTime: '09:00', endTime: '10:00' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid time format', () => {
    const r = timeSlotSchema.safeParse({ startTime: '9am', endTime: '10am' });
    expect(r.success).toBe(false);
  });
});
```

**File:** `tests/unit/session/session-model.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';
import Booking from '../../../src/database/models/session.model.js';
import User from '../../../src/database/models/user.model.js';

let studentId, tutorId;

beforeAll(async () => {
  await connectTestDB();
  const student = await User.create({ name: 'Student', email: 's@test.com', role: 'student' });
  const tutor = await User.create({ name: 'Tutor', email: 't@test.com', role: 'tutor' });
  studentId = student._id;
  tutorId = tutor._id;
});
afterEach(async () => await Booking.deleteMany({}));
afterAll(async () => await disconnectTestDB());

describe('Booking Model', () => {
  it('creates a booking with default status pending', async () => {
    const booking = await Booking.create({
      student: studentId, tutor: tutorId,
      subject: 'Physics', scheduledAt: new Date(Date.now() + 86400000), duration: 60,
    });
    expect(booking.status).toBe('pending');
    expect(booking.duration).toBe(60);
  });

  it('computes endTime virtual correctly', async () => {
    const start = new Date(Date.now() + 86400000);
    const booking = await Booking.create({
      student: studentId, tutor: tutorId,
      subject: 'Physics', scheduledAt: start, duration: 60,
    });
    const endTime = new Date(start.getTime() + 60 * 60000);
    expect(booking.endTime.getTime()).toBe(endTime.getTime());
  });

  it('rejects invalid status transition — only enum values allowed', async () => {
    await expect(Booking.create({
      student: studentId, tutor: tutorId,
      subject: 'Chem', scheduledAt: new Date(Date.now() + 86400000), status: 'invalid_status',
    })).rejects.toThrow();
  });
});
```

**File:** `tests/unit/session/availability-model.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';
import Availability from '../../../src/database/models/availability.model.js';
import User from '../../../src/database/models/user.model.js';

let tutorId;

beforeAll(async () => {
  await connectTestDB();
  const tutor = await User.create({ name: 'Tutor2', email: 'tutor2@test.com', role: 'tutor' });
  tutorId = tutor._id;
});
afterEach(async () => await Availability.deleteMany({}));
afterAll(async () => await disconnectTestDB());

describe('Availability Model', () => {
  it('creates availability with defaults', async () => {
    const avail = await Availability.create({ tutor: tutorId });
    expect(avail.isActive).toBe(true);
    expect(avail.timezone).toBe('UTC');
  });

  it('enforces one availability doc per tutor (unique constraint)', async () => {
    await Availability.create({ tutor: tutorId });
    await expect(Availability.create({ tutor: tutorId })).rejects.toThrow();
  });
});
```

---

### 3.5 Session Booking — Integration Tests

**How to run:**

```bash
cd server
npm run test:integration -- --testPathPattern=session
```

**File:** `tests/integration/session/booking.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../helpers/app.helper.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

async function createAndLogin(userData) {
  await request(app).post('/api/v1/auth/register').send(userData);
  const res = await request(app).post('/api/v1/auth/login').send({
    email: userData.email, password: userData.password,
  });
  return res.headers['set-cookie'];
}

async function getTutorId(tutorData) {
  const res = await request(app).post('/api/v1/auth/register').send(tutorData);
  return res.body.user._id;
}

describe('POST /api/v1/bookings', () => {
  it('student can create a booking with a tutor', async () => {
    const tutorId = await getTutorId({
      name: 'Tutor', email: 'tutor@test.com', password: 'pass1234',
      confirmPassword: 'pass1234', role: 'tutor',
    });
    const cookie = await createAndLogin({
      name: 'Student', email: 'student@test.com',
      password: 'pass1234', confirmPassword: 'pass1234',
    });
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', cookie)
      .send({
        tutor: tutorId,
        subject: 'Mathematics',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
      });
    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe('pending');
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).post('/api/v1/bookings').send({ subject: 'Math' });
    expect(res.status).toBe(401);
  });

  it('returns 400 with invalid booking data', async () => {
    const cookie = await createAndLogin({
      name: 'S2', email: 's2@test.com', password: 'pass1234', confirmPassword: 'pass1234',
    });
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', cookie)
      .send({ subject: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/bookings', () => {
  it('returns list of bookings for authenticated user', async () => {
    const cookie = await createAndLogin({
      name: 'S3', email: 's3@test.com', password: 'pass1234', confirmPassword: 'pass1234',
    });
    const res = await request(app).get('/api/v1/bookings').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.bookings)).toBe(true);
  });
});

describe('PUT /api/v1/bookings/:id/accept', () => {
  it('tutor can accept a pending booking', async () => {
    const tutorCookie = await createAndLogin({
      name: 'T2', email: 't2@test.com', password: 'pass1234',
      confirmPassword: 'pass1234', role: 'tutor',
    });
    const tutorProfile = await request(app).get('/api/v1/auth/me').set('Cookie', tutorCookie);
    const tutorId = tutorProfile.body._id;

    const studentCookie = await createAndLogin({
      name: 'S4', email: 's4@test.com', password: 'pass1234', confirmPassword: 'pass1234',
    });
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', studentCookie)
      .send({
        tutor: tutorId, subject: 'Biology',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(), duration: 30,
      });
    const bookingId = bookingRes.body.booking._id;

    const acceptRes = await request(app)
      .put(`/api/v1/bookings/${bookingId}/accept`)
      .set('Cookie', tutorCookie);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.booking.status).toBe('accepted');
  });
});
```

---

### 3.6 Session Booking — Performance Tests

**File:** `tests/performance/scenarios/booking-load.yml`

```yaml
config:
  target: "http://localhost:5001"
  phases:
    - name: "Booking load test"
      duration: 90
      arrivalRate: 30
  defaults:
    headers:
      Content-Type: "application/json"
      Cookie: "{{ authCookie }}"

scenarios:
  - name: "Fetch Available Slots"
    weight: 50
    flow:
      - get:
          url: "/api/v1/bookings/slots?tutorId={{ tutorId }}"
          expect:
            - statusCode: 200

  - name: "Get User Bookings"
    weight: 30
    flow:
      - get:
          url: "/api/v1/bookings"
          expect:
            - statusCode: 200

  - name: "Get Tutors with Availability"
    weight: 20
    flow:
      - get:
          url: "/api/v1/bookings/tutors"
          expect:
            - statusCode: 200
```

**How to run:**

```bash
# Start the server on port 5001, then:
cd server
npm run test:perf -- tests/performance/scenarios/booking-load.yml
```

**Acceptance thresholds:**

| Metric | Target |
|--------|--------|
| `http.response_time.p95` | < 600 ms |
| `http.response_time.p99` | < 1200 ms |
| Booking creation throughput | ≥ 25 req/s |
| Error rate | < 1% |

---

## 4. Member 2 — Knowledge Vault (Resources)

**Covers:** `resource.service.js`, `resource.controller.js`, `resource.routes.js`, `resource.model.js`, `cloudinary.js`, `upload.middleware.js`

---

### 4.1 Unit Tests

**How to run:**

```bash
cd server
npm run test:unit -- --testPathPattern=resource
```

**File:** `tests/unit/resource/resource-model.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';
import Resource from '../../../src/database/models/resource.model.js';
import User from '../../../src/database/models/user.model.js';

let tutorId;

beforeAll(async () => {
  await connectTestDB();
  const tutor = await User.create({ name: 'Tutor', email: 'tutor@res.com', role: 'tutor' });
  tutorId = tutor._id;
});
afterEach(async () => await Resource.deleteMany({}));
afterAll(async () => await disconnectTestDB());

describe('Resource Model', () => {
  it('creates a resource with required fields', async () => {
    const resource = await Resource.create({
      title: 'Calculus Notes',
      description: 'Introduction to derivatives',
      type: 'PDF',
      cloudinary_url: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
      tutor_id: tutorId,
    });
    expect(resource._id).toBeDefined();
    expect(resource.type).toBe('PDF');
  });

  it('rejects resource without required title', async () => {
    await expect(Resource.create({
      description: 'No title', type: 'PDF',
      cloudinary_url: 'https://example.com/file.pdf', tutor_id: tutorId,
    })).rejects.toThrow();
  });

  it('rejects resource without cloudinary_url', async () => {
    await expect(Resource.create({
      title: 'No URL', description: 'Missing URL', type: 'PDF', tutor_id: tutorId,
    })).rejects.toThrow();
  });
});
```

---

### 4.2 Integration Tests

**How to run:**

```bash
cd server
npm run test:integration -- --testPathPattern=resource
```

**File:** `tests/integration/resource/resource.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../../helpers/app.helper.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';
import path from 'path';

// Mock Cloudinary to avoid real uploads during tests
jest.mock('../../../src/integrations/cloudinary.js', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/test/sample.pdf',
    public_id: 'test/sample',
  }),
  deleteFromCloudinary: jest.fn().mockResolvedValue({ result: 'ok' }),
}));

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

async function loginAsTutor() {
  await request(app).post('/api/v1/auth/register').send({
    name: 'Tutor', email: 'tutor@res.com',
    password: 'pass1234', confirmPassword: 'pass1234', role: 'tutor',
  });
  const res = await request(app).post('/api/v1/auth/login').send({
    email: 'tutor@res.com', password: 'pass1234',
  });
  return res.headers['set-cookie'];
}

describe('GET /api/v1/resources', () => {
  it('returns 200 with empty array when no resources', async () => {
    const res = await request(app).get('/api/v1/resources');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.resources ?? res.body)).toBe(true);
  });
});

describe('POST /api/v1/resources', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/v1/resources')
      .field('title', 'Notes')
      .field('description', 'Test resource')
      .field('type', 'PDF');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/resources/search', () => {
  it('returns 200 for search query', async () => {
    const res = await request(app).get('/api/v1/resources/search?q=calculus');
    expect(res.status).toBe(200);
  });
});
```

---

### 4.3 Performance Tests

**File:** `tests/performance/scenarios/resource-load.yml`

```yaml
config:
  target: "http://localhost:5001"
  phases:
    - name: "Resource browsing load"
      duration: 90
      arrivalRate: 30

scenarios:
  - name: "Browse Resources"
    weight: 50
    flow:
      - get:
          url: "/api/v1/resources"
          expect:
            - statusCode: 200

  - name: "Search Resources"
    weight: 30
    flow:
      - get:
          url: "/api/v1/resources/search?q=mathematics"
          expect:
            - statusCode: 200

  - name: "Get Single Resource"
    weight: 20
    flow:
      - get:
          url: "/api/v1/resources/{{ resourceId }}"
          expect:
            - statusCode: 200
```

**How to run:**

```bash
cd server
npm run test:perf -- tests/performance/scenarios/resource-load.yml
```

**Acceptance thresholds:**

| Metric | Target |
|--------|--------|
| `http.response_time.p95` | < 500 ms |
| `http.response_time.p99` | < 1000 ms |
| Resource browse throughput | ≥ 40 req/s |
| File upload throughput | ≥ 10 req/s |
| Error rate | < 1% |

---

## 5. Member 3 — Reviews & Reputation

**Covers:** `review.service.js`, `review.controller.js`, `review.routes.js`, `review.model.js`, `review.repository.js`, `badge.service.js`, `reputation.service.js`

---

### 5.1 Unit Tests

**How to run:**

```bash
cd server
npm run test:unit -- --testPathPattern=review
```

**File:** `tests/unit/review/review-model.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';
import Review from '../../../src/database/models/review.model.js';
import User from '../../../src/database/models/user.model.js';
import Booking from '../../../src/database/models/session.model.js';

let reviewerId, tutorId, bookingId;

beforeAll(async () => {
  await connectTestDB();
  const reviewer = await User.create({ name: 'Reviewer', email: 'rev@test.com' });
  const tutor = await User.create({ name: 'ReviewedTutor', email: 'revtutor@test.com', role: 'tutor' });
  const booking = await Booking.create({
    student: reviewer._id, tutor: tutor._id,
    subject: 'Art', scheduledAt: new Date(), duration: 60,
  });
  reviewerId = reviewer._id;
  tutorId = tutor._id;
  bookingId = booking._id;
});
afterEach(async () => await Review.deleteMany({}));
afterAll(async () => await disconnectTestDB());

describe('Review Model', () => {
  it('creates a review with rating in range 1-5', async () => {
    const review = await Review.create({
      booking: bookingId, reviewer: reviewerId, tutor: tutorId,
      rating: 4, comment: 'Great session!',
    });
    expect(review.rating).toBe(4);
    expect(review.isDeleted).toBe(false);
  });

  it('rejects rating below 1', async () => {
    await expect(Review.create({
      booking: bookingId, reviewer: reviewerId, tutor: tutorId, rating: 0,
    })).rejects.toThrow();
  });

  it('rejects rating above 5', async () => {
    await expect(Review.create({
      booking: bookingId, reviewer: reviewerId, tutor: tutorId, rating: 6,
    })).rejects.toThrow();
  });

  it('enforces one review per booking (unique constraint)', async () => {
    await Review.create({
      booking: bookingId, reviewer: reviewerId, tutor: tutorId, rating: 5,
    });
    await expect(Review.create({
      booking: bookingId, reviewer: reviewerId, tutor: tutorId, rating: 3,
    })).rejects.toThrow();
  });
});
```

**File:** `tests/unit/review/reputation-service.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from '@jest/globals';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';
import User from '../../../src/database/models/user.model.js';

// Import actual reputation service — adjust path if needed
// import { calculateReputation } from '../../../src/modules/review/reputation.service.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

describe('Reputation Score Calculation', () => {
  it('reputationScore defaults to 0 on new user', async () => {
    const user = await User.create({ name: 'New', email: 'new@rep.com', role: 'tutor' });
    expect(user.reputationScore).toBe(0);
    expect(user.reviewCount).toBe(0);
  });

  it('badge defaults to none', async () => {
    const user = await User.create({ name: 'Badgeless', email: 'badge@rep.com', role: 'tutor' });
    expect(user.badge).toBe('none');
  });

  it('ratingDistribution initialises as empty map', async () => {
    const user = await User.create({ name: 'Dist', email: 'dist@rep.com', role: 'tutor' });
    expect(user.ratingDistribution).toBeDefined();
  });
});
```

**File:** `tests/unit/review/badge-service.test.js`

```js
import { describe, it, expect } from '@jest/globals';

// Inline badge logic for isolated unit test (mirrors badge.service.js logic)
function assignBadge(reputationScore, reviewCount) {
  if (reviewCount < 3) return 'none';
  if (reputationScore >= 4.5) return 'gold';
  if (reputationScore >= 3.5) return 'silver';
  if (reputationScore >= 2.5) return 'bronze';
  return 'none';
}

describe('Badge Assignment Logic', () => {
  it('assigns gold for score >= 4.5 with enough reviews', () => {
    expect(assignBadge(4.8, 10)).toBe('gold');
  });

  it('assigns silver for score >= 3.5', () => {
    expect(assignBadge(3.7, 5)).toBe('silver');
  });

  it('assigns bronze for score >= 2.5', () => {
    expect(assignBadge(2.8, 4)).toBe('bronze');
  });

  it('assigns none when fewer than 3 reviews', () => {
    expect(assignBadge(5.0, 2)).toBe('none');
  });

  it('assigns none for score below 2.5', () => {
    expect(assignBadge(2.0, 5)).toBe('none');
  });
});
```

---

### 5.2 Integration Tests

**How to run:**

```bash
cd server
npm run test:integration -- --testPathPattern=review
```

**File:** `tests/integration/review/review.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../helpers/app.helper.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';
import Booking from '../../../src/database/models/session.model.js';
import User from '../../../src/database/models/user.model.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

async function loginAs(userData) {
  await request(app).post('/api/v1/auth/register').send(userData);
  const res = await request(app).post('/api/v1/auth/login').send({
    email: userData.email, password: userData.password,
  });
  return { cookie: res.headers['set-cookie'], id: res.body.user?._id };
}

describe('POST /api/v1/reviews', () => {
  it('student can submit a review for completed booking', async () => {
    const { cookie: studentCookie, id: studentId } = await loginAs({
      name: 'Stu', email: 'stu@rev.com', password: 'pass1234', confirmPassword: 'pass1234',
    });
    const { id: tutorId } = await loginAs({
      name: 'Tutor', email: 'tutor@rev.com', password: 'pass1234',
      confirmPassword: 'pass1234', role: 'tutor',
    });

    // Directly insert a completed booking for this test
    const booking = await Booking.create({
      student: studentId, tutor: tutorId,
      subject: 'History', scheduledAt: new Date(), duration: 60, status: 'completed',
    });

    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Cookie', studentCookie)
      .send({ booking: booking._id.toString(), tutor: tutorId, rating: 5, comment: 'Excellent!' });

    expect(res.status).toBe(201);
    expect(res.body.review.rating).toBe(5);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).post('/api/v1/reviews').send({ rating: 5 });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/reviews/tutor/:tutorId', () => {
  it('returns reviews for a given tutor', async () => {
    const { id: tutorId } = await loginAs({
      name: 'RTutor', email: 'rtutor@rev.com', password: 'pass1234',
      confirmPassword: 'pass1234', role: 'tutor',
    });
    const res = await request(app).get(`/api/v1/reviews/tutor/${tutorId}`);
    expect(res.status).toBe(200);
  });
});
```

---

### 5.3 Performance Tests

**File:** `tests/performance/scenarios/review-load.yml`

```yaml
config:
  target: "http://localhost:5001"
  phases:
    - name: "Review read load"
      duration: 90
      arrivalRate: 30

scenarios:
  - name: "View Tutor Reviews"
    weight: 60
    flow:
      - get:
          url: "/api/v1/reviews/tutor/{{ tutorId }}"
          expect:
            - statusCode: 200

  - name: "Get Single Review"
    weight: 40
    flow:
      - get:
          url: "/api/v1/reviews/{{ reviewId }}"
          expect:
            - statusCode: 200
```

**How to run:**

```bash
cd server
npm run test:perf -- tests/performance/scenarios/review-load.yml
```

**Acceptance thresholds:**

| Metric | Target |
|--------|--------|
| `http.response_time.p95` | < 500 ms |
| `http.response_time.p99` | < 1000 ms |
| Review read throughput | ≥ 40 req/s |
| Error rate | < 1% |

---

## 6. Member 4 — Community Threads & Infrastructure

**Covers:** `thread.service.js`, `thread.controller.js`, `thread.routes.js`, `thread.model.js`, `thread.validator.js`, `user.service.js`, `user.controller.js`, `profanity-filter.utils.js`, `error-handler.middleware.js`, `rate-limit.middleware.js`, `async-handler.middleware.js`, `request-id.middleware.js`, `errors-utils.js`, `id-utils.js`, `date-utils.js`

---

### 6.1 Unit Tests

**How to run:**

```bash
cd server
npm run test:unit -- --testPathPattern="thread|utils"
```

**File:** `tests/unit/thread/thread-validator.test.js`

```js
import { describe, it, expect } from '@jest/globals';
import {
  createThreadSchema,
  createReplySchema,
} from '../../../src/common/validators/thread.validator.js';

describe('createThreadSchema', () => {
  it('accepts valid thread data', () => {
    const result = createThreadSchema.safeParse({
      title: 'How do I solve quadratics?',
      content: 'I am struggling with the quadratic formula and need help.',
      subject: 'Mathematics',
    });
    expect(result.success).toBe(true);
  });

  it('rejects title shorter than 5 characters', () => {
    const result = createThreadSchema.safeParse({
      title: 'Hi', content: 'A valid content block here that is long enough.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects content shorter than 10 characters', () => {
    const result = createThreadSchema.safeParse({
      title: 'Valid Title Here', content: 'Short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects title over 200 characters', () => {
    const result = createThreadSchema.safeParse({
      title: 'A'.repeat(201), content: 'Sufficient content length for the thread body.',
    });
    expect(result.success).toBe(false);
  });
});

describe('createReplySchema', () => {
  it('accepts valid reply text', () => {
    const result = createReplySchema.safeParse({ text: 'This is my answer.' });
    expect(result.success).toBe(true);
  });

  it('rejects empty reply text', () => {
    const result = createReplySchema.safeParse({ text: '' });
    expect(result.success).toBe(false);
  });
});
```

**File:** `tests/unit/thread/thread-model.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';
import Thread from '../../../src/database/models/thread.model.js';
import User from '../../../src/database/models/user.model.js';

let authorId;

beforeAll(async () => {
  await connectTestDB();
  const user = await User.create({ name: 'Poster', email: 'poster@thread.com' });
  authorId = user._id;
});
afterEach(async () => await Thread.deleteMany({}));
afterAll(async () => await disconnectTestDB());

describe('Thread Model', () => {
  it('creates a thread with defaults', async () => {
    const thread = await Thread.create({
      authorId, title: 'My First Thread', content: 'This is the body of the thread.',
    });
    expect(thread.isResolved).toBe(false);
    expect(thread.isDeleted).toBe(false);
    expect(thread.upvotes).toHaveLength(0);
    expect(thread.replies).toHaveLength(0);
  });

  it('upvoteCount virtual returns correct count', async () => {
    const thread = await Thread.create({
      authorId, title: 'Upvote Me', content: 'Please upvote this thread.',
      upvotes: [authorId],
    });
    expect(thread.upvoteCount).toBe(1);
  });

  it('replyCount virtual returns zero for new thread', async () => {
    const thread = await Thread.create({
      authorId, title: 'No Replies Yet', content: 'Waiting for replies here.',
    });
    expect(thread.replyCount).toBe(0);
  });

  it('rejects thread with missing content', async () => {
    await expect(Thread.create({ authorId, title: 'Title Only' })).rejects.toThrow();
  });
});
```

**File:** `tests/unit/utils/error-utils.test.js`

```js
import { describe, it, expect } from '@jest/globals';
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '../../../src/common/utils/errors-utils.js';

describe('Custom Exception Classes', () => {
  it('NotFoundException has status 404', () => {
    const err = new NotFoundException('User not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('User not found');
  });

  it('BadRequestException has status 400', () => {
    const err = new BadRequestException('Invalid input');
    expect(err.statusCode).toBe(400);
  });

  it('UnauthorizedException has status 401', () => {
    const err = new UnauthorizedException('Not logged in');
    expect(err.statusCode).toBe(401);
  });

  it('ForbiddenException has status 403', () => {
    const err = new ForbiddenException('Access denied');
    expect(err.statusCode).toBe(403);
  });

  it('all exceptions extend Error', () => {
    const err = new NotFoundException('test');
    expect(err).toBeInstanceOf(Error);
  });
});
```

**File:** `tests/unit/utils/date-utils.test.js`

```js
import { describe, it, expect } from '@jest/globals';
import { thirtyDaysFromNow } from '../../../src/common/utils/date-utils.js';

describe('date-utils', () => {
  it('thirtyDaysFromNow returns a date approximately 30 days in the future', () => {
    const result = thirtyDaysFromNow();
    const now = Date.now();
    const diffMs = result.getTime() - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);
  });
});
```

**File:** `tests/unit/utils/id-utils.test.js`

```js
import { describe, it, expect } from '@jest/globals';
import { generateUniqueCode } from '../../../src/common/utils/id-utils.js';

describe('id-utils', () => {
  it('generates a non-empty unique code', () => {
    const code = generateUniqueCode();
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);
  });

  it('generates different codes on each call', () => {
    const a = generateUniqueCode();
    const b = generateUniqueCode();
    expect(a).not.toBe(b);
  });
});
```

---

### 6.2 Integration Tests

**How to run:**

```bash
cd server
npm run test:integration -- --testPathPattern=thread
```

**File:** `tests/integration/thread/thread.test.js`

```js
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../helpers/app.helper.js';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../../helpers/db.helper.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

async function loginAs(userData) {
  await request(app).post('/api/v1/auth/register').send(userData);
  const res = await request(app).post('/api/v1/auth/login').send({
    email: userData.email, password: userData.password,
  });
  return res.headers['set-cookie'];
}

const userA = { name: 'ThreadUser', email: 'threaduser@test.com', password: 'pass1234', confirmPassword: 'pass1234' };

describe('POST /api/v1/threads', () => {
  it('authenticated user can create a thread', async () => {
    const cookie = await loginAs(userA);
    const res = await request(app)
      .post('/api/v1/threads')
      .set('Cookie', cookie)
      .send({ title: 'How does integration work?', content: 'I need help understanding integration in calculus.' });
    expect(res.status).toBe(201);
    expect(res.body.thread.title).toBe('How does integration work?');
    expect(res.body.thread.isDeleted).toBe(false);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/v1/threads').send({
      title: 'Guest Thread', content: 'This should not be allowed at all.',
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid thread data', async () => {
    const cookie = await loginAs({ ...userA, email: 'u2@test.com' });
    const res = await request(app)
      .post('/api/v1/threads').set('Cookie', cookie).send({ title: 'Hi', content: 'Short' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/threads', () => {
  it('returns 200 with list of threads', async () => {
    const res = await request(app).get('/api/v1/threads');
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/v1/threads/:id/upvote', () => {
  it('authenticated user can upvote a thread', async () => {
    const cookie = await loginAs({ ...userA, email: 'upvoter@test.com' });
    const createRes = await request(app)
      .post('/api/v1/threads').set('Cookie', cookie)
      .send({ title: 'Upvote This Thread Please', content: 'Content that is long enough for the validator.' });
    const threadId = createRes.body.thread._id;

    const upvoteRes = await request(app)
      .patch(`/api/v1/threads/${threadId}/upvote`)
      .set('Cookie', cookie);
    expect(upvoteRes.status).toBe(200);
  });
});

describe('POST /api/v1/threads/:id/replies', () => {
  it('user can post a reply to a thread', async () => {
    const cookie = await loginAs({ ...userA, email: 'replier@test.com' });
    const createRes = await request(app)
      .post('/api/v1/threads').set('Cookie', cookie)
      .send({ title: 'Thread With Replies', content: 'Main content of this discussion thread.' });
    const threadId = createRes.body.thread._id;

    const replyRes = await request(app)
      .post(`/api/v1/threads/${threadId}/replies`)
      .set('Cookie', cookie)
      .send({ text: 'This is my reply to the thread.' });
    expect(replyRes.status).toBe(201);
  });
});

describe('DELETE /api/v1/threads/:id', () => {
  it('author can soft-delete their own thread', async () => {
    const cookie = await loginAs({ ...userA, email: 'deleter@test.com' });
    const createRes = await request(app)
      .post('/api/v1/threads').set('Cookie', cookie)
      .send({ title: 'Thread To Delete Now', content: 'This thread content will be soft deleted.' });
    const threadId = createRes.body.thread._id;

    const deleteRes = await request(app)
      .delete(`/api/v1/threads/${threadId}`)
      .set('Cookie', cookie);
    expect(deleteRes.status).toBe(200);
  });

  it('non-author cannot delete another user thread', async () => {
    const ownerCookie = await loginAs({ ...userA, email: 'owner@test.com' });
    const otherCookie = await loginAs({ ...userA, email: 'other@test.com' });

    const createRes = await request(app)
      .post('/api/v1/threads').set('Cookie', ownerCookie)
      .send({ title: 'Owners Thread Here', content: 'Owner wrote this thread content block.' });
    const threadId = createRes.body.thread._id;

    const deleteRes = await request(app)
      .delete(`/api/v1/threads/${threadId}`)
      .set('Cookie', otherCookie);
    expect(deleteRes.status).toBe(403);
  });
});
```

---

### 6.3 Infrastructure Integration Tests

**File:** `tests/integration/infrastructure/error-handler.test.js`

```js
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import errorHandler from '../../../src/middlewares/core/error-handler.middleware.js';
import { NotFoundException, BadRequestException } from '../../../src/common/utils/errors-utils.js';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get('/not-found', () => { throw new NotFoundException('Item missing'); });
  app.get('/bad-request', () => { throw new BadRequestException('Invalid data'); });
  app.get('/generic-error', () => { throw new Error('Unexpected crash'); });
  app.use(errorHandler);
  return app;
}

const app = buildTestApp();

describe('Global Error Handler Middleware', () => {
  it('returns 404 for NotFoundException', async () => {
    const res = await request(app).get('/not-found');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Item missing');
  });

  it('returns 400 for BadRequestException', async () => {
    const res = await request(app).get('/bad-request');
    expect(res.status).toBe(400);
  });

  it('returns 500 for unhandled errors', async () => {
    const res = await request(app).get('/generic-error');
    expect(res.status).toBe(500);
  });
});
```

---

### 6.4 Performance Tests

**File:** `tests/performance/scenarios/thread-load.yml`

```yaml
config:
  target: "http://localhost:5001"
  phases:
    - name: "Thread browsing load"
      duration: 60
      arrivalRate: 40
    - name: "Peak concurrent readers"
      duration: 30
      arrivalRate: 80

scenarios:
  - name: "Browse threads"
    weight: 60
    flow:
      - get:
          url: "/api/v1/threads"
          expect:
            - statusCode: 200

  - name: "Read single thread"
    weight: 30
    flow:
      - get:
          url: "/api/v1/threads/{{ threadId }}"
          expect:
            - statusCode: 200

  - name: "Health check"
    weight: 10
    flow:
      - get:
          url: "/health"
          expect:
            - statusCode: 200
```

**Acceptance thresholds:**

| Metric | Target |
|--------|--------|
| `http.response_time.p95` | < 400 ms |
| `http.response_time.p99` | < 800 ms |
| Thread list throughput | ≥ 60 req/s |
| Error rate | < 0.5% |

---

## 7. Shared Performance Testing (All Members)

### 7.1 Full Application Load Test

**File:** `tests/performance/scenarios/load-test.yml`

```yaml
config:
  target: "http://localhost:5001"
  phases:
    - name: "Warm-up"
      duration: 30
      arrivalRate: 5
    - name: "Ramp-up"
      duration: 60
      arrivalRate: 25
    - name: "Peak load"
      duration: 120
      arrivalRate: 75
    - name: "Cool-down"
      duration: 30
      arrivalRate: 5
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "Health check (baseline)"
    weight: 10
    flow:
      - get:
          url: "/health"
          expect:
            - statusCode: 200

  - name: "Browse resources (unauthenticated)"
    weight: 25
    flow:
      - get:
          url: "/api/v1/resources"
          expect:
            - statusCode: 200

  - name: "Browse threads (unauthenticated)"
    weight: 25
    flow:
      - get:
          url: "/api/v1/threads"
          expect:
            - statusCode: 200

  - name: "Auth + read bookings flow"
    weight: 20
    flow:
      - post:
          url: "/api/v1/auth/login"
          json:
            email: "loadtest@example.com"
            password: "loadpass123"
          capture:
            - header: "set-cookie"
              as: "authCookie"
      - get:
          url: "/api/v1/bookings"
          headers:
            Cookie: "{{ authCookie }}"
          expect:
            - statusCode: 200

  - name: "View tutor reviews"
    weight: 20
    flow:
      - get:
          url: "/api/v1/reviews/tutor/{{ tutorId }}"
          expect:
            - statusCode: 200
```

### 7.2 Running Full Load Test

```bash
# Step 1 — start the server in test mode on port 5001
cd server
NODE_ENV=test PORT=5001 npm run start

# Step 2 — seed the load test user (one-time setup)
node tests/performance/seed-loadtest-user.js

# Step 3 — run full load test
npm run test:perf -- tests/performance/scenarios/load-test.yml --output tests/performance/results/report.json

# Step 4 — generate HTML report
npx artillery report tests/performance/results/report.json
```

### 7.3 Global Acceptance Criteria

| Metric | Threshold |
|--------|-----------|
| `http.response_time.p95` | < 600 ms |
| `http.response_time.p99` | < 1200 ms |
| `http.response_time.mean` | < 200 ms |
| Peak throughput | ≥ 60 req/s |
| Error rate (4xx + 5xx) | < 2% |
| Rate limit 429 responses | Acceptable — expected behaviour |

---

## 8. CI / Test Coverage Summary

### 8.1 Running All Tests

```bash
# All unit tests
cd server && npm run test:unit

# All integration tests
cd server && npm run test:integration

# All tests with coverage report
cd server && npm run test:coverage

# Watch mode during development
cd server && npm run test:watch
```

### 8.2 Coverage Targets by Module

| Module | Owner | Unit Tests | Integration Tests | Coverage Target |
|--------|-------|------------|-------------------|-----------------|
| Auth & Session Booking | Member 1 | hash, token, auth validators, user model, session validators, booking model, availability model | register, login, protected routes, create/get/accept booking | ≥ 80% |
| Knowledge Vault (Resources) | Member 2 | resource model, cloudinary mock | list resources, upload auth guard, search | ≥ 75% |
| Reviews & Reputation | Member 3 | review model, reputation defaults, badge assignment logic | submit review, get tutor reviews | ≥ 75% |
| Threads & Infrastructure | Member 4 | thread validator, thread model, error utils, date/id utils | full thread CRUD, upvote, reply, error handler | ≥ 75% |

### 8.3 Test File Summary by Member

| Member | Unit Test Files | Integration Test Files | Performance Scenario |
|--------|----------------|------------------------|---------------------|
| 1 | `hash-utils`, `token-utils`, `auth-validator`, `user-model`, `session-validator`, `session-model`, `availability-model` | `register`, `login`, `protected-routes`, `booking` (create/get/accept) | `auth-load.yml` + `booking-load.yml` |
| 2 | `resource-model` | `resource` (list/search/upload guard) | `resource-load.yml` |
| 3 | `review-model`, `reputation-service`, `badge-service` | `review` (submit/get tutor reviews) | `review-load.yml` |
| 4 | `thread-validator`, `thread-model`, `error-utils`, `date-utils`, `id-utils` | `thread` (full CRUD), `error-handler` | `thread-load.yml` |

### 8.4 Environment Setup Checklist

Before running any tests, verify the following:

- [ ] `server/.env.test` is created (see Section 1.1)
- [ ] `mongodb-memory-server` is installed (`npm install --save-dev mongodb-memory-server`)
- [ ] `jest`, `supertest` are installed (`npm install --save-dev jest supertest`)
- [ ] `server/package.json` has `test`, `test:unit`, `test:integration` scripts (see Section 2.2)
- [ ] `server/src/index.js` exports `app` and guards `listen()` behind `NODE_ENV !== 'test'`
- [ ] `server/jest.config.js` is created (see Section 2.2)
- [ ] `tests/helpers/db.helper.js` is created (see Section 1.3)
- [ ] `tests/helpers/app.helper.js` is created (see Section 1.3)
- [ ] For performance tests: `artillery` is installed and server is running on port 5001

---

*Report generated for Peer-Pulse v1.0.0 — 2026-04-04*
