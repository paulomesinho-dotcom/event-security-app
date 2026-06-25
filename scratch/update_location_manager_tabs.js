const fs = require('fs');
let content = fs.readFileSync('src/components/LocationManager.tsx', 'utf8');

// 1. Add Import
content = content.replace(
  /import { MapPin, Map, Edit2, Trash2, Plus, X, AlertCircle, Clock } from "lucide-react";/,
  `import { MapPin, Map, Edit2, Trash2, Plus, X, AlertCircle, Clock } from "lucide-react";\nimport { EVENT_TABS } from "../constants/events";`
);

// 2. Add activeTab state
content = content.replace(
  /const \[hasUnsavedChanges, setHasUnsavedChanges\] = useState\(false\);/,
  `const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);\n    const [activeTab, setActiveTab] = useState(EVENT_TABS[0].id);`
);

// 3. Update openCreateDrawer
const createDrawerOld = `setDraftShifts({});`;
const createDrawerNew = `const initial: any = {};
      for (const tab of EVENT_TABS) {
        for (const d of tab.dates) {
          initial[d] = {};
          for (const p of tab.periods) {
            initial[d][p] = { start: "", end: "" };
          }
        }
      }
      setDraftShifts(initial);`;
content = content.replace(createDrawerOld, createDrawerNew);

// 4. Update openEditDrawer
const editDrawerOld = `const initial: any = {};
    if (loc.customShifts) {
      for (const d of Object.keys(loc.customShifts)) {
        initial[d] = { manha: { start: "", end: "" }, tarde: { start: "", end: "" } };
        for (const p of periods) {
          const existing = loc.customShifts[d]?.[p] || { start: "", end: "" };
          initial[d][p] = { ...existing };
        }
      }
    }
    setDraftShifts(initial);`;
const editDrawerNew = `const initial: any = {};
      for (const tab of EVENT_TABS) {
        for (const d of tab.dates) {
          initial[d] = {};
          for (const p of tab.periods) {
            initial[d][p] = { start: "", end: "" };
          }
        }
      }
      if (loc.customShifts) {
        for (const tab of EVENT_TABS) {
          for (const d of tab.dates) {
            for (const p of tab.periods) {
              const existing = loc.customShifts[d]?.[p];
              if (existing) {
                initial[d][p] = { ...existing };
              }
            }
          }
        }
      }
      setDraftShifts(initial);`;
content = content.replace(editDrawerOld, editDrawerNew);

// 5. Replace render
const renderOld = `<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Clock size={14} /> Horários de Turnos (Opcional)
                  </h4>
                  {!isReadOnly && (
                    <button onClick={handleAddDate} className="btn btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", borderRadius: "var(--radius-full)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Plus size={14} /> Adicionar Dia
                    </button>
                  )}
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {Object.keys(draftShifts).sort().map(date => (
                    <div key={date} style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                          <h5 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-primary)" }}>Dia {date}</h5>
                          {!isReadOnly && (
                            <button onClick={() => handleRemoveDate(date)} style={{ background: "transparent", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: "0.2rem", display: "flex" }} title="Remover Dia">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {periods.map(period => (
                                <div key={period} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", width: "60px" }}>{period}</label>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                                      <input 
                                        type="time" 
                                        className="input" 
                                        value={draftShifts[date]?.[period]?.start || ""} 
                                        onChange={(e) => handleShiftChange(date, period, "start", e.target.value)}
                                        style={{ padding: "0.4rem", flex: 1, fontSize: "0.85rem", background: "var(--color-surface)", opacity: isReadOnly ? 0.7 : 1 }}
                                        disabled={isReadOnly}
                                      />
                                      <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>às</span>
                                      <input 
                                        type="time" 
                                        className="input" 
                                        value={draftShifts[date]?.[period]?.end || ""} 
                                        onChange={(e) => handleShiftChange(date, period, "end", e.target.value)}
                                        style={{ padding: "0.4rem", flex: 1, fontSize: "0.85rem", background: "var(--color-surface)", opacity: isReadOnly ? 0.7 : 1 }}
                                        disabled={isReadOnly}
                                      />
                                  </div>
                                </div>
                            ))}
                          </div>
                      </div>
                    ))}
                  </div>`;

const renderNew = `<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Clock size={14} /> Horários de Turnos (Opcional)
                  </h4>
                </div>
                
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
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {EVENT_TABS.find(t => t.id === activeTab)?.dates.map(date => (
                    <div key={date} style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                          <h5 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-primary)" }}>Dia {date}</h5>
                        </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {EVENT_TABS.find(t => t.id === activeTab)?.periods.map(period => (
                                <div key={period} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", width: "60px" }}>{period}</label>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                                      <input 
                                        type="time" 
                                        className="input" 
                                        value={draftShifts[date]?.[period]?.start || ""} 
                                        onChange={(e) => handleShiftChange(date, period, "start", e.target.value)}
                                        style={{ padding: "0.4rem", flex: 1, fontSize: "0.85rem", background: "var(--color-surface)", opacity: isReadOnly ? 0.7 : 1 }}
                                        disabled={isReadOnly}
                                      />
                                      <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>às</span>
                                      <input 
                                        type="time" 
                                        className="input" 
                                        value={draftShifts[date]?.[period]?.end || ""} 
                                        onChange={(e) => handleShiftChange(date, period, "end", e.target.value)}
                                        style={{ padding: "0.4rem", flex: 1, fontSize: "0.85rem", background: "var(--color-surface)", opacity: isReadOnly ? 0.7 : 1 }}
                                        disabled={isReadOnly}
                                      />
                                  </div>
                                </div>
                            ))}
                          </div>
                      </div>
                    ))}
                  </div>`;
content = content.replace(renderOld, renderNew);

// Remove unused functions handleAddDate and handleRemoveDate
content = content.replace(/const handleAddDate = \(\) => \{[\s\S]*?const handleRemoveDate = \(dateToRemove: string\) => \{[\s\S]*?setHasUnsavedChanges\(true\);\n  \};\n/, '');

// Also need to remove 'const periods = ["manha", "tarde"];' if it exists
content = content.replace(/const periods = \["manha", "tarde"\];\n/g, '');

fs.writeFileSync('src/components/LocationManager.tsx', content);
console.log("Updated LocationManager.tsx");
