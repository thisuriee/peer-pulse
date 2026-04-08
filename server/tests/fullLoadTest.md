# Terminal 1
NODE_ENV=test PORT=5001 node src/index.js

# Terminal 2 — seed a load test user first if the auth-load scenario needs one
# Then:
npx artillery run tests/performance/scenarios/load-test.yml \
  --output tests/performance/results/report.json

# Generate HTML report
npx artillery report tests/performance/results/report.json