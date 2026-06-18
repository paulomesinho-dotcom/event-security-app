"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { AlertTriangle } from "lucide-react";

export default function EmergencyBanner() {
  const { activeWorkplaceId } = useWorkplace();
  const [globalEmergency, setGlobalEmergency] = useState(false);
  const [workplaceEmergency, setWorkplaceEmergency] = useState(false);

  // Listen to Global Emergency
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        setGlobalEmergency(snap.data().globalEmergency === true);
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
      zIndex: 9999,
      position: "relative",
      boxShadow: "0 4px 6px -1px rgba(239, 68, 68, 0.5)"
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
