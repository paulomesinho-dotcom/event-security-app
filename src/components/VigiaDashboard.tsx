"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, addDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Play, Square, Clock, Calendar, CheckCircle2, AlertTriangle, X, Bell, FileWarning, MessageCircle } from "lucide-react";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase-messaging";

import dynamic from "next/dynamic";
const MapViewer = dynamic(() => import("@/components/MapViewer"), { ssr: false });

const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas to Blob failed"));
        }, "image/jpeg", 0.7);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

interface Shift {
  id: string;
  locatorId: string;
  locatorName: string;
  planId: string;
  status: "pending" | "active" | "completed";
  startTime: string;
  name?: string;
  time?: string;
  days?: string;
  morningStart?: string;
  morningEnd?: string;
  afternoonStart?: string;
  afternoonEnd?: string;
  period?: "morning" | "afternoon" | "both";
  dates?: string;
}

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt?: string;
}

interface Locator {
  id: string;
  x: number;
  y: number;
  name: string;
  color?: string;
}

function getShiftStartTime(shift: Shift): string {
  if (shift.morningStart && (shift.period === "morning" || shift.period === "both")) return shift.morningStart;
  if (shift.afternoonStart && shift.period === "afternoon") return shift.afternoonStart;
  if (shift.time && shift.time.includes("(")) {
    const match = shift.time.match(/\((.*?)\s*-/);
    if (match) return match[1].trim();
  }
  return shift.time || "";
}

function getShiftEndTime(shift: Shift): string {
  if (shift.afternoonEnd && (shift.period === "afternoon" || shift.period === "both")) return shift.afternoonEnd;
  if (shift.morningEnd && shift.period === "morning") return shift.morningEnd;
  if (shift.time && shift.time.includes("-")) {
    const match = shift.time.match(/-\s*(.*?)\)/);
    if (match) return match[1].trim();
  }
  return "";
}

