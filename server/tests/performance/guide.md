## Requires Live Server
## One terminal runs the server; another runs Artillery.
## Terminal 1 — start server in test mode:

cd server
NODE_ENV=test PORT=5001 node src/index.js`

## Wait until you see "Database connected" in the log

## Terminal 2 — create the Artillery YAML files 



## Run per-module performance tests (each member runs their own)
cd server

# Member 1
npx artillery run tests/performance/scenarios/auth-load.yml
npx artillery run tests/performance/scenarios/booking-load.yml

# Member 2
npx artillery run tests/performance/scenarios/resource-load.yml

# Member 3
npx artillery run tests/performance/scenarios/review-load.yml

# Member 4
npx artillery run tests/performance/scenarios/thread-load.yml