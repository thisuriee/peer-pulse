const fs = require('fs');
let code = fs.readFileSync('CreateThreadModal.jsx', 'utf8');

code = code.replace(
  /toast\(\{ title: 'Error', description: 'Failed to create thread', variant: 'destructive' \}\);/g,
  "toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create thread', variant: 'destructive' });"
);

fs.writeFileSync('CreateThreadModal.jsx', code);
