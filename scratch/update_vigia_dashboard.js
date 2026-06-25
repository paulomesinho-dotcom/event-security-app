const fs = require('fs');

let content = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf8');

// 1. Replace isWithinShiftTime
const newIsWithinShiftTime = `function isWithinShiftTime(shift: Shift): { allowed: boolean; reason: string } {
  const now = new Date();

  if (shift.days) {
    const monthMap: Record<string, number> = {
      "jan": 0, "fev": 1, "mar": 2, "abr": 3, "mai": 4, "jun": 5,
      "jul": 6, "ago": 7, "set": 8, "out": 9, "nov": 10, "dez": 11
    };
    
    const shiftDays = shift.days.split(",").map(d => d.trim());
    let dateMatches = false;
    for (const d of shiftDays) {
      const parts = d.split("/");
      if (parts.length === 2) {
        const day = parseInt(parts[0], 10);
        const monthStr = parts[1].toLowerCase();
        const month = monthMap[monthStr];
        
        if (now.getDate() === day && now.getMonth() === month) {
          dateMatches = true;
          break;
        }
      }
    }
    
    if (!dateMatches) {
      return { allowed: false, reason: \`Apenas no próprio dia (\${shift.days})\` };
    }
  }

  const getMinutes = (timeStr: string) => {
    if (!timeStr) return -1;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startStr = getShiftStartTime(shift);
  const endStr = getShiftEndTime(shift);

  if (!startStr && !endStr) return { allowed: true, reason: "" };

  const startMin = getMinutes(startStr);
  const endMin = getMinutes(endStr);

  if (startMin > 0 && nowMin < startMin - 30) {
    return { allowed: false, reason: \`Início às \${startStr} (pode iniciar 30 min antes)\` };
  }
  if (endMin > 0 && nowMin > endMin + 15) {
    return { allowed: false, reason: \`Período terminou às \${endStr}\` };
  }

  return { allowed: true, reason: "" };
}`;

content = content.replace(/function isWithinShiftTime\([^]*?return \{ allowed: true, reason: "" \};\n\}/, newIsWithinShiftTime);


// 2. Replace pending shift card rendering to include workplace name
const pendingShiftOld = `<h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                                {shift.local || shift.locatorName}
                              </h4>`;
const pendingShiftNew = `<div style={{ marginBottom: "0.2rem" }}>
                                {workplaces.find(w => w.planIds?.includes(shift.planId)) && (
                                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    {workplaces.find(w => w.planIds?.includes(shift.planId))?.name}
                                  </span>
                                )}
                              </div>
                              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                                {shift.local || shift.locatorName}
                              </h4>`;
content = content.replace(pendingShiftOld, pendingShiftNew);


