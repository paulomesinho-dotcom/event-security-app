const fs = require('fs');
let content = fs.readFileSync('src/components/ShiftsPage.tsx', 'utf8');

// 1. Ensure EVENT_TABS is imported
if (!content.includes('import { EVENT_TABS }')) {
  content = content.replace(
    /import \{ useAuth \} from "@\/contexts\/AuthContext";/,
    `import { useAuth } from "@/contexts/AuthContext";\nimport { EVENT_TABS } from "@/constants/events";`
  );
}

// 2. Replace static dates and periods with activeTab
content = content.replace(
  /const dates = \["10\/jul", "11\/jul", "12\/jul"\] as const;\s*const periods = \["manha", "tarde"\] as const;\s*type DateKey = typeof dates\[number\];\s*type PeriodKey = typeof periods\[number\];/g,
  `const [activeTab, setActiveTab] = useState(EVENT_TABS[0].id);\n  const currentTab = EVENT_TABS.find(t => t.id === activeTab) || EVENT_TABS[0];\n\n  type DateKey = string;\n  type PeriodKey = string;`
);

// 3. Replace assignVigia's isoStart logic
content = content.replace(
  /let isoStart = new Date\(\)\.toISOString\(\);\s*if \(date === "10\/jul"\) isoStart = `2026-07-10T\$\{shiftTimes\.start\}:00Z`;\s*if \(date === "11\/jul"\) isoStart = `2026-07-11T\$\{shiftTimes\.start\}:00Z`;\s*if \(date === "12\/jul"\) isoStart = `2026-07-12T\$\{shiftTimes\.start\}:00Z`;/g,
  `let isoStart = new Date().toISOString();\n      if (date.includes("-")) {\n        isoStart = \`\${date}T\${shiftTimes.start}:00Z\`;\n      } else {\n        const mMap: any = {"jan":"01","fev":"02","mar":"03","abr":"04","mai":"05","jun":"06","jul":"07","ago":"08","set":"09","out":"10","nov":"11","dez":"12"};\n        const parts = date.split("/");\n        if (parts.length === 2 && mMap[parts[1]]) {\n           isoStart = \`2026-\${mMap[parts[1]]}-\${parts[0].padStart(2, '0')}T\${shiftTimes.start}:00Z\`;\n        }\n      }`
);

// 4. Also update the name and time for "Noite"
content = content.replace(
  /name: `\$\{localName\} - \$\{period === "manha" \? "Manhã" : "Tarde"\}`,\s*time: `\$\{period === "manha" \? "Manhã" : "Tarde"\} \(\$\{shiftTimes\.start\} - \$\{shiftTimes\.end\}\)`,/g,
  `name: \`\${localName} - \${period === "manha" ? "Manhã" : period === "tarde" ? "Tarde" : "Noite"}\`,\n        time: \`\${period === "manha" ? "Manhã" : period === "tarde" ? "Tarde" : "Noite"} (\${shiftTimes.start} - \${shiftTimes.end})\`,`
);

// 5. Update the Table Render block
// Find the exact table render opening block
content = content.replace(
  /<table style=\{\{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" \}\}>\s*<thead>\s*<tr>\s*<th rowSpan=\{2\} style=\{thStyle\}>Pino \(Local\)<\/th>\s*\{dates\.map\(d => \(\s*<th key=\{d\} colSpan=\{2\} style=\{\{ \.\.\.thStyle, borderBottom: "1px solid var\(--color-border\)", textAlign: "center" \}\}>\s*\{d\}\s*<\/th>\s*\)\)\}\s*<\/tr>\s*<tr>\s*\{dates\.map\(d => \(\s*periods\.map\(p => \(\s*<th key=\{`\$\{d\}-\$\{p\}`\} style=\{\{ \.\.\.thStyle, fontSize: "0\.8rem", textAlign: "center", background: "var\(--color-bg\)" \}\}>\s*\{p === "manha" \? "Manhã" : "Tarde"\}\s*<\/th>\s*\)\)\s*\)\)\}\s*<\/tr>\s*<\/thead>/g,
  `<table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
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
          </thead>`
);

// Add the tabs UI right before the table's container div
content = content.replace(
  /<div style=\{\{ overflowX: "auto", background: "var\(--color-surface\)", borderRadius: "var\(--radius-lg\)", border: "1px solid var\(--color-border\)", boxShadow: "var\(--shadow-sm\)" \}\}>/g,
  `<div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", marginBottom: "1.5rem", paddingBottom: "0.5rem" }}>
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
        <div style={{ overflowX: "auto", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>`
);

// 6. Update inner loop inside tbody
content = content.replace(
  /\{dates\.map\(d => \(\s*periods\.map\(p => \{/g,
  `{currentTab.dates.map(d => (\n                    currentTab.periods.map(p => {`
);

fs.writeFileSync('src/components/ShiftsPage.tsx', content);
console.log("Regex script ran.");
