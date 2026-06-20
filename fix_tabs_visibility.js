const fs = require('fs');
let dashboard = fs.readFileSync('src/components/EmergencyDashboard.tsx', 'utf-8');

// 1. Remove isSuperadmin checks around TabButton
dashboard = dashboard.replace(
`          {isSuperadmin && (
            <TabButton id="global_evac" icon={Globe} label="Evacuação Total" color="var(--color-text-secondary)" activeColor="var(--color-danger)" />
          )}`,
`          <TabButton id="global_evac" icon={Globe} label="Evacuação Total" color="var(--color-text-secondary)" activeColor="var(--color-danger)" />`
);

dashboard = dashboard.replace(
`          {isSuperadmin && (
            <TabButton id="missing" icon={Eye} label="Pessoa Desaparecida" color="var(--color-text-secondary)" activeColor="#eab308" />
          )}`,
`          <TabButton id="missing" icon={Eye} label="Pessoa Desaparecida" color="var(--color-text-secondary)" activeColor="#eab308" />`
);

// 2. Remove isSuperadmin checks for rendering the Tab Contents
dashboard = dashboard.replace(
`{activeTab === "global_evac" && isSuperadmin && (`,
`{activeTab === "global_evac" && (`
);

dashboard = dashboard.replace(
`{activeTab === "missing" && isSuperadmin && (`,
`{activeTab === "missing" && (`
);

// 3. Wrap Global Evacuation Buttons with isSuperadmin
const globalButtonsOld = `{globalEmergency && globalAlertType === "evacuation" ? (
                 <button onClick={toggleGlobal} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "transparent", border: "2px solid var(--color-danger)", color: "var(--color-danger)", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>
                   DESATIVAR ALERTA GLOBAL
                 </button>
               ) : (
                 <button onClick={toggleGlobal} disabled={globalEmergency && globalAlertType !== "evacuation"} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "var(--color-danger)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: (globalEmergency && globalAlertType !== "evacuation") ? "not-allowed" : "pointer", fontSize: "0.95rem", opacity: (globalEmergency && globalAlertType !== "evacuation") ? 0.5 : 1 }}>
                   <ShieldAlert size={18} />
                   INICIAR EVACUAÇÃO TOTAL
                 </button>
               )}`;

const globalButtonsNew = `{isSuperadmin && (globalEmergency && globalAlertType === "evacuation" ? (
                 <button onClick={toggleGlobal} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "transparent", border: "2px solid var(--color-danger)", color: "var(--color-danger)", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>
                   DESATIVAR ALERTA GLOBAL
                 </button>
               ) : (
                 <button onClick={toggleGlobal} disabled={globalEmergency && globalAlertType !== "evacuation"} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "var(--color-danger)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: (globalEmergency && globalAlertType !== "evacuation") ? "not-allowed" : "pointer", fontSize: "0.95rem", opacity: (globalEmergency && globalAlertType !== "evacuation") ? 0.5 : 1 }}>
                   <ShieldAlert size={18} />
                   INICIAR EVACUAÇÃO TOTAL
                 </button>
               ))}`;
dashboard = dashboard.replace(globalButtonsOld, globalButtonsNew);

// 4. Wrap Missing Person Button with isSuperadmin
const missingButtonOld = `<button 
                   onClick={() => setShowMissingForm(true)}
                   style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "#eab308", color: "#000", border: "none", borderRadius: "var(--radius-full)", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
                 >
                   <span style={{ fontSize: "1.2rem" }}>+</span> NOVO ALERTA
                 </button>`;

const missingButtonNew = `{isSuperadmin && (
                 <button 
                   onClick={() => setShowMissingForm(true)}
                   style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "#eab308", color: "#000", border: "none", borderRadius: "var(--radius-full)", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
                 >
                   <span style={{ fontSize: "1.2rem" }}>+</span> NOVO ALERTA
                 </button>
                 )}`;
dashboard = dashboard.replace(missingButtonOld, missingButtonNew);

fs.writeFileSync('src/components/EmergencyDashboard.tsx', dashboard);
console.log('Fixed tabs visibility and buttons.');
