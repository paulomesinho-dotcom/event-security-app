"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Clock, ShieldAlert, Globe, MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EmergencyHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [history, setHistory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [workplaces, setWorkplaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const isSuperadmin = user?.role === "superadmin";

  useEffect(() => {
    if (!user) return;
    
    // Fetch users for resolving names
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
       setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch workplaces for resolving names
    const unsubWorkplaces = onSnapshot(collection(db, "workplaces"), (snap) => {
       setWorkplaces(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch history, order by startTime descending
    const qHistory = query(collection(db, "emergency_history"), orderBy("startTime", "desc"));
    const unsubHistory = onSnapshot(qHistory, (snap) => {
       const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       if (!isSuperadmin) {
         setHistory(docs);
       } else {
         setHistory(docs);
       }
       setLoading(false);
    });

    return () => { unsubUsers(); unsubWorkplaces(); unsubHistory(); };
  }, [user, isSuperadmin]);

  if (!user || (user.role !== "captain" && user.role !== "superadmin")) {
     return <div style={{ padding: "2rem" }}>Acesso não autorizado.</div>;
  }

  // Filter history based on permissions and search
  const displayHistory = history.filter(h => {
     // If captain, only show if workplace belongs to them
     if (!isSuperadmin) {
        if (h.type === "global") return false; 
        const wp = workplaces.find(w => w.id === h.workplaceId);
        if (wp?.captainId !== user.uid) return false;
     }
     
     // Search filter
     if (searchQuery) {
        const wpName = workplaces.find(w => w.id === h.workplaceId)?.name || "Global";
        if (!wpName.toLowerCase().includes(searchQuery.toLowerCase()) && !h.type.includes(searchQuery.toLowerCase())) {
           return false;
        }
     }
     return true;
  });

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "--";
    return new Date(isoStr).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getDuration = (start: string, end?: string) => {
    if (!end) return "Em curso";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <button onClick={() => router.push("/dashboard")} className="btn" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-secondary)" }}>
        <ArrowLeft size={16} /> Voltar ao Painel
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-primary)" }}>
             <Clock size={24} color="var(--color-primary)" />
             Histórico de Emergências
          </h2>
          <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
             Consulte o registo oficial de evacuações e alertas passados.
          </p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--color-surface)", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
           <Search size={16} color="var(--color-text-secondary)" />
           <input 
             type="text" 
             placeholder="Pesquisar local..." 
             value={searchQuery} 
             onChange={(e) => setSearchQuery(e.target.value)}
             style={{ background: "transparent", border: "none", outline: "none", color: "var(--color-text-primary)", fontSize: "0.9rem", width: "200px" }}
           />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>A carregar histórico...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
           {displayHistory.length === 0 ? (
             <div style={{ textAlign: "center", padding: "4rem", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)" }}>
               <ShieldAlert size={48} color="var(--color-text-tertiary)" style={{ margin: "0 auto 1rem auto" }} />
               <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--color-text-secondary)" }}>Nenhum registo encontrado</h3>
             </div>
           ) : (
             displayHistory.map((item) => {
               const wp = workplaces.find(w => w.id === item.workplaceId);
               const initiator = users.find(u => u.id === item.initiatedBy);
               const isGlobal = item.type === "global";
               
               return (
                 <div key={item.id} style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--color-border)", background: item.status === "active" ? "rgba(239, 68, 68, 0.05)" : "transparent" }}>
                       <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: isGlobal ? "rgba(239, 68, 68, 0.1)" : "rgba(249, 115, 22, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                             {isGlobal ? <Globe size={20} color="var(--color-danger)" /> : <MapPin size={20} color="#f97316" />}
                          </div>
                          <div>
                             <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.1rem" }}>
                                {isGlobal ? "Alerta Global" : `Alerta Local: ${wp?.name || "Local Desconhecido"}`}
                             </h3>
                             <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", display: "flex", gap: "1rem" }}>
                                <span><strong>Iniciado por:</strong> {initiator?.name || "Desconhecido"}</span>
                                <span><strong>Tipo:</strong> {item.alertType === "evacuation" ? "Evacuação" : "Pessoa Desaparecida"}</span>
                             </div>
                          </div>
                       </div>
                       <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: item.status === "active" ? "var(--color-danger)" : "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                             {item.status === "active" ? "EM CURSO" : "FECHADO"}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--color-text-tertiary)" }}>
                             Duração: {getDuration(item.startTime, item.endTime)}
                          </div>
                       </div>
                    </div>
                    
                    <div style={{ padding: "1.25rem 1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", background: "var(--color-bg)" }}>
                       <div>
                          <span style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-tertiary)", marginBottom: "0.25rem" }}>Início</span>
                          <span style={{ fontSize: "0.95rem", color: "var(--color-text-primary)" }}>{formatDate(item.startTime)}</span>
                       </div>
                       <div>
                          <span style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-tertiary)", marginBottom: "0.25rem" }}>Fim da Evacuação</span>
                          <span style={{ fontSize: "0.95rem", color: "var(--color-text-primary)" }}>{formatDate(item.endTime)}</span>
                       </div>
                       <div>
                          <span style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-tertiary)", marginBottom: "0.25rem" }}>Resultados Finais</span>
                          {item.status === "closed" ? (
                             <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem" }}>
                                <span style={{ color: "var(--color-success)" }}><strong>{item.finalAlertAck?.length || 0}</strong> Receções</span>
                                {item.alertType === "evacuation" && (
                                  <span style={{ color: "var(--color-success)" }}><strong>{item.finalEvacAck?.length || 0}</strong> Evacuações</span>
                                )}
                             </div>
                          ) : (
                             <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>A recolher dados...</span>
                          )}
                       </div>
                    </div>
                 </div>
               );
             })
           )}
        </div>
      )}
    </div>
  );
}
