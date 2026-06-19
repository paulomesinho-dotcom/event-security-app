"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function EmergencyBanner() {
  const { user } = useAuth();
  const { activeWorkplaceId } = useWorkplace();

  // Global State
  const [globalEmergency, setGlobalEmergency] = useState(false);
  const [globalAlertType, setGlobalAlertType] = useState("evacuation");
  const [globalAlertDetails, setGlobalAlertDetails] = useState<any>(null);
  const [globalAlertAck, setGlobalAlertAck] = useState<string[]>([]);
  const [globalEvacAck, setGlobalEvacAck] = useState<string[]>([]);

  // Workplace State
  const [workplaceEmergency, setWorkplaceEmergency] = useState(false);
  const [workplaceAlertAck, setWorkplaceAlertAck] = useState<string[]>([]);
  const [workplaceEvacAck, setWorkplaceEvacAck] = useState<string[]>([]);

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

  // Listen to Workplace Emergency
  useEffect(() => {
    if (!activeWorkplaceId) {
      setWorkplaceEmergency(false);
      return;
    }
    const unsub = onSnapshot(doc(db, "workplaces", activeWorkplaceId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWorkplaceEmergency(data.isEmergency === true);
        setWorkplaceAlertAck(data.alertAck || []);
        setWorkplaceEvacAck(data.evacAck || []);
      } else {
        setWorkplaceEmergency(false);
      }
    });
    return () => unsub();
  }, [activeWorkplaceId]);

  const isEmergency = globalEmergency || workplaceEmergency;

  if (!isEmergency) return null;

  const isMissingPerson = globalEmergency && globalAlertType === "missing_person";
  const isEvacuation = globalEmergency ? globalAlertType === "evacuation" : workplaceEmergency;
  const bgColor = isMissingPerson ? "var(--color-warning)" : "var(--color-danger)";

  const hasAcknowledgedGlobal = user && globalAlertAck.includes(user.uid);
  const hasAcknowledgedLocal = user && workplaceAlertAck.includes(user.uid);
  const hasEvacuatedGlobal = user && globalEvacAck.includes(user.uid);
  const hasEvacuatedLocal = user && workplaceEvacAck.includes(user.uid);

  let needsToAcknowledge = false;
  let hasEvacuated = false;

  if (globalEmergency) {
    needsToAcknowledge = !hasAcknowledgedGlobal;
    hasEvacuated = !!hasEvacuatedGlobal;
  } else if (workplaceEmergency) {
    needsToAcknowledge = !hasAcknowledgedLocal;
    hasEvacuated = !!hasEvacuatedLocal;
  }

  const handleAcknowledge = async () => {
    if (!user) return;
    try {
      if (globalEmergency) {
        const docRef = doc(db, "settings", "global");
        await setDoc(docRef, { globalAlertAck: [...globalAlertAck, user.uid] }, { merge: true });
      } else if (workplaceEmergency && activeWorkplaceId) {
        const docRef = doc(db, "workplaces", activeWorkplaceId);
        await setDoc(docRef, { alertAck: [...workplaceAlertAck, user.uid] }, { merge: true });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEvacuated = async () => {
    if (!user) return;
    try {
      if (globalEmergency) {
        const docRef = doc(db, "settings", "global");
        await setDoc(docRef, { globalEvacAck: [...globalEvacAck, user.uid] }, { merge: true });
      } else if (workplaceEmergency && activeWorkplaceId) {
        const docRef = doc(db, "workplaces", activeWorkplaceId);
        await setDoc(docRef, { evacAck: [...workplaceEvacAck, user.uid] }, { merge: true });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Full Screen overlay for Alerts (Unacknowledged)
  if (needsToAcknowledge) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: bgColor, color: isMissingPerson ? "#000" : "white",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        zIndex: 10000, padding: "2rem", textAlign: "center",
        animation: "pulseBackground 1.5s infinite"
      }}>
        <style>{`
          @keyframes pulseBackground {
            0% { opacity: 1; }
            50% { opacity: 0.8; }
            100% { opacity: 1; }
          }
        `}</style>
        <AlertTriangle size={80} style={{ marginBottom: "1.5rem" }} />
        
        <h1 style={{ fontSize: "2.5rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem", letterSpacing: "0.1em" }}>
          {isMissingPerson ? "PESSOA DESAPARECIDA" : globalEmergency ? "ALERTA GLOBAL - EVACUAÇÃO" : "EMERGÊNCIA LOCAL - EVACUAÇÃO"}
        </h1>

        {isMissingPerson && globalAlertDetails && (
          <div style={{ background: "rgba(255,255,255,0.9)", padding: "1.5rem", borderRadius: "var(--radius-lg)", color: "#000", maxWidth: "600px", width: "100%", boxShadow: "var(--shadow-xl)" }}>
            {globalAlertDetails.photoUrl && (
               <img src={globalAlertDetails.photoUrl} alt="Desaparecido" style={{ width: "100%", maxHeight: "400px", objectFit: "contain", borderRadius: "var(--radius-md)", marginBottom: "1rem" }} />
            )}
            <p style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0, textAlign: "left", whiteSpace: "pre-wrap" }}>
              {globalAlertDetails.description}
            </p>
          </div>
        )}

        {!isMissingPerson && (
          <p style={{ fontSize: "1.5rem", fontWeight: 600, maxWidth: "600px", margin: "0 auto" }}>
            PROCEDA COM CAUTELA E SIGA O PROTOCOLO DE EMERGÊNCIA
          </p>
        )}

        <button 
          onClick={handleAcknowledge}
          style={{ 
            marginTop: "3rem", padding: "1.5rem 3rem", fontSize: "1.5rem", fontWeight: 900,
            background: "white", color: bgColor, border: "none", borderRadius: "var(--radius-full)",
            cursor: "pointer", boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}
        >
          CONFIRMAR RECEÇÃO
        </button>
      </div>
    );
  }

  // Small banner for acknowledged emergencies
  return (
    <div style={{
      width: "100%",
      background: bgColor,
      color: isMissingPerson ? "#000" : "white",
      padding: "0.75rem 1rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.75rem",
      fontWeight: "bold",
      fontSize: "1rem",
      animation: isMissingPerson ? "pulseWarning 1.5s infinite" : "pulseRed 1.5s infinite",
      zIndex: 9990,
      position: "relative",
    }}>
      <style>{`
        @keyframes pulseRed {
          0% { background-color: #ef4444; }
          50% { background-color: #991b1b; }
          100% { background-color: #ef4444; }
        }
        @keyframes pulseWarning {
          0% { background-color: #eab308; }
          50% { background-color: #a16207; }
          100% { background-color: #eab308; }
        }
      `}</style>
      
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <AlertTriangle size={20} />
        <span style={{ textAlign: "center" }}>
          {globalEmergency 
            ? (isMissingPerson ? "⚠️ ALERTA DE PESSOA DESAPARECIDA (Receção Confirmada) ⚠️" : "⚠️ ALERTA GLOBAL ATIVO (Receção Confirmada) ⚠️")
            : "⚠️ MODO DE EMERGÊNCIA LOCAL ATIVADO (Receção Confirmada) ⚠️"}
        </span>
        <AlertTriangle size={20} />
      </div>

      {isEvacuation && user && (user.role === "vigia" || user.role === "captain") && (
        <div style={{ marginTop: "0.25rem" }}>
          {!hasEvacuated ? (
            <button 
              onClick={handleEvacuated}
              style={{
                background: "white", color: bgColor, border: "none", padding: "0.5rem 1.5rem",
                borderRadius: "var(--radius-full)", fontWeight: 800, cursor: "pointer",
                boxShadow: "0 4px 10px rgba(0,0,0,0.2)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem"
              }}
            >
              <CheckCircle2 size={18} />
              CONFIRMAR LOCAL EVACUADO
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.2)", padding: "0.4rem 1rem", borderRadius: "var(--radius-full)", fontSize: "0.85rem" }}>
              <CheckCircle2 size={16} /> Local Evacuado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
