const fs = require('fs');

const file = 'src/components/VigiaDashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

const startStr = '<div style={{ background: "linear-gradient(135deg, #151F31 0%, #1e3a5f 100%)"';
const endStr = '</section>';

const start = c.indexOf(startStr);
const end = c.indexOf(endStr, start);

if (start === -1 || end === -1) {
  console.error("Could not find the block");
  process.exit(1);
}

const newBlock = `<div style={{ background: "linear-gradient(135deg, #151F31 0%, #1e3a5f 100%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "0 8px 32px rgba(21,31,49,0.35)", color: "white" }}>
                <div style={{ height: "3px", background: "#10b981" }} />
                <div style={{ padding: "1rem 1.1rem", position: "relative" }}>
                  <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.6rem", position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                      <MapPin size={16} color="#34d399" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ marginBottom: "0.2rem" }}>
                          {activeWorkplace && (
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {activeWorkplace.name}
                            </span>
                          )}
                        </div>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                          {activeShiftLocation?.local || activeShift.locatorName}
                        </h4>
                        {(activeShiftLocation?.sublocal || activeShiftLocation?.subsublocal) && (
                          <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                            {[activeShiftLocation.sublocal, activeShiftLocation.subsublocal].filter(Boolean).join(" - ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ background: "rgba(16,185,129,0.2)", color: "#34d399", fontSize: "0.65rem", fontWeight: 700, padding: "0.25rem 0.5rem", borderRadius: "100px", display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", animation: "pulse 2s infinite" }} /> ATIVO
                    </div>
                  </div>

                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem", background: "rgba(255,255,255,0.1)", padding: "0.3rem 0.7rem", borderRadius: "var(--radius-md)", position: "relative" }}>
                    <Clock size={13} color="rgba(255,255,255,0.9)" />
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>Iniciado: {new Date(activeShift.startTime).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 0.9rem", marginBottom: "0.75rem", position: "relative" }}>
                    {activeShift.name && <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>{activeShift.name}</span>}
                    {activeShift.days && <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: "0.2rem" }}><Calendar size={11} />{activeShift.days}</span>}
                    {activeShift.time && <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: "0.2rem" }}><Clock size={11} />{activeShift.time}</span>}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", position: "relative" }}>
                    <button onClick={() => viewMap(activeShift)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", fontSize: "0.82rem", padding: "0.5rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "var(--radius-md)", color: "white", cursor: "pointer", fontWeight: 600 }}>
                      <MapPin size={14} /> Planta
                    </button>
                    <button onClick={() => updateShiftStatus(activeShift, "completed")} style={{ flex: 2, padding: "0.6rem", fontSize: "0.85rem", fontWeight: 700, border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", background: "#ef4444", color: "white", boxShadow: "0 4px 12px rgba(239,68,68,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
                      <Square size={14} fill="currentColor" /> Terminar Turno
                    </button>
                  </div>
                </div>
              </div>
            `;

c = c.substring(0, start) + newBlock + "\n              " + c.substring(end);
fs.writeFileSync(file, c);
console.log("Updated active shift layout.");
