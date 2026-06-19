"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { AlertTriangle, X, Image as ImageIcon, Users, CheckCircle2, Circle } from "lucide-react";

export default function EmergencyControl() {
  const { user } = useAuth();
  const { activeWorkplaceId } = useWorkplace();
  const [canActivate, setCanActivate] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // States
  const [globalEmergency, setGlobalEmergency] = useState(false);
  const [workplaceEmergency, setWorkplaceEmergency] = useState(false);
  const [globalAlertType, setGlobalAlertType] = useState<string>("evacuation");
  const [globalAlertAck, setGlobalAlertAck] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  // Missing Person Form
  const [missingDesc, setMissingDesc] = useState("");
  const [missingPhoto, setMissingPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"evacuation" | "missing">("evacuation");

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
      if (snap.exists()) {
        const data = snap.data();
        setGlobalEmergency(data.globalEmergency === true);
        setGlobalAlertType(data.globalAlertType || "evacuation");
        setGlobalAlertAck(data.globalAlertAck || []);
      }
    });

    let unsubUsers = () => {};
    if (user?.role === "superadmin") {
      unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
        setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    let unsubWorkplace = () => {};
    if (activeWorkplaceId) {
      unsubWorkplace = onSnapshot(doc(db, "workplaces", activeWorkplaceId), (snap) => {
        if (snap.exists()) setWorkplaceEmergency(snap.data().isEmergency === true);
      });
    }

    return () => {
      unsubGlobal();
      unsubWorkplace();
      unsubUsers();
    };
  }, [activeWorkplaceId, user]);

  const toggleGlobal = async () => {
    if (user?.role !== "superadmin") return;
    if (!confirm(globalEmergency ? "Desativar Alerta Global?" : "Tem a certeza que deseja ATIVAR O ALERTA GLOBAL? Isto afetará TODOS os eventos!")) return;
    try {
      if (globalEmergency) {
        // Deactivate
        await setDoc(doc(db, "settings", "global"), { globalEmergency: false }, { merge: true });
      } else {
        // Activate Evacuation
        await setDoc(doc(db, "settings", "global"), { 
          globalEmergency: true, 
          globalAlertType: "evacuation",
          globalAlertAck: [user.uid] 
        }, { merge: true });
      }
    } catch (err) {
      console.error(err);
      alert("Erro.");
    }
  };

  const triggerMissingPerson = async () => {
    if (user?.role !== "superadmin") return;
    if (!missingDesc) return alert("Adicione uma descrição.");
    if (!confirm("Ativar alerta de PESSOA DESAPARECIDA em todos os eventos?")) return;
    
    setUploading(true);
    try {
      let photoUrl = "";
      if (missingPhoto) {
        const storage = getStorage();
        const fileRef = ref(storage, `alerts/missing_${Date.now()}`);
        await uploadBytes(fileRef, missingPhoto);
        photoUrl = await getDownloadURL(fileRef);
      }
      
      await setDoc(doc(db, "settings", "global"), { 
        globalEmergency: true, 
        globalAlertType: "missing_person",
        globalAlertDetails: { description: missingDesc, photoUrl },
        globalAlertAck: [user.uid]
      }, { merge: true });
      
      setMissingDesc("");
      setMissingPhoto(null);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao disparar alerta.");
    } finally {
      setUploading(false);
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
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-border)", background: globalEmergency && globalAlertType === "missing_person" ? "#eab308" : "var(--color-danger)", color: "white" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertTriangle size={20} />
                Painel de Alertas
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "white" }}>
                <X size={20} />
              </button>
            </div>

            {/* Tabs for Super Admin */}
            {user?.role === "superadmin" && !globalEmergency && (
              <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)" }}>
                <button onClick={() => setActiveTab("evacuation")} style={{ flex: 1, padding: "1rem", background: activeTab === "evacuation" ? "var(--color-bg)" : "var(--color-surface)", border: "none", borderBottom: activeTab === "evacuation" ? "2px solid var(--color-danger)" : "2px solid transparent", fontWeight: 600, cursor: "pointer" }}>Evacuação</button>
                <button onClick={() => setActiveTab("missing")} style={{ flex: 1, padding: "1rem", background: activeTab === "missing" ? "var(--color-bg)" : "var(--color-surface)", border: "none", borderBottom: activeTab === "missing" ? "2px solid #eab308" : "2px solid transparent", fontWeight: 600, cursor: "pointer" }}>Pessoa Desaparecida</button>
              </div>
            )}

            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {globalEmergency && user?.role === "superadmin" && (
                 <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "1rem", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                    <h3 style={{ margin: 0, marginBottom: "0.5rem", color: "var(--color-danger)" }}>ALERTA GLOBAL ATIVO</h3>
                    <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
                      Tipo: <strong>{globalAlertType === "missing_person" ? "Pessoa Desaparecida" : "Evacuação"}</strong>
                    </p>

                    <div style={{ textAlign: "left", marginBottom: "1.5rem", background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                      <h4 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "0.875rem" }}>Recibos de Leitura ({globalAlertAck.length}/{allUsers.length})</h4>
                      <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {allUsers.map(u => {
                          const ack = globalAlertAck.includes(u.id);
                          return (
                            <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem", background: ack ? "rgba(16, 185, 129, 0.1)" : "rgba(255,255,255,0.05)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem" }}>
                              <span style={{ fontWeight: 500 }}>{u.name}</span>
                              <span style={{ color: ack ? "#10b981" : "var(--color-text-tertiary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                {ack ? <><CheckCircle2 size={14}/> Viu</> : <><Circle size={14}/> Pendente</>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button onClick={toggleGlobal} className="btn btn-danger" style={{ width: "100%" }}>DESATIVAR ALERTA GLOBAL</button>
                 </div>
              )}

              {!globalEmergency && user?.role === "superadmin" && activeTab === "evacuation" && (
                <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
                  <h3 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem", color: "var(--color-text-primary)" }}>Emergência Global</h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
                    Ativa o alerta de evacuação em <strong>todos os workplaces e utilizadores</strong> em simultâneo.
                  </p>
                  <button 
                    onClick={toggleGlobal}
                    style={{ 
                      width: "100%", padding: "0.75rem", 
                      background: "var(--color-danger)", 
                      color: "white",
                      border: "none",
                      borderRadius: "var(--radius-md)", fontWeight: "bold", cursor: "pointer"
                    }}
                  >
                    ATIVAR EMERGÊNCIA GLOBAL
                  </button>
                </div>
              )}

              {!globalEmergency && user?.role === "superadmin" && activeTab === "missing" && (
                <div style={{ background: "rgba(234, 179, 8, 0.05)", border: "1px solid rgba(234, 179, 8, 0.2)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
                  <h3 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}><Users size={16}/> Pessoa Desaparecida</h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
                    Dispara um alerta sonoro e visual para todos os dispositivos com foto e descrição.
                  </p>
                  
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.3rem", fontWeight: 600 }}>Descrição (Roupa, Idade, Nome)</label>
                    <textarea className="input" rows={3} value={missingDesc} onChange={e => setMissingDesc(e.target.value)} placeholder="Ex: Criança, 5 anos, t-shirt azul, calções vermelhos, responde por 'João'..." style={{ resize: "none" }}></textarea>
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.3rem", fontWeight: 600 }}>Fotografia (Opcional, mas recomendado)</label>
                    <input type="file" accept="image/*" onChange={e => setMissingPhoto(e.target.files?.[0] || null)} className="input" style={{ padding: "0.5rem" }} />
                  </div>

                  <button 
                    onClick={triggerMissingPerson}
                    disabled={uploading || !missingDesc}
                    style={{ 
                      width: "100%", padding: "0.75rem", 
                      background: uploading || !missingDesc ? "var(--color-text-tertiary)" : "#eab308", 
                      color: "white", border: "none",
                      borderRadius: "var(--radius-md)", fontWeight: "bold", cursor: uploading || !missingDesc ? "not-allowed" : "pointer"
                    }}
                  >
                    {uploading ? "A DISPARAR ALERTA..." : "DISPARAR ALERTA DE DESAPARECIDO"}
                  </button>
                </div>
              )}

              {activeWorkplaceId && !globalEmergency && (
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
