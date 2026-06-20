const fs = require('fs');

const file = 'src/components/EmergencyBanner.tsx';
const content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.match(/[^\x00-\x7F]/)) {
    console.log(i + 1, l.trim());
  }
});
