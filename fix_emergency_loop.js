const fs = require('fs');

let content = fs.readFileSync('src/components/EmergencyBanner.tsx', 'utf-8');

// Replace the buggy condition
content = content.replace('if (change.type === "added" || (change.type === "modified" && change.doc.data().isEmergency === true)) {', 'if (change.type === "added") {');

fs.writeFileSync('src/components/EmergencyBanner.tsx', content);
console.log('Fixed EmergencyBanner local emergency condition.');
