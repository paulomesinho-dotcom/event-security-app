const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// The incorrect part:
/*
          <div style={{ padding: "1rem", flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "3rem" }}>
            <button 
              onClick={() => setShowIncidentModal(true)}
              style={{ padding: "1rem 1.25rem", background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.95rem", boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}>
              <AlertTriangle size={20} /> NOVA OCORRÊNCIA
            </button>
              )}
*/

const targetToReplace = `<button 
              onClick={() => setShowIncidentModal(true)}
              style={{ padding: "1rem 1.25rem", background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.95rem", boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}>
              <AlertTriangle size={20} /> NOVA OCORRÊNCIA
            </button>
              )}`;

const tabsHTML = `              <div style={{ display: "flex", background: "var(--color-surface)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "var(--radius-lg)", padding: "0.25rem", marginBottom: "1rem" }}>
                <button 
                  onClick={() => setIncidentTab("ativas")}
                  style={{ flex: 1, padding: "0.6rem", background: incidentTab === "ativas" ? "rgba(239,68,68,0.15)" : "transparent", color: incidentTab === "ativas" ? "#ef4444" : "var(--color-text-secondary)", border: "none", borderRadius: "var(--radius-md)", fontWeight: incidentTab === "ativas" ? 600 : 500, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
                >
                  Ativas ({activeIncidents.length})
                </button>
                <button 
                  onClick={() => setIncidentTab("arquivadas")}
                  style={{ flex: 1, padding: "0.6rem", background: incidentTab === "arquivadas" ? "rgba(239,68,68,0.15)" : "transparent", color: incidentTab === "arquivadas" ? "#ef4444" : "var(--color-text-secondary)", border: "none", borderRadius: "var(--radius-md)", fontWeight: incidentTab === "arquivadas" ? 600 : 500, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
                >
                  Histórico ({archivedIncidents.length})
                </button>
              </div>

              {incidentTab === "ativas" && (
                <button 
                  onClick={() => setShowIncidentModal(true)}
                  style={{ padding: "1rem 1.25rem", background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.95rem", boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}>
                  <AlertTriangle size={20} /> NOVA OCORRÊNCIA
                </button>
              )}`;

content = content.replace(/<button \s*onClick=\{\(\) => setShowIncidentModal\(true\)\}\s*style=\{\{ padding: "1rem 1\.25rem", background: "linear-gradient\(135deg, #dc2626, #ef4444\)", color: "white", border: "none", borderRadius: "var\(--radius-md\)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0\.5rem", fontSize: "0\.95rem", boxShadow: "0 4px 16px rgba\(239,68,68,0\.4\)" \}\}>\s*<AlertTriangle size=\{20\} \/> NOVA OCORRÊNCIA\s*<\/button>\s*\)\}/g, tabsHTML);

fs.writeFileSync(file, content);
console.log("Syntax and tabs fixed");
