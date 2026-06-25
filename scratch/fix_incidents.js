const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Change Query for Incidents
content = content.replace(
  /const qIncidents = query\(collection\(db, "incidents"\), where\("vigiaId", "==", user\?\.uid \|\| "unknown"\)\);/,
  `const qIncidents = query(collection(db, "incidents"));`
);

// 2. Add State for Tabs
content = content.replace(
  /const \[myIncidents, setMyIncidents\] = useState<any\[\]>\(\[\]\);/,
  `const [allIncidents, setAllIncidents] = useState<any[]>([]);\n  const [incidentTab, setIncidentTab] = useState<"ativas" | "arquivadas">("ativas");\n  const activeIncidents = allIncidents.filter(i => i.status === "open");\n  const archivedIncidents = allIncidents.filter(i => i.status !== "open");`
);

// 3. Change onSnapshot setter
content = content.replace(
  /setMyIncidents\(inc\);/,
  `setAllIncidents(inc);`
);

// 4. Update the Dashboard badge
content = content.replace(
  /myIncidents\.length > 0 && <p style=\{\{ margin: 0, fontSize: "0\.75rem", color: "#fca5a5" \}\}>\{myIncidents\.length\} registadas<\/p>/,
  `activeIncidents.length > 0 && <p style={{ margin: 0, fontSize: "0.75rem", color: "#fca5a5" }}>{activeIncidents.length} ativas</p>`
);

// 5. Update the UI for incidents panel
const incidentPanelStart = /<button \n\s*onClick=\{\(\) => setShowIncidentModal\(true\)\}/;
content = content.replace(incidentPanelStart, `
              <div style={{ display: "flex", background: "var(--color-surface)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "var(--radius-lg)", padding: "0.25rem", marginBottom: "1rem" }}>
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
                onClick={() => setShowIncidentModal(true)}`
);

// Close the button
content = content.replace(
  /<\/button>\s*\{myIncidents\.length === 0 \? \(/,
  `</button>\n              )}\n              {(incidentTab === "ativas" ? activeIncidents : archivedIncidents).length === 0 ? (`
);

// Replace myIncidents mapping
content = content.replace(
  /myIncidents\.map\(\(inc, idx\) => \(/g,
  `(incidentTab === "ativas" ? activeIncidents : archivedIncidents).map((inc, idx) => (`
);

// Add flexShrink: 0 and a Close button if active
const incidentCardStyleRegex = /<div key=\{idx\} style=\{\{ background: "var\(--color-surface\)", borderRadius: "var\(--radius-md\)", border: "1px solid var\(--color-border\)", padding: "1rem" \}\}>/g;
content = content.replace(incidentCardStyleRegex, `<div key={idx} style={{ flexShrink: 0, background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", padding: "1rem", position: "relative" }}>
                     {incidentTab === "ativas" && (
                       <button
                         onClick={async () => {
                           if(confirm("Tem a certeza que deseja fechar esta ocorrência?")) {
                             try {
                               await updateDoc(doc(db, "incidents", inc.id), { status: "resolved", resolvedAt: new Date().toISOString(), resolvedBy: user?.name || user?.email || "Capitão" });
                             } catch(err) { alert("Erro ao fechar"); }
                           }
                         }}
                         style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "0.3rem 0.6rem", borderRadius: "100px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}
                       >
                         FECHAR OCORRÊNCIA
                       </button>
                     )}`);

// There is a history modal inside `activePanel === 'info'`, but it's not needed if we have tabs here.
// But we won't delete it just in case, or maybe it's fine.

fs.writeFileSync(file, content);
console.log('Incidents fixed');
