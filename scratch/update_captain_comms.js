const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize to LF for reliable string searching
content = content.replace(/\r\n/g, '\n');

// 1. Add Users to lucide-react import
if (!content.includes(', Users,') && !content.includes(', Users }')) {
  content = content.replace('import { MapPin,', 'import { MapPin, Users,');
}

// 2. Insert state variables around line 278
const stateTarget = 'const [sendingGlobalAlert, setSendingGlobalAlert] = useState(false);';
const newStates = `const [sendingGlobalAlert, setSendingGlobalAlert] = useState(false);

  // Comunicações reestruturadas
  const [showTeamNotifyModal, setShowTeamNotifyModal] = useState(false);
  const [teamNotifyText, setTeamNotifyText] = useState("");
  const [sendingTeamNotify, setSendingTeamNotify] = useState(false);

  const [showCommsPlansModal, setShowCommsPlansModal] = useState(false);
  const [selectedCommsPlan, setSelectedCommsPlan] = useState<any>(null);
  const [selectedPinInfo, setSelectedPinInfo] = useState<any>(null);

  const [showTeamMembersModal, setShowTeamMembersModal] = useState(false);
  const [selectedTeamMemberDetails, setSelectedTeamMemberDetails] = useState<any>(null);

  const [showDirectMsgModal, setShowDirectMsgModal] = useState<{ vigiaId: string; vigiaName: string } | null>(null);
  const [directMsgText, setDirectMsgText] = useState("");
  const [sendingDirectMsg, setSendingDirectMsg] = useState(false);`;

if (!content.includes('showTeamNotifyModal')) {
  content = content.replace(stateTarget, newStates);
}

// 3. Insert send functions around sendGlobalAlert
const sendTarget = 'const sendGlobalAlert = async () => {';
const newSendFuncs = `const sendTeamNotification = async () => {
    if (!teamNotifyText) return;
    setSendingTeamNotify(true);
    try {
      await fetch("/api/send-notification-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: teamNotifyText,
          senderName: user?.name || user?.email,
          senderId: user?.uid,
          title: "Mensagem da Equipa (Capitão)",
          target: "all"
        })
      });
      alert("Mensagem enviada para a equipa!");
      setTeamNotifyText("");
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar mensagem para a equipa.");
    } finally {
      setSendingTeamNotify(false);
    }
  };

  const sendDirectMessage = async () => {
    if (!showDirectMsgModal || !directMsgText) return;
    setSendingDirectMsg(true);
    try {
      await fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: showDirectMsgModal.vigiaId,
          message: directMsgText,
          senderName: user?.name || user?.email,
          title: "Mensagem Direta do Capitão"
        })
      });
      alert(\`Mensagem enviada para \${showDirectMsgModal.vigiaName}!\`);
      setDirectMsgText("");
      setShowDirectMsgModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar mensagem direta.");
    } finally {
      setSendingDirectMsg(false);
    }
  };

  const sendGlobalAlert = async () => {`;

if (!content.includes('sendTeamNotification')) {
  content = content.replace(sendTarget, newSendFuncs);
}

