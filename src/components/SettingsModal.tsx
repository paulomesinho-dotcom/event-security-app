"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Settings, X } from "lucide-react";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [captainsCanActivate, setCaptainsCanActivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCaptainsCanActivate(docSnap.data().captainsCanActivateEmergency || false);
        }
      } catch (err) {
        console.error("Erro ao carregar configurações", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "global"), {
        captainsCanActivateEmergency: captainsCanActivate
      }, { merge: true });
      onClose();
    } catch (err) {
      console.error("Erro ao guardar", err);
      alert("Erro ao guardar configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "450px", overflow: "hidden", boxShadow: "var(--shadow-xl)" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-border)" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Settings size={20} color="var(--color-primary)" />
            Configurações Globais
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.5rem" }}>
          {loading ? (
            <p>A carregar...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Modo de Emergência</h3>
              
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={captainsCanActivate}
                  onChange={(e) => setCaptainsCanActivate(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--color-primary)" }}
                />
                <span style={{ fontSize: "0.95rem" }}>
                  Permitir que os Capitães ativem o Modo de Emergência nos seus locais.
                </span>
              </label>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", margin: 0, marginTop: "-0.5rem", paddingLeft: "1.9rem" }}>
                Se desativado, apenas os Super Admins poderão ativar o estado de emergência para evacuação.
              </p>
            </div>
          )}
        </div>

        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="btn btn-primary" disabled={loading || saving}>
            {saving ? "A Guardar..." : "Guardar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
