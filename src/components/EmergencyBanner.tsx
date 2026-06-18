"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";

export default function EmergencyBanner() {
  const { user } = useAuth();
  const { activeWorkplaceId } = useWorkplace();
  const [globalEmergency, setGlobalEmergency] = useState(false);
  const [globalAlertType, setGlobalAlertType] = useState("evacuation");
  const [globalAlertDetails, setGlobalAlertDetails] = useState<any>(null);
  const [globalAlertAck, setGlobalAlertAck] = useState<string[]>([]);
  const [workplaceEmergency, setWorkplaceEmergency] = useState(false);

  // Listen to Global Emergency
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGlobalEmergency(data.globalEmergency === true);
        setGlobalAlertType(data.globalAlertType || "evacuation");
        setGlobalAlertDetails(data.globalAlertDetails || null);
        setGlobalAlertAck(data.globalAlertAck || []);
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
        setWorkplaceEmergency(snap.data().isEmergency === true);
      } else {
        setWorkplaceEmergency(false);
      }
    });
    return () => unsub();
  }, [activeWorkplaceId]);

  const isEmergency = globalEmergency || workplaceEmergency;

  if (!isEmergency) return null;

  const isMissingPerson = globalEmergency && globalAlertType === "missing_person";
  const bgColor = isMissingPerson ? "var(--color-warning)" : "var(--color-danger)";
  const hasAcknowledged = user && globalAlertAck.includes(user.uid);

  const handleAcknowledge = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "settings", "global");
      const newAck = [...globalAlertAck, user.uid];
      await setDoc(docRef, { globalAlertAck: newAck }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // Full Screen overlay for Global Alerts
  if (globalEmergency) {
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
          {isMissingPerson ? "PESSOA DESAPARECIDA" : "ALERTA GLOBAL - EVACUAÇÃO"}
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

        {/* Read Receipt Button */}
        {!hasAcknowledged && (
          <button 
            onClick={handleAcknowledge}
            style={{ 
              marginTop: "3rem", padding: "1.5rem 3rem", fontSize: "1.5rem", fontWeight: 900,
              background: "white", color: bgColor, border: "none", borderRadius: "var(--radius-full)",
              cursor: "pointer", boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
            }}
          >
            CONFIRMAR RECEÇÃO DO ALERTA
          </button>
        )}
        
        {hasAcknowledged && (
          <div style={{ marginTop: "3rem", padding: "1rem 2rem", fontSize: "1.2rem", fontWeight: 700, background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-full)" }}>
            ✓ Receção Confirmada
          </div>
        )}
      </div>
    );
  }

  // Small banner for workplace emergency (only visible inside the workplace)
  return (
    <div style={{
      width: "100%",
      background: "var(--color-danger)",
      color: "white",
      padding: "0.75rem 1rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "1rem",
      fontWeight: "bold",
      fontSize: "1.1rem",
      animation: "pulseRed 1.5s infinite",
      zIndex: 9990,
      position: "relative",
    }}>
      <style>{`
        @keyframes pulseRed {
          0% { background-color: #ef4444; }
          50% { background-color: #991b1b; }
          100% { background-color: #ef4444; }
        }
      `}</style>
      <AlertTriangle size={24} />
      <span>⚠️ MODO DE EMERGÊNCIA ATIVADO - EVACUAR O LOCAL IMEDIATAMENTE ⚠️</span>
      <AlertTriangle size={24} />
    </div>
  );
}
