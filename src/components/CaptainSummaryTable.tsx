"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Clock, CheckCircle2, PlayCircle, ShieldCheck } from "lucide-react";

interface Shift {
  id: string;
  locatorName: string;
  planId: string;
  personId: string;
  status: string;
  name: string;
  time: string;
  days: string;
}

interface UserMap {
  [key: string]: string;
}

export default function CaptainSummaryTable() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "captain") return;

    // Fetch all vigias to map IDs to Names
    const fetchUsers = async () => {
      const q = query(collection(db, "users"), where("role", "==", "vigia"));
      onSnapshot(q, (snapshot) => {
        const uMap: UserMap = {};
        snapshot.forEach(doc => {
          uMap[doc.id] = doc.data().name;
        });
        setUsers(uMap);
      });
    };

    fetchUsers();

    // Fetch shifts created by this captain
    const qShifts = query(collection(db, "shifts"), where("captainId", "==", user.uid));
    const unsubscribeShifts = onSnapshot(qShifts, (snapshot) => {
      const shiftData: Shift[] = [];
      snapshot.forEach(doc => shiftData.push({ id: doc.id, ...doc.data() } as Shift));
      // Sort by status for better visibility
      shiftData.sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (a.status !== "active" && b.status === "active") return 1;
        return 0;
      });
      setShifts(shiftData);
      setLoading(false);
    });

    return () => unsubscribeShifts();
  }, [user]);

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>A carregar dados do resumo...</div>;

  // Calculate Metrics
  const totalShifts = shifts.length;
  const activeShifts = shifts.filter(s => s.status === "active").length;
  const pendingShifts = shifts.filter(s => s.status === "pending").length;
  const completedShifts = shifts.filter(s => s.status === "completed").length;

  return (
    <div>
      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        
        <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "var(--color-primary-light)", padding: "1rem", borderRadius: "50%", color: "var(--color-primary)" }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>Total de Escalas</p>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{totalShifts}</p>
          </div>
        </div>

        <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "1rem", borderRadius: "50%", color: "var(--color-success)" }}>
            <PlayCircle size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>Em Curso</p>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{activeShifts}</p>
          </div>
        </div>

        <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "1rem", borderRadius: "50%", color: "#f59e0b" }}>
            <Clock size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>Pendentes</p>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{pendingShifts}</p>
          </div>
        </div>

      </div>

      {shifts.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>Ainda não existem turnos atribuídos na sua zona.</p>
        </div>
      ) : (
        <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "1rem 1.5rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>Posição do Pino</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>Turno</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>Vigia Destacado</th>
                <th style={{ padding: "1rem 1.5rem", color: "var(--color-text-secondary)", fontWeight: 600, textAlign: "right" }}>Estado Atual</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map(shift => {
                const vigiaName = users[shift.personId] || "Desconhecido";
                
                return (
                  <tr key={shift.id} style={{ borderBottom: "1px solid var(--color-border)", transition: "background-color 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--color-bg)"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                    
                    {/* Posição */}
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                         <MapPin size={16} color="var(--color-text-tertiary)" />
                         <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{shift.locatorName}</span>
                      </div>
                    </td>

                    {/* Turno */}
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "0.25rem" }}>{shift.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Clock size={12} /> {shift.days} • {shift.time}
                      </div>
                    </td>

                    {/* Vigia */}
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                         <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem" }}>
                            {vigiaName.charAt(0).toUpperCase()}
                         </div>
                         <span style={{ fontWeight: 500 }}>{vigiaName}</span>
                      </div>
                    </td>

                    {/* Estado */}
                    <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                      <span style={{ 
                        display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 600,
                        background: shift.status === "active" ? "rgba(16, 185, 129, 0.1)" : shift.status === "completed" ? "var(--color-bg)" : "rgba(245, 158, 11, 0.1)",
                        color: shift.status === "active" ? "var(--color-success)" : shift.status === "completed" ? "var(--color-text-secondary)" : "#f59e0b"
                       }}>
                        {shift.status === "pending" && <Clock size={12} />}
                        {shift.status === "active" && <PlayCircle size={12} />}
                        {shift.status === "completed" && <CheckCircle2 size={12} />}
                        {shift.status === "pending" ? "Pendente" : shift.status === "active" ? "Em Curso" : "Terminado"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
