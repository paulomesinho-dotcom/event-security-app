const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Change State
content = content.replace(
  /const \[activeSuspects, setActiveSuspects\] = useState<any\[\]>\(\[\]\);/,
  `const [allSuspects, setAllSuspects] = useState<any[]>([]);\n  const [suspectTab, setSuspectTab] = useState<"ativos" | "arquivados">("ativos");\n  const activeSuspects = allSuspects.filter(s => s.status === "active");\n  const archivedSuspects = allSuspects.filter(s => s.status !== "active");`
);

// 2. Change Query
content = content.replace(
  /const qSuspects = query\(collection\(db, "suspicious_persons"\), where\("status", "==", "active"\)\);/,
  `const qSuspects = query(collection(db, "suspicious_persons"));`
);

// 3. Change onSnapshot handler
content = content.replace(
  /setActiveSuspects\(s\);/,
  `setAllSuspects(s);`
);

// 4. Update the Panel UI to include tabs
const panelStartRegex = /<button \n\s*onClick=\{\(\) => \{\n\s*setSuspectLocal\(/;
content = content.replace(panelStartRegex, `
              <div style={{ display: "flex", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)", padding: "0.25rem", marginBottom: "0.5rem" }}>
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
              </div>

              {suspectTab === "ativos" && (
                <button 
                  onClick={() => {
                    setSuspectLocal(`
);

// We need to map over the correct list. Currently it maps over `activeSuspects.map`.
// Wait, the button "LANÇAR ALERTA" is also inside the panel. We should only show it if `suspectTab === "ativos"`.
// I added `{suspectTab === "ativos" && (` before the button. I need to close it.

// Let's find the end of the button and the activeSuspects.map
content = content.replace(
  /<\/button>\s*\{activeSuspects\.length === 0 \? \(/g,
  `</button>\n              )}\n              {(suspectTab === "ativos" ? activeSuspects : archivedSuspects).length === 0 ? (`
);

content = content.replace(
  /activeSuspects\.map\(\(suspect, idx\) => \(/g,
  `(suspectTab === "ativos" ? activeSuspects : archivedSuspects).map((suspect, idx) => (`
);

fs.writeFileSync(file, content);
console.log('Script ran successfully');
