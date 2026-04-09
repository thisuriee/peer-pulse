const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/v1/threads/69d3eae1a1418ccbcd930ed9/replies/69d3ec4aa1418ccbcd930f1e/upvote',
  method: 'POST',
  headers: {
    // missing auth, but this should yield a 401 or 403, or our specific 404 message
  }
};

const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log('BODY:', chunk);
  });
});

req.on('error', (e) => {
  console.error('problem with request:', e.message);
});

req.end();
