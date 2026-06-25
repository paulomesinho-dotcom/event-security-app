"use client";

import { useEffect, useState } from "react";
import { initAudio, playAlertBeeps, stopAlertBeeps } from "@/lib/audioAlert";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, addDoc, orderBy, limit, arrayUnion } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Play, Square, Clock, Calendar, CheckCircle2, AlertTriangle, X, Bell, FileWarning, MessageCircle, Camera, Image as ImageIcon, Search, Crosshair, UserX, Info, ChevronUp, ChevronDown, Radio, CheckCheck, Check, ShieldAlert, Shield, User } from "lucide-react";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase-messaging";

import dynamic from "next/dynamic";
const MapViewer = dynamic(() => import("@/components/MapViewer"), { ssr: false });
const MapModal = dynamic(() => import("@/components/MapModal"), { ssr: false });

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
  local?: string;
  sublocal?: string;
  subsublocal?: string;
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

export default function CaptainPatrolDashboard({ onOpenMap, isSidebarOpen, forcedWorkplaceId }: { onOpenMap?: (locId: string) => void, isSidebarOpen?: boolean, forcedWorkplaceId?: string | null }) {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [teamShifts, setTeamShifts] = useState<any[]>([]);
  const [teamVigias, setTeamVigias] = useState<Record<string, any>>({});
  const [locators, setLocators] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "locators"), (snap) => {
      const arr: any[] = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setLocators(arr);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const users: Record<string, any> = {};
      snap.forEach((d) => {
         users[d.id] = { id: d.id, ...d.data() };
      });
      setTeamVigias(users);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "shifts"), where("status", "in", ["pending", "active"]));
    const unsub = onSnapshot(q, (snap) => {
      const sfts: any[] = [];
      snap.forEach((d) => {
        const s = { id: d.id, ...d.data() } as any;
        if (user.role === "superadmin" || s.workplaceId === (forcedWorkplaceId || user.workplaceId)) {
          sfts.push(s);
        }
      });
      setTeamShifts(sfts);
    });
    return () => unsub();
  }, [user, forcedWorkplaceId]);

  const [globalSettings, setGlobalSettings] = useState<any>(null);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), snap => {
      if (snap.exists()) setGlobalSettings(snap.data());
      else setGlobalSettings(null);
    });
    return () => unsub();
  }, []);

  // Derive
  const userIds = new Set(teamShifts.filter((s: any) => s.status === 'active' || s.status === 'pending').map((s: any) => s.vigiaId || s.personId || s.userId).filter(Boolean));
  const activeTeamShifts = teamShifts.filter(s => s.status === "active");
  const pendingTeamShifts = teamShifts.filter(s => s.status === "pending");


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
  const [allIncidents, setAllIncidents] = useState<any[]>([]);
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [incidentTab, setIncidentTab] = useState<"ativas" | "arquivadas">("ativas");
  const activeIncidents = allIncidents.filter(i => i.status === "open");
  const archivedIncidents = allIncidents.filter(i => i.status !== "open");

  // Suspicious Persons
  
  
  useEffect(() => {
    const unlockAudio = () => {
      initAudio();
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
    };
    document.addEventListener("touchstart", unlockAudio, { once: true });
    document.addEventListener("click", unlockAudio, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
    };
  }, []);

  const [globalNotifications, setGlobalNotifications] = useState<any[]>([]);
  const [activePanel, setActivePanel] = useState<'zello'|'suspects'|'incidents'|'info'|null>(null);
  const [showGlobalAlertModal, setShowGlobalAlertModal] = useState(false);
  const [globalAlertText, setGlobalAlertText] = useState("");
  const [sendingGlobalAlert, setSendingGlobalAlert] = useState(false);
  
  // Info Data
  const [infoItems, setInfoItems] = useState<any[]>([]);
  const [expandedInfoTopics, setExpandedInfoTopics] = useState<Record<string, boolean>>({});
  
  // Captain Info & Notification
  const [captainName, setCaptainName] = useState("");
  const [isSendingNotify, setIsSendingNotify] = useState(false);
  
  useEffect(() => {
    const q = query(collection(db, "information"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setInfoItems(data);
      const topics: Record<string, boolean> = {};
      data.forEach(item => { topics[item.topic] = true; });
      setExpandedInfoTopics(topics);
    });
    return () => unsubscribe();
  }, []);
  
  const groupedInfoItems = infoItems.reduce((acc, item) => {
    if (!acc[item.topic]) acc[item.topic] = [];
    acc[item.topic].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const sortedInfoTopics = Object.entries(groupedInfoItems).sort(([topicA, itemsA], [topicB, itemsB]) => {
    const minA = Math.min(...(itemsA as any[]).map(i => typeof i.order === "number" ? i.order : 999));
    const minB = Math.min(...(itemsB as any[]).map(i => typeof i.order === "number" ? i.order : 999));
    if (minA !== minB) return minA - minB;
    return topicA.localeCompare(topicB);
  });

  // Instead of showSuspectsList, showIncidentsList, we will replace them where used.
const [allSuspects, setAllSuspects] = useState<any[]>([]);
  const [suspectTab, setSuspectTab] = useState<"ativos" | "arquivados">("ativos");
  const activeSuspects = allSuspects.filter(s => s.status === "active");
  const archivedSuspects = allSuspects.filter(s => s.status !== "active");
    const [showNewSuspectModal, setShowNewSuspectModal] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<any>(null);
  const [mapModalData, setMapModalData] = useState<any>(null);
  
  const [suspectLocal, setSuspectLocal] = useState("");
  const [suspectSublocal, setSuspectSublocal] = useState("");
  const [suspectSubsublocal, setSuspectSubsublocal] = useState("");
  const [activeShiftLocation, setActiveShiftLocation] = useState<{local: string, sublocal: string, subsublocal: string} | null>(null);
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
    const qShifts = query(collection(db, "shifts"), where("personId", "==", user?.uid || "unknown"));
    
    const unsubGlobalNotifs = onSnapshot(query(collection(db, "global_notifications"), orderBy("timestamp", "desc")), (snap) => {
      const notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGlobalNotifications(notifs);
    });
    const unsubShifts = onSnapshot(qShifts, (snapshot) => {
      const data: Shift[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Shift));
      data.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setShifts(data);
      setLoading(false);
    });
    const qNotifs = query(collection(db, "notifications"), where("vigiaId", "==", user?.uid || "unknown"));
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

    const qIncidents = query(collection(db, "incidents"));
    const unsubIncidents = onSnapshot(qIncidents, (snap) => {
      const inc: any[] = [];
      snap.forEach(d => inc.push({ id: d.id, ...d.data() }));
      inc.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllIncidents(inc);
    });

    const qSuspects = query(collection(db, "suspicious_persons"));
    const unsubSuspects = onSnapshot(qSuspects, (snap) => {
      const s: any[] = [];
      snap.forEach(d => s.push({ id: d.id, ...d.data() }));
      s.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllSuspects(s);
      setSelectedSuspect((prev: any) => {
        if (!prev) return null;
        const updated = s.find(sus => sus.id === prev.id);
        if (updated) return updated;
        return null; // was closed
      });
    });

    return () => { unsubGlobalNotifs();
        unsubShifts();
        unsubNotifs(); unsubFcm(); unsubWorkplaces(); unsubIncidents(); unsubSuspects(); };
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
  const pendingShift = shifts.find(s => s.status === "pending");
  
  let activeWorkplace: any = null;
  if (forcedWorkplaceId) {
    activeWorkplace = workplaces.find(w => w.id === forcedWorkplaceId) || null;
  }
  if (!activeWorkplace && activeShift) {
    activeWorkplace = workplaces.find(w => w.planIds?.includes(activeShift.planId)) || null;
  }
  if (!activeWorkplace && pendingShift) {
    activeWorkplace = workplaces.find(w => w.planIds?.includes(pendingShift.planId)) || null;
  }
  if (!activeWorkplace && user?.uid) {
    activeWorkplace = workplaces.find(w => w.captainId === user.uid) || null;
  }
  if (!activeWorkplace && user?.workplaceId) {
    activeWorkplace = workplaces.find(w => w.id === user.workplaceId) || null;
  }

  // Emergency monitoring calculation
  const isGlobalEmergency = globalSettings?.globalEmergency === true;
  const isLocalEmergency = activeWorkplace?.isEmergency === true;
  const isEmergencyActive = isGlobalEmergency || isLocalEmergency;

  const alertAckSet = new Set([
    ...(isGlobalEmergency ? (globalSettings?.globalAlertAck || []) : []),
    ...(isLocalEmergency ? (activeWorkplace?.alertAck || []) : [])
  ]);
  const evacAckSet = new Set([
    ...(isGlobalEmergency ? (globalSettings?.globalEvacAck || []) : []),
    ...(isLocalEmergency ? (activeWorkplace?.evacAck || []) : [])
  ]);

  const workplaceGuardsList = Object.values(teamVigias).filter((u: any) => {
    if (!u || u.role === "superadmin" || u.role === "admin" || u.role === "captain") return false;
    return u.workplaceId === activeWorkplace?.id || teamShifts.some(s => s.vigiaId === u.id || s.personId === u.id || s.userId === u.id);
  });

  // Overdue shifts calculation
  const nowObj = new Date();
  const nowMinTotal = nowObj.getHours() * 60 + nowObj.getMinutes();

  const overdueShifts = teamShifts.filter(shift => {
    if (shift.status === "pending") {
      const startStr = getShiftStartTime(shift);
      if (!startStr) return false;
      const [h, m] = startStr.split(":").map(Number);
      const startMin = h * 60 + m;
      return startMin > 0 && startMin < nowMinTotal;
    } else if (shift.status === "active") {
      const endStr = getShiftEndTime(shift);
      if (!endStr) return false;
      const [h, m] = endStr.split(":").map(Number);
      const endMin = h * 60 + m;
      return endMin > 0 && endMin < nowMinTotal;
    }
    return false;
  });

  useEffect(() => {
    if (activeWorkplace?.captainId) {
      getDoc(doc(db, "users", activeWorkplace.captainId)).then(snap => {
        if (snap.exists()) setCaptainName((snap.data() as any).name);
      });
    }
  }, [activeWorkplace]);

  useEffect(() => {
    const fetchLocationData = async () => {
      if (activeShift?.locatorId) {
        try {
          const locDoc = await getDoc(doc(db, "locators", activeShift.locatorId));
          if (locDoc.exists()) {
             const locData = locDoc.data();
             if (locData.locationId) {
                const absDoc = await getDoc(doc(db, "abstract_locations", locData.locationId));
                if (absDoc.exists()) {
                   const absData = absDoc.data();
                   setActiveShiftLocation({
                      local: absData.local || "",
                      sublocal: absData.sublocal || "",
                      subsublocal: absData.subsublocal || ""
                   });
                   return;
                }
             }
          }
        } catch(e) { console.error("Error fetching location data", e); }
      }
      setActiveShiftLocation(null);
    };
    fetchLocationData();
  }, [activeShift?.locatorId]);

  const submitIncident = async () => {
    const currentShift = activeShift || shifts.find(s => s.status === "pending");
    // if (!currentShift) return alert("Precisa de ter um turno atribuído para reportar ocorrências.");
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
        shiftId: typeof currentShift !== "undefined" ? currentShift.id : activeShift?.id,
        locatorName: typeof currentShift !== "undefined" ? currentShift.locatorName : activeShift?.locatorName,
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

  const getGPSLocation = (): Promise<{lat: number, lng: number} | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => { 
          console.error("GPS Error:", err); 
          resolve(null); 
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
      );
    });
  };

  const handleCreateSuspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspectDesc) return alert("Por favor, descreva o suspeito.");
    setSuspectUploading(true);
    
    const gps = await getGPSLocation();
    
    let planImageUrl = "";
    let pinX: number | null = null;
    let pinY: number | null = null;
    if (activeShift?.planId) {
      try {
        const planDoc = await getDoc(doc(db, "plans", activeShift.planId));
        if (planDoc.exists()) planImageUrl = planDoc.data().imageUrl || "";
      } catch(e) { console.error("plan fetch error", e); }
    }
    if (activeShift?.locatorId) {
      try {
        const locDoc = await getDoc(doc(db, "locators", activeShift.locatorId));
        if (locDoc.exists()) {
          const locData = locDoc.data();
          pinX = locData.x ?? null;
          pinY = locData.y ?? null;
        }
      } catch(e) { console.error("locator fetch error", e); }
    }

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
        initialLocation: [suspectLocal, suspectSublocal, suspectSubsublocal].filter(Boolean).join(" - ") || "Desconhecido",
        local: suspectLocal,
        sublocal: suspectSublocal,
        subsublocal: suspectSubsublocal,
        direction: suspectDirection,
        description: suspectDesc,
        photoUrl,
        planImageUrl,
        pinX,
        pinY,
        lat: gps?.lat || null,
        lng: gps?.lng || null,
        status: "active",
        createdAt: new Date().toISOString(),
        updates: []
      });
      setShowNewSuspectModal(false);
      setSuspectDesc("");
      setSuspectDirection("");
      setSuspectLocal("");
      setSuspectSublocal("");
      setSuspectSubsublocal("");
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
      const gps = await getGPSLocation();
      
      const newUpdate = {
        timestamp: new Date().toISOString(),
        vigiaName: user?.name || user?.email || "Vigia",
        type: updateType,
        message: updateMessage,
        photoUrl,
        lat: gps?.lat || null,
        lng: gps?.lng || null
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

  
  
  const markGlobalNotificationAsRead = async (notif: any) => {
    if (!user?.uid || notif.readBy?.includes(user.uid)) return;
    try {
      await updateDoc(doc(db, "global_notifications", notif.id), {
        readBy: arrayUnion(user.uid)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const sendGlobalAlert = async () => {
    if (!globalAlertText) return;
    setSendingGlobalAlert(true);
    try {
      await fetch("/api/send-notification-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: globalAlertText,
          senderName: user?.name || user?.email,
          senderId: user?.uid,
          title: "NOTIFICAÇÃO GLOBAL",
          target: "all"
        })
      });
      alert("Notificação enviada para todos!");
      setGlobalAlertText("");
      setShowGlobalAlertModal(false);
      setActivePanel(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar notificação.");
    } finally {
      setSendingGlobalAlert(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", color: "var(--color-text-secondary)" }}>
      <Clock size={32} style={{ marginBottom: "1rem", opacity: 0.4 }} />
      <p>A procurar os seus turnos...</p>
    </div>
  );

  const pendingShifts = shifts.filter(s => s.status === "pending").sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const completedShifts = shifts.filter(s => s.status === "completed");
  const zelloLink = activeWorkplace?.zelloGroupLink || activeWorkplace?.zelloChannelLink;
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* SCROLLABLE CONTENT — flex: 1 so it fills remaining height */}
    <div className="animate-fade-in vigia-app-main" style={{ padding: "1rem 0.5rem" }}>
      {fcmBanner && (
        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.9rem 1rem", background: "linear-gradient(135deg, #1e1b4b, #312e81)", borderRadius: "var(--radius-lg)", color: "white", boxShadow: "0 4px 20px rgba(99,102,241,0.4)", animation: "slideDown 0.3s ease" }}>
          <Bell size={18} style={{ flexShrink: 0, marginTop: "0.1rem", color: "#a5b4fc" }} />
          <div style={{ flex: 1, minWidth: 0}}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.7rem", color: "#a5b4fc", marginBottom: "0.2rem", letterSpacing: "0.05em" }}>🔔 NOTIFICAÇíO DO CAPITíO</p>
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
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.7rem", color: "#a5b4fc", letterSpacing: "0.05em" }}>MENSAGEM DO CAPITíO</p>
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

      {activeSuspects.length > 0 && (
        <button
          onClick={() => { stopAlertBeeps(); setActivePanel("suspects"); }}
          style={{ width: "100%", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.9rem 1rem", background: "linear-gradient(135deg, #2d1b4e, #3b1f6e)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(168,85,247,0.4)", color: "white", cursor: "pointer", textAlign: "left", boxShadow: "0 4px 16px rgba(168,85,247,0.25)", animation: "suspectPulse 3s ease-in-out infinite" }}
        >
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(168,85,247,0.2)", border: "1.5px solid rgba(168,85,247,0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UserX size={18} color="#d8b4fe" />
          </div>
          <div style={{ flex: 1, minWidth: 0}}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.7rem", color: "#c084fc", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.15rem" }}>⚠ SUSPEITO ATIVO</p>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(255,255,255,0.9)" }}>
              {activeSuspects.length === 1
                ? activeSuspects[0].description
                : `${activeSuspects.length} suspeitos em acompanhamento`}
            </p>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#c084fc", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
            Ver <span style={{ fontSize: "1rem" }}>›</span>
          </div>
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

        {/* Secção 1: Monitorização de Emergência (quando ativa) */}
        {isEmergencyActive && (
          <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "2px solid #ef4444", borderRadius: "var(--radius-lg)", padding: "1.25rem", boxShadow: "0 4px 20px rgba(239,68,68,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", borderBottom: "1px solid rgba(239,68,68,0.3)", paddingBottom: "0.75rem" }}>
              <ShieldAlert size={24} color="#ef4444" style={{ animation: "pulse 2s infinite" }} />
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Estado de Emergência ({activeWorkplace?.name || "Local"})
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  Confirmações da equipa de patrulha no local
                </span>
              </div>
            </div>

            {workplaceGuardsList.length === 0 ? (
              <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", margin: 0 }}>Nenhum vigia associado a este local.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {workplaceGuardsList.map((guard: any) => {
                  const hasSeenAlert = alertAckSet.has(guard.id);
                  const hasConfirmedEvac = evacAckSet.has(guard.id);

                  const guardShift = teamShifts.find(s => (s.vigiaId === guard.id || s.personId === guard.id || s.userId === guard.id) && (s.status === "active" || s.status === "pending"));
                  const locator = guardShift ? locators.find(l => l.id === guardShift.locatorId) : null;
                  const plan = locator ? activeWorkplace?.plans?.find((p: any) => p.id === locator?.planId) : null;
                  const hasPin = !!(plan && locator && typeof locator.x === "number" && typeof locator.y === "number");

                  return (
                    <div key={guard.id} style={{ background: "var(--color-surface)", padding: "0.85rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        {hasPin ? (
                          <button
                            type="button"
                            onClick={() => setMapModalData({ planImageUrl: plan.imageUrl, pinX: locator.x, pinY: locator.y, title: `${guard.name || guard.email} (${locator.name || "Pin"})` })}
                            style={{ background: "transparent", border: "none", padding: 0, color: "var(--color-primary)", fontWeight: 700, fontSize: "0.95rem", textDecoration: "underline", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                            title="Ver posição do pin de localização"
                          >
                            <MapPin size={16} color="#ef4444" />
                            <span>{guard.name || guard.email?.split("@")[0]}</span>
                          </button>
                        ) : (
                          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                            <User size={16} color="var(--color-text-tertiary)" />
                            <span>{guard.name || guard.email?.split("@")[0]}</span>
                          </span>
                        )}
                        {locator && <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)" }}>• {locator.name}</span>}
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: "var(--radius-full)",
                          background: hasSeenAlert ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: hasSeenAlert ? "#10b981" : "#ef4444",
                          border: `1px solid ${hasSeenAlert ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                          display: "inline-flex", alignItems: "center", gap: "0.3rem"
                        }}>
                          {hasSeenAlert ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                          {hasSeenAlert ? "ALERTA VISTO" : "ALERTA NÃO VISTO"}
                        </span>

                        <span style={{
                          fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: "var(--radius-full)",
                          background: hasConfirmedEvac ? "rgba(59, 130, 246, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: hasConfirmedEvac ? "#3b82f6" : "#f59e0b",
                          border: `1px solid ${hasConfirmedEvac ? "rgba(59,130,246,0.3)" : "rgba(245,158,11,0.3)"}`,
                          display: "inline-flex", alignItems: "center", gap: "0.3rem"
                        }}>
                          {hasConfirmedEvac ? <Shield size={13} /> : <AlertTriangle size={13} />}
                          {hasConfirmedEvac ? "ZONA EVACUADA / SEGURO" : "ESTADO PENDENTE"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Secção 2: Turnos em Atraso */}
        {overdueShifts && overdueShifts.length > 0 && (
          <div style={{ background: "rgba(239, 68, 68, 0.06)", border: "1.5px solid #ef4444", borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", fontWeight: 800, color: "#ef4444", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              <AlertTriangle size={15} /> Turnos em Atraso ({overdueShifts.length})
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {overdueShifts.map(shift => {
                const locator = locators.find(l => l.id === shift.locatorId);
                const vigia = teamVigias[shift.vigiaId || shift.personId || shift.userId];
                
                const isStarting = shift.status === "pending";
                const timeStr = isStarting ? getShiftStartTime(shift) : getShiftEndTime(shift);
                let delayMin = 0;
                if (timeStr) {
                  const [h, m] = timeStr.split(":").map(Number);
                  const targetMin = h * 60 + m;
                  delayMin = Math.max(0, nowMinTotal - targetMin);
                }
                
                const delayFormatted = delayMin >= 60 ? `${Math.floor(delayMin / 60)}h ${delayMin % 60}m` : `${delayMin} min`;
                const plan = locator ? activeWorkplace?.plans?.find((p: any) => p.id === locator?.planId) : null;
                const hasPin = !!(plan && locator && typeof locator.x === "number" && typeof locator.y === "number");

                return (
                  <div key={shift.id} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(239, 68, 68, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span>{vigia?.name || "Vigia Desconhecido"}</span>
                        <span style={{ fontSize: "0.65rem", background: "#ef4444", color: "white", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 800 }}>
                          {isStarting ? "A COMEÇAR EM ATRASO" : "A ACABAR EM ATRASO"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Clock size={14} color="#ef4444" />
                        <span>Atraso de <strong style={{ color: "#ef4444" }}>{delayFormatted}</strong> (Previsto: {timeStr})</span>
                      </div>
                    </div>

                    <div>
                      {hasPin ? (
                        <button
                          type="button"
                          onClick={() => setMapModalData({ planImageUrl: plan.imageUrl, pinX: locator.x, pinY: locator.y, title: `${vigia?.name || "Vigia"} - ${locator.name}` })}
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)", padding: "0.5rem 0.85rem", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                        >
                          <MapPin size={14} /> Ver no Mapa
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-tertiary)" }}>{locator?.name || "Sem planta"}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {activeWorkplace?.plans && activeWorkplace.plans.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>O Seu Local</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {activeWorkplace.plans.map((p: any) => (
              <button 
                key={p.id}
                onClick={() => setMapModalData({ title: p.name, planImageUrl: p.imageUrl })}
                style={{ width: "100%", padding: "1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", color: "var(--color-text-primary)", fontWeight: 600, fontSize: "0.95rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
                    <MapPin size={16} />
                  </div>
                  {p.name}
                </div>
                <span style={{ fontSize: "1.2rem", color: "var(--color-text-tertiary)" }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

          {/* Secção Principal: Estado da Equipa */}
          <div style={{ marginTop: "1rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Equipa em Patrulha (Ativos)</span>
            {activeTeamShifts && activeTeamShifts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                {activeTeamShifts.map(shift => {
                   
                   const locator = locators.find(l => l.id === shift.locatorId);
                   const vigia = teamVigias[shift.vigiaId || shift.personId || shift.userId];
                   
                   // Check if overdue
                   let isOverdue = false;
                   const now = new Date();
                   const nowMin = now.getHours() * 60 + now.getMinutes();
                   const startStr = getShiftStartTime(shift);
                   if (startStr) {
                       const [h, m] = startStr.split(":").map(Number);
                       const startMin = h * 60 + m;
                       if (startMin > 0 && startMin < nowMin) {
                           isOverdue = true;
                       }
                   }

                   return (
                     <div key={shift.id} onClick={() => {
                        const plan = activeWorkplace?.plans?.find((p: any) => p.id === locator?.planId);
                        if (plan && locator) {
                           setMapModalData({ planImageUrl: plan.imageUrl, pinX: locator.x, pinY: locator.y, title: locator.name || "Local" });
                        }
                     }} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-lg)", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", border: isOverdue ? "2px solid #ef4444" : "1px solid rgba(56, 189, 248, 0.3)", position: "relative", overflow: "hidden", cursor: "pointer" }}>
                       <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "4px", background: "var(--color-primary)" }} />
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <div>
                           <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                             <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isOverdue ? "#ef4444" : "var(--color-primary)", boxShadow: isOverdue ? "0 0 10px #ef4444" : "0 0 10px var(--color-primary)" }} />
                             {vigia?.name || "Vigia Desconhecido"}
                             {isOverdue && <span style={{fontSize: "0.6rem", background: "#ef4444", color: "white", padding: "0.1rem 0.3rem", borderRadius: "4px", marginLeft: "0.3rem"}}>EM ATRASO</span>}
                           </div>
                           <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                             <MapPin size={14} />
                             {locator?.name || "A carregar local..."}
                           </div>
                         </div>
                       </div>
                     </div>
                   );
                })}
              </div>
            ) : (
              <div style={{ marginTop: "0.5rem", background: "var(--color-surface)", padding: "1.25rem", borderRadius: "var(--radius-lg)", textAlign: "center", border: "1px solid var(--color-border)" }}>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>Nenhum vigia em patrulha neste momento.</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Próximos Turnos (A Iniciar)</span>
            {pendingTeamShifts && pendingTeamShifts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {pendingTeamShifts.map((shift, idx) => {
                   
                   const locator = locators.find(l => l.id === shift.locatorId);
                   const vigia = teamVigias[shift.vigiaId || shift.personId || shift.userId];
                   
                   // Check if overdue
                   let isOverdue = false;
                   const now = new Date();
                   const nowMin = now.getHours() * 60 + now.getMinutes();
                   const startStr = getShiftStartTime(shift);
                   if (startStr) {
                       const [h, m] = startStr.split(":").map(Number);
                       const startMin = h * 60 + m;
                       if (startMin > 0 && startMin < nowMin) {
                           isOverdue = true;
                       }
                   }

                   
  return (
                     <div key={shift.id} onClick={() => {
                        const plan = activeWorkplace?.plans?.find((p: any) => p.id === locator?.planId);
                        if (plan && locator) {
                           setMapModalData({ planImageUrl: plan.imageUrl, pinX: locator.x, pinY: locator.y, title: locator.name || "Local" });
                        }
                     }} style={{ background: "var(--color-surface)", padding: "0.875rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                       <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                         <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
                           <Clock size={16} />
                         </div>
                         <div>
                           <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.95rem" }}>{vigia?.name || "Vigia Desconhecido"}</div>
                           <div style={{ fontSize: "0.8rem", color: "var(--color-text-tertiary)" }}>{locator?.name || "Local Desconhecido"} • {shift.time}</div>
                         </div>
                       </div>
                     </div>
                   );
                })}
              </div>
            ) : (
              <div style={{ background: "var(--color-surface)", padding: "1.25rem", borderRadius: "var(--radius-md)", textAlign: "center", border: "1px solid var(--color-border)" }}>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>Não existem turnos agendados.</p>
              </div>
            )}
          </div>
        </div>
    </div>

      
      {activePanel === 'incidents' && !showIncidentModal && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #1e0a3c, #5b1030)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(239,68,68,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(239,68,68,0.25)", border: "1px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileWarning size={18} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#ffffff", fontSize: "1rem", fontWeight: 700 }}>Ocorrências</h3>
                {activeIncidents.length > 0 && <p style={{ margin: 0, fontSize: "0.75rem", color: "#fca5a5" }}>{activeIncidents.length} ativas</p>}
              </div>
            </div>
            <button onClick={() => setActivePanel(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18}/></button>
          </div>
          <div style={{ padding: "1rem", flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "3rem" }}>
                          <div style={{ display: "flex", background: "var(--color-surface)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "var(--radius-lg)", padding: "0.25rem", marginBottom: "1rem" }}>
                <button 
                  onClick={() => setIncidentTab("ativas")}
                  style={{ flex: 1, padding: "0.6rem", background: incidentTab === "ativas" ? "rgba(239,68,68,0.15)" : "transparent", color: incidentTab === "ativas" ? "#ef4444" : "var(--color-text-secondary)", border: "none", borderRadius: "var(--radius-md)", fontWeight: incidentTab === "ativas" ? 600 : 500, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
                >
                  Ativas ({activeIncidents.length})
                </button>
                <button 
                  onClick={() => setIncidentTab("arquivadas")}
                  style={{ flex: 1, padding: "0.6rem", background: incidentTab === "arquivadas" ? "rgba(239,68,68,0.15)" : "transparent", color: incidentTab === "arquivadas" ? "#ef4444" : "var(--color-text-secondary)", border: "none", borderRadius: "var(--radius-md)", fontWeight: incidentTab === "arquivadas" ? 600 : 500, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
                >
                  Histórico ({archivedIncidents.length})
                </button>
              </div>

              {incidentTab === "ativas" && (
                <button 
                  onClick={() => setShowIncidentModal(true)}
                  style={{ padding: "1rem 1.25rem", background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.95rem", boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}>
                  <AlertTriangle size={20} /> NOVA OCORRÊNCIA
                </button>
              )}
              {(incidentTab === "ativas" ? activeIncidents : archivedIncidents).length === 0 ? (
               <div style={{ textAlign: "center", padding: "3rem 2rem", color: "var(--color-text-secondary)" }}>
                 <FileWarning size={40} style={{ opacity: 0.3, margin: "0 auto 1rem", display: "block" }} />
                 <p style={{ margin: 0 }}>Nenhuma ocorrência registada.</p>
               </div>
            ) : (
               (incidentTab === "ativas" ? activeIncidents : archivedIncidents).map((inc, idx) => (
                 <div key={inc.id || idx} style={{ flexShrink: 0, background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden", position: "relative" }}>
                     <div 
                       onClick={() => setExpandedIncidentId(expandedIncidentId === inc.id ? null : inc.id)} 
                       style={{ padding: "1rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                     >
                       <div>
                         <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 600, display: "block", marginBottom: "0.2rem" }}>
                           {new Date(inc.createdAt).toLocaleString("pt-PT")}
                         </span>
                         <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--color-text-primary)" }}>
                           {inc.vigiaName || "Equipa de Segurança"}
                         </span>
                       </div>
                       <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                         <span style={{ background: incidentTab === "ativas" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: incidentTab === "ativas" ? "#ef4444" : "#10b981", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", fontSize: "0.7rem", fontWeight: 700 }}>
                           {incidentTab === "ativas" ? "ATIVA" : "RESOLVIDA"}
                         </span>
                         <span style={{ color: "var(--color-text-tertiary)", fontSize: "1.2rem", transform: expandedIncidentId === inc.id ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.2s" }}>›</span>
                       </div>
                     </div>
                     
                     {expandedIncidentId === inc.id && (
                       <div style={{ padding: "0 1rem 1rem 1rem", borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
                         <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "var(--color-text-primary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                           {inc.message}
                         </p>
                         {inc.photoUrl && (
                           <div style={{ marginTop: "0.5rem" }}>
                             <img onClick={(e) => { e.stopPropagation(); setSelectedPhoto(inc.photoUrl); }} src={inc.photoUrl} alt="Anexo" style={{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "var(--radius-sm)", cursor: "zoom-in" }} />
                           </div>
                         )}
                         {incidentTab === "ativas" && (
                           <button
                             onClick={async (e) => {
                               e.stopPropagation();
                               if(confirm("Tem a certeza que deseja fechar esta ocorrência?")) {
                                 try {
                                   await updateDoc(doc(db, "incidents", inc.id), { status: "resolved", resolvedAt: new Date().toISOString(), resolvedBy: user?.name || user?.email || "Capitão" });
                                 } catch(err) { alert("Erro ao fechar"); }
                               }
                             }}
                             style={{ marginTop: "1rem", width: "100%", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                           >
                             FECHAR OCORRÊNCIA
                           </button>
                         )}
                       </div>
                     )}
                   </div>
                 ))
              )}
          </div>
        </div>
      )}

      {showIncidentModal && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 10001, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "var(--color-surface)", width: "100%", display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #1e0a3c, #5b1030)", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={18} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#ffffff", fontSize: "1rem", fontWeight: 700 }}>Reportar Ocorrência</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#fca5a5" }}>Alerta imediato para o Capitão</p>
                </div>
              </div>
              <button onClick={() => setShowIncidentModal(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
            </div>
            
            <div style={{ padding: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-danger)", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "0.04em" }}>Descrição *</label>
                <textarea 
                  className="input" 
                  rows={4} 
                  value={incidentText} 
                  onChange={e => setIncidentText(e.target.value)}
                  placeholder="Descreva a situação em detalhe..."
                  style={{ resize: "vertical" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "0.04em" }}>Fotografia (Opcional)</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <label style={{ flex: 1, minWidth: 0, padding: "0.75rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                    <Camera size={16} /> Câmara
                    <input type="file" accept="image/*" capture="environment" onChange={e => setIncidentPhoto(e.target.files?.[0] || null)} style={{ display: "none" }} />
                  </label>
                  <label style={{ flex: 1, minWidth: 0, padding: "0.75rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                    <ImageIcon size={16} /> Galeria
                    <input type="file" accept="image/*" onChange={e => setIncidentPhoto(e.target.files?.[0] || null)} style={{ display: "none" }} />
                  </label>
                </div>
                {incidentPhoto && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--color-success)", fontWeight: 600 }}>✓ Anexo: {incidentPhoto.name}</p>}
              </div>

              <button 
                onClick={(e) => {
                  e.preventDefault();
                  submitIncident();
                }} 
                disabled={incidentUploading || !incidentText}
                style={{
                  width: "100%", padding: "1rem", background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "white",
                  border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "1rem",
                  cursor: (incidentUploading || !incidentText) ? "not-allowed" : "pointer",
                  opacity: (incidentUploading || !incidentText) ? 0.6 : 1,
                  marginTop: "auto"
                }}
              >
                {incidentUploading ? "A ENVIAR..." : "ENVIAR OCORRÊNCIA"}
              </button>
            </div>
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
                <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>A SUA POSIÇíO</p>
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

          <div style={{ flex: 1, minWidth: 0, padding: "0.5rem", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, minWidth: 0, borderRadius: "var(--radius-md)", overflow: "hidden", border: "2px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" }}>
              <MapViewer imageUrl={shiftPlanUrl} locators={[shiftLocator]} />
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><FileWarning size={18}/> O Meu Histórico</h3>
            <button onClick={() => setShowHistoryModal(false)} style={{ background: "none", border: "none", color: "var(--color-text-primary)", cursor: "pointer" }}><X size={20}/></button>
          </div>
          <div style={{ padding: "1rem", flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "3rem" }}>
            {allIncidents.length === 0 ? (
               <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>Ainda não reportou nenhuma ocorrência.</div>
            ) : (
               allIncidents.map(inc => (
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
      
      {activePanel === 'suspects' && !showNewSuspectModal && !selectedSuspect && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header with gradient */}
          <div style={{ background: "linear-gradient(135deg, #1e0a3c, #2d1060)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(168,85,247,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(168,85,247,0.25)", border: "1.5px solid rgba(168,85,247,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserX size={18} color="#d8b4fe" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#e9d5ff", fontSize: "1rem", fontWeight: 700 }}>Pessoas Suspeitas</h3>
                {activeSuspects.length > 0 && <p style={{ margin: 0, fontSize: "0.75rem", color: "#c084fc" }}>{activeSuspects.length} em acompanhamento</p>}
              </div>
            </div>
            <button onClick={() => setActivePanel(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18}/></button>
          </div>
          <div style={{ padding: "1rem", flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "3rem" }}>
            
              <div style={{ display: "flex", background: "var(--color-surface)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: "var(--radius-lg)", padding: "0.25rem", marginBottom: "1rem" }}>
                <button 
                  onClick={() => setSuspectTab("ativos")}
                  style={{ flex: 1, padding: "0.6rem", background: suspectTab === "ativos" ? "rgba(168,85,247,0.15)" : "transparent", color: suspectTab === "ativos" ? "#a855f7" : "var(--color-text-secondary)", border: "none", borderRadius: "var(--radius-md)", fontWeight: suspectTab === "ativos" ? 600 : 500, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
                >
                  Ativos ({activeSuspects.length})
                </button>
                <button 
                  onClick={() => setSuspectTab("arquivados")}
                  style={{ flex: 1, padding: "0.6rem", background: suspectTab === "arquivados" ? "rgba(168,85,247,0.15)" : "transparent", color: suspectTab === "arquivados" ? "#a855f7" : "var(--color-text-secondary)", border: "none", borderRadius: "var(--radius-md)", fontWeight: suspectTab === "arquivados" ? 600 : 500, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
                >
                  Histórico ({archivedSuspects.length})
                </button>
              </div>

              {suspectTab === "ativos" && (
            <button 
              onClick={() => {
                setSuspectLocal(activeShiftLocation?.local || activeWorkplace?.name || activeShift?.locatorName || (pendingShifts[0]?.locatorName) || "");
                setSuspectSublocal(activeShiftLocation?.sublocal || "");
                setSuspectSubsublocal(activeShiftLocation?.subsublocal || "");
                setShowNewSuspectModal(true);
              }}
              style={{ padding: "1rem 1.25rem", background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.95rem", boxShadow: "0 4px 16px rgba(168,85,247,0.4)" }}>
              <Crosshair size={20} /> DETETADO SUSPEITO
            </button>
              )}
              {(suspectTab === "ativos" ? activeSuspects : archivedSuspects).length === 0 ? (
               <div style={{ textAlign: "center", padding: "3rem 2rem", color: "var(--color-text-secondary)" }}>
                 <UserX size={40} style={{ opacity: 0.3, margin: "0 auto 1rem", display: "block" }} />
                 <p style={{ margin: 0 }}>Nenhum suspeito ativo no momento.</p>
               </div>
            ) : (
               (suspectTab === "ativos" ? activeSuspects : archivedSuspects).map(sus => (
                 <div key={sus.id} onClick={() => setSelectedSuspect(sus)} style={{ flexShrink: 0, background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid rgba(168,85,247,0.2)", cursor: "pointer", overflow: "hidden" }}>
                   <div style={{ display: "flex", gap: "0.75rem", padding: "0.9rem 1rem", alignItems: "flex-start" }}>
                     {sus.photoUrl ? (
                       <img src={sus.photoUrl} alt="Suspeito" style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
                     ) : (
                       <div style={{ width: "56px", height: "56px", background: "rgba(168,85,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-sm)", color: "#a855f7", flexShrink: 0 }}>
                         <UserX size={24} />
                       </div>
                     )}
                     <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                       <p style={{ margin: "0 0 0.3rem 0", fontSize: "0.95rem", fontWeight: 600, lineHeight: 1.4 }}>{sus.description}</p>
                       <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                         <span>📍 {sus.initialLocation}</span>
                         <span>{new Date(sus.createdAt).toLocaleTimeString("pt-PT", {hour: "2-digit", minute:"2-digit"})}</span>
                       </div>
                       <span style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)" }}>Por {sus.vigiaName}</span>
                     </div>
                     <div style={{ color: "#a855f7", flexShrink: 0, paddingTop: "0.2rem", fontSize: "1.2rem" }}>›</div>
                   </div>
                   {sus.direction && (
                     <div style={{ background: "rgba(168,85,247,0.05)", padding: "0.4rem 1rem", borderTop: "1px solid rgba(168,85,247,0.1)", fontSize: "0.75rem", color: "#c084fc" }}>
                       🧭 Direção: {sus.direction}
                     </div>
                   )}
                 </div>
               ))
            )}
          </div>
        </div>
      )}

      {showNewSuspectModal && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 10001, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "var(--color-surface)", width: "100%", display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
            {/* Purple gradient header */}
            <div style={{ background: "linear-gradient(135deg, #1e0a3c, #2d1060)", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(168,85,247,0.3)", border: "1.5px solid rgba(168,85,247,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Crosshair size={18} color="#d8b4fe" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#e9d5ff", fontSize: "1rem", fontWeight: 700 }}>Novo Suspeito Detetado</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#c084fc" }}>Alerta imediato para todos os vigias</p>
                </div>
              </div>
              <button onClick={() => setShowNewSuspectModal(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSuspect} style={{ padding: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: "#a855f7", marginBottom: "0.4rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>Descrição Física / Roupa *</label>
                <textarea required rows={3} value={suspectDesc} onChange={(e) => setSuspectDesc(e.target.value)} placeholder="Ex: Homem, t-shirt azul, chapéu preto, altura média..." className="input" style={{ resize: "none", borderColor: suspectDesc ? "rgba(168,85,247,0.5)" : undefined }}></textarea>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Local</label>
                  <input type="text" value={suspectLocal} onChange={(e) => setSuspectLocal(e.target.value)} placeholder="Ex: Recinto Principal" className="input" />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Sub Local (Opcional)</label>
                  <input type="text" value={suspectSublocal} onChange={(e) => setSuspectSublocal(e.target.value)} placeholder="Ex: Porta Sul" className="input" />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Sub Sub Local (Opcional)</label>
                  <input type="text" value={suspectSubsublocal} onChange={(e) => setSuspectSubsublocal(e.target.value)} placeholder="Ex: Catraca 3" className="input" />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Direção (Opcional)</label>
                  <input type="text" value={suspectDirection} onChange={(e) => setSuspectDirection(e.target.value)} placeholder="Ex: Palco principal, saída norte..." className="input" />
                </div>
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Fotografia (Opcional)</label>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => setSuspectPhoto(e.target.files?.[0] || null)} id="suspectPhotoInput" style={{ display: "none" }} />
                <label htmlFor="suspectPhotoInput" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", background: suspectPhoto ? "rgba(168,85,247,0.1)" : "var(--color-bg)", border: suspectPhoto ? "1px solid #a855f7" : "1px dashed var(--color-border)", borderRadius: "var(--radius-md)", color: suspectPhoto ? "#a855f7" : "var(--color-text-secondary)", cursor: "pointer", justifyContent: "center", fontWeight: 600 }}>
                  {suspectPhoto ? "✓ Fotografia Pronta" : "Tirar Foto / Escolher da Galeria"}
                </label>
              </div>
              <button type="submit" disabled={suspectUploading || !suspectDesc} style={{ background: suspectUploading || !suspectDesc ? "rgba(168,85,247,0.3)" : "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", padding: "0.9rem", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "1rem", cursor: (suspectUploading || !suspectDesc) ? "not-allowed" : "pointer", boxShadow: (suspectUploading || !suspectDesc) ? "none" : "0 4px 16px rgba(168,85,247,0.4)", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <Crosshair size={20} />
                {suspectUploading ? "A Enviar..." : "LANÇAR ALERTA"}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedSuspect && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9002, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #1e0a3c, #2d1060)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(168,85,247,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(168,85,247,0.25)", border: "1.5px solid rgba(168,85,247,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserX size={18} color="#d8b4fe" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#e9d5ff", fontSize: "1rem", fontWeight: 700 }}>Alerta Suspeito</h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#c084fc" }}>Reportado por {selectedSuspect.vigiaName}</p>
              </div>
            </div>
            <button onClick={() => setSelectedSuspect(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18}/></button>
          </div>
          <div style={{ padding: "1.25rem", overflowY: "auto", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ background: "rgba(168,85,247,0.05)", padding: "1rem", borderRadius: "var(--radius-lg)", border: "1px solid rgba(168,85,247,0.2)" }}>
                {selectedSuspect.photoUrl && (
                  <img src={selectedSuspect.photoUrl} alt="Suspeito" style={{ width: "100%", maxHeight: "300px", objectFit: "cover", borderRadius: "var(--radius-md)", marginBottom: "1rem" }} />
                )}
                <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {selectedSuspect.description}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px dashed rgba(168,85,247,0.3)", fontSize: "0.85rem" }}>
                  <div><strong style={{ color: "#a855f7" }}>Visto em:</strong><br/>{selectedSuspect.initialLocation} 
                          {(selectedSuspect?.planImageUrl) && (
                            <button 
                              onClick={() => setMapModalData({ planImageUrl: selectedSuspect.planImageUrl, pinX: selectedSuspect.pinX, pinY: selectedSuspect.pinY, title: "Localização" })} 
                              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginTop: "0.75rem", fontSize: "0.8rem", color: "#a855f7", textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              <MapPin size={14} /> Ver na Planta
                            </button>
                          )}
</div>
                  <div><strong style={{ color: "#a855f7" }}>Direção:</strong><br/>{selectedSuspect.direction || "Desconhecida"}</div>
                  <div><strong style={{ color: "#a855f7" }}>Reportado por:</strong><br/>{selectedSuspect.vigiaName}</div>
                  <div><strong style={{ color: "#a855f7" }}>Hora:</strong><br/>{new Date(selectedSuspect.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
              </div>

              {selectedSuspect.updates && selectedSuspect.updates.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 1rem 0", color: "var(--color-text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Histórico de Atualizações</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "relative" }}>
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: "15px", width: "2px", background: "rgba(168,85,247,0.2)", zIndex: 0 }}></div>
                    {selectedSuspect.updates.map((upd: any, idx: number) => (
                      <div key={idx} style={{ display: "flex", gap: "1rem", position: "relative", zIndex: 1 }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-surface)", border: "2px solid #a855f7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#a855f7" }}>
                          {upd.type === 'resolvido' ? <CheckCircle2 size={16} /> : upd.type === 'falso_alarme' ? <X size={16} /> : <AlertTriangle size={16} />}
                        </div>
                        <div style={{ background: "var(--color-bg)", padding: "0.85rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", flex: 1, minWidth: 0}}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                            <div>
                              <strong style={{ fontSize: "0.85rem", color: "var(--color-text-primary)", display: "block" }}>{upd.vigiaName}</strong>
                              <span style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)" }}>{new Date(upd.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <span style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-full)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" }}>
                              {upd.type.replace('_', ' ')}
                            </span>
                          </div>
                          {upd.photoUrl && (
                            <img src={upd.photoUrl} alt="Atualização" style={{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "var(--radius-sm)", marginBottom: "0.5rem" }} />
                          )}
                          {upd.message && <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{upd.message}</p>}
                          <div style={{ marginTop: "0.5rem" }}>
                            
                          {(selectedSuspect?.planImageUrl) && (
                            <button 
                              onClick={() => setMapModalData({ planImageUrl: selectedSuspect.planImageUrl, pinX: selectedSuspect.pinX, pinY: selectedSuspect.pinY, title: "Localização" })} 
                              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginTop: "0.75rem", fontSize: "0.8rem", color: "#a855f7", textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              <MapPin size={14} /> Ver na Planta
                            </button>
                          )}

                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            
            {selectedSuspect.status === "active" && (
            <form onSubmit={handleAddSuspectUpdate} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-lg)", border: "1px solid rgba(168,85,247,0.2)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>

              <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.04em" }}>Adicionar Atualização</h4>
              <select value={updateType} onChange={(e) => setUpdateType(e.target.value)} className="input">
                <option value="avistamento">Visto a passar / Novo Local</option>
                <option value="abordagem">Abordado / Identificado</option>
                <option value="falso_alarme">Falso Alarme (Fechar ocorrência)</option>
                <option value="resolvido">A pessoa foi embora (Fechar)</option>
              </select>
              <textarea rows={2} value={updateMessage} onChange={(e) => setUpdateMessage(e.target.value)} placeholder={updateType === 'resolvido' || updateType === 'falso_alarme' ? "Descreva o desfecho (Obrigatório)" : "Detalhes adicionais (Opcional)"} className="input" style={{ resize: "none" }}></textarea>
              
              <input type="file" accept="image/*" capture="environment" onChange={(e) => setUpdatePhoto(e.target.files?.[0] || null)} id="updatePhotoInput" style={{ display: "none" }} />
              <label htmlFor="updatePhotoInput" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem", background: updatePhoto ? "rgba(168,85,247,0.1)" : "var(--color-bg)", border: updatePhoto ? "1px solid #a855f7" : "1px dashed var(--color-border)", borderRadius: "var(--radius-md)", color: updatePhoto ? "#a855f7" : "var(--color-text-secondary)", cursor: "pointer", justifyContent: "center", fontSize: "0.85rem", fontWeight: 600 }}>
                <Camera size={16} />
                {updatePhoto ? "✓ Foto Pronta" : "Tirar Foto (Opcional)"}
              </label>

              
              <button type="submit" disabled={updateUploading || (!updateMessage && (updateType === 'resolvido' || updateType === 'falso_alarme'))} style={{ background: updateUploading ? "rgba(168,85,247,0.3)" : "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", padding: "0.75rem", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: updateUploading ? "not-allowed" : "pointer", boxShadow: updateUploading ? "none" : "0 4px 12px rgba(168,85,247,0.35)" }}>
                {updateUploading ? "A enviar..." : "ENVIAR ATUALIZAÇÃO"}
              </button>
            </form>
            )}

          </div>
        </div>
      )}

      
      {activePanel === 'info' && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #1e0a3c, #102a43)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(56,189,248,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(56,189,248,0.25)", border: "1.5px solid rgba(56,189,248,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Info size={18} color="#bae6fd" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#e0f2fe", fontSize: "1rem", fontWeight: 700 }}>Informações Úteis</h3>
              </div>
            </div>
            <button onClick={() => setActivePanel(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18}/></button>
          </div>
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto" }}>
            <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "3rem" }}>
            
            {activeWorkplace && (
              <div style={{ 
                 background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.2)", 
                 borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "0.5rem",
                 display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem"
              }}>
                 <div>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--color-text-tertiary)", marginBottom: "0.25rem" }}>
                       O Seu Local Atual
                    </div>
                    <div style={{ fontSize: "0.95rem", color: "var(--color-text-primary)", fontWeight: 600 }}>
                       {activeWorkplace.name} <span style={{ color: "var(--color-text-tertiary)", margin: "0 0.5rem" }}>|</span> Capitão: {captainName || "..."}
                    </div>
                 </div>
                 <button 
                    onClick={async () => {
                      const msg = prompt("Que mensagem deseja enviar à equipa?");
                      if (!msg) return;

                      setIsSendingNotify(true);
                      try {
                        const vigiaIdsToNotify = Array.from(userIds);
                        let successCount = 0;
                        for (const targetVigiaId of vigiaIdsToNotify) {
                           const res = await fetch("/api/send-notification", {
                             method: "POST",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({
                               vigiaId: targetVigiaId,
                               title: `Mensagem do Capitão (${activeWorkplace.name})`,
                               message: msg
                             })
                           });
                           if (res.ok) {
                             const data = await res.json();
                             if (!data.error && data.code !== "NO_FCM_TOKEN") {
                               successCount++;
                             }
                           }
                        }
                        alert(`Notificação enviada com sucesso a ${successCount} vigia(s).`);
                      } catch (err) {
                        console.error(err);
                        alert("Erro ao contactar servidor.");
                      } finally {
                        setIsSendingNotify(false);
                      }
                    }}
                    disabled={isSendingNotify || userIds.size === 0}
                    style={{
                       background: "var(--color-surface)", border: "1px solid var(--color-border)",
                       padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", fontSize: "0.8rem",
                       color: "#38bdf8", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem",
                       cursor: (isSendingNotify || userIds.size === 0) ? "not-allowed" : "pointer",
                       opacity: (isSendingNotify || userIds.size === 0) ? 0.6 : 1
                    }}
                 >
                    <Bell size={14} />
                    {isSendingNotify ? "A enviar..." : "Notificar Equipa"}
                 </button>
              </div>
            )}

            {Object.keys(groupedInfoItems).length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--color-text-secondary)", marginTop: "2rem" }}>Nenhuma informação publicada.</p>
            ) : (
              sortedInfoTopics.map(([topic, topicItems]) => (
                <div key={topic} style={{ flexShrink: 0, background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                  <button 
                    onClick={() => setExpandedInfoTopics(prev => ({ ...prev, [topic]: !prev[topic] }))}
                    style={{ width: "100%", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", color: "var(--color-primary)", fontWeight: 600, fontSize: "1rem" }}
                  >
                    {topic}
                    {expandedInfoTopics[topic] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {expandedInfoTopics[topic] && (
                    <div style={{ padding: "0 1rem 1rem 1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {(topicItems as any[]).map((item: any) => (
                        <div key={item.id} style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)" }}>
                          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.05rem", color: "var(--color-text-primary)" }}>{item.title}</h4>
                          <div className="quill-content-preview" style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }} dangerouslySetInnerHTML={{ __html: item.content }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            </div>
          </div>
        </div>
      )}

<style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(16,185,129,0.2); }
          50% { box-shadow: 0 0 0 6px rgba(16,185,129,0.05); }
        }
        @keyframes suspectPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(168,85,247,0.15); }
          50% { box-shadow: 0 0 0 8px rgba(168,85,247,0.0); }
        }
      `}</style>

    {/* BOTTOM NAVIGATION BAR — flex sibling of scrollable content */}
    
        {activePanel === 'zello' && !showGlobalAlertModal && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #3b0764, #c2410c)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(249,115,22,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(249,115,22,0.25)", border: "1.5px solid rgba(249,115,22,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Radio size={18} color="#fdba74" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#ffedd5", fontSize: "1rem", fontWeight: 700 }}>Comunicações</h3>
                  </div>
              </div>
              <button onClick={() => setActivePanel(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18}/></button>
            </div>
            
            <div style={{ padding: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
              <button 
              onClick={() => setShowGlobalAlertModal(true)}
              style={{ width: "100%", padding: "1.2rem", background: "linear-gradient(135deg, #4285F4, #1A73E8)", color: "white", border: "none", borderRadius: "var(--radius-lg)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontSize: "1rem", boxShadow: "0 4px 16px rgba(66, 133, 244, 0.4)" }}
            >
              <Bell size={24} /> NOTIFICAR TODOS
            </button>

              
            {globalNotifications.length > 0 && (
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <h4 style={{ margin: "0", color: "var(--color-text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Histórico de Notificações</h4>
                <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", paddingRight: "0.5rem" }}>
                  {globalNotifications.map((notif: any) => {
                    const isRead = notif.readBy?.includes(user?.uid);
                    return (
                      <div 
                        key={notif.id}
                        onClick={() => markGlobalNotificationAsRead(notif)}
                        style={{ 
                          padding: "1rem", 
                          background: isRead ? "var(--color-surface)" : "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(234,88,12,0.05))",
                          border: isRead ? "1px solid var(--color-border)" : "1px solid rgba(249,115,22,0.3)",
                          borderRadius: "var(--radius-md)",
                          cursor: "pointer"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: isRead ? "var(--color-text-primary)" : "#f97316" }}>{notif.senderName}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isRead ? <CheckCheck size={14} color="#3b82f6" /> : <Check size={14} />}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>{notif.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ height: "1px", background: "var(--color-border)", margin: "0.5rem 0" }} />
              <h4 style={{ margin: "0 0 0.5rem", color: "var(--color-text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Canais Zello</h4>

              {activeWorkplace?.zelloChannelLink ? (
                <a href={activeWorkplace.zelloChannelLink} style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: "var(--radius-lg)", fontWeight: 700, color: "var(--color-text-primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1rem" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316" }}><Radio size={20} /></div>
                  Rádio Vigias
                </a>
              ) : (
                <div style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.75rem", opacity: 0.5 }}>
                   <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Radio size={20} /></div>
                   Canal Vigias não configurado
                </div>
              )}

              {(activeWorkplace as any)?.zelloGroupLink ? (
                <a href={(activeWorkplace as any).zelloGroupLink} style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "var(--radius-lg)", fontWeight: 700, color: "var(--color-text-primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1rem" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7" }}><Radio size={20} /></div>
                  Rádio Capitães/Coord.
                </a>
              ) : (
                <div style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.75rem", opacity: 0.5 }}>
                   <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Radio size={20} /></div>
                   Canal Capitães não configurado
                </div>
              )}
            </div>
          </div>
        )}

        {showGlobalAlertModal && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 10001, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #1e0a3c, #5b1030)", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bell size={18} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#ffffff", fontSize: "1rem", fontWeight: 700 }}>Notificar Todos</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#fca5a5" }}>Alerta Geral para Equipas</p>
                </div>
              </div>
              <button onClick={() => setShowGlobalAlertModal(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>Mensagem de Alerta</label>
                <textarea 
                  className="input" 
                  rows={5} 
                  value={globalAlertText} 
                  onChange={e => setGlobalAlertText(e.target.value)}
                  placeholder="Escreva a mensagem que todos os vigias vão receber no telemóvel..."
                  style={{ resize: "vertical" }}
                />
              </div>
              <button 
                onClick={sendGlobalAlert} 
                disabled={sendingGlobalAlert || !globalAlertText}
                style={{
                  width: "100%", padding: "1rem", background: "var(--color-danger)", color: "white",
                  border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "1rem",
                  cursor: (sendingGlobalAlert || !globalAlertText) ? "not-allowed" : "pointer",
                  opacity: (sendingGlobalAlert || !globalAlertText) ? 0.6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
                }}
              >
                {sendingGlobalAlert ? "A ENVIAR..." : "ENVIAR ALERTA"}
              </button>
            </div>
          </div>
        )}

      <div className="vigia-app-bottom-bar" style={{ zIndex: 20000 }}>
        {/* Zello */}
        <button
          onClick={() => setActivePanel(activePanel === "zello" ? null : "zello")}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto"
          }}
        >
          <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "rgba(249, 115, 22, 0.15)", border: "1.5px solid rgba(249,115,22,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316" }}>
            <Radio size={20} fill="currentColor" />
          </div>
          <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#f97316" }}>Comunicações</span>
        </button>

        {/* Suspects */}
        <button
          onClick={() => { stopAlertBeeps(); setActivePanel(activePanel === "suspects" ? null : "suspects"); }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto"
          }}
        >
          <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: activeSuspects.length > 0 ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.08)", border: activeSuspects.length > 0 ? "1.5px solid rgba(168,85,247,0.7)" : "1.5px solid rgba(168,85,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7", position: "relative", animation: activeSuspects.length > 0 ? "suspectPulse 3s ease-in-out infinite" : "none" }}>
            <UserX size={20} />
            {activeSuspects.length > 0 && (
              <span style={{ position: "absolute", top: "-3px", right: "-3px", background: "#a855f7", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "0.6rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeSuspects.length}</span>
            )}
          </div>
          <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#a855f7" }}>Suspeito</span>
        </button>

        {/* Incidents */}
        <button
          onClick={() => { stopAlertBeeps(); setActivePanel(activePanel === "incidents" ? null : "incidents"); }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto"
          }}
        >
          <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "linear-gradient(135deg, #dc2626, #ef4444)", boxShadow: "0 3px 12px rgba(239,68,68,0.45)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <FileWarning size={20} />
          </div>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#ef4444" }}>Ocorrência</span>
        </button>

        {/* Info */}
        <button
          onClick={() => setActivePanel(activePanel === "info" ? null : "info")}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto"
          }}
        >
          <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "var(--color-bg)", border: "1.5px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", position: "relative" }}>
            <Info size={20} />
          </div>
          <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Informação</span>
        </button>
      </div>

      {mapModalData && (
        <MapModal
          data={{
            title: mapModalData.title,
            planImageUrl: mapModalData.planImageUrl,
            pinX: mapModalData.pinX,
            pinY: mapModalData.pinY
          }}
          onClose={() => setMapModalData(null)}
        />
      )}
    
      {selectedPhoto && (
        <div onClick={() => setSelectedPhoto(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <img src={selectedPhoto} alt="Zoomed" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "var(--radius-md)" }} />
          <button onClick={() => setSelectedPhoto(null)} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✕</button>
        </div>
      )}
    </div>
  );
}
