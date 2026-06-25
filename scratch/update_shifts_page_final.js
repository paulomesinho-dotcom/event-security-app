const fs = require('fs');

let content = fs.readFileSync('src/components/ShiftsPage.tsx', 'utf8');

// 1. Ensure EVENT_TABS is imported
if (!content.includes('import { EVENT_TABS }')) {
  content = content.replace(
    /import { useAuth } from "@\/contexts\/AuthContext";/,
    `import { useAuth } from "@/contexts/AuthContext";\nimport { EVENT_TABS } from "@/constants/events";`
  );
}

// 2. Replace static dates and periods with activeTab
const targetStates = `  const dates = ["10/jul", "11/jul", "12/jul"] as const;
  const periods = ["manha", "tarde"] as const;

  type DateKey = typeof dates[number];
  type PeriodKey = typeof periods[number];`;

const replacementStates = `  const [activeTab, setActiveTab] = useState(EVENT_TABS[0].id);
  const currentTab = EVENT_TABS.find(t => t.id === activeTab) || EVENT_TABS[0];

  type DateKey = string;
  type PeriodKey = string;`;

content = content.replace(targetStates, replacementStates);

// 3. Replace assignVigia's isoStart logic
const targetAssignVigia = `      let isoStart = new Date().toISOString();
      if (date === "10/jul") isoStart = \`2026-07-10T\${shiftTimes.start}:00Z\`;
      if (date === "11/jul") isoStart = \`2026-07-11T\${shiftTimes.start}:00Z\`;
      if (date === "12/jul") isoStart = \`2026-07-12T\${shiftTimes.start}:00Z\`;

      const shiftData = {
        locatorId: locator.id,
        locatorName: locator.name,
        local: localName,
        planId: locator.planId,
        personId: vigiaId,
        captainId: user?.uid,
        name: \`\${localName} - \${period === "manha" ? "Manhã" : "Tarde"}\`,
        time: \`\${period === "manha" ? "Manhã" : "Tarde"} (\${shiftTimes.start} - \${shiftTimes.end})\`,`;

const replacementAssignVigia = `      let isoStart = new Date().toISOString();
      if (date.includes("-")) {
        isoStart = \`\${date}T\${shiftTimes.start}:00Z\`;
      } else {
        const mMap: any = {"jan":"01","fev":"02","mar":"03","abr":"04","mai":"05","jun":"06","jul":"07","ago":"08","set":"09","out":"10","nov":"11","dez":"12"};
        const parts = date.split("/");
        if (parts.length === 2 && mMap[parts[1]]) {
           isoStart = \`2026-\${mMap[parts[1]]}-\${parts[0].padStart(2, '0')}T\${shiftTimes.start}:00Z\`;
        }
      }

      const shiftData = {
        locatorId: locator.id,
        locatorName: locator.name,
        local: localName,
        planId: locator.planId,
        personId: vigiaId,
        captainId: user?.uid,
        name: \`\${localName} - \${period === "manha" ? "Manhã" : period === "tarde" ? "Tarde" : "Noite"}\`,
        time: \`\${period === "manha" ? "Manhã" : period === "tarde" ? "Tarde" : "Noite"} (\${shiftTimes.start} - \${shiftTimes.end})\`,`;

content = content.replace(targetAssignVigia, replacementAssignVigia);

// 4. Update the Table Render block
const targetRender = `      <div style={{ padding: "0 1.5rem 2rem 1.5rem" }}>
        <div style={{ overflowX: "auto", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
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
          </thead>
          <tbody>
            {locators.map(locator => {
              const loc = locations[locator.locationId];
              if (!loc) return null;
              return (
                <tr key={locator.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ ...tdStyle, fontWeight: 500, color: "var(--color-text-primary)", background: "var(--color-bg)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <MapPin size={16} color="var(--color-primary)" />
                      {locator.name} <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: "normal" }}>({loc.local})</span>
                    </div>
                  </td>
                  {dates.map(d => (
                    periods.map(p => {`;

const replacementRender = `      <div style={{ padding: "0 1.5rem 2rem 1.5rem" }}>
        
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

        <div style={{ overflowX: "auto", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
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
          </thead>
          <tbody>
            {locators.map(locator => {
              const loc = locations[locator.locationId];
              if (!loc) return null;
              return (
                <tr key={locator.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ ...tdStyle, fontWeight: 500, color: "var(--color-text-primary)", background: "var(--color-bg)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <MapPin size={16} color="var(--color-primary)" />
                      {locator.name} <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: "normal" }}>({loc.local})</span>
                    </div>
                  </td>
                  {currentTab.dates.map(d => (
                    currentTab.periods.map(p => {`;

content = content.replace(targetRender, replacementRender);

fs.writeFileSync('src/components/ShiftsPage.tsx', content);
console.log("Updated ShiftsPage.tsx correctly!");
