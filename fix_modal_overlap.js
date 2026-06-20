const fs = require('fs');
let dashboard = fs.readFileSync('src/components/EmergencyDashboard.tsx', 'utf-8');

const oldModal = `{showMissingForm && (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "1rem" }}>
                    <div style={{ background: "var(--color-bg)", width: "100%", maxWidth: "600px", borderRadius: "var(--radius-xl)", overflow: "hidden", animation: "slideUp 0.3s ease-out" }}>`;

const newModal = `{showMissingForm && (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "1rem" }}>
                    <div style={{ background: "var(--color-bg)", width: "100%", maxWidth: "600px", borderRadius: "var(--radius-xl)", maxHeight: "90vh", overflowY: "auto", animation: "slideUp 0.3s ease-out", display: "flex", flexDirection: "column" }}>`;

dashboard = dashboard.replace(oldModal, newModal);
fs.writeFileSync('src/components/EmergencyDashboard.tsx', dashboard);

// Also check EmergencyBanner.tsx for z-index
let banner = fs.readFileSync('src/components/EmergencyBanner.tsx', 'utf-8');
banner = banner.replace(/zIndex: 10001/g, 'zIndex: 99999');
fs.writeFileSync('src/components/EmergencyBanner.tsx', banner);

console.log('Fixed missing person modal overlap.');
