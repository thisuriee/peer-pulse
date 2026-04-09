const fs = require('fs');
let code = fs.readFileSync('ThreadDetailsPage.jsx', 'utf8');

// For try...catch in handleReplySubmit
code = code.replace(
  /toast\(\{ title: 'Error', description: 'Failed to add reply', variant: 'destructive' \}\);/,
  "toast({ title: 'Error', description: err.response?.data?.message || 'Failed to add reply', variant: 'destructive' });"
);

// We should also patch ThreadService / CreateThreadModal just in case
fs.writeFileSync('ThreadDetailsPage.jsx', code);
