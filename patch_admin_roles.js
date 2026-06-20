const fs = require('fs');

// 1. Patch EmergencyDashboard.tsx
let dashboard = fs.readFileSync('src/components/EmergencyDashboard.tsx', 'utf-8');

const oldButtons = `{workplaceEmergency ? (
                      <button onClick={toggleWorkplace} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "transparent", border: "2px solid #f97316", color: "#f97316", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>
                        DESATIVAR ALERTA LOCAL
                      </button>
                    ) : (
                      <button onClick={toggleWorkplace} disabled={globalEmergency} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "#f97316", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: globalEmergency ? "not-allowed" : "pointer", fontSize: "0.95rem", opacity: globalEmergency ? 0.5 : 1 }}>
                        <MapPin size={18} />
                        INICIAR ALERTA DE ZONA
                      </button>
                    )}`;

const newButtons = `{user?.role === "superadmin" && (workplaceEmergency ? (
                      <button onClick={toggleWorkplace} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "transparent", border: "2px solid #f97316", color: "#f97316", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>
                        DESATIVAR ALERTA LOCAL
                      </button>
                    ) : (
                      <button onClick={toggleWorkplace} disabled={globalEmergency} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "#f97316", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: globalEmergency ? "not-allowed" : "pointer", fontSize: "0.95rem", opacity: globalEmergency ? 0.5 : 1 }}>
                        <MapPin size={18} />
                        INICIAR ALERTA DE ZONA
                      </button>
                    ))}`;

dashboard = dashboard.replace(oldButtons, newButtons);
fs.writeFileSync('src/components/EmergencyDashboard.tsx', dashboard);

// 2. Patch EmergencyBanner.tsx
let banner = fs.readFileSync('src/components/EmergencyBanner.tsx', 'utf-8');

// Missing Persons
banner = banner.replace(
  /if \(change\.type === "added" && change\.doc\.data\(\)\.initiatedBy !== user\?\.uid\) playAlertBeeps\(\);/g,
  'if (change.type === "added" && change.doc.data().initiatedBy !== user?.uid && user?.role !== "superadmin") playAlertBeeps();'
);

// Global Emergency
banner = banner.replace(
  /if \(data\.globalAlertCreatedBy !== user\?\.uid\) playAlertBeeps\(\);/g,
  'if (data.globalAlertCreatedBy !== user?.uid && user?.role !== "superadmin") playAlertBeeps();'
);

// Local Emergency
banner = banner.replace(
  /if \(change\.type === "added" && change\.doc\.data\(\)\.emergencyCreatedBy !== user\?\.uid\) \{\s*playAlertBeeps\(\);\s*\}/g,
  'if (change.type === "added" && change.doc.data().emergencyCreatedBy !== user?.uid && user?.role !== "superadmin") {\n             playAlertBeeps();\n          }'
);

fs.writeFileSync('src/components/EmergencyBanner.tsx', banner);

// 3. Patch VigiaDashboard.tsx
let vigia = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf-8');

vigia = vigia.replace(
  /if \(change\.type === "added" && change\.doc\.data\(\)\.vigiaId !== user\?\.uid\) \{\s*playAlertBeeps\(\);\s*\}/g,
  'if (change.type === "added" && change.doc.data().vigiaId !== user?.uid && user?.role !== "superadmin") {\n            playAlertBeeps();\n          }'
);

fs.writeFileSync('src/components/VigiaDashboard.tsx', vigia);

console.log('Patched permissions and sound.');
