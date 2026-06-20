const fs = require('fs');

// 1. Patch EmergencyBanner.tsx
let banner = fs.readFileSync('src/components/EmergencyBanner.tsx', 'utf-8');

// Ensure stopAlertBeeps is imported
if (!banner.includes('stopAlertBeeps')) {
  banner = banner.replace('import { playAlertBeeps } from "@/lib/audioAlert";', 'import { playAlertBeeps, stopAlertBeeps } from "@/lib/audioAlert";');
}

// Add stopAlertBeeps to handleAcknowledge
if (!banner.includes('stopAlertBeeps(); // Added by patch in handleAcknowledge')) {
  banner = banner.replace('const handleAcknowledge = async () => {', 'const handleAcknowledge = async () => {\n    stopAlertBeeps(); // Added by patch in handleAcknowledge');
}

// Add stopAlertBeeps to handleEvacuated
if (!banner.includes('stopAlertBeeps(); // Added by patch in handleEvacuated')) {
  banner = banner.replace('const handleEvacuated = async () => {', 'const handleEvacuated = async () => {\n    stopAlertBeeps(); // Added by patch in handleEvacuated');
}

fs.writeFileSync('src/components/EmergencyBanner.tsx', banner);


// 2. Patch VigiaDashboard.tsx
let dashboard = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf-8');

// Ensure stopAlertBeeps is imported
if (!dashboard.includes('stopAlertBeeps')) {
  dashboard = dashboard.replace('import { initAudio, playAlertBeeps } from "@/lib/audioAlert";', 'import { initAudio, playAlertBeeps, stopAlertBeeps } from "@/lib/audioAlert";');
}

// Change onClick={() => setActivePanel('suspects')} to include stopAlertBeeps()
dashboard = dashboard.replace(/onClick=\{\(\) => setActivePanel\('suspects'\)\}/g, 'onClick={() => { stopAlertBeeps(); setActivePanel("suspects"); }}');

// Change onClick={() => setActivePanel('incidents')} to include stopAlertBeeps()
dashboard = dashboard.replace(/onClick=\{\(\) => setActivePanel\('incidents'\)\}/g, 'onClick={() => { stopAlertBeeps(); setActivePanel("incidents"); }}');

fs.writeFileSync('src/components/VigiaDashboard.tsx', dashboard);

console.log('Patched Banner and Dashboard');
