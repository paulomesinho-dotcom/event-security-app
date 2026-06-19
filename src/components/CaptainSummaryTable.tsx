"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, orderBy } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { MapPin, Clock, CheckCircle2, PlayCircle, ShieldCheck, Bell, X, Check, CheckCheck } from "lucide-react";

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
  const [notifMessage, setNotifMessage] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [vigiaNotifications, setVigiaNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!selectedPersonId) return;
    const q = query(
      collection(db, "notifications"), 
      where("vigiaId", "==", selectedPersonId)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      notifs.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });
      setVigiaNotifications(notifs);
    });
    return () => unsubscribe();
  }, [selectedPersonId]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || !notifMessage.trim()) return;
    setSendingNotif(true);
    try {
      // 1. Save to Firestore (for in-app notification when app is open)
      await addDoc(collection(db, "notifications"), {
        vigiaId: selectedPersonId,
        message: notifMessage.trim(),
        read: false,
        dismissed: false,
        createdAt: new Date().toISOString()
      });

      // 2. Send FCM push notification (works when app is closed/background)
      const response = await fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vigiaId: selectedPersonId,
          title: "Mensagem do Capitão",
          message: notifMessage.trim()
        })
      });
      if (!response.ok) throw new Error("Falha ao enviar");
      alert("Notificação enviada com sucesso!");
      setShowNotifModal(false);
      setNotifMessage("");
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar notificação.");
    } finally {
      setSendingNotif(false);
    }
  };

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

                    {/* Ações */}
                    <td style={{ textAlign: "right" }}>
                      <button 
                         onClick={() => {
                           setSelectedPersonId(shift.personId);
                           setNotifMessage("");
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

      {/* Modal de Notificação */}
      {showNotifModal && typeof document !== 'undefined' && createPortal(
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)" }}>
          <div className="glass animate-fade-in" style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            
            <button 
               onClick={() => setShowNotifModal(false)}
               style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
            >
               <X size={20} />
            </button>

            <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", marginTop: 0 }}>
              <Bell size={20} color="var(--color-primary)" />
              Enviar Notificação
            </h3>
            
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
              Escreva a mensagem que deseja enviar para o dispositivo do Vigia <strong>{users[selectedPersonId]}</strong>.
            </p>

            {vigiaNotifications.length > 0 && (
              <div style={{ marginBottom: "1rem", maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.5rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                {vigiaNotifications.map(n => {
                  const timeStr = n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <div key={n.id} style={{ background: "var(--color-surface)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", border: "1px solid var(--color-border)" }}>
                      <p style={{ margin: "0 0 0.25rem", color: "var(--color-text-primary)" }}>{n.message}</p>
                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", color: "var(--color-text-tertiary)" }}>
                        {timeStr}
                        {n.read ? <CheckCheck size={14} color="#3b82f6" /> : <Check size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={handleSendNotification} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  Mensagem
                </label>
                <textarea
                  className="input"
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  required
                  rows={3}
                  placeholder="Ex: Preciso de apoio no portão sul..."
                  style={{ resize: "none" }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                {["Dirija-se ao posto de controlo.", "Contacte o Capitão de Zona com urgência.", "Há uma ocorrência na sua área. Atenção redobrada."].map(preset => (
                  <button key={preset} type="button" onClick={() => setNotifMessage(preset)} style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", borderRadius: "999px", border: "1px solid var(--color-border)", background: notifMessage === preset ? "var(--color-primary-light)" : "var(--color-bg)", color: notifMessage === preset ? "var(--color-primary)" : "var(--color-text-secondary)", cursor: "pointer" }}>
                    {preset}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNotifModal(false)} disabled={sendingNotif}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-danger" disabled={sendingNotif || !notifMessage.trim()}>
                  {sendingNotif ? "A enviar..." : "Enviar Push"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
