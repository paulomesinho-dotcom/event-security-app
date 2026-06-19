"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, addDoc, orderBy, limit } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Play, Square, Clock, Calendar, CheckCircle2, AlertTriangle, X, Bell, FileWarning, MessageCircle, Camera, Image as ImageIcon, Search, Crosshair } from "lucide-react";
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
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
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

  // Suspicious Persons
  const [activeSuspects, setActiveSuspects] = useState<any[]>([]);
  const [showSuspectsList, setShowSuspectsList] = useState(false);
  const [showNewSuspectModal, setShowNewSuspectModal] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<any>(null);
  
  const [suspectLocation, setSuspectLocation] = useState("");
  const [suspectDirection, setSuspectDirection] = useState("");
  const [suspectDesc, setSuspectDesc] = useState("");
  const [suspectPhoto, setSuspectPhoto] = useState<File | null>(null);
  const [suspectUploading, setSuspectUploading] = useState(false);

  const [updateType, setUpdateType] = useState("avistamento");
  const [updateMessage, setUpdateMessage] = useState("");
  const [updatePhoto, setUpdatePhoto] = useState<File | null>(null);
  const [updateUploading, setUpdateUploading] = useState(false);

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
    const qNotifs = query(collection(db, "notifications"), where("vigiaId", "==", user.uid));
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        // Skip explicitly dismissed, or legacy read notifications
        if (data.dismissed === true || (data.dismissed === undefined && data.read === true)) return;
        
        notifs.push({ id: d.id, ...data } as Notification);

        // Auto-mark as read (WhatsApp style ticks) as soon as app sees it
        if (data.read === false) {
          updateDoc(doc(db, "notifications", d.id), { read: true, dismissed: false }).catch(console.error);
        }
      });
      notifs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setNotifications(notifs);
    });

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        setShowNotifPrompt(true);
      } else if (Notification.permission === "granted") {
        requestNotificationPermission(user.uid);
      }
    }

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

    const qSuspects = query(collection(db, "suspicious_persons"), where("status", "==", "active"));
    const unsubSuspects = onSnapshot(qSuspects, (snap) => {
      const s: any[] = [];
      snap.forEach(d => s.push({ id: d.id, ...d.data() }));
      s.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setActiveSuspects(s);
      setSelectedSuspect((prev: any) => {
        if (!prev) return null;
        const updated = s.find(sus => sus.id === prev.id);
        if (updated) return updated;
        return null; // was closed
      });
    });

    return () => { unsubShifts(); unsubNotifs(); unsubFcm(); unsubWorkplaces(); unsubIncidents(); unsubSuspects(); };
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

  const dismissNotification = async (id: string) => {
    // Optimistic UI removal
    setNotifications(prev => prev.filter(n => n.id !== id));
    await updateDoc(doc(db, "notifications", id), { dismissed: true });
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
    if (!activeShift) return alert("Precisa de ter um turno ativo para reportar ocorrências.");
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
        workplaceId: activeWorkplace ? activeWorkplace.id : "unknown",
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

  const handleCreateSuspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspectDesc) return alert("Por favor, descreva o suspeito.");
    setSuspectUploading(true);
    let photoUrl = "";
    if (suspectPhoto) {
      try {
        const compressed = await compressImage(suspectPhoto);
        const storage = getStorage();
        const fileRef = ref(storage, `suspects/${Date.now()}_${user?.uid}.jpg`);
        await uploadBytes(fileRef, compressed);
        photoUrl = await getDownloadURL(fileRef);
      } catch (err) {
        console.error("Image upload failed", err);
      }
    }

    try {
      await addDoc(collection(db, "suspicious_persons"), {
        vigiaId: user?.uid,
        vigiaName: user?.name || user?.email || "Vigia",
        initialLocation: suspectLocation || activeShift?.locatorName || "Desconhecido",
        direction: suspectDirection,
        description: suspectDesc,
        photoUrl,
        status: "active",
        createdAt: new Date().toISOString(),
        updates: []
      });
      setShowNewSuspectModal(false);
      setSuspectDesc("");
      setSuspectDirection("");
      setSuspectLocation("");
      setSuspectPhoto(null);
    } catch (error) {
      console.error(error);
      alert("Erro ao criar alerta.");
    } finally {
      setSuspectUploading(false);
    }
  };

  const handleAddSuspectUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuspect) return;
    if (!updateMessage && updateType !== "resolvido" && updateType !== "falso_alarme") return alert("Adicione um comentário.");
    
    setUpdateUploading(true);
    let photoUrl = "";
    if (updatePhoto) {
      try {
        const compressed = await compressImage(updatePhoto);
        const storage = getStorage();
        const fileRef = ref(storage, `suspects_updates/${Date.now()}_${user?.uid}.jpg`);
        await uploadBytes(fileRef, compressed);
        photoUrl = await getDownloadURL(fileRef);
      } catch (err) {
        console.error("Image upload failed", err);
      }
    }

    try {
      const isClosing = updateType === "resolvido" || updateType === "falso_alarme";
      const newUpdate = {
        timestamp: new Date().toISOString(),
        vigiaName: user?.name || user?.email || "Vigia",
        type: updateType,
        message: updateMessage,
        photoUrl
      };

      const docRef = doc(db, "suspicious_persons", selectedSuspect.id);
      
      const payload: any = {
        updates: [...(selectedSuspect.updates || []), newUpdate]
      };
      
      if (isClosing) {
        payload.status = updateType === "resolvido" ? "resolved" : "false_alarm";
      }

      await updateDoc(docRef, payload);
      
      setUpdateMessage("");
      setUpdatePhoto(null);
      setUpdateType("avistamento");
      if (isClosing) {
         setSelectedSuspect(null);
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao adicionar atualização.");
    } finally {
      setUpdateUploading(false);
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
  const zelloLink = activeWorkplace?.zelloGroupLink || activeWorkplace?.zelloChannelLink;

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

      {showNotifPrompt && (
        <div style={{ marginBottom: "1rem", padding: "1rem", background: "var(--color-primary-light)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-primary)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Bell size={20} color="var(--color-primary)" />
            <h4 style={{ margin: 0, color: "var(--color-text-primary)" }}>Ative as Notificações</h4>
          </div>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
            Para receber avisos imediatos do seu Capitão mesmo com a app fechada, ative as notificações push.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ width: "100%", padding: "0.5rem" }}
            onClick={() => {
              if (!user) return;
              requestNotificationPermission(user.uid).then(token => {
                if (token) setShowNotifPrompt(false);
                else alert("Para ativar, poderá ter de adicionar a App ao ecrã inicial primeiro (no iPhone: Partilhar -> Adicionar ao Ecrã Principal).");
              });
            }}
          >
            Ativar Notificações
          </button>
        </div>
      )}

      {notifications.length > 0 && (
        <div style={{ marginBottom: "1.5rem", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
          {notifications.map(n => {
            const timeStr = n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return (
            <div key={n.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.9rem 1rem", background: "#1e1b4b", borderLeft: "4px solid #818cf8", color: "white" }}>
              <Bell size={18} style={{ flexShrink: 0, marginTop: "0.1rem", color: "#a5b4fc" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.7rem", color: "#a5b4fc", letterSpacing: "0.05em" }}>MENSAGEM DO CAPITÃO</p>
                  {timeStr && <span style={{ fontSize: "0.65rem", color: "rgba(165,180,252,0.8)" }}>{timeStr}</span>}
                </div>
                <p style={{ margin: 0, fontSize: "0.9rem", wordBreak: "break-word" }}>{n.message}</p>
              </div>
              <button onClick={() => dismissNotification(n.id)} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", borderRadius: "50%", padding: "0.3rem", color: "white", display: "flex", alignItems: "center", flexShrink: 0 }}>
                <X size={15} />
              </button>
            </div>
            );
          })}
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
                      <p style={{ margin: 0, fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.05em" }}>
                        {activeWorkplace ? `${activeWorkplace.name.toUpperCase()} - ` : ""}POSIÇÃO ATUAL
                      </p>
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
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "500px", padding: "2rem", position: "relative" }}>
            <button onClick={() => setShowIncidentModal(false)} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}>
              <X size={24} />
            </button>
            <h2 style={{ margin: "0 0 1.5rem 0", color: "var(--color-danger)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={24} /> Reportar Ocorrência
            </h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              Registe informações vitais (ex: feridos, suspeito avistado). Esta ocorrência será imediatamente enviada ao Capitão.
            </p>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Descrição *</label>
              <textarea 
                className="input" 
                rows={3} 
                value={incidentText} 
                onChange={e => setIncidentText(e.target.value)}
                placeholder="Descreva a situação..."
                style={{ resize: "vertical" }}
              />
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Fotografia (Opcional)</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <label style={{ flex: 1, padding: "0.75rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                  <Camera size={16} /> Câmara
                  <input type="file" accept="image/*" capture="environment" onChange={e => setIncidentPhoto(e.target.files?.[0] || null)} style={{ display: "none" }} />
                </label>
                <label style={{ flex: 1, padding: "0.75rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                  <ImageIcon size={16} /> Galeria
                  <input type="file" accept="image/*" onChange={e => setIncidentPhoto(e.target.files?.[0] || null)} style={{ display: "none" }} />
                </label>
              </div>
              {incidentPhoto && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--color-success)", fontWeight: 600 }}>✓ Anexo: {incidentPhoto.name}</p>}
            </div>

            <button 
              onClick={submitIncident} 
              disabled={incidentUploading || !incidentText}
              style={{
                width: "100%", padding: "1rem", background: "var(--color-danger)", color: "white",
                border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "1rem",
                cursor: (incidentUploading || !incidentText) ? "not-allowed" : "pointer",
                opacity: (incidentUploading || !incidentText) ? 0.6 : 1
              }}
            >
              {incidentUploading ? "A ENVIAR..." : "ENVIAR OCORRÊNCIA"}
            </button>
          </div>
        </div>
      )}

      {showMapForShift && shiftPlanUrl && shiftLocator && (
        <div className="vigia-map-modal">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", background: "#0d1b2a", color: "white", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
              <div style={{ background: "rgba(165,180,252,0.2)", padding: "0.6rem", borderRadius: "50%", flexShrink: 0 }}>
                <MapPin size={22} color="#a5b4fc" />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>A SUA POSIÇÃO</p>
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shiftLocator.name}</h2>
              </div>
            </div>
            <button onClick={() => setShowMapForShift(null)} style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.6rem 1rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "var(--radius-full)", color: "white", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", flexShrink: 0 }}>
              <X size={16} /> Fechar
            </button>
          </div>

          {showMapForShift.time && (
            <div style={{ padding: "0.65rem 1.25rem", background: "rgba(13,27,42,0.9)", color: "rgba(255,255,255,0.65)", fontSize: "0.85rem", display: "flex", gap: "1.5rem", flexShrink: 0, flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {showMapForShift.name && <span style={{ fontWeight: 600 }}>📋 {showMapForShift.name}</span>}
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

      {/* Modals for Suspicious Persons */}
      
      {showSuspectsList && !showNewSuspectModal && !selectedSuspect && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", color: "#22c55e" }}><Search size={18}/> Pessoas Suspeitas</h3>
            <button onClick={() => setShowSuspectsList(false)} style={{ background: "none", border: "none", color: "var(--color-text-primary)", cursor: "pointer" }}><X size={20}/></button>
          </div>
          <div style={{ padding: "1rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "3rem" }}>
            <button 
              onClick={() => setShowNewSuspectModal(true)}
              style={{ padding: "1rem", background: "#22c55e", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "1rem" }}>
              <Crosshair size={20} /> DETETADO SUSPEITO
            </button>
            
            {activeSuspects.length === 0 ? (
               <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>Nenhum suspeito ativo no momento.</div>
            ) : (
               activeSuspects.map(sus => (
                 <div key={sus.id} onClick={() => setSelectedSuspect(sus)} style={{ background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "1rem", border: "1px solid var(--color-border)", cursor: "pointer", display: "flex", gap: "1rem" }}>
                    {sus.photoUrl ? (
                      <img src={sus.photoUrl} alt="Suspeito" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: "60px", height: "60px", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-sm)", color: "var(--color-text-tertiary)", flexShrink: 0 }}>
                        <Search size={24} />
                      </div>
                    )}
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sus.description}</p>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block" }}>Local: {sus.initialLocation}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", display: "block" }}>Visto por: {sus.vigiaName} às {new Date(sus.createdAt).toLocaleTimeString("pt-PT", {hour: "2-digit", minute:"2-digit"})}</span>
                    </div>
                 </div>
               ))
            )}
          </div>
        </div>
      )}

      {showNewSuspectModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 9001, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>
            <div style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "var(--color-text-primary)" }}>Novo Suspeito</h3>
              <button onClick={() => setShowNewSuspectModal(false)} style={{ background: "none", border: "none", color: "var(--color-text-primary)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateSuspect} style={{ padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.3rem" }}>Descrição Física / Roupa *</label>
                <textarea required rows={3} value={suspectDesc} onChange={(e) => setSuspectDesc(e.target.value)} placeholder="Ex: Homem, t-shirt azul, chapéu preto..." className="input-field" style={{ resize: "none" }}></textarea>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.3rem" }}>Local Visto</label>
                <input type="text" value={suspectLocation} onChange={(e) => setSuspectLocation(e.target.value)} placeholder={activeShift?.locatorName || "Desconhecido"} className="input-field" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.3rem" }}>Direção / Desloca-se para onde?</label>
                <input type="text" value={suspectDirection} onChange={(e) => setSuspectDirection(e.target.value)} placeholder="Ex: Em direção ao palco principal" className="input-field" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.3rem" }}>Fotografia (Opcional)</label>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => setSuspectPhoto(e.target.files?.[0] || null)} id="suspectPhotoInput" style={{ display: "none" }} />
                <label htmlFor="suspectPhotoInput" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", background: suspectPhoto ? "rgba(16,185,129,0.1)" : "var(--color-bg)", border: suspectPhoto ? "1px solid #10b981" : "1px dashed var(--color-border)", borderRadius: "var(--radius-md)", color: suspectPhoto ? "#10b981" : "var(--color-text-secondary)", cursor: "pointer", justifyContent: "center" }}>
                  <Camera size={18} />
                  {suspectPhoto ? "Fotografia Adicionada" : "Tirar Foto"}
                </label>
              </div>
              <button type="submit" disabled={suspectUploading || !suspectDesc} style={{ background: "#22c55e", color: "white", padding: "0.75rem", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "0.95rem", cursor: (suspectUploading || !suspectDesc) ? "not-allowed" : "pointer", opacity: (suspectUploading || !suspectDesc) ? 0.5 : 1, marginTop: "0.5rem" }}>
                {suspectUploading ? "A Enviar..." : "LANÇAR ALERTA"}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedSuspect && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "var(--color-surface)", zIndex: 9002, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
            <h3 style={{ margin: 0, color: "#22c55e", fontSize: "1.1rem" }}>Alerta Suspeito</h3>
            <button onClick={() => setSelectedSuspect(null)} style={{ background: "none", border: "none", color: "var(--color-text-primary)", cursor: "pointer" }}><X size={20}/></button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "2rem" }}>
            <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
              <p style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: 700 }}>{selectedSuspect.description}</p>
              <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span><strong>Local Inicial:</strong> {selectedSuspect.initialLocation}</span>
                {selectedSuspect.direction && <span><strong>Direção:</strong> {selectedSuspect.direction}</span>}
                <span><strong>Reportado por:</strong> {selectedSuspect.vigiaName} às {new Date(selectedSuspect.createdAt).toLocaleTimeString("pt-PT", {hour: "2-digit", minute:"2-digit"})}</span>
              </div>
              {selectedSuspect.photoUrl && (
                <img src={selectedSuspect.photoUrl} alt="Suspeito" style={{ width: "100%", maxHeight: "250px", objectFit: "contain", borderRadius: "var(--radius-md)", marginTop: "1rem" }} />
              )}
            </div>

            <div style={{ margin: "1rem 0" }}>
              <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem" }}>Evolução da Ocorrência</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "2px solid var(--color-border)", paddingLeft: "1rem", marginLeft: "0.5rem" }}>
                {(!selectedSuspect.updates || selectedSuspect.updates.length === 0) && (
                  <span style={{ fontSize: "0.85rem", color: "var(--color-text-tertiary)" }}>Nenhuma atualização ainda.</span>
                )}
                {selectedSuspect.updates?.map((u: any, i: number) => (
                  <div key={i} style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: "-1.35rem", top: "0.25rem", width: "10px", height: "10px", borderRadius: "50%", background: "var(--color-primary)" }} />
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", fontWeight: 600 }}>{new Date(u.timestamp).toLocaleTimeString("pt-PT", {hour: "2-digit", minute:"2-digit"})} - {u.vigiaName}</span>
                    <span style={{ display: "inline-block", marginLeft: "0.5rem", fontSize: "0.7rem", background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>{u.type.toUpperCase()}</span>
                    {u.message && <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>{u.message}</p>}
                    {u.photoUrl && <img src={u.photoUrl} style={{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "var(--radius-sm)", marginTop: "0.5rem" }} />}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddSuspectUpdate} style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem" }}>Adicionar Informação</h4>
              <div>
                <select value={updateType} onChange={(e) => setUpdateType(e.target.value)} className="input-field">
                  <option value="avistamento">👀 Visto a passar / Atualização de Local</option>
                  <option value="abordagem">✋ Abordado / Identificado</option>
                  <option value="falso_alarme">❌ Falso Alarme / Resolvido (Fechar)</option>
                  <option value="resolvido">✅ A pessoa foi embora (Fechar)</option>
                </select>
              </div>
              <textarea rows={2} value={updateMessage} onChange={(e) => setUpdateMessage(e.target.value)} placeholder="Detalhes (Obrigatório para fechar a ocorrência)" className="input-field" style={{ resize: "none" }}></textarea>
              
              <input type="file" accept="image/*" capture="environment" onChange={(e) => setUpdatePhoto(e.target.files?.[0] || null)} id="updatePhotoInput" style={{ display: "none" }} />
              <label htmlFor="updatePhotoInput" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", background: updatePhoto ? "rgba(16,185,129,0.1)" : "var(--color-surface)", border: updatePhoto ? "1px solid #10b981" : "1px dashed var(--color-border)", borderRadius: "var(--radius-md)", color: updatePhoto ? "#10b981" : "var(--color-text-secondary)", cursor: "pointer", justifyContent: "center", fontSize: "0.85rem" }}>
                <Camera size={16} />
                {updatePhoto ? "Foto Adicionada" : "Tirar Foto (Opcional)"}
              </label>

              <button type="submit" disabled={updateUploading || (!updateMessage && (updateType === 'resolvido' || updateType === 'falso_alarme'))} style={{ background: "var(--color-primary)", color: "white", padding: "0.75rem", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: updateUploading ? "not-allowed" : "pointer" }}>
                {updateUploading ? "A enviar..." : "ENVIAR"}
              </button>
            </form>
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

    {/* BOTTOM NAVIGATION BAR — flex sibling of scrollable content */}
    <div className="vigia-app-bottom-bar">
      {activeShift && (
        <>
          {zelloLink && (
            <a href={zelloLink} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.3rem", textDecoration: "none", flex: "1 0 auto" }}>
              <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "rgba(249, 115, 22, 0.15)", border: "1.5px solid rgba(249,115,22,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316" }}>
                <Play size={20} fill="currentColor" />
              </div>
              <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#f97316" }}>Rádio</span>
            </a>
          )}
          <button onClick={() => setShowSuspectsList(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "rgba(34, 197, 94, 0.15)", border: "1.5px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#22c55e", position: "relative" }}>
              <Search size={20} fill="currentColor" />
              {activeSuspects.length > 0 && (
                <span style={{ position: "absolute", top: "-3px", right: "-3px", background: "#22c55e", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "0.6rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeSuspects.length}</span>
              )}
            </div>
            <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#22c55e" }}>Suspeito</span>
          </button>
          <button onClick={() => setShowIncidentModal(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "linear-gradient(135deg, #dc2626, #ef4444)", boxShadow: "0 3px 12px rgba(239,68,68,0.45)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
              <FileWarning size={20} />
            </div>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#ef4444" }}>Ocorrência</span>
          </button>
        </>
      )}
      <button onClick={() => setShowHistoryModal(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto" }}>
        <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: myIncidents.length > 0 ? "rgba(99,102,241,0.15)" : "var(--color-bg)", border: myIncidents.length > 0 ? "1.5px solid rgba(99,102,241,0.4)" : "1.5px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: myIncidents.length > 0 ? "#6366f1" : "var(--color-text-secondary)", position: "relative" }}>
          <Clock size={20} />
          {myIncidents.length > 0 && (
            <span style={{ position: "absolute", top: "-3px", right: "-3px", background: "#6366f1", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "0.6rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{myIncidents.length}</span>
          )}
        </div>
        <span style={{ fontSize: "0.65rem", fontWeight: 600, color: myIncidents.length > 0 ? "#6366f1" : "var(--color-text-secondary)" }}>Histórico</span>
      </button>
    </div>
    </>
  );
}
