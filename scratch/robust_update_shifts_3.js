const fs = require('fs');
let content = fs.readFileSync('src/components/ShiftsPage.tsx', 'utf8');

content = content.replace(/\r\n/g, '\n'); // FIX CRLF vs LF !!

// 1. Add Import
if (!content.includes('import { EVENT_TABS }')) {
  content = content.replace(
    'import { useAuth } from "@/contexts/AuthContext";',
    'import { useAuth } from "@/contexts/AuthContext";\nimport { EVENT_TABS } from "@/constants/events";'
  );
}

// 2. States
const oldStates = `  const dates = ["10/jul", "11/jul", "12/jul"] as const;
  const periods = ["manha", "tarde"] as const;

  type DateKey = typeof dates[number];
  type PeriodKey = typeof periods[number];`;

const newStates = `  const [activeTab, setActiveTab] = useState(EVENT_TABS[0].id);
  const currentTab = EVENT_TABS.find(t => t.id === activeTab) || EVENT_TABS[0];

  type DateKey = string;
  type PeriodKey = string;`;

content = content.replace(oldStates, newStates);

// 3. assignVigia logic
const oldAssign1 = `      let isoStart = new Date().toISOString();
      if (date === "10/jul") isoStart = \`2026-07-10T\${shiftTimes.start}:00Z\`;
      if (date === "11/jul") isoStart = \`2026-07-11T\${shiftTimes.start}:00Z\`;
      if (date === "12/jul") isoStart = \`2026-07-12T\${shiftTimes.start}:00Z\`;`;

const newAssign1 = `      let isoStart = new Date().toISOString();
      if (date.includes("-")) {
        isoStart = \`\${date}T\${shiftTimes.start}:00Z\`;
      } else {
        const mMap: any = {"jan":"01","fev":"02","mar":"03","abr":"04","mai":"05","jun":"06","jul":"07","ago":"08","set":"09","out":"10","nov":"11","dez":"12"};
        const parts = date.split("/");
        if (parts.length === 2 && mMap[parts[1]]) {
           isoStart = \`2026-\${mMap[parts[1]]}-\${parts[0].padStart(2, '0')}T\${shiftTimes.start}:00Z\`;
        }
      }`;

content = content.replace(oldAssign1, newAssign1);

const oldAssign2 = `        name: \`\${localName} - \${period === "manha" ? "Manhã" : "Tarde"}\`,
        time: \`\${period === "manha" ? "Manhã" : "Tarde"} (\${shiftTimes.start} - \${shiftTimes.end})\`,`;

const newAssign2 = `        name: \`\${localName} - \${period === "manha" ? "Manhã" : period === "tarde" ? "Tarde" : "Noite"}\`,
        time: \`\${period === "manha" ? "Manhã" : period === "tarde" ? "Tarde" : "Noite"} (\${shiftTimes.start} - \${shiftTimes.end})\`,`;

content = content.replace(oldAssign2, newAssign2);

// 4. Render Table
const oldRender = `  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
        <thead>
          <tr>
            <th rowSpan={2} style={thStyle}>Pino (Local)</th>
            {dates.map(d => (
              <th key={d} colSpan={2} style={{ ...thStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center" }}>
                {d}
              </th>
            ))}
          </tr>
          <tr>
            {dates.map(d => (
               periods.map(p => (
                 <th key={\`\${d}-\${p}\`} style={{ ...thStyle, fontSize: "0.8rem", textAlign: "center", background: "var(--color-bg)" }}>
                   {p === "manha" ? "Manhã" : "Tarde"}
                 </th>
               ))
            ))}
          </tr>
        </thead>`;

const newRender = `  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", marginBottom: "1.5rem", paddingBottom: "0.5rem" }}>
        {EVENT_TABS.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", border: "none", background: activeTab === tab.id ? "var(--color-primary)" : "var(--color-bg)", color: activeTab === tab.id ? "white" : "var(--color-text-secondary)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
          <thead>
            <tr>
              <th rowSpan={2} style={thStyle}>Pino (Local)</th>
              {currentTab.dates.map(d => (
                <th key={d} colSpan={currentTab.periods.length} style={{ ...thStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center" }}>
                  {d}
                </th>
              ))}
            </tr>
            <tr>
              {currentTab.dates.map(d => (
                 currentTab.periods.map(p => (
                   <th key={\`\${d}-\${p}\`} style={{ ...thStyle, fontSize: "0.8rem", textAlign: "center", background: "var(--color-bg)" }}>
                     {p === "manha" ? "Manhã" : p === "tarde" ? "Tarde" : "Noite"}
                   </th>
                 ))
              ))}
            </tr>
          </thead>`;

content = content.replace(oldRender, newRender);

const oldLoop = `{dates.map(d => (
                  periods.map(p => {`;

const newLoop = `{currentTab.dates.map(d => (
                    currentTab.periods.map(p => {`;

content = content.replace(oldLoop, newLoop);

fs.writeFileSync('src/components/ShiftsPage.tsx', content);
console.log("Updated with CRLF fix!");
