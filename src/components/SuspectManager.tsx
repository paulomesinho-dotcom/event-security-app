"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserX, Clock, MapPin, CheckCircle2, X, AlertTriangle, Eye, Navigation, Search } from "lucide-react";

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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem" }}>
        <button 
          onClick={() => { setTab("ativos"); setSelectedSuspect(null); }}
          style={{ background: tab === "ativos" ? "rgba(168,85,247,0.1)" : "transparent", color: tab === "ativos" ? "#a855f7" : "var(--color-text-secondary)", border: "none", padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", transition: "all 0.2s" }}
        >
          <AlertTriangle size={16} /> ATIVOS ({activeSuspects.length})
        </button>
        <button 
          onClick={() => { setTab("historico"); setSelectedSuspect(null); }}
          style={{ background: tab === "historico" ? "rgba(255,255,255,0.05)" : "transparent", color: tab === "historico" ? "var(--color-text-primary)" : "var(--color-text-secondary)", border: "none", padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", transition: "all 0.2s" }}
        >
          <Clock size={16} /> HISTÓRICO ({historySuspects.length})
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        
        {/* Left Side: List */}
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              {tab === "ativos" ? "Suspeitos Ativos" : "Histórico de Suspeitos"}
            </h3>
            <span style={{ background: displayList.length > 0 ? "rgba(168,85,247,0.15)" : "var(--color-bg)", color: displayList.length > 0 ? "#a855f7" : "var(--color-text-secondary)", fontWeight: 700, fontSize: "0.8rem", padding: "0.2rem 0.65rem", borderRadius: "999px", border: displayList.length > 0 ? "1px solid rgba(168,85,247,0.3)" : "1px solid var(--color-border)" }}>
              {displayList.length}
            </span>
          </div>

          <div style={{ padding: "0.75rem" }}>
            {displayList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>
                <Search size={36} style={{ opacity: 0.25, margin: "0 auto 0.75rem", display: "block" }} />
                <p style={{ margin: 0, fontSize: "0.9rem" }}>Nenhum registo encontrado.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {displayList.map(sus => (
                  <div 
                    key={sus.id} 
                    onClick={() => setSelectedSuspect(sus)} 
                    style={{ padding: "0.9rem 1rem", borderRadius: "var(--radius-md)", border: `1px solid ${selectedSuspect?.id === sus.id ? '#a855f7' : 'var(--color-border)'}`, background: selectedSuspect?.id === sus.id ? 'rgba(168,85,247,0.08)' : 'var(--color-bg)', cursor: "pointer", display: "flex", gap: "0.75rem", alignItems: "center", transition: "all 0.2s" }}
                  >
                    {sus.photoUrl ? (
                      <img src={sus.photoUrl} alt="Suspeito" style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: "44px", height: "44px", background: "rgba(168,85,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-sm)", color: "#a855f7", flexShrink: 0 }}>
                        <Search size={18} />
                      </div>
                    )}
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sus.description}</p>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                        <span>{sus.initialLocation}</span>
                        <span>·</span>
                        <span>{new Date(sus.createdAt).toLocaleTimeString("pt-PT", {hour: "2-digit", minute:"2-digit"})}</span>
                      </div>
                    </div>
                    <div style={{ color: "#a855f7", fontSize: "1.2rem", flexShrink: 0 }}>›</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detail View */}
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", minHeight: "400px", overflow: "hidden", position: "sticky", top: "1rem" }}>
          {!selectedSuspect ? (
            <div style={{ height: "100%", minHeight: "400px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", padding: "3rem" }}>
              <Search size={48} style={{ marginBottom: "1rem", opacity: 0.2 }} />
              <p style={{ margin: 0, textAlign: "center", fontSize: "0.9rem" }}>Selecione um suspeito para ver os detalhes e evolução</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(168,85,247,0.2)", background: selectedSuspect.status === "active" ? "rgba(168,85,247,0.05)" : "var(--color-bg)", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    {selectedSuspect.status === "active" ? <AlertTriangle size={16} color="#a855f7" /> : (selectedSuspect.status === "resolved" ? <CheckCircle2 size={16} color="#10b981" /> : <X size={16} color="#ef4444" />)}
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, lineHeight: 1.3, color: "var(--color-text-primary)" }}>{selectedSuspect.description}</h3>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "#a855f7", fontWeight: 600 }}>Por {selectedSuspect.vigiaName} · {new Date(selectedSuspect.createdAt).toLocaleTimeString("pt-PT", {hour:"2-digit", minute:"2-digit"})}</span>
                </div>
              </div>

              <div style={{ padding: "1.25rem" }}>
                {selectedSuspect.photoUrl && (
                  <img src={selectedSuspect.photoUrl} alt="Foto Suspeito" style={{ width: "100%", maxHeight: "240px", objectFit: "contain", borderRadius: "var(--radius-md)", marginBottom: "1.25rem", background: "var(--color-bg)" }} />
                )}
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                  <div style={{ background: "var(--color-bg)", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-md)", borderLeft: "3px solid #a855f7" }}>
                    <strong style={{ color: "#a855f7", display: "block", marginBottom: "0.2rem", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>📍 Local Inicial</strong>
                    {selectedSuspect.initialLocation}
                  </div>
                  <div style={{ background: "var(--color-bg)", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-md)", borderLeft: "3px solid rgba(168,85,247,0.4)" }}>
                    <strong style={{ color: "var(--color-text-secondary)", display: "block", marginBottom: "0.2rem", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>🧭 Direção</strong>
                    {selectedSuspect.direction || "—"}
                  </div>
                </div>
                
                <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Histórico ({selectedSuspect.updates?.length || 0})</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "2px solid rgba(168,85,247,0.25)", paddingLeft: "1.25rem", marginLeft: "0.5rem" }}>
                  {(!selectedSuspect.updates || selectedSuspect.updates.length === 0) && (
                    <span style={{ fontSize: "0.85rem", color: "var(--color-text-tertiary)" }}>Nenhuma atualização registada ainda.</span>
                  )}
                  {selectedSuspect.updates?.map((u: any, i: number) => (
                    <div key={i} style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: "-1.6rem", top: "0.3rem", width: "10px", height: "10px", borderRadius: "50%", background: "#a855f7", border: "2px solid var(--color-surface)" }} />
                      <div style={{ background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", border: "1px solid var(--color-border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: u.message ? "0.5rem" : 0 }}>
                          <span style={{ fontSize: "0.7rem", background: "rgba(168,85,247,0.1)", color: "#a855f7", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>{u.type.replace("_"," ").toUpperCase()}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>{u.vigiaName}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)", marginLeft: "auto" }}>{new Date(u.timestamp).toLocaleTimeString("pt-PT", {hour: "2-digit", minute:"2-digit"})}</span>
                        </div>
                        {u.message && <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-primary)" }}>{u.message}</p>}
                        {u.photoUrl && <img src={u.photoUrl} alt="Atualização" style={{ width: "100%", maxWidth: "200px", borderRadius: "var(--radius-md)", marginTop: "0.75rem" }} />}
                        <a href={`https://maps.google.com/?q=${u.lat && u.lng ? `${u.lat},${u.lng}` : encodeURIComponent('Porto ' + selectedSuspect.initialLocation)}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginTop: "0.75rem", fontSize: "0.8rem", color: "#a855f7", textDecoration: "underline" }}>
                          <MapPin size={14} /> Ver Local da Atualização
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedSuspect.status === "active" && (
                  <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
                    <button onClick={() => handleCloseActive(selectedSuspect.id, "resolved")} style={{ flex: 1, background: "#10b981", color: "white", padding: "0.75rem", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      <CheckCircle2 size={18} /> Resolvido
                    </button>
                    <button onClick={() => handleCloseActive(selectedSuspect.id, "false_alarm")} style={{ flex: 1, background: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", padding: "0.75rem", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      <X size={18} /> Falso Alarme
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
