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
          {incidents.map(inc => (
            <div 
              key={inc.id} 
              onClick={() => setSelectedIncident(inc)}
              style={{ 
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
                padding: "1rem 1.25rem", background: "var(--color-surface)", 
                borderLeft: inc.status === "open" ? "4px solid var(--color-danger)" : "4px solid var(--color-success)",
                borderRadius: "var(--radius-md)", cursor: "pointer",
                boxShadow: "var(--shadow-sm)", transition: "transform 0.2s, box-shadow 0.2s",
                opacity: inc.status === "resolved" ? 0.7 : 1
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flex: 1, minWidth: 0 }}>
                <div style={{ flexShrink: 0, width: "90px" }}>
                  <span style={{ background: inc.status === "open" ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)", color: inc.status === "open" ? "var(--color-danger)" : "var(--color-success)", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700 }}>
                    {inc.status === "open" ? "ABERTO" : "RESOLVIDO"}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inc.locatorName}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.25rem" }}><Clock size={12} /> {new Date(inc.createdAt).toLocaleString("pt-PT")}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <User size={12} style={{ display: "inline", marginRight: "0.25rem" }} /> {inc.vigiaName} — {inc.message}
                  </p>
                </div>
              </div>
              <div style={{ flexShrink: 0, color: "var(--color-primary)" }}>
                <Eye size={20} />
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedIncident && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "600px", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-border)", background: selectedIncident.status === "open" ? "var(--color-danger)" : "var(--color-success)", color: "white" }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><FileWarning size={18}/> Detalhe da Ocorrência</h3>
              <button onClick={() => setSelectedIncident(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={20}/></button>
            </div>
            
            <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", gap: "2rem" }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.25rem", textTransform: "uppercase" }}>Reportado por</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600 }}><User size={16} /> {selectedIncident.vigiaName}</div>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.25rem", textTransform: "uppercase" }}>Local / Turno</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600 }}><MapPin size={16} /> {selectedIncident.locatorName}</div>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.25rem", textTransform: "uppercase" }}>Data / Hora</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600 }}><Clock size={16} /> {new Date(selectedIncident.createdAt).toLocaleString("pt-PT")}</div>
                </div>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Mensagem</span>
                <p style={{ margin: 0, fontSize: "1rem", whiteSpace: "pre-wrap", background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  {selectedIncident.message}
                </p>
              </div>
              
              {selectedIncident.photoUrl && (
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Fotografia Anexa</span>
                  <a href={selectedIncident.photoUrl} target="_blank" rel="noopener noreferrer">
                    <img src={selectedIncident.photoUrl} alt="Ocorrência" style={{ width: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "var(--color-bg)" }} />
                  </a>
                </div>
              )}
            </div>

            {selectedIncident.status === "open" && user?.role !== "vigia" && (
              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--color-border)", background: "var(--color-bg)", display: "flex", justifyContent: "flex-end" }}>
                <button 
                  onClick={() => { markResolved(selectedIncident.id); setSelectedIncident(null); }} 
                  className="btn btn-success" 
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <CheckCircle2 size={18} /> Marcar como Resolvido
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
