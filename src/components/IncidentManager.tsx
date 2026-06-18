"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { FileWarning, Clock, CheckCircle2, User, MapPin } from "lucide-react";

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
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {incidents.map(inc => (
            <div key={inc.id} style={{ 
              background: "var(--color-surface)", 
              border: inc.status === "open" ? "2px solid var(--color-danger)" : "1px solid var(--color-border)", 
              borderRadius: "var(--radius-lg)", 
              overflow: "hidden", 
              boxShadow: "var(--shadow-md)",
              opacity: inc.status === "resolved" ? 0.7 : 1
            }}>
              <div style={{ 
                display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", 
                background: inc.status === "open" ? "rgba(239, 68, 68, 0.1)" : "var(--color-bg)",
                borderBottom: "1px solid var(--color-border)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ 
                    background: inc.status === "open" ? "var(--color-danger)" : "var(--color-success)", 
                    color: "white", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 
                  }}>
                    {inc.status === "open" ? "ABERTO" : "RESOLVIDO"}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                    <Clock size={14} /> {new Date(inc.createdAt).toLocaleString("pt-PT")}
                  </span>
                </div>
                {inc.status === "open" && user?.role !== "vigia" && (
                  <button onClick={() => markResolved(inc.id)} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                    Marcar como Resolvido
                  </button>
                )}
              </div>

              <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "2rem" }}>
                <div>
                  <div style={{ display: "flex", gap: "2rem", marginBottom: "1.5rem" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.25rem", textTransform: "uppercase" }}>Reportado por</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600 }}>
                        <User size={16} /> {inc.vigiaName}
                      </div>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.25rem", textTransform: "uppercase" }}>Local / Turno</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600 }}>
                        <MapPin size={16} /> {inc.locatorName}
                      </div>
                    </div>
                  </div>

                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Mensagem</span>
                  <p style={{ margin: 0, fontSize: "1rem", whiteSpace: "pre-wrap", background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    {inc.message}
                  </p>
                </div>
                
                {inc.photoUrl && (
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Fotografia Anexa</span>
                    <a href={inc.photoUrl} target="_blank" rel="noopener noreferrer">
                      <img src={inc.photoUrl} alt="Ocorrência" style={{ width: "200px", height: "200px", objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