// 3. Replace active shift card rendering
const activeShiftOld = `<div style={{ background: "linear-gradient(135deg, #151F31 0%, #1e3a5f 100%)", borderRadius: "var(--radius-lg)", padding: "1.25rem", color: "white", boxShadow: "0 8px 32px rgba(21,31,49,0.35)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flex: 1, minWidth: 0 }}>
                    <div style={{ background: "rgba(16,185,129,0.2)", padding: "0.55rem", borderRadius: "50%", flexShrink: 0 }}>
                      <MapPin size={20} color="#34d399" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.05em" }}>
                        {activeWorkplace ? \`\${activeWorkplace.name.toUpperCase()} - \` : ""}POSIÇÃO ATUAL
                      </p>
                      {activeShiftLocation ? (
                        <>
                          <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {activeShiftLocation.local || activeShift.locatorName}
                          </h3>
                          {(activeShiftLocation.sublocal || activeShiftLocation.subsublocal) && (
                            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                              {[activeShiftLocation.sublocal, activeShiftLocation.subsublocal].filter(Boolean).join(" - ")}
                            </p>
                          )}
                        </>
                      ) : (
                        <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeShift.locatorName}</h3>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
                    <button onClick={() => viewMap(activeShift)} style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.8rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "var(--radius-md)", color: "white", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                      <MapPin size={14} /> Planta
                    </button>
                    <button onClick={() => updateShiftStatus(activeShift, "completed")} style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.8rem", background: "#ef4444", border: "none", borderRadius: "var(--radius-md)", color: "white", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, boxShadow: "0 4px 12px rgba(239,68,68,0.35)", whiteSpace: "nowrap" }}>
                      <Square size={14} fill="currentColor" /> Terminar
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {activeShift.name && (
                    <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.75rem" }}>
                      <p style={{ margin: 0, fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.15rem", fontWeight: 600 }}>DESIGNAÇÃO</p>
                      <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>{activeShift.name}</p>
                    </div>
                  )}
                  {activeShift.time && (
                    <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.75rem" }}>
                      <p style={{ margin: 0, fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.15rem", fontWeight: 600 }}>HORÁRIO</p>
                      <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>{activeShift.time}</p>
                    </div>
                  )}
                  {activeShift.days && (
                    <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.75rem" }}>
                      <p style={{ margin: 0, fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.15rem", fontWeight: 600 }}>DATA</p>
                      <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>{activeShift.days}</p>
                    </div>
                  )}
                  <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.75rem" }}>
                    <p style={{ margin: 0, fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.15rem", fontWeight: 600 }}>INICIADO</p>
                    <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>{new Date(activeShift.startTime).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              </div>`;

const activeShiftNew = `<div style={{ background: "linear-gradient(135deg, #151F31 0%, #1e3a5f 100%)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "0 8px 32px rgba(21,31,49,0.35)", position: "relative" }}>
                <div style={{ height: "3px", background: "linear-gradient(90deg, #10b981, #34d399)" }} />
                <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
                
                <div style={{ padding: "1rem 1.1rem", position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.6rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                      <MapPin size={16} color="#34d399" style={{ flexShrink: 0 }} />
                      <div>
                        {activeWorkplace && (
                          <div style={{ marginBottom: "0.2rem" }}>
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {activeWorkplace.name}
                            </span>
                          </div>
                        )}
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "white" }}>
                          {activeShiftLocation ? activeShiftLocation.local : activeShift.locatorName}
                        </h4>
                        {(activeShiftLocation?.sublocal || activeShiftLocation?.subsublocal) && (
                          <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                            {[activeShiftLocation.sublocal, activeShiftLocation.subsublocal].filter(Boolean).join(" - ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status="active" />
                  </div>

                  {getShiftStartTime(activeShift) && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem", background: "rgba(16,185,129,0.15)", padding: "0.3rem 0.7rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(16,185,129,0.3)" }}>
                      <Clock size={13} color="#34d399" />
                      <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#34d399" }}>
                        Iniciado às: {new Date(activeShift.startTime).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 0.9rem", marginBottom: "0.75rem" }}>
                    {activeShift.name && <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>{activeShift.name}</span>}
                    {activeShift.days && <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: "0.2rem" }}><Calendar size={11} />{activeShift.days}</span>}
                    {activeShift.time && <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: "0.2rem" }}><Clock size={11} />{activeShift.time}</span>}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => viewMap(activeShift)} className="btn" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", fontSize: "0.82rem", padding: "0.5rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "var(--radius-md)", color: "white", cursor: "pointer", fontWeight: 600 }}>
                      <MapPin size={14} /> Planta
                    </button>
                    <button onClick={() => updateShiftStatus(activeShift, "completed")} style={{ flex: 2, padding: "0.6rem", fontSize: "0.85rem", fontWeight: 700, border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", boxShadow: "0 4px 12px rgba(239,68,68,0.35)" }}>
                      <Square size={14} fill="currentColor" style={{ marginRight: "0.2rem" }} /> Terminar
                    </button>
                  </div>
                </div>
              </div>`;
content = content.replace(activeShiftOld, activeShiftNew);

fs.writeFileSync('src/components/VigiaDashboard.tsx', content);
console.log("Done");
