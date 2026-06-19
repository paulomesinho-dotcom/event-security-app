"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserX, Clock, MapPin, CheckCircle2, X, AlertTriangle, Eye, Navigation } from "lucide-react";

export default function SuspectManager() {
  const [suspects, setSuspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"ativos" | "historico">("ativos");
  const [selectedSuspect, setSelectedSuspect] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, "suspicious_persons"));
    const unsub = onSnapshot(q, (snap) => {
      const s: any[] = [];
      snap.forEach(d => s.push({ id: d.id, ...d.data() }));
      s.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSuspects(s);
      setLoading(false);
      
      setSelectedSuspect((prev: any) => {
        if (!prev) return null;
        return s.find(sus => sus.id === prev.id) || null;
      });
    });
    return () => unsub();
  }, []);

  const activeSuspects = suspects.filter(s => s.status === "active");
  const historySuspects = suspects.filter(s => s.status !== "active");
  const displayList = tab === "ativos" ? activeSuspects : historySuspects;

  const handleCloseActive = async (id: string, newStatus: "resolved" | "false_alarm") => {
    if (!confirm("Tem a certeza que pretende fechar esta ocorrência?")) return;
    try {
      await updateDoc(doc(db, "suspicious_persons", id), {
        status: newStatus,
        closedAt: new Date().toISOString()
      });
    } catch (err) {
      alert("Erro ao fechar ocorrência.");
    }
  };

  if (loading) return <div style={{ padding: "2rem" }}>A carregar suspeitos...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem" }}>
        <button 
          onClick={() => setTab("ativos")}
          style={{ background: tab === "ativos" ? "rgba(168,85,247,0.1)" : "transparent", color: tab === "ativos" ? "#a855f7" : "var(--color-text-secondary)", border: "none", padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <AlertTriangle size={16} /> ATIVOS ({activeSuspects.length})
        </button>
        <button 
          onClick={() => setTab("historico")}
          style={{ background: tab === "historico" ? "rgba(255,255,255,0.05)" : "transparent", color: tab === "historico" ? "var(--color-text-primary)" : "var(--color-text-secondary)", border: "none", padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Clock size={16} /> HISTÓRICO ({historySuspects.length})
        </button>
      </div>

      {/* Detail Modal */}
      {selectedSuspect && (
        <div style={{ position: "fixed", top: "60px", left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "600px", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: selectedSuspect.status === "active" ? "linear-gradient(135deg, #1e0a3c, #2d1060)" : "var(--color-surface)" }}>
              <h3 style={{ margin: 0, color: selectedSuspect.status === "active" ? "white" : "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {selectedSuspect.status === "active" ? <AlertTriangle color="#d8b4fe" /> : (selectedSuspect.status === "resolved" ? <CheckCircle2 color="#10b981" /> : <X color="#ef4444" />)}
                Detalhes do Suspeito
              </h3>
              <button onClick={() => setSelectedSuspect(null)} style={{ background: "transparent", border: "none", color: selectedSuspect.status === "active" ? "white" : "var(--color-text-primary)", cursor: "pointer" }}><X size={20}/></button>
            </div>
            
            <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                {selectedSuspect.photoUrl && (
                  <img src={selectedSuspect.photoUrl} alt="Suspeito" style={{ width: "200px", height: "200px", objectFit: "cover", borderRadius: "var(--radius-md)", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: "250px" }}>
                  <p style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 500 }}>{selectedSuspect.description}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem", fontSize: "0.9rem" }}>
                    <div><strong style={{ color: "var(--color-text-secondary)" }}>Local Inicial:</strong> {selectedSuspect.initialLocation}</div>
                    <div><strong style={{ color: "var(--color-text-secondary)" }}>Direção:</strong> {selectedSuspect.direction || "Desconhecida"}</div>
                    <div><strong style={{ color: "var(--color-text-secondary)" }}>Reportado por:</strong> {selectedSuspect.vigiaName}</div>
                    <div><strong style={{ color: "var(--color-text-secondary)" }}>Hora Registo:</strong> {new Date(selectedSuspect.createdAt).toLocaleString()}</div>
                    <div style={{ marginTop: "0.5rem" }}>
                      <a href={`https://maps.google.com/?q=${selectedSuspect.lat && selectedSuspect.lng ? `${selectedSuspect.lat},${selectedSuspect.lng}` : encodeURIComponent('Porto ' + selectedSuspect.initialLocation)}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(168,85,247,0.1)", color: "#a855f7", padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", textDecoration: "none", fontWeight: 600, fontSize: "0.85rem" }}>
                        <Navigation size={14} /> Abrir Local no Mapa
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {selectedSuspect.updates && selectedSuspect.updates.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 1rem 0", color: "var(--color-text-secondary)", textTransform: "uppercase", fontSize: "0.85rem" }}>Histórico de Atualizações</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "relative" }}>
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: "15px", width: "2px", background: "var(--color-border)", zIndex: 0 }}></div>
                    {selectedSuspect.updates.map((upd: any, idx: number) => (
                      <div key={idx} style={{ display: "flex", gap: "1rem", position: "relative", zIndex: 1 }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-bg)", border: "2px solid #a855f7", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7" }}>
                          {upd.type === 'resolvido' ? <CheckCircle2 size={16} /> : upd.type === 'falso_alarme' ? <X size={16} /> : <AlertTriangle size={16} />}
                        </div>
                        <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                            <div>
                              <strong style={{ display: "block" }}>{upd.vigiaName}</strong>
                              <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)" }}>{new Date(upd.timestamp).toLocaleString()}</span>
                            </div>
                            <span style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7", padding: "0.25rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>
                              {upd.type.replace('_', ' ')}
                            </span>
                          </div>
                          {upd.photoUrl && (
                            <img src={upd.photoUrl} alt="Atualização" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "var(--radius-sm)", marginBottom: "0.5rem" }} />
                          )}
                          {upd.message && <p style={{ margin: 0, fontSize: "0.95rem" }}>{upd.message}</p>}
                          <a href={`https://maps.google.com/?q=${upd.lat && upd.lng ? `${upd.lat},${upd.lng}` : encodeURIComponent('Porto ' + selectedSuspect.initialLocation)}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginTop: "0.75rem", fontSize: "0.8rem", color: "#a855f7", textDecoration: "underline" }}>
                            <MapPin size={14} /> Ver Local da Atualização
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Admin actions for Active suspects */}
            {selectedSuspect.status === "active" && (
              <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid var(--color-border)", display: "flex", gap: "1rem", background: "var(--color-bg)" }}>
                <button onClick={() => handleCloseActive(selectedSuspect.id, "resolved")} style={{ flex: 1, background: "#10b981", color: "white", padding: "0.75rem", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <CheckCircle2 size={18} /> Marcar como Resolvido
                </button>
                <button onClick={() => handleCloseActive(selectedSuspect.id, "false_alarm")} style={{ flex: 1, background: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", padding: "0.75rem", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <X size={18} /> Falso Alarme
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
        {displayList.length === 0 && (
          <div style={{ padding: "2rem", color: "var(--color-text-tertiary)", gridColumn: "1 / -1", textAlign: "center" }}>Nenhum registo encontrado.</div>
        )}
        {displayList.map(sus => (
          <div key={sus.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Header Badge */}
            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: sus.status === "active" ? "rgba(168,85,247,0.1)" : "var(--color-bg)" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: sus.status === "active" ? "#a855f7" : (sus.status === "resolved" ? "#10b981" : "#ef4444"), display: "flex", alignItems: "center", gap: "0.35rem" }}>
                {sus.status === "active" ? <AlertTriangle size={14}/> : (sus.status === "resolved" ? <CheckCircle2 size={14}/> : <X size={14}/>)}
                {sus.status === "active" ? "Ativo" : (sus.status === "resolved" ? "Resolvido" : "Falso Alarme")}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)" }}>
                {new Date(sus.createdAt).toLocaleDateString()} {new Date(sus.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            
            {/* Content */}
            <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
              <p style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", fontWeight: 500, lineClamp: 3, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {sus.description}
              </p>
              
              <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><MapPin size={14} color="#a855f7" /> {sus.initialLocation}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><UserX size={14} color="#a855f7" /> {sus.vigiaName}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: "1rem", borderTop: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
              <button onClick={() => setSelectedSuspect(sus)} style={{ width: "100%", padding: "0.6rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <Eye size={16} /> Detalhes & Histórico
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
