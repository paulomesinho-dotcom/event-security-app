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

const newBlock = `<div style={{ background: "linear-gradient(135deg, #151F31 0%, #1e3a5f 100%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "0 8px 32px rgba(21,31,49,0.35)", position: "relative" }}>
                <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
                
                <div style={{ height: "3px", background: "linear-gradient(90deg, #10b981, #34d399)" }} />
                
                <div style={{ padding: "1.25rem 1.1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.8rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                      <MapPin size={16} color="#34d399" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ marginBottom: "0.2rem" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {activeWorkplace ? \`\${activeWorkplace.name} - \` : ""}POSIÇÃO ATUAL
                          </span>
                        </div>
                        {activeShiftLocation ? (
                          <>
                            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "white" }}>
                              {activeShiftLocation.local || activeShift.locatorName}
                            </h3>
                            {(activeShiftLocation.sublocal || activeShiftLocation.subsublocal) && (
                              <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>
                                {[activeShiftLocation.sublocal, activeShiftLocation.subsublocal].filter(Boolean).join(" - ")}
                              </p>
                            )}
                          </>
                        ) : (
                          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "white" }}>
                            {activeShift.locatorName}
                          </h3>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
                    {activeShift.name && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Info size={14} color="rgba(255,255,255,0.5)" />
                        <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.9)" }}>{activeShift.name}</span>
                      </div>
                    )}
                    {activeShift.days && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Calendar size={14} color="rgba(255,255,255,0.5)" />
                        <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.9)" }}>{activeShift.days}</span>
                      </div>
                    )}
                    {activeShift.time && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Clock size={14} color="rgba(255,255,255,0.5)" />
                        <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
                          <span style={{ color: "white" }}>{activeShift.time.split('-')[0]}</span> - {activeShift.time.split('-')[1] || ""}
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Play size={14} color="rgba(255,255,255,0.5)" />
                      <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
                        Iniciado às <span style={{ color: "white" }}>{new Date(activeShift.startTime).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => viewMap(activeShift)} style={{ flex: 1, padding: "0.65rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "var(--radius-md)", color: "white", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
                      <MapPin size={16} /> Planta
                    </button>
                    <button onClick={() => updateShiftStatus(activeShift, "completed")} style={{ flex: 1, padding: "0.65rem", background: "#ef4444", border: "none", borderRadius: "var(--radius-md)", color: "white", fontSize: "0.85rem", fontWeight: 700, boxShadow: "0 4px 12px rgba(239,68,68,0.35)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
                      <Square size={16} fill="currentColor" /> Terminar
                    </button>
                  </div>
                </div>
              </div>
            `;

c = c.substring(0, start) + newBlock + "\n              " + c.substring(end);
fs.writeFileSync(file, c);
console.log("Updated active shift layout.");
