const fs = require('fs');

// Patch EmergencyBanner.tsx
let banner = fs.readFileSync('src/components/EmergencyBanner.tsx', 'utf-8');

// Missing Persons: change.doc.data().initiatedBy !== user?.uid
banner = banner.replace(
  'if (change.type === "added") playAlertBeeps();',
  'if (change.type === "added" && change.doc.data().initiatedBy !== user?.uid) playAlertBeeps();'
);

// Global Emergency: data.globalAlertCreatedBy !== user?.uid
banner = banner.replace(
  /if \(!initialLoadGlobal && data\.globalEmergency === true && !globalEmergency\) \{\s*playAlertBeeps\(\);\s*\}/,
  'if (!initialLoadGlobal && data.globalEmergency === true && !globalEmergency) {\n          if (data.globalAlertCreatedBy !== user?.uid) playAlertBeeps();\n        }'
);

// Local Emergency: change.doc.data().emergencyCreatedBy !== user?.uid
banner = banner.replace(
  /if \(change\.type === "added"\) \{\s*playAlertBeeps\(\);\s*\}/,
  'if (change.type === "added" && change.doc.data().emergencyCreatedBy !== user?.uid) {\n             playAlertBeeps();\n          }'
);

fs.writeFileSync('src/components/EmergencyBanner.tsx', banner);

// Patch VigiaDashboard.tsx
let dashboard = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf-8');

// Suspects: change.doc.data().vigiaId !== user?.uid
dashboard = dashboard.replace(
  /if \(change\.type === "added"\) \{\s*playAlertBeeps\(\);\s*\}/,
  'if (change.type === "added" && change.doc.data().vigiaId !== user?.uid) {\n            playAlertBeeps();\n          }'
);

fs.writeFileSync('src/components/VigiaDashboard.tsx', dashboard);
console.log('Fixed self-triggered alarms in both files.');
