"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, orderBy } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { MapPin, Clock, CheckCircle2, PlayCircle, ShieldCheck, Bell, X, Check, CheckCheck, AlertTriangle } from "lucide-react";
import NotificationModal from "@/components/NotificationModal";

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

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function CaptainSummaryTable() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);

  // Notification Modal State
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState("");

  const { activeWorkplace } = useWorkplace();

  useEffect(() => {
    if (!user || (user.role !== "captain" && user.role !== "superadmin") || !activeWorkplace) return;

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

    // Fetch shifts that belong to plans in the active workplace
    const qShifts = user.role === "superadmin" 
      ? query(collection(db, "shifts"))
      : query(collection(db, "shifts"), where("captainId", "==", user.uid));
      
    const unsubscribeShifts = onSnapshot(qShifts, (snapshot) => {
      const shiftData: Shift[] = [];
      const planIds = activeWorkplace.planIds || [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (planIds.includes(data.planId)) {
          shiftData.push({ id: doc.id, ...data } as Shift);
        }
      });
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
  }, [user, activeWorkplace]);

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

      {shifts.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
           <button 
             onClick={() => {
               setSelectedPersonId("all");
               setShowNotifModal(true);
             }}
             className="btn btn-primary"
             style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.875rem" }}
           >
             <Bell size={16} /> Notificar Todos na Zona
           </button>
        </div>
      )}

      {shifts.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>Ainda não existem turnos atribuídos na sua zona.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="drive-table">
            <thead>
              <tr>
                <th>Posição do Pino</th>
                <th>Turno</th>
                <th>Vigia Destacado</th>
                <th style={{ textAlign: "right" }}>Estado Atual</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map(shift => {
                const vigiaName = users[shift.personId] || "Desconhecido";
                
                let lateness = null;
                if (shift.status !== "completed") {
                  const nowObj = new Date();
                  
                  // 1. ISO Timestamp Check (Most Reliable)
                  let isOverdueFromISO = false;
                  if (shift.status === "pending" && shift.startTime) {
                    if (new Date(shift.startTime).getTime() < nowObj.getTime()) isOverdueFromISO = true;
                  } else if (shift.status === "active" && shift.endTime) {
                    if (new Date(shift.endTime).getTime() < nowObj.getTime()) isOverdueFromISO = true;
                  }

                  if (isOverdueFromISO) {
                    lateness = shift.status === "pending" ? "Atrasado a Iniciar" : "Atrasado a Terminar";
                  } else if (!shift.startTime && !shift.endTime) {
                    // 2. Fallback to Legacy Date + Time Check
                    const todayISO = nowObj.toISOString().slice(0, 10);
                    const dateStrings = [shift.date, shift.days, shift.dates].filter(Boolean).join(",");
                    let isTodayOrPast = true;
                    
                    if (dateStrings) {
                      const sDates = dateStrings.split(",").map((d: string) => d.trim());
                      isTodayOrPast = sDates.some((d: string) => {
                        if (d === todayISO) return true;
                        if (d.match(/^\d{4}-\d{2}-\d{2}$/)) return d <= todayISO;
                        if (d.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                          const [day, m, y] = d.split("/");
                          return `${y}-${m}-${day}` <= todayISO;
                        }
                        return false;
                      });
                    }

                    if (isTodayOrPast) {
                      const match = shift.time.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
                      if (match) {
                        const currentTotal = nowObj.getHours() * 60 + nowObj.getMinutes();
                        const [startH, startM] = match[1].split(":").map(Number);
                        const [endH, endM] = match[2].split(":").map(Number);
                        const startTotal = startH * 60 + startM;
                        const endTotal = endH * 60 + endM;
                        const crossesMidnight = endTotal < startTotal;

                        if (shift.status === "pending") {
                          if (!crossesMidnight && currentTotal >= startTotal) lateness = "Atrasado a Iniciar";
                          else if (crossesMidnight && (currentTotal >= startTotal || currentTotal < endTotal)) lateness = "Atrasado a Iniciar";
                        } else if (shift.status === "active") {
                          if (!crossesMidnight && currentTotal >= endTotal) lateness = "Atrasado a Terminar";
                          else if (crossesMidnight && (currentTotal >= endTotal && currentTotal < startTotal)) lateness = "Atrasado a Terminar";
                        }
                      }
                    }
                  }
                }

                return (
                  <tr key={shift.id}>
                    
                    {/* Posição */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                         <MapPin size={16} color="var(--color-text-tertiary)" />
                         <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{shift.locatorName}</span>
                      </div>
                    </td>

                    {/* Turno */}
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "0.25rem" }}>{shift.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Clock size={12} /> {shift.days} • {shift.time}
                      </div>
                    </td>

                    {/* Vigia */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                         <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem" }}>
                            {vigiaName.charAt(0).toUpperCase()}
                         </div>
                         <span style={{ fontWeight: 500 }}>{vigiaName}</span>
                      </div>
                    </td>

                    {/* Estado */}
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.35rem" }}>
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
                        {lateness && (
                          <span style={{ fontSize: "0.7rem", color: "var(--color-danger)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.2rem", animation: "pulse 2s infinite" }}>
                            <AlertTriangle size={10} /> {lateness}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ações */}
                    <td style={{ textAlign: "right" }}>
                      <button 
                         onClick={() => {
                           setSelectedPersonId(shift.personId);
                           setShowNotifModal(true);
                         }}
                         className="btn btn-secondary"
                         style={{ padding: "0.4rem 0.8rem", display: "inline-flex", gap: "0.4rem", color: "var(--color-primary)", borderColor: "var(--color-border)" }}
                         title={`Notificar ${vigiaName}`}
                      >
                         <Bell size={14} /> <span style={{ fontSize: "0.75rem" }}>Notificar</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <NotificationModal 
        isOpen={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        selectedPersonId={selectedPersonId}
        usersMap={users}
        allVigiaIds={shifts.map(s => s.personId)}
      />
    </div>
  );
}
