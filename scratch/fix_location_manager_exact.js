const fs = require('fs');

let content = fs.readFileSync('src/components/LocationManager.tsx', 'utf8');

const target = `<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Clock size={14} /> Horǭrios de Turnos (Opcional)
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
                          {periods.map(period => (`;

const replacement = `<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Clock size={14} /> Horǭrios de Turnos (Opcional)
                  </h4>
                </div>
                
                <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", marginBottom: "1.5rem", paddingBottom: "0.5rem" }}>
                  {EVENT_TABS.map(tab => (
                    <button 
                      key={tab.id}
                      onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
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
                          {EVENT_TABS.find(t => t.id === activeTab)?.periods.map(period => (`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/LocationManager.tsx', content);
  console.log("Updated LocationManager.tsx!");
} else {
  console.log("String replace did not match!");
}
