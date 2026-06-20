const fs = require('fs');

const file = 'src/components/VigiaDashboard.tsx';
const content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
lines.forEach((l, i) => {
  // Check for broken strings or "api/send-notification"
  if (l.includes('api/send-notification') || l.includes('title:') || l.includes('message:')) {
    console.log(i + 1, l.trim());
  }
});
