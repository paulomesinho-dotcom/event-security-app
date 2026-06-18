"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { AlertTriangle, X } from "lucide-react";

export default function EmergencyControl() {
  const { user } = useAuth();
  const { activeWorkplaceId } = useWorkplace();
  const [canActivate, setCanActivate] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // States
  const [globalEmergency, setGlobalEmergency] = useState(false);
  const [workplaceEmergency, setWorkplaceEmergency] = useState(false);

  // Check Permissions
  useEffect(() => {
    if (!user) return;
    if (user.role === "superadmin") {
      setCanActivate(true);
      return;
    }
    if (user.role === "captain") {
      // Listen to settings to see if captain can activate
      const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
        if (snap.exists()) {
          setCanActivate(snap.data().captainsCanActivateEmergency === true);
        }
      });
      return () => unsub();
    }
  }, [user]);

  // Listen to Emergency States
  useEffect(() => {
    const unsubGlobal = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) setGlobalEmergency(snap.data().globalEmergency === true);
    });

    let unsubWorkplace = () => {};
    if (activeWorkplaceId) {
      unsubWorkplace = onSnapshot(doc(db, "workplaces", activeWorkplaceId), (snap) => {
        if (snap.exists()) setWorkplaceEmergency(snap.data().isEmergency === true);
      });
    }

    return () => {
      unsubGlobal();
      unsubWorkplace();
    };
  }, [activeWorkplaceId]);

  const toggleGlobal = async () => {
    if (user?.role !== "superadmin") return;
    if (!confirm(globalEmergency ? "Desativar Emergência Global?" : "Tem a certeza que deseja ATIVAR A EMERGÊNCIA GLOBAL? Isto afetará TODOS os eventos!")) return;
    try {
      await setDoc(doc(db, "settings", "global"), { globalEmergency: !globalEmergency }, { merge: true });
    } catch (err) {
      console.error(err);
      alert("Erro.");
    }
  };

  const toggleWorkplace = async () => {
    if (!activeWorkplaceId) return;
    if (!confirm(workplaceEmergency ? "Desativar Emergência do Local?" : "Tem a certeza que deseja ATIVAR A EMERGÊNCIA neste local?")) return;
    try {
      await setDoc(doc(db, "workplaces", activeWorkplaceId), { isEmergency: !workplaceEmergency }, { merge: true });
    } catch (err) {
      console.error(err);
      alert("Erro.");
    }
  };

  if (!canActivate) return null;

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        style={{ 
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "40px", height: "40px", borderRadius: "50%",
          background: globalEmergency || workplaceEmergency ? "var(--color-danger)" : "rgba(239, 68, 68, 0.1)",
          color: globalEmergency || workplaceEmergency ? "white" : "var(--color-danger)",
          border: "none", cursor: "pointer",
          animation: globalEmergency || workplaceEmergency ? "pulse 1.5s infinite" : "none"
        }}
        title="Painel de Emergência"
      >
        <AlertTriangle size={20} />
      </button>

      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "450px", overflow: "hidden", boxShadow: "var(--shadow-xl)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-border)", background: "var(--color-danger)", color: "white" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertTriangle size={20} />
                Controlo de Emergência
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "white" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {user?.role === "superadmin" && (
                <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
                  <h3 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem", color: "var(--color-text-primary)" }}>Emergência Global</h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
                    Ativa o alerta de evacuação em <strong>todos os workplaces e utilizadores</strong> em simultâneo.
                  </p>
                  <button 
                    onClick={toggleGlobal}
                    style={{ 
                      width: "100%", padding: "0.75rem", 
                      background: globalEmergency ? "transparent" : "var(--color-danger)", 
                      color: globalEmergency ? "var(--color-danger)" : "white",
                      border: globalEmergency ? "2px solid var(--color-danger)" : "none",
                      borderRadius: "var(--radius-md)", fontWeight: "bold", cursor: "pointer"
                    }}
                  >
                    {globalEmergency ? "Desativar Emergência Global" : "ATIVAR EMERGÊNCIA GLOBAL"}
                  </button>
                </div>
              )}

              {activeWorkplaceId && (
                <div style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
                  <h3 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem", color: "var(--color-text-primary)" }}>Emergência no Workplace Atual</h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
                    Ativa o alerta de evacuação apenas no Workplace selecionado.
                  </p>
                  <button 
                    onClick={toggleWorkplace}
                    style={{ 
                      width: "100%", padding: "0.75rem", 
                      background: workplaceEmergency ? "transparent" : "#f59e0b", 
                      color: workplaceEmergency ? "#f59e0b" : "white",
                      border: workplaceEmergency ? "2px solid #f59e0b" : "none",
                      borderRadius: "var(--radius-md)", fontWeight: "bold", cursor: "pointer"
                    }}
                  >
                    {workplaceEmergency ? "Desativar Emergência Local" : "ATIVAR EMERGÊNCIA LOCAL"}
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
