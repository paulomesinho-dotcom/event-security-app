const fs = require('fs');

let content = fs.readFileSync('src/components/CaptainPatrolDashboard.tsx', 'utf8');
const lines = content.split('\n');

const newUI = `          {/* Secção Principal: Estado da Equipa */}
          <div style={{ marginTop: "1rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Equipa em Patrulha (Ativos)</span>
            {activeTeamShifts && activeTeamShifts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                {activeTeamShifts.map(shift => {
                   const locator = locators.find(l => l.id === shift.locatorId);
                   const vigia = teamVigias[shift.vigiaId];
                   return (
                     <div key={shift.id} onClick={() => {
                        const plan = activeWorkplace?.plans?.find(p => p.id === locator?.planId);
                        if (plan && locator) {
                           setMapModalData({ planImageUrl: plan.imageUrl, pinX: locator.x, pinY: locator.y, title: locator.name || "Local" });
                        }
                     }} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-lg)", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", position: "relative", overflow: "hidden", cursor: "pointer" }}>
                       <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "4px", background: "var(--color-primary)" }} />
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <div>
                           <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                             <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-primary)", boxShadow: "0 0 10px var(--color-primary)" }} />
                             {vigia?.name || "Vigia Desconhecido"}
                           </div>
                           <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                             <MapPin size={14} />
                             {locator?.name || "A carregar local..."}
                           </div>
                         </div>
                       </div>
                     </div>
                   );
                })}
              </div>
            ) : (
              <div style={{ marginTop: "0.5rem", background: "var(--color-surface)", padding: "1.25rem", borderRadius: "var(--radius-lg)", textAlign: "center", border: "1px solid var(--color-border)" }}>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>Nenhum vigia em patrulha neste momento.</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Próximos Turnos (A Iniciar)</span>
            {pendingTeamShifts && pendingTeamShifts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {pendingTeamShifts.map((shift, idx) => {
                   const locator = locators.find(l => l.id === shift.locatorId);
                   const vigia = teamVigias[shift.vigiaId];
                   return (
                     <div key={shift.id} onClick={() => {
                        const plan = activeWorkplace?.plans?.find(p => p.id === locator?.planId);
                        if (plan && locator) {
                           setMapModalData({ planImageUrl: plan.imageUrl, pinX: locator.x, pinY: locator.y, title: locator.name || "Local" });
                        }
                     }} style={{ background: "var(--color-surface)", padding: "0.875rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                       <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                         <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
                           <Clock size={16} />
                         </div>
                         <div>
                           <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.95rem" }}>{vigia?.name || "Vigia Desconhecido"}</div>
                           <div style={{ fontSize: "0.8rem", color: "var(--color-text-tertiary)" }}>{locator?.name || "Local Desconhecido"} • {shift.time}</div>
                         </div>
                       </div>
                     </div>
                   );
                })}
              </div>
            ) : (
              <div style={{ background: "var(--color-surface)", padding: "1.25rem", borderRadius: "var(--radius-md)", textAlign: "center", border: "1px solid var(--color-border)" }}>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>Não existem turnos agendados.</p>
              </div>
            )}
          </div>`;

// Replace lines 748 to 886 (which are index 747 to 885)
const before = lines.slice(0, 748);
const after = lines.slice(886);

const newLines = [...before, newUI, ...after];
fs.writeFileSync('src/components/CaptainPatrolDashboard.tsx', newLines.join('\n'));
console.log('Patched correctly!');