function isWithinShiftTime(shift: Shift): { allowed: boolean; reason: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (shift.dates) {
    const shiftDates = shift.dates.split(",").map(d => d.trim());
    if (!shiftDates.includes(today)) {
      return { allowed: false, reason: `Programado para: ${shiftDates.join(", ")}` };
    }
  }

  const getMinutes = (timeStr: string) => {
    if (!timeStr) return -1;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startStr = getShiftStartTime(shift);
  const endStr = getShiftEndTime(shift);

  if (!startStr && !endStr) return { allowed: true, reason: "" };

  const startMin = getMinutes(startStr);
  const endMin = getMinutes(endStr);

  if (startMin > 0 && nowMin < startMin - 30) {
    return { allowed: false, reason: `Início às ${startStr} (pode iniciar 30 min antes)` };
  }
  if (endMin > 0 && nowMin > endMin + 15) {
    return { allowed: false, reason: `Período terminou às ${endStr}` };
  }

  return { allowed: true, reason: "" };
}

function isNearingEnd(shift: Shift): boolean {
  if (shift.status !== "active") return false;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const endStr = getShiftEndTime(shift);
  if (!endStr) return false;
  const [h, m] = endStr.split(":").map(Number);
  const endMin = h * 60 + m;
  return nowMin >= endMin - 30 && nowMin <= endMin + 15;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    active: { label: "Em Curso", bg: "rgba(16,185,129,0.12)", color: "#059669", icon: <Play size={11} fill="currentColor" /> },
    pending: { label: "Próximo", bg: "rgba(245,158,11,0.12)", color: "#d97706", icon: <Clock size={11} /> },
    completed: { label: "Concluído", bg: "rgba(107,114,128,0.12)", color: "#6b7280", icon: <CheckCircle2 size={11} /> },
  }[status] || { label: status, bg: "#f3f4f6", color: "#374151", icon: null };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: cfg.bg, color: cfg.color, whiteSpace: "nowrap" }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function VigiaDashboard() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [workplaces, setWorkplaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fcmBanner, setFcmBanner] = useState<string | null>(null);
  const [showMapForShift, setShowMapForShift] = useState<Shift | null>(null);
  const [shiftPlanUrl, setShiftPlanUrl] = useState<string>("");
  const [shiftLocator, setShiftLocator] = useState<Locator | null>(null);
  const [endAlertFired, setEndAlertFired] = useState<Set<string>>(new Set());

  // Incident Reporting
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [incidentText, setIncidentText] = useState("");
  const [incidentPhoto, setIncidentPhoto] = useState<File | null>(null);
  const [incidentUploading, setIncidentUploading] = useState(false);
  const [myIncidents, setMyIncidents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const qShifts = query(collection(db, "shifts"), where("personId", "==", user.uid));
    const unsubShifts = onSnapshot(qShifts, (snapshot) => {
      const data: Shift[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Shift));
      data.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setShifts(data);
      setLoading(false);
    });
    const qNotifs = query(collection(db, "notifications"), where("vigiaId", "==", user.uid), where("read", "==", false));
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach(d => notifs.push({ id: d.id, ...d.data() } as Notification));
      notifs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setNotifications(notifs);
    });
    requestNotificationPermission(user.uid);

    const unsubFcm = onForegroundMessage((payload) => {
      const msg = payload.notification?.body || payload.data?.message || "Nova mensagem do Capitão";
      setFcmBanner(msg);
      setTimeout(() => setFcmBanner(null), 8000);
    });

    const unsubWorkplaces = onSnapshot(collection(db, "workplaces"), (snap) => {
      setWorkplaces(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qIncidents = query(collection(db, "incidents"), where("vigiaId", "==", user.uid));
    const unsubIncidents = onSnapshot(qIncidents, (snap) => {
      const inc: any[] = [];
      snap.forEach(d => inc.push({ id: d.id, ...d.data() }));
      inc.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyIncidents(inc);
    });

    return () => { unsubShifts(); unsubNotifs(); unsubFcm(); unsubWorkplaces(); unsubIncidents(); };
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      const active = shifts.find(s => s.status === "active");
      if (active && isNearingEnd(active) && !endAlertFired.has(active.id)) {
        setEndAlertFired(prev => new Set(prev).add(active.id));
        alert(`⏰ Atenção: O seu turno em "${active.locatorName}" está a chegar ao fim!`);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [shifts, endAlertFired]);

  const markNotificationRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const viewMap = async (shift: Shift) => {
    const planDoc = await getDoc(doc(db, "plans", shift.planId));
    if (planDoc.exists()) setShiftPlanUrl(planDoc.data().imageUrl);
    const locDoc = await getDoc(doc(db, "locators", shift.locatorId));
    if (locDoc.exists()) setShiftLocator({ id: locDoc.id, ...locDoc.data() } as Locator);
    setShowMapForShift(shift);
  };

  const updateShiftStatus = async (shift: Shift, newStatus: "active" | "completed") => {
    try {
      if (newStatus === "active") {
        const check = isWithinShiftTime(shift);
        if (!check.allowed) {
          alert(`Não é possível iniciar o turno.\n\n${check.reason}`);
          return;
        }
      }
      await updateDoc(doc(db, "shifts", shift.id), { status: newStatus });
    } catch (e) {
      alert("Erro a atualizar o turno.");
    }
  };

  const activeShift = shifts.find(s => s.status === "active");
  const activeWorkplace = activeShift ? workplaces.find(w => w.planIds?.includes(activeShift.planId)) : null;

  const submitIncident = async () => {
    if (!activeShift || !activeWorkplace) return alert("Precisa de ter um turno ativo para reportar ocorrências.");
    if (!incidentText) return alert("Descreva a ocorrência.");
    setIncidentUploading(true);
    try {
      let photoUrl = "";
      if (incidentPhoto) {
        const compressedBlob = await compressImage(incidentPhoto);
        const storage = getStorage();
        const fileRef = ref(storage, `incidents/${user?.uid}_${Date.now()}`);
        await uploadBytes(fileRef, compressedBlob);
        photoUrl = await getDownloadURL(fileRef);
      }
      await addDoc(collection(db, "incidents"), {
        vigiaId: user?.uid,
        shiftId: activeShift.id,
        locatorName: activeShift.locatorName,
        workplaceId: activeWorkplace.id,
        message: incidentText,
        photoUrl,
        status: "open",
        createdAt: new Date().toISOString()
      });
      setShowIncidentModal(false);
      setIncidentText("");
      setIncidentPhoto(null);
      alert("Ocorrência enviada ao Capitão com sucesso.");
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar ocorrência.");
    } finally {
      setIncidentUploading(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", color: "var(--color-text-secondary)" }}>
      <Clock size={32} style={{ marginBottom: "1rem", opacity: 0.4 }} />
      <p>A procurar os seus turnos...</p>
    </div>
  );

  const pendingShifts = shifts.filter(s => s.status === "pending");
  const completedShifts = shifts.filter(s => s.status === "completed");
  const zelloLink = activeWorkplace?.zelloChannelLink;
  const whatsappLink = activeWorkplace?.whatsappGroupLink;

  return (
    <>
    {/* SCROLLABLE CONTENT — flex: 1 so it fills remaining height */}
    <div className="animate-fade-in vigia-app-main" style={{ padding: "1rem 0.5rem" }}>
      {fcmBanner && (
        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.9rem 1rem", background: "linear-gradient(135deg, #1e1b4b, #312e81)", borderRadius: "var(--radius-lg)", color: "white", boxShadow: "0 4px 20px rgba(99,102,241,0.4)", animation: "slideDown 0.3s ease" }}>
          <Bell size={18} style={{ flexShrink: 0, marginTop: "0.1rem", color: "#a5b4fc" }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.7rem", color: "#a5b4fc", marginBottom: "0.2rem", letterSpacing: "0.05em" }}>🔔 NOTIFICAÇÃO DO CAPITÃO</p>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>{fcmBanner}</p>
          </div>
          <button onClick={() => setFcmBanner(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", borderRadius: "50%", padding: "0.3rem", color: "white", display: "flex", alignItems: "center", flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>
      )}

      {notifications.length > 0 && (
        <div style={{ marginBottom: "1.5rem", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
          {notifications.map(n => (
            <div key={n.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.9rem 1rem", background: "#1e1b4b", borderLeft: "4px solid #818cf8", color: "white" }}>
              <Bell size={18} style={{ flexShrink: 0, marginTop: "0.1rem", color: "#a5b4fc" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.7rem", color: "#a5b4fc", marginBottom: "0.2rem", letterSpacing: "0.05em" }}>MENSAGEM DO CAPITÃO</p>
                <p style={{ margin: 0, fontSize: "0.9rem", wordBreak: "break-word" }}>{n.message}</p>
              </div>
              <button onClick={() => markNotificationRead(n.id)} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", borderRadius: "50%", padding: "0.3rem", color: "white", display: "flex", alignItems: "center", flexShrink: 0 }}>
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {shifts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1.5rem", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)" }}>
          <Calendar size={44} style={{ color: "var(--color-text-tertiary)", marginBottom: "1rem" }} />
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>Ainda não tem turnos atribuídos.<br />Aguarde a atribuição pelo seu Capitão.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* Removed inline action buttons to put them in fixed bottom bar */}

          {activeShift && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Turno em Curso</span>
              </div>
              <div style={{ background: "linear-gradient(135deg, #151F31 0%, #1e3a5f 100%)", borderRadius: "var(--radius-lg)", padding: "1.25rem", color: "white", boxShadow: "0 8px 32px rgba(21,31,49,0.35)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flex: 1, minWidth: 0 }}>
                    <div style={{ background: "rgba(16,185,129,0.2)", padding: "0.55rem", borderRadius: "50%", flexShrink: 0 }}>
                      <MapPin size={20} color="#34d399" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.05em" }}>POSIÇÃO ATUAL</p>
                      <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeShift.locatorName}</h3>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
                    <button onClick={() => viewMap(activeShift)} style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.8rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "var(--radius-md)", color: "white", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                      <MapPin size={14} /> Planta
                    </button>
                    <button onClick={() => updateShiftStatus(activeShift, "completed")} style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.8rem", background: "#ef4444", border: "none", borderRadius: "var(--radius-md)", color: "white", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, boxShadow: "0 4px 12px rgba(239,68,68,0.35)", whiteSpace: "nowrap" }}>
                      <Square size={14} fill="currentColor" /> Terminar
                    </button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.5rem" }}>
                  {activeShift.name && (
                    <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.75rem" }}>
                      <p style={{ margin: 0, fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.15rem", fontWeight: 600 }}>DESIGNAÇÃO</p>
                      <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>{activeShift.name}</p>
                    </div>
                  )}
                  {activeShift.time && (
                    <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.75rem" }}>
                      <p style={{ margin: 0, fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.15rem", fontWeight: 600 }}>HORÁRIO</p>
                      <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>{activeShift.time}</p>
                    </div>
                  )}
                  {activeShift.days && (
                    <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.75rem" }}>
                      <p style={{ margin: 0, fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.15rem", fontWeight: 600 }}>DATA</p>
                      <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>{activeShift.days}</p>
                    </div>
                  )}
                  <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.75rem" }}>
                    <p style={{ margin: 0, fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.15rem", fontWeight: 600 }}>INICIADO</p>
                    <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>{new Date(activeShift.startTime).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {pendingShifts.length > 0 && (
            <section>
              <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Próximos Turnos</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {pendingShifts.map(shift => {
                  const timeCheck = isWithinShiftTime(shift);
                  const startTime = getShiftStartTime(shift);
                  const disabled = !!activeShift || !timeCheck.allowed;
                  return (
                    <div key={shift.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                      <div style={{ height: "3px", background: timeCheck.allowed ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #f59e0b, #fbbf24)" }} />
                      <div style={{ padding: "1rem 1.1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.6rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                            <MapPin size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>{shift.locatorName}</h4>
                          </div>
                          <StatusBadge status="pending" />
                        </div>

                        {/* Hora de início destacada */}
                        {startTime && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem", background: "var(--color-primary-light)", padding: "0.3rem 0.7rem", borderRadius: "var(--radius-md)" }}>
                            <Clock size={13} color="var(--color-primary)" />
                            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--color-primary)" }}>Início: {startTime}</span>
                          </div>
                        )}

                        {/* Meta info */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 0.9rem", marginBottom: "0.75rem" }}>
                          {shift.name && <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>{shift.name}</span>}
                          {shift.days && <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.2rem" }}><Calendar size={11} />{shift.days}</span>}
                          {shift.time && <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.2rem" }}><Clock size={11} />{shift.time}</span>}
                        </div>

                        {/* Restriction warning */}
                        {!timeCheck.allowed && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", padding: "0.5rem 0.65rem", background: "rgba(245,158,11,0.08)", borderRadius: "var(--radius-md)", marginBottom: "0.75rem" }}>
                            <AlertTriangle size={13} color="#d97706" style={{ flexShrink: 0, marginTop: "0.1rem" }} />
                            <span style={{ fontSize: "0.76rem", color: "#d97706", fontWeight: 500 }}>{timeCheck.reason}</span>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button onClick={() => viewMap(shift)} className="btn btn-secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", fontSize: "0.82rem", padding: "0.5rem" }}>
                            <MapPin size={14} /> Planta
                          </button>
                          <button onClick={() => updateShiftStatus(shift, "active")} disabled={disabled} style={{ flex: 2, padding: "0.6rem", fontSize: "0.85rem", fontWeight: 700, border: "none", borderRadius: "var(--radius-md)", cursor: disabled ? "not-allowed" : "pointer", background: disabled ? "#e5e7eb" : "#10b981", color: disabled ? "#6b7280" : "white" }}>
                            <Play size={14} fill="currentColor" style={{ display: "inline-block", marginRight: "0.3rem" }} /> Iniciar Turno
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {showIncidentModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-border)", background: "#ef4444", color: "white" }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><FileWarning size={18}/> Reportar Ocorrência</h3>
              <button onClick={() => setShowIncidentModal(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={20}/></button>
            </div>
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.5rem", fontWeight: 600 }}>Descrição da Ocorrência *</label>
                <textarea rows={4} value={incidentText} onChange={e => setIncidentText(e.target.value)} placeholder="Descreva o que se está a passar..." style={{ width: "100%", padding: "0.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", resize: "none" }}></textarea>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.5rem", fontWeight: 600 }}>Anexar Fotografia (Opcional)</label>
                <input type="file" accept="image/*" capture="environment" onChange={e => setIncidentPhoto(e.target.files?.[0] || null)} style={{ width: "100%" }} />
              </div>
              <button onClick={submitIncident} disabled={incidentUploading || !incidentText} style={{ width: "100%", padding: "1rem", background: "#ef4444", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", opacity: incidentUploading || !incidentText ? 0.5 : 1 }}>
                {incidentUploading ? "A ENVIAR..." : "ENVIAR RELATÓRIO AO CAPITÃO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMapForShift && shiftPlanUrl && shiftLocator && (
        <div className="vigia-map-modal">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1rem", background: "#151F31", color: "white", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "0.45rem", borderRadius: "var(--radius-md)", flexShrink: 0 }}>
                <MapPin size={18} color="#a5b4fc" />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>A SUA POSIÇÃO</p>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shiftLocator.name}</h3>
              </div>
            </div>
            <button onClick={() => setShowMapForShift(null)} style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "var(--radius-md)", color: "white", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", flexShrink: 0 }}>
              <X size={15} /> Fechar
            </button>
          </div>

          {showMapForShift.time && (
            <div style={{ padding: "0.5rem 1rem", background: "rgba(21,31,49,0.85)", color: "rgba(255,255,255,0.6)", fontSize: "0.78rem", display: "flex", gap: "1.25rem", flexShrink: 0, flexWrap: "wrap" }}>
              {showMapForShift.name && <span>📋 {showMapForShift.name}</span>}
              <span>🕐 {showMapForShift.time}</span>
              {showMapForShift.days && <span>📅 {showMapForShift.days}</span>}
            </div>
          )}

          <div style={{ flex: 1, padding: "0.5rem", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, borderRadius: "var(--radius-md)", overflow: "hidden", border: "2px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" }}>
              <MapViewer imageUrl={shiftPlanUrl} locators={[shiftLocator]} />
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><FileWarning size={18}/> O Meu Histórico</h3>
            <button onClick={() => setShowHistoryModal(false)} style={{ background: "none", border: "none", color: "var(--color-text-primary)", cursor: "pointer" }}><X size={20}/></button>
          </div>
          <div style={{ padding: "1rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "3rem" }}>
            {myIncidents.length === 0 ? (
               <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>Ainda não reportou nenhuma ocorrência.</div>
            ) : (
               myIncidents.map(inc => (
                 <div key={inc.id} style={{ background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "1rem", border: "1px solid var(--color-border)" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                     <span style={{ fontSize: "0.75rem", fontWeight: 700, color: inc.status === "open" ? "#ef4444" : "#10b981", background: inc.status === "open" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", padding: "0.15rem 0.5rem", borderRadius: "999px" }}>
                       {inc.status === "open" ? "ABERTO" : "RESOLVIDO"}
                     </span>
                     <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                       {new Date(inc.createdAt).toLocaleString("pt-PT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                     </span>
                   </div>
                   <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>{inc.message}</p>
                   <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", display: "block", marginBottom: inc.photoUrl ? "0.5rem" : 0 }}>Local: {inc.locatorName}</span>
                   {inc.photoUrl && (
                     <img src={inc.photoUrl} alt="Foto" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "var(--radius-sm)" }} />
                   )}
                 </div>
               ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(16,185,129,0.2); }
          50% { box-shadow: 0 0 0 6px rgba(16,185,129,0.05); }
        }
      `}</style>
    </div>

    {/* BOTTOM NAVIGATION BAR — flex sibling of main scroll area */}
    <div className="vigia-app-bottom-bar">
      {activeShift && (
        <>
          {zelloLink && (
            <a href={zelloLink} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.25rem", background: "rgba(249, 115, 22, 0.15)", color: "#f97316", padding: "0.5rem", borderRadius: "var(--radius-md)", textDecoration: "none", fontWeight: 600, fontSize: "0.7rem", border: "1px solid rgba(249, 115, 22, 0.3)", flex: "1 0 auto", minWidth: "65px" }}>
              <Play size={18} fill="currentColor" /> Rádio
            </a>
          )}
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.25rem", background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", padding: "0.5rem", borderRadius: "var(--radius-md)", textDecoration: "none", fontWeight: 600, fontSize: "0.7rem", border: "1px solid rgba(34, 197, 94, 0.3)", flex: "1 0 auto", minWidth: "65px" }}>
              <MessageCircle size={18} fill="currentColor" /> Chat
            </a>
          )}
          <button onClick={() => setShowIncidentModal(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.25rem", background: "#ef4444", color: "white", padding: "0.5rem", borderRadius: "var(--radius-md)", border: "none", fontWeight: 600, fontSize: "0.7rem", flex: "1 0 auto", minWidth: "65px", cursor: "pointer", boxShadow: "0 2px 8px rgba(239,68,68,0.3)" }}>
            <FileWarning size={18} /> Ocorrência
          </button>
        </>
      )}
      <button onClick={() => setShowHistoryModal(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.25rem", background: "transparent", color: "var(--color-text-secondary)", padding: "0.5rem", borderRadius: "var(--radius-md)", border: "none", fontWeight: 600, fontSize: "0.7rem", flex: "1 0 auto", minWidth: "65px", cursor: "pointer" }}>
        <Clock size={18} /> {myIncidents.length > 0 ? `(${myIncidents.length}) Histórico` : `Histórico`}
      </button>
    </div>
    </>
  );
}