// 4. Replace Comunicações panel UI
const oldZelloStart = '<div style={{ padding: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>';
const newZelloContent = `<div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <button 
                    onClick={() => setShowTeamNotifyModal(true)}
                    style={{ width: "100%", padding: "1rem", background: "linear-gradient(135deg, #4285F4, #1A73E8)", color: "white", border: "none", borderRadius: "var(--radius-lg)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontSize: "0.95rem", boxShadow: "0 4px 12px rgba(66, 133, 244, 0.3)" }}
                  >
                    <Bell size={20} /> NOTIFICAR EQUIPA
                  </button>

                  <button 
                    onClick={() => {
                      if (activeWorkplace?.plans?.length === 1) {
                        setSelectedCommsPlan(activeWorkplace.plans[0]);
                      } else {
                        setSelectedCommsPlan(null);
                      }
                      setSelectedPinInfo(null);
                      setShowCommsPlansModal(true);
                    }}
                    style={{ width: "100%", padding: "1rem", background: "linear-gradient(135deg, #6366f1, #4338ca)", color: "white", border: "none", borderRadius: "var(--radius-lg)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontSize: "0.95rem", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)" }}
                  >
                    <MapPin size={20} /> ABRIR PLANTAS
                  </button>

                  <button 
                    onClick={() => {
                      setSelectedTeamMemberDetails(null);
                      setShowTeamMembersModal(true);
                    }}
                    style={{ width: "100%", padding: "1rem", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", border: "none", borderRadius: "var(--radius-lg)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontSize: "0.95rem", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }}
                  >
                    <Users size={20} /> VER EQUIPA
                  </button>
                </div>

                <div style={{ height: "1px", background: "var(--color-border)", margin: "0.25rem 0" }} />
                <h4 style={{ margin: "0", color: "var(--color-text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Canais Zello</h4>

                {activeWorkplace?.zelloChannelLink ? (
                  <a href={activeWorkplace.zelloChannelLink} style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: "var(--radius-lg)", fontWeight: 700, color: "var(--color-text-primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1rem" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316" }}><Radio size={20} /></div>
                    Rádio Vigias
                  </a>
                ) : (
                  <div style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.75rem", opacity: 0.5 }}>
                     <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Radio size={20} /></div>
                     Canal Vigias não configurado
                  </div>
                )}

                {(activeWorkplace as any)?.zelloGroupLink ? (
                  <a href={(activeWorkplace as any).zelloGroupLink} style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "var(--radius-lg)", fontWeight: 700, color: "var(--color-text-primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1rem" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7" }}><Radio size={20} /></div>
                    Rádio Capitães e Coordenador
                  </a>
                ) : (
                  <div style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.75rem", opacity: 0.5 }}>
                     <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Radio size={20} /></div>
                     Canal Capitães não configurado
                  </div>
                )}
              </div>
            </div>`;

if (!content.includes('ABRIR PLANTAS')) {
  const zelloHeaderEnd = '<h3 style={{ margin: 0, color: "#ffedd5", fontSize: "1rem", fontWeight: 700 }}>Comunicações</h3>';
  const headerIndex = content.indexOf(zelloHeaderEnd);
  if (headerIndex !== -1) {
    const startIndex = content.indexOf(oldZelloStart, headerIndex);
    if (startIndex !== -1) {
      const capNotConfig = content.indexOf('Canal Capitães não configurado', startIndex);
      if (capNotConfig !== -1) {
        const closeDiv1 = content.indexOf('</div>', capNotConfig);
        const closeIf = content.indexOf(')}', closeDiv1);
        const closeContainer = content.indexOf('</div>', closeIf) + 6; // closes oldZelloStart
        
        content = content.substring(0, startIndex) + newZelloContent + content.substring(closeContainer);
      }
    }
  }
}

