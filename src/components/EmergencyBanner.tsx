"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, collection, query, where, addDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, CheckCircle2, ShieldAlert, X, Camera, Bell, Image as ImageIcon, Eye, UserX } from "lucide-react";

export default function EmergencyBanner() {
  const { user } = useAuth();
  const { activeWorkplaceId, hasActiveShift } = useWorkplace();

  // Global State
  const [globalEmergency, setGlobalEmergency] = useState(false);
  const [globalAlertType, setGlobalAlertType] = useState("evacuation");
  const [globalAlertDetails, setGlobalAlertDetails] = useState<any>(null);
  const [globalAlertAck, setGlobalAlertAck] = useState<string[]>([]);
  const [globalEvacAck, setGlobalEvacAck] = useState<string[]>([]);

  // Local Emergencies (Any workplace)
  const [localEmergencies, setLocalEmergencies] = useState<any[]>([]);

  // Incident Modal State
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentMsg, setIncidentMsg] = useState("");
  const [incidentPhoto, setIncidentPhoto] = useState<File | null>(null);
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // Missing Persons from history
  const [activeMissingPersons, setActiveMissingPersons] = useState<any[]>([]);
  const [showMissingDetails, setShowMissingDetails] = useState<any | null>(null);

  // Active Suspects (for Captains/Admins)
  const [activeSuspects, setActiveSuspects] = useState<any[]>([]);
  const [showSuspectDetails, setShowSuspectDetails] = useState<any | null>(null);
  const [dismissedSuspects, setDismissedSuspects] = useState<string[]>([]);

  useEffect(() => {
    const d = localStorage.getItem("dismissedSuspects");
    if (d) setDismissedSuspects(JSON.parse(d));
  }, []);

  // Listen to Active Missing Persons
  useEffect(() => {
    const q = query(
      collection(db, "emergency_history"), 
      where("status", "==", "active"),
      where("alertType", "==", "missing_person")
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs: any[] = [];
      snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
      setActiveMissingPersons(msgs);
    });
    return () => unsub();
  }, []);

  // Listen to Active Suspects
  useEffect(() => {
    if (user?.role === "vigia") return; // Vigias already have their own suspect UI in VigiaDashboard
    const q = query(
      collection(db, "suspicious_persons"), 
      where("status", "==", "active")
    );
    const unsub = onSnapshot(q, (snap) => {
      const sus: any[] = [];
      snap.forEach(d => sus.push({ id: d.id, ...d.data() }));
      setActiveSuspects(sus);
    });
    return () => unsub();
  }, [user]);

  // Listen to Global Emergency
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGlobalEmergency(data.globalEmergency === true);
        setGlobalAlertType(data.globalAlertType || "evacuation");
        setGlobalAlertDetails(data.globalAlertDetails || null);
        setGlobalAlertAck(data.globalAlertAck || []);
        setGlobalEvacAck(data.globalEvacAck || []);
      } else {
        setGlobalEmergency(false);
      }
    });
    return () => unsub();
  }, []);

  // Listen to ALL Local Emergencies (efficient query)
  useEffect(() => {
    const q = query(collection(db, "workplaces"), where("isEmergency", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      const ems: any[] = [];
      snap.forEach(d => ems.push({ id: d.id, ...d.data() }));
      setLocalEmergencies(ems);
    });
    return () => unsub();
  }, []);

  if (!user) return null;

  // Determine if there is a blocking emergency for THIS user
  const myLocalEmergency = localEmergencies.find(e => e.id === activeWorkplaceId);
  const otherLocalEmergencies = localEmergencies.filter(e => e.id !== activeWorkplaceId);

  const isEvacuation = (globalEmergency && globalAlertType === "evacuation") || !!myLocalEmergency;
  const unackedMissing = activeMissingPersons.filter(m => !(m.alertAck || []).includes(user.uid));
  const ackedMissing = activeMissingPersons.filter(m => (m.alertAck || []).includes(user.uid));
  const currentMissing = unackedMissing[0];

  let needsToAcknowledge = false;
  let hasEvacuated = false;
  let activeEmergencyId = "";
  let isMissingPersonBlock = false;
  let missingPersonData: any = null;

  if (hasActiveShift) {
    if (isEvacuation && globalEmergency && globalAlertType === "evacuation" && !globalAlertAck.includes(user.uid)) {
      needsToAcknowledge = true;
      hasEvacuated = globalEvacAck.includes(user.uid);
      activeEmergencyId = "global";
    } else if (isEvacuation && myLocalEmergency && !(myLocalEmergency.alertAck || []).includes(user.uid)) {
      needsToAcknowledge = true;
      hasEvacuated = (myLocalEmergency.evacAck || []).includes(user.uid);
      activeEmergencyId = myLocalEmergency.id;
    } else if (currentMissing) {
      needsToAcknowledge = true;
      isMissingPersonBlock = true;
      missingPersonData = currentMissing;
      activeEmergencyId = currentMissing.id;
    } else if (isEvacuation) {
      hasEvacuated = globalEmergency ? globalEvacAck.includes(user.uid) : (myLocalEmergency?.evacAck || []).includes(user.uid);
      activeEmergencyId = globalEmergency ? "global" : myLocalEmergency?.id || "";
    }
  }

  const isBlockingEmergency = hasActiveShift && needsToAcknowledge;
  const visibleSuspects = activeSuspects.filter(s => !dismissedSuspects.includes(s.id));
  const hasActiveBanners = hasActiveShift && !needsToAcknowledge && (isEvacuation || ackedMissing.length > 0 || visibleSuspects.length > 0);
  const hasNonBlockingNotifications = !hasActiveShift && (globalEmergency || localEmergencies.length > 0 || activeMissingPersons.length > 0 || visibleSuspects.length > 0);

  if (!isBlockingEmergency && !hasActiveBanners && !hasNonBlockingNotifications && !showMissingDetails && !showIncidentModal && !showSuspectDetails && visibleSuspects.length === 0) return null;

  const handleAcknowledge = async () => {
    try {
      if (isMissingPersonBlock && missingPersonData) {
        await setDoc(doc(db, "emergency_history", missingPersonData.id), { alertAck: [...(missingPersonData.alertAck || []), user.uid] }, { merge: true });
      } else if (globalEmergency && globalAlertType === "evacuation") {
        await setDoc(doc(db, "settings", "global"), { globalAlertAck: [...globalAlertAck, user.uid] }, { merge: true });
      } else if (myLocalEmergency && activeWorkplaceId) {
        await setDoc(doc(db, "workplaces", activeWorkplaceId), { alertAck: [...(myLocalEmergency.alertAck || []), user.uid] }, { merge: true });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEvacuated = async () => {
    try {
      if (globalEmergency) {
        await setDoc(doc(db, "settings", "global"), { globalEvacAck: [...globalEvacAck, user.uid] }, { merge: true });
      } else if (myLocalEmergency && activeWorkplaceId) {
        await setDoc(doc(db, "workplaces", activeWorkplaceId), { evacAck: [...(myLocalEmergency.evacAck || []), user.uid] }, { merge: true });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitIncident = async () => {
    if (!incidentMsg) return alert("Adicione uma descrição");
    setSubmittingIncident(true);
    try {
      let photoUrl = "";
      if (incidentPhoto) {
        const storage = getStorage();
        const fileRef = ref(storage, `incidents/${Date.now()}_${incidentPhoto.name}`);
        await uploadBytes(fileRef, incidentPhoto);
        photoUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "incidents"), {
        vigiaId: user.uid,
        vigiaName: user.name || "Vigia",
        shiftId: "emergency_report", // or actual shiftId if we had it, but emergency implies right now
        workplaceId: activeWorkplaceId || "Sem Local",
        locatorName: activeWorkplaceId || "Desconhecido", // the captain will see this
        message: incidentMsg,
        photoUrl,
        status: "open",
        isEmergencyIncident: true,
        emergencyContext: activeEmergencyId,
        createdAt: new Date().toISOString()
      });

      setShowIncidentModal(false);
      setIncidentMsg("");
      setIncidentPhoto(null);
      alert("Ocorrência registada com sucesso!");
    } catch (error) {
      console.error("Error submitting incident:", error);
      alert("Erro ao reportar ocorrência.");
    } finally {
      setSubmittingIncident(false);
    }
  };

  // 1. NON-BLOCKING NOTIFICATIONS (Toast style at the top)
  if (hasNonBlockingNotifications) {
    return (
      <div style={{ position: "fixed", top: 10, left: 10, right: 10, zIndex: 9999, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {localEmergencies.map(em => (
          <div key={em.id} style={{ background: "rgba(239, 68, 68, 0.95)", backdropFilter: "blur(10px)", color: "white", padding: "1rem", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: "1rem", animation: "slideDown 0.3s ease-out" }}>
            <div style={{ background: "white", color: "#ef4444", borderRadius: "50%", padding: "0.5rem" }}>
              <Bell size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>⚠️ EMERGÊNCIA NO LOCAL</div>
              <div style={{ fontSize: "1rem" }}>{em.name}</div>
              {user.role === "vigia" && em.id === activeWorkplaceId && !hasActiveShift && (
                <div style={{ fontSize: "0.8rem", marginTop: "0.25rem", opacity: 0.9 }}>Recebeu esta notificação porque não tem um turno ativo neste local.</div>
              )}
            </div>
          </div>
        ))}
        {user.role !== "vigia" && visibleSuspects.length > 0 && !hasActiveShift && (
           <div style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", padding: "1rem", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", animation: "slideDown 0.3s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", padding: "0.5rem" }}>
                <UserX size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", textTransform: "uppercase" }}>SUSPEITO ATIVO</div>
                <div style={{ fontSize: "1rem" }}>{visibleSuspects.length} em acompanhamento</div>
              </div>
            </div>
            <button onClick={(e) => {
              e.stopPropagation();
              const idsToDismiss = visibleSuspects.map(s => s.id);
              const newDismissed = [...new Set([...dismissedSuspects, ...idsToDismiss])];
              setDismissedSuspects(newDismissed);
              localStorage.setItem("dismissedSuspects", JSON.stringify(newDismissed));
            }} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", padding: "0.5rem" }}>
              <X size={20} />
            </button>
           </div>
        )}
      </div>
    );
  }

  // 2. FULL SCREEN BLOCK (Unacknowledged)
  if (isBlockingEmergency && needsToAcknowledge) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(15, 23, 42, 0.85)", 
        backdropFilter: "blur(8px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        zIndex: 10000, padding: "1.5rem", textAlign: "center"
      }}>
        
        <div style={{
          background: "var(--color-surface)",
          color: "var(--color-text-primary)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          maxWidth: "450px",
          width: "100%",
          overflow: "hidden",
          animation: "scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        }}>
          
          <div style={{ 
            background: isMissingPersonBlock ? "#eab308" : "#dc2626", 
            padding: "2.5rem 2rem", display: "flex", flexDirection: "column", alignItems: "center",
            color: "white" 
          }}>
            <ShieldAlert size={56} style={{ marginBottom: "1rem", animation: "pulse 2s infinite" }} />
            <h1 style={{ fontSize: "1.75rem", fontWeight: 900, textTransform: "uppercase", margin: 0, letterSpacing: "0.05em", lineHeight: 1.1 }}>
              {isMissingPersonBlock ? "PESSOA DESAPARECIDA" : (globalEmergency && globalAlertType === "evacuation") ? "EVACUAÇÃO GERAL" : "EVACUAÇÃO DE ZONA"}
            </h1>
          </div>

          <div style={{ padding: "2rem" }}>
            {isMissingPersonBlock && missingPersonData && (
              <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-lg)", width: "100%", marginBottom: "1.5rem" }}>
                {missingPersonData.photoUrl && (
                   <img src={missingPersonData.photoUrl} alt="Desaparecido" style={{ width: "100%", maxHeight: "250px", objectFit: "contain", borderRadius: "var(--radius-md)", marginBottom: "1rem", background: "white" }} />
                )}
                <p style={{ fontSize: "1rem", fontWeight: 500, margin: 0, textAlign: "left", whiteSpace: "pre-wrap", color: "var(--color-text-primary)" }}>
                  {missingPersonData.description}
                </p>
              </div>
            )}

            {!isMissingPersonBlock && (
              <p style={{ fontSize: "1.1rem", fontWeight: 500, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: "2rem" }}>
                Por favor, proceda de imediato de acordo com o protocolo de segurança definido.
              </p>
            )}

            <button 
              onClick={handleAcknowledge}
              style={{ 
                padding: "1rem 2rem", fontSize: "1.15rem", fontWeight: 700,
                background: isMissingPersonBlock ? "#ca8a04" : "#dc2626", color: "white", border: "none", borderRadius: "var(--radius-xl)",
                cursor: "pointer", width: "100%", transition: "transform 0.2s",
                boxShadow: isMissingPersonBlock ? "0 4px 14px 0 rgba(202, 138, 4, 0.39)" : "0 4px 14px 0 rgba(220, 38, 38, 0.39)"
              }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.02)"}
              onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
            >
              CONFIRMAR RECEÇÃO
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. ACKNOWLEDGED BANNERS (Sticks to top)
  
  return (
    <>
      {isEvacuation && !needsToAcknowledge && (
        <div style={{
          width: "100%", background: "#ef4444", color: "white", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", zIndex: 9990, position: "relative", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 800, fontSize: "1rem" }}>
              <AlertTriangle size={20} style={{ animation: "pulse 2s infinite" }} />
              <span>{(globalEmergency && globalAlertType === "evacuation") ? "ALERTA GLOBAL: EVACUAÇÃO EM CURSO" : "ALERTA LOCAL: EVACUAÇÃO EM CURSO"}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {(user?.role === "vigia" || user?.role === "captain") && (
              <>
                {!hasEvacuated ? (
                  <button onClick={handleEvacuated} style={{ background: "white", color: "#ef4444", border: "none", padding: "0.6rem 1.25rem", borderRadius: "var(--radius-full)", fontWeight: 800, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CheckCircle2 size={16} /> CONFIRMAR ZONA EVACUADA
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.2)", padding: "0.6rem 1.25rem", borderRadius: "var(--radius-full)", fontSize: "0.85rem", fontWeight: 600 }}>
                    <CheckCircle2 size={16} /> ZONA EVACUADA
                  </div>
                )}
              </>
            )}
            <button onClick={() => setShowIncidentModal(true)} style={{ background: "rgba(0,0,0,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", padding: "0.6rem 1.25rem", borderRadius: "var(--radius-full)", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Camera size={16} /> REGISTAR OCORRÊNCIA
            </button>
          </div>
        </div>
      )}

      {ackedMissing.length > 0 && !isMissingPersonBlock && (
        <div style={{
          width: "100%", background: "#eab308", color: "#000", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", zIndex: 9989, position: "relative", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 800, fontSize: "1rem" }}>
              <AlertTriangle size={20} style={{ animation: "pulse 2s infinite" }} />
              <span>BUSCA ATIVA: PESSOA DESAPARECIDA ({ackedMissing.length})</span>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button onClick={() => setShowMissingDetails(ackedMissing.length === 1 ? ackedMissing[0] : "list")} style={{ background: "white", color: "#ca8a04", border: "none", padding: "0.6rem 1.25rem", borderRadius: "var(--radius-full)", fontWeight: 800, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Eye size={16} /> VER DETALHES
            </button>
            <button onClick={() => setShowIncidentModal(true)} style={{ background: "rgba(0,0,0,0.1)", color: "#000", border: "1px solid rgba(0,0,0,0.2)", padding: "0.6rem 1.25rem", borderRadius: "var(--radius-full)", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Camera size={16} /> REGISTAR OCORRÊNCIA
            </button>
          </div>
        </div>
      )}

      {/* Suspect Banner for Captains/Admins (non-blocking) */}
      {visibleSuspects.length > 0 && user?.role !== "vigia" && (
        <div style={{
          width: "100%", background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", zIndex: 9988, position: "relative", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 800, fontSize: "1rem" }}>
              <UserX size={20} style={{ animation: "pulse 2s infinite" }} />
              <span>SUSPEITO ATIVO ({visibleSuspects.length})</span>
            </div>
            <button onClick={(e) => {
              e.stopPropagation();
              const idsToDismiss = visibleSuspects.map(s => s.id);
              const newDismissed = [...new Set([...dismissedSuspects, ...idsToDismiss])];
              setDismissedSuspects(newDismissed);
              localStorage.setItem("dismissedSuspects", JSON.stringify(newDismissed));
            }} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}>
              <X size={24} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button onClick={() => setShowSuspectDetails(visibleSuspects.length === 1 ? visibleSuspects[0] : "list")} style={{ background: "white", color: "#9333ea", border: "none", padding: "0.6rem 1.25rem", borderRadius: "var(--radius-full)", fontWeight: 800, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Eye size={16} /> VER DETALHES
            </button>
          </div>
        </div>
      )}

      {/* Incident Modal Overlay */}
      {showIncidentModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "500px", padding: "2rem", position: "relative" }}>
            <button onClick={() => setShowIncidentModal(false)} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}>
              <X size={24} />
            </button>
            <h2 style={{ margin: "0 0 1.5rem 0", color: "var(--color-danger)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={24} /> Reportar Incidente
            </h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              Registe informações vitais (ex: feridos, suspeito avistado). Esta ocorrência será imediatamente destacada no painel de comando.
            </p>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Descrição</label>
              <textarea 
                className="input" 
                rows={3} 
                value={incidentMsg} 
                onChange={e => setIncidentMsg(e.target.value)}
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
              disabled={submittingIncident || !incidentMsg}
              style={{
                width: "100%", padding: "1rem", background: "var(--color-danger)", color: "white",
                border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "1rem",
                cursor: (submittingIncident || !incidentMsg) ? "not-allowed" : "pointer",
                opacity: (submittingIncident || !incidentMsg) ? 0.6 : 1
              }}
            >
              {submittingIncident ? "A SUBMETER..." : "ENVIAR OCORRÊNCIA"}
            </button>
          </div>
        </div>
      )}

      {/* Missing Details Modal Overlay */}
      {showMissingDetails && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "500px", padding: "2rem", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowMissingDetails(null)} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}>
              <X size={24} />
            </button>
            <h2 style={{ margin: "0 0 1.5rem 0", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={24} color="#eab308" /> Buscas Ativas
            </h2>
            
            {showMissingDetails === "list" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {ackedMissing.map(m => (
                  <div key={m.id} style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    {m.photoUrl && (
                      <img src={m.photoUrl} alt="Desaparecido" style={{ width: "100%", maxHeight: "200px", objectFit: "contain", borderRadius: "var(--radius-md)", marginBottom: "1rem", background: "white" }} />
                    )}
                    <p style={{ margin: 0, fontSize: "0.95rem", whiteSpace: "pre-wrap", color: "var(--color-text-primary)" }}>{m.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                {showMissingDetails.photoUrl && (
                  <img src={showMissingDetails.photoUrl} alt="Desaparecido" style={{ width: "100%", maxHeight: "250px", objectFit: "contain", borderRadius: "var(--radius-md)", marginBottom: "1rem", background: "white" }} />
                )}
                <p style={{ margin: 0, fontSize: "1rem", whiteSpace: "pre-wrap", color: "var(--color-text-primary)" }}>{showMissingDetails.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suspect Details Modal Overlay */}
      {showSuspectDetails && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "500px", padding: "2rem", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowSuspectDetails(null)} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}>
              <X size={24} />
            </button>
            <h2 style={{ margin: "0 0 1.5rem 0", color: "#a855f7", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <UserX size={24} /> Suspeitos Ativos
            </h2>
            
            {showSuspectDetails === "list" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {activeSuspects.map(m => (
                  <div key={m.id} style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(168,85,247,0.3)" }}>
                    {m.photoUrl && (
                      <img src={m.photoUrl} alt="Suspeito" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "var(--radius-md)", marginBottom: "1rem" }} />
                    )}
                    <p style={{ margin: 0, fontSize: "0.95rem", whiteSpace: "pre-wrap", color: "var(--color-text-primary)", fontWeight: 500 }}>{m.description}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "1rem", fontSize: "0.85rem" }}>
                      <div><strong style={{ color: "var(--color-text-secondary)" }}>Visto em:</strong><br/>{m.initialLocation} <a href={`https://maps.google.com/?q=${m.lat && m.lng ? `${m.lat},${m.lng}` : encodeURIComponent('Porto ' + m.initialLocation)}`} target="_blank" rel="noreferrer" style={{ color: "#a855f7", textDecoration: "underline", marginLeft: "4px" }}>(Ver no Mapa)</a></div>
                      <div><strong style={{ color: "var(--color-text-secondary)" }}>Direção:</strong><br/>{m.direction || "Desconhecida"}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(168,85,247,0.3)" }}>
                {showSuspectDetails.photoUrl && (
                  <img src={showSuspectDetails.photoUrl} alt="Suspeito" style={{ width: "100%", maxHeight: "250px", objectFit: "cover", borderRadius: "var(--radius-md)", marginBottom: "1rem" }} />
                )}
                <p style={{ margin: 0, fontSize: "1rem", whiteSpace: "pre-wrap", color: "var(--color-text-primary)", fontWeight: 500 }}>{showSuspectDetails.description}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "1rem", fontSize: "0.85rem" }}>
                  <div><strong style={{ color: "var(--color-text-secondary)" }}>Visto em:</strong><br/>{showSuspectDetails.initialLocation} {showSuspectDetails.lat && showSuspectDetails.lng && <a href={`https://maps.google.com/?q=${showSuspectDetails.lat},${showSuspectDetails.lng}`} target="_blank" rel="noreferrer" style={{ color: "#a855f7", textDecoration: "underline", marginLeft: "4px" }}>(Ver no Mapa)</a>}</div>
                  <div><strong style={{ color: "var(--color-text-secondary)" }}>Direção:</strong><br/>{showSuspectDetails.direction || "Desconhecida"}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
