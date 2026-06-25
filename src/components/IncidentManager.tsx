"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { FileWarning, Clock, CheckCircle2, User, MapPin, X, Eye } from "lucide-react";

interface Incident {
  id: string;
  vigiaId: string;
  vigiaName: string;
  shiftId: string;
  locatorName: string;
  workplaceId: string;
  message: string;
  photoUrl: string;
  status: "open" | "resolved";
  createdAt: string;
}

export default function IncidentManager() {
  const { user } = useAuth();
  const { activeWorkplaceId } = useWorkplace();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  useEffect(() => {
    if (!activeWorkplaceId) {
      setIncidents([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "incidents"), where("workplaceId", "==", activeWorkplaceId));
    const unsub = onSnapshot(q, (snap) => {
      const data: Incident[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Incident));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setIncidents(data);
      setLoading(false);
    });

    return () => unsub();
  }, [activeWorkplaceId]);

  const markResolved = async (id: string) => {
    try {
      await updateDoc(doc(db, "incidents", id), { status: "resolved" });
    } catch (e) {
      alert("Erro ao resolver ocorrência.");
    }
  };

  if (loading) return <div>A carregar ocorrências...</div>;

  return (
    <div className="animate-fade-in" style={{ padding: "0 0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h3 style={{ color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
          <FileWarning size={20} /> Ocorrências do Local
        </h3>
      </div>

      {incidents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)" }}>
          <CheckCircle2 size={40} style={{ color: "var(--color-success)", marginBottom: "1rem", opacity: 0.8 }} />
          <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>Nenhuma ocorrência reportada neste local.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {incidents.map(inc => {
            const isExpanded = selectedIncident?.id === inc.id;
            return (
            <div 
              key={inc.id} 
              style={{ 
                display: "flex", flexDirection: "column",
                background: "var(--color-surface)", 
                borderLeft: inc.status === "open" ? "4px solid var(--color-danger)" : "4px solid var(--color-success)",
                borderRadius: "var(--radius-md)",
                boxShadow: isExpanded ? "var(--shadow-md)" : "var(--shadow-sm)", transition: "all 0.2s",
                opacity: inc.status === "resolved" && !isExpanded ? 0.7 : 1,
                overflow: "hidden"
              }}
            >
              <div 
                onClick={() => setSelectedIncident(isExpanded ? null : inc)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "1rem 1.25rem", cursor: "pointer" }}
                onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.02)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flex: 1, minWidth: 0 }}>
                  <div style={{ flexShrink: 0, width: "90px" }}>
                    <span style={{ background: inc.status === "open" ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)", color: inc.status === "open" ? "var(--color-danger)" : "var(--color-success)", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700 }}>
                      {inc.status === "open" ? "ABERTO" : "RESOLVIDO"}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.95rem", whiteSpace: "pre-wrap", wordBreak: "normal", overflowWrap: "anywhere" }}>{inc.locatorName}</span>
                      <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.25rem" }}><Clock size={12} /> {new Date(inc.createdAt).toLocaleString("pt-PT")}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-secondary)", whiteSpace: "pre-wrap", wordBreak: "normal", overflowWrap: "anywhere" }}>
                      <User size={12} style={{ display: "inline", marginRight: "0.25rem" }} /> {inc.vigiaName} — {inc.message}
                    </p>
                  </div>
                </div>
                <div style={{ flexShrink: 0, color: "var(--color-text-tertiary)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: "0 1.25rem 1.25rem 1.25rem", borderTop: "1px solid var(--color-border)", animation: "fade-in 0.2s ease" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", marginTop: "1rem" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-tertiary)", marginBottom: "0.25rem", textTransform: "uppercase" }}>Reportado por</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.9rem" }}><User size={14} color="var(--color-text-secondary)" /> {inc.vigiaName}</div>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-tertiary)", marginBottom: "0.25rem", textTransform: "uppercase" }}>Local / Posição</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.9rem" }}><MapPin size={14} color="var(--color-text-secondary)" /> {inc.locatorName}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: "1.5rem" }}>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Mensagem</span>
                    <p style={{ margin: 0, fontSize: "1rem", lineHeight: 1.5, color: "var(--color-text-primary)", whiteSpace: "pre-wrap", wordBreak: "normal", overflowWrap: "anywhere" }}>
                      {inc.message}
                    </p>
                  </div>

                  {inc.photoUrl && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Fotografia Anexa</span>
                      <a href={inc.photoUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--color-border)", width: "fit-content" }}>
                        <img src={inc.photoUrl} alt="Ocorrência" style={{ maxHeight: "300px", objectFit: "contain", display: "block" }} />
                      </a>
                    </div>
                  )}

                  {inc.status === "open" && user?.role !== "vigia" && (
                    <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); markResolved(inc.id); setSelectedIncident(null); }} 
                        className="btn" 
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--color-success)", color: "white", padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(16, 185, 129, 0.2)" }}
                      >
                        <CheckCircle2 size={16} /> Marcar como Resolvido
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Modal removed. Incidents now expand inline. */}
    </div>
  );
}