// 5. Insert new Modals before mapModalData
const modalsTarget = '{mapModalData && (';
const newModalsCode = `{/* MODAL NOTIFICAR EQUIPA */}
      {showTeamNotifyModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "var(--color-bg)", zIndex: 10001, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #1e0a3c, #5b1030)", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bell size={18} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#ffffff", fontSize: "1rem", fontWeight: 700 }}>Notificar Equipa</h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#fca5a5" }}>Enviar Mensagem Global</p>
              </div>
            </div>
            <button onClick={() => setShowTeamNotifyModal(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
          </div>
          
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label style={{ fontWeight: 600, color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>Escrever Mensagem</label>
              <textarea 
                className="input" 
                rows={4} 
                value={teamNotifyText} 
                onChange={e => setTeamNotifyText(e.target.value)}
                placeholder="Escreva a mensagem ou instrução para a equipa..."
                style={{ resize: "vertical" }}
              />
              <button 
                onClick={sendTeamNotification} 
                disabled={sendingTeamNotify || !teamNotifyText}
                style={{
                  width: "100%", padding: "1rem", background: "var(--color-primary)", color: "white",
                  border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "1rem",
                  cursor: (sendingTeamNotify || !teamNotifyText) ? "not-allowed" : "pointer",
                  opacity: (sendingTeamNotify || !teamNotifyText) ? 0.6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
                }}
              >
                {sendingTeamNotify ? "A ENVIAR..." : "ENVIAR PARA A EQUIPA"}
              </button>
            </div>

            {globalNotifications.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h4 style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Últimas Mensagens Enviadas</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {globalNotifications.map((notif: any) => (
                    <div 
                      key={notif.id}
                      style={{ 
                        padding: "1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "0.35rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f97316" }}>{notif.senderName}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)" }}>
                          {new Date(notif.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", lineHeight: 1.4 }}>{notif.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL ABRIR PLANTAS */}
      {showCommsPlansModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "var(--color-bg)", zIndex: 10001, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #312e81, #1e1b4b)", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MapPin size={18} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#ffffff", fontSize: "1rem", fontWeight: 700 }}>Plantas do Local</h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#c7d2fe" }}>{selectedCommsPlan?.name || "Selecione uma planta"}</p>
              </div>
            </div>
            <button onClick={() => { setShowCommsPlansModal(false); setSelectedPinInfo(null); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
            {!selectedCommsPlan ? (
              <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.85rem", textTransform: "uppercase" }}>Plantas Disponíveis</h4>
                {activeWorkplace?.plans?.map((plan: any) => (
                  <div 
                    key={plan.id}
                    onClick={() => setSelectedCommsPlan(plan)}
                    style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem" }}
                  >
                    <img src={plan.imageUrl} alt={plan.name} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)" }}>{plan.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {activeWorkplace?.plans?.length > 1 && (
                  <div style={{ padding: "0.5rem 1rem", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button onClick={() => { setSelectedCommsPlan(null); setSelectedPinInfo(null); }} style={{ background: "none", border: "none", color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>⬅ Trocar Planta</button>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{selectedCommsPlan.name}</span>
                  </div>
                )}
                <div style={{ flex: 1, position: "relative" }}>
                  <MapViewer 
                    imageUrl={selectedCommsPlan.imageUrl}
                    locators={locators.filter(l => !l.planId || l.planId === selectedCommsPlan.id)}
                    onLocatorClick={(locator) => {
                      const guardsOnPin = teamShifts.filter(s => (s.locatorName === locator.name || s.locationId === locator.id) && (s.status === 'active' || s.status === 'pending')).map(s => {
                        const v = teamVigias[s.vigiaId || s.personId || s.userId] || { name: s.personName || "Segurança" };
                        return { id: s.vigiaId || s.personId || s.userId, name: v.name || v.email || "Segurança", status: s.status, shiftTime: \`\${s.startTime ? new Date(s.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''} - \${s.endTime ? new Date(s.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}\` };
                      });
                      setSelectedPinInfo({ locator, guards: guardsOnPin });
                    }}
                  />
                </div>

                {/* PIN INFO OVERLAY */}
                {selectedPinInfo && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--color-surface)", borderTop: "2px solid #6366f1", padding: "1.25rem", boxShadow: "0 -4px 20px rgba(0,0,0,0.2)", zIndex: 100, maxHeight: "60%", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "1rem", color: "var(--color-text-primary)", fontWeight: 800 }}>📍 {selectedPinInfo.locator.name}</h4>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Seguranças no Posto ({selectedPinInfo.guards.length})</span>
                      </div>
                      <button onClick={() => setSelectedPinInfo(null)} style={{ background: "none", border: "none", color: "var(--color-text-tertiary)", cursor: "pointer" }}><X size={20} /></button>
                    </div>

                    {selectedPinInfo.guards.length === 0 ? (
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-tertiary)", fontStyle: "italic" }}>Nenhum turno ativo ou previsto para este ponto.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {selectedPinInfo.guards.map((g: any, i: number) => (
                          <div key={i} style={{ padding: "0.75rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>{g.name}</div>
                              <div style={{ fontSize: "0.75rem", color: g.status === 'active' ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
                                {g.status === 'active' ? '🟢 Ativo' : '🟡 Previsto'} {g.shiftTime && \`(\${g.shiftTime})\`}
                              </div>
                            </div>
                            {g.id && (
                              <button 
                                onClick={() => setShowDirectMsgModal({ vigiaId: g.id, vigiaName: g.name })}
                                style={{ padding: "0.5rem 0.8rem", background: "#6366f1", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}
                              >
                                <MessageCircle size={14} /> Mensagem
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL VER EQUIPA */}
      {showTeamMembersModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "var(--color-bg)", zIndex: 10001, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #065f46, #047857)", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={18} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#ffffff", fontSize: "1rem", fontWeight: 700 }}>Equipa Atribuída</h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#a7f3d0" }}>Seguranças em Turno</p>
              </div>
            </div>
            <button onClick={() => { setShowTeamMembersModal(false); setSelectedTeamMemberDetails(null); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "1.5rem" }}>
            {!selectedTeamMemberDetails ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {Array.from(userIds).length === 0 ? (
                  <p style={{ color: "var(--color-text-tertiary)", fontStyle: "italic" }}>Nenhum vigia associado aos turnos atuais.</p>
                ) : (
                  Array.from(userIds).map(id => {
                    const v = teamVigias[id] || { name: "Segurança" };
                    const vigiaShifts = teamShifts.filter(s => (s.vigiaId === id || s.personId === id || s.userId === id) && (s.status === 'active' || s.status === 'pending'));
                    return (
                      <div 
                        key={id}
                        onClick={() => setSelectedTeamMemberDetails({ id, ...v })}
                        style={{ padding: "1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(16,185,129,0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1rem" }}>
                            {(v.name || v.email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>{v.name || v.email || "Segurança"}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Turnos ({vigiaShifts.length})</div>
                          </div>
                        </div>
                        <span style={{ color: "var(--color-text-tertiary)" }}>➔</span>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <button onClick={() => setSelectedTeamMemberDetails(null)} style={{ background: "none", border: "none", color: "#10b981", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start", padding: 0 }}>⬅ Voltar à lista da equipa</button>
                
                <div style={{ padding: "1.25rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>{selectedTeamMemberDetails.name || selectedTeamMemberDetails.email}</h4>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Vigia de Segurança</span>
                  </div>
                  <button 
                    onClick={() => setShowDirectMsgModal({ vigiaId: selectedTeamMemberDetails.id, vigiaName: selectedTeamMemberDetails.name || "Segurança" })}
                    style={{ padding: "0.6rem 1rem", background: "#10b981", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <MessageCircle size={16} /> Mensagem
                  </button>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 0.75rem", color: "var(--color-text-secondary)", fontSize: "0.85rem", textTransform: "uppercase" }}>Turnos Atribuídos</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {teamShifts.filter(s => s.vigiaId === selectedTeamMemberDetails.id || s.personId === selectedTeamMemberDetails.id || s.userId === selectedTeamMemberDetails.id).map((shift: any) => (
                      <div key={shift.id} style={{ padding: "1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--color-text-primary)", fontSize: "0.9rem" }}>
                            {shift.status === 'active' ? '🟢 Ativo' : '🟡 Previsto'}: {shift.locatorName || "Posto"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                            🕐 {shift.startTime ? new Date(shift.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''} - {shift.endTime ? new Date(shift.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setShowTeamMembersModal(false);
                            setSelectedTeamMemberDetails(null);
                            viewMap(shift);
                          }}
                          style={{ padding: "0.5rem 0.8rem", background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}
                        >
                          <MapPin size={14} /> Ver na Planta
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL MENSAGEM DIRETA INDIVIDUAL */}
      {showDirectMsgModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 100005, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "var(--color-surface)", width: "100%", maxWidth: "450px", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--color-border)" }}>
            <div style={{ background: "#6366f1", padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "white" }}>
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Mensagem para {showDirectMsgModal.vigiaName}</h4>
              <button onClick={() => setShowDirectMsgModal(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <textarea 
                className="input" 
                rows={4} 
                value={directMsgText} 
                onChange={e => setDirectMsgText(e.target.value)}
                placeholder={\`Escreva a instrução direta para \${showDirectMsgModal.vigiaName}...\`}
                style={{ resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button onClick={() => setShowDirectMsgModal(null)} className="btn btn-secondary" style={{ padding: "0.7rem 1.2rem" }}>Cancelar</button>
                <button 
                  onClick={sendDirectMessage} 
                  disabled={sendingDirectMsg || !directMsgText}
                  className="btn btn-primary" 
                  style={{ padding: "0.7rem 1.2rem", background: "#6366f1" }}
                >
                  {sendingDirectMsg ? "A enviar..." : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mapModalData && (`;

if (!content.includes('MODAL NOTIFICAR EQUIPA')) {
  // Locate {mapModalData && ( regardless of indentation
  const mapModalRegex = /(\s*)\{mapModalData && \(/;
  const match = content.match(mapModalRegex);
  if (match) {
    const indent = match[1];
    content = content.replace(match[0], indent + newModalsCode);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated CaptainPatrolDashboard.tsx');
