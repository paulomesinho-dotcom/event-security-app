const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/VigiaDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add State for Tabs
content = content.replace(
  /const \[myIncidents, setMyIncidents\] = useState<any\[\]>\(\[\]\);/,
  `const [allIncidents, setAllIncidents] = useState<any[]>([]);\n  const [incidentTab, setIncidentTab] = useState<"ativas" | "arquivadas">("ativas");\n  const activeIncidents = allIncidents.filter(i => i.status === "open");\n  const archivedIncidents = allIncidents.filter(i => i.status !== "open");`
);

// 2. Change onSnapshot setter
content = content.replace(
  /setMyIncidents\(inc\);/,
  `setAllIncidents(inc);`
);

// 3. Update the Dashboard badge
content = content.replace(
  /myIncidents\.length > 0 && <p style=\{\{ margin: 0, fontSize: "0\.75rem", color: "#fca5a5" \}\}>\{myIncidents\.length\} registadas<\/p>/,
  `activeIncidents.length > 0 && <p style={{ margin: 0, fontSize: "0.75rem", color: "#fca5a5" }}>{activeIncidents.length} ativas</p>`
);

// 4. Update the UI for incidents panel
const incidentPanelStart = /<button \n\s*onClick=\{\(\) => setShowIncidentModal\(true\)\}\n\s*style=\{\{ padding: "1rem 1\.25rem", background: "linear-gradient\(135deg, #dc2626, #ef4444\)", color: "white", border: "none", borderRadius: "var\(--radius-md\)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0\.5rem", fontSize: "0\.95rem", boxShadow: "0 4px 16px rgba\(239,68,68,0\.4\)" \}\}>\n\s*<AlertTriangle size=\{20\} \/> NOVA OCORRÊNCIA\n\s*<\/button>\n\s*\)\}/;

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

content = content.replace(/<button \s*onClick=\{\(\) => setShowIncidentModal\(true\)\}\s*style=\{\{ padding: "1rem 1\.25rem", background: "linear-gradient\(135deg, #dc2626, #ef4444\)", color: "white", border: "none", borderRadius: "var\(--radius-md\)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0\.5rem", fontSize: "0\.95rem", boxShadow: "0 4px 16px rgba\(239,68,68,0\.4\)" \}\}>\s*<AlertTriangle size=\{20\} \/> NOVA OCORRÊNCIA\s*<\/button>\s*/g, tabsHTML);


// Replace myIncidents usage in the main panel
content = content.replace(
  /\{myIncidents\.length === 0 \? \(/g,
  `{(incidentTab === "ativas" ? activeIncidents : archivedIncidents).length === 0 ? (`
);

content = content.replace(
  /myIncidents\.map\(\(inc, idx\) => \(/g,
  `(incidentTab === "ativas" ? activeIncidents : archivedIncidents).map((inc, idx) => (`
);

// Add flexShrink: 0 to the main incident card
const incidentCardStyleRegex = /<div key=\{idx\} style=\{\{ background: "var\(--color-surface\)", borderRadius: "var\(--radius-md\)", border: "1px solid var\(--color-border\)", padding: "1rem" \}\}>/g;
content = content.replace(incidentCardStyleRegex, `<div key={idx} style={{ flexShrink: 0, background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", padding: "1rem", position: "relative" }}>`);


// Replace myIncidents inside the History modal (even if they don't use it much now, it should compile)
content = content.replace(/myIncidents/g, 'allIncidents');

fs.writeFileSync(file, content);
console.log('Vigia incidents fixed');
