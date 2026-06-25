const fs = require('fs');
const c = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf8');
const start = c.indexOf('<div style={{ background: "linear-gradient(135deg, #151F31 0%, #1e3a5f 100%)"');
const end = c.indexOf('</section>', start);
console.log(c.substring(start, end));
