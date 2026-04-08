npm run test:integration -- --testPathPattern=auth
npm run test:integration -- --testPathPattern=session

### Phase 02 verification

cd server
npm run test:integration

## All integration tests must pass before Phase 3.