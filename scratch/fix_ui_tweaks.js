const fs = require('fs');
const path = require('path');

const captainPath = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(captainPath, 'utf8');

// 1. Make the tabs "mais leves"
const oldTabsHTML = `<div style={{ display: "flex", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)", padding: "0.25rem", marginBottom: "0.5rem" }}>
                <button 
                  onClick={() => setSuspectTab("ativos")}
                  style={{ flex: 1, padding: "0.75rem", background: suspectTab === "ativos" ? "var(--color-surface)" : "transparent", color: suspectTab === "ativos" ? "var(--color-text-primary)" : "var(--color-text-secondary)", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                >
                  Ativos ({activeSuspects.length})
                </button>
                <button 
                  onClick={() => setSuspectTab("arquivados")}
                  style={{ flex: 1, padding: "0.75rem", background: suspectTab === "arquivados" ? "var(--color-surface)" : "transparent", color: suspectTab === "arquivados" ? "var(--color-text-primary)" : "var(--color-text-secondary)", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                >
                  Arquivados ({archivedSuspects.length})
                </button>
              </div>`;

const newTabsHTML = `<div style={{ display: "flex", background: "var(--color-surface)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: "var(--radius-lg)", padding: "0.25rem", marginBottom: "1rem" }}>
                <button 
                  onClick={() => setSuspectTab("ativos")}
                  style={{ flex: 1, padding: "0.6rem", background: suspectTab === "ativos" ? "rgba(168,85,247,0.15)" : "transparent", color: suspectTab === "ativos" ? "#a855f7" : "var(--color-text-secondary)", border: "none", borderRadius: "var(--radius-md)", fontWeight: suspectTab === "ativos" ? 600 : 500, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
                >
                  Ativos ({activeSuspects.length})
                </button>
                <button 
                  onClick={() => setSuspectTab("arquivados")}
                  style={{ flex: 1, padding: "0.6rem", background: suspectTab === "arquivados" ? "rgba(168,85,247,0.15)" : "transparent", color: suspectTab === "arquivados" ? "#a855f7" : "var(--color-text-secondary)", border: "none", borderRadius: "var(--radius-md)", fontWeight: suspectTab === "arquivados" ? 600 : 500, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
                >
                  Histórico ({archivedSuspects.length})
                </button>
              </div>`;

content = content.replace(oldTabsHTML, newTabsHTML);

// Also replace the word "Arquivados" with "Histórico" in the button mapping just in case it doesn't strictly match the old block exactly
content = content.replace(/Arquivados \(\{archivedSuspects\.length\}\)/g, 'Histórico ({archivedSuspects.length})');

// 2. Fix overlapping suspects by adding flexShrink: 0
content = content.replace(
  /onClick=\{\(\) => setSelectedSuspect\(sus\)\} style=\{\{ background: "var\(--color-surface\)", borderRadius: "var\(--radius-md\)", border: "1px solid rgba\(168,85,247,0\.2\)", cursor: "pointer", overflow: "hidden" \}\}/g,
  `onClick={() => setSelectedSuspect(sus)} style={{ flexShrink: 0, background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid rgba(168,85,247,0.2)", cursor: "pointer", overflow: "hidden" }}`
);

fs.writeFileSync(captainPath, content);

// 3. Fix overlapping suspects in VigiaDashboard too
const vigiaPath = path.join(__dirname, '../src/components/VigiaDashboard.tsx');
let vigiaContent = fs.readFileSync(vigiaPath, 'utf8');
vigiaContent = vigiaContent.replace(
  /onClick=\{\(\) => setSelectedSuspect\(sus\)\} style=\{\{ background: "var\(--color-surface\)", borderRadius: "var\(--radius-md\)", border: "1px solid rgba\(168,85,247,0\.2\)", cursor: "pointer", overflow: "hidden" \}\}/g,
  `onClick={() => setSelectedSuspect(sus)} style={{ flexShrink: 0, background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid rgba(168,85,247,0.2)", cursor: "pointer", overflow: "hidden" }}`
);
fs.writeFileSync(vigiaPath, vigiaContent);

console.log('Fixed styling and overlapping');
