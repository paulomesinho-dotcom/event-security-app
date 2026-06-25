const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const tabsHTML = `
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
`;

if (!content.includes('Ativos ({activeSuspects.length})')) {
  content = content.replace('{suspectTab === "ativos" && (', tabsHTML + '\n              {suspectTab === "ativos" && (');
  fs.writeFileSync(file, content);
  console.log('Tabs inserted!');
} else {
  console.log('Tabs already exist!');
}
