const fs = require('fs');
let content = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf8');

// Incident modal
content = content.replace(
  '{showIncidentModal && (\n        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,',
  '{showIncidentModal && (\n        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))",'
);

// History modal
content = content.replace(
  '{showHistoryModal && (\n        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,',
  '{showHistoryModal && (\n        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))",'
);

// Suspects list
content = content.replace(
  '{showSuspectsList && !showNewSuspectModal && !selectedSuspect && (\n        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,',
  '{showSuspectsList && !showNewSuspectModal && !selectedSuspect && (\n        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))",'
);

// New suspect / details modal
content = content.replace(
  '{showNewSuspectModal && (\n        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,',
  '{showNewSuspectModal && (\n        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))",'
);

// Also selectedSuspect modal
content = content.replace(
  '{selectedSuspect && (\n        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,',
  '{selectedSuspect && (\n        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))",'
);

fs.writeFileSync('src/components/VigiaDashboard.tsx', content, 'utf8');
console.log('Modals updated');
