
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { AlertTriangle, CheckCircle2, Circle, Search, MapPin, Globe, Eye, Lock, ShieldAlert } from "lucide-react";

type TabType = "global_evac" | "local_evac" | "missing";

export default function EmergencyDashboard() {
  const { user } = useAuth();
  const { activeWorkplaceId, activeWorkplace } = useWorkplace();

  const [globalEmergency, setGlobalEmergency] = useState(false);
  const [globalAlertType, setGlobalAlertType] = useState<string>("evacuation");
  const [globalAlertAck, setGlobalAlertAck] = useState<string[]>([]);
  const [globalEvacAck, setGlobalEvacAck] = useState<string[]>([]);
  
  const [workplaceEmergency, setWorkplaceEmergency] = useState(false);
  const [workplaceAlertAck, setWorkplaceAlertAck] = useState<string[]>([]);
  const [workplaceEvacAck, setWorkplaceEvacAck] = useState<string[]>([]);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [workplaceUsers, setWorkplaceUsers] = useState<any[]>([]);
  const [activeShifts, setActiveShifts] = useState<string[]>([]);
  const [emergencyIncidents, setEmergencyIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);

  const [missingDesc, setMissingDesc] = useState("");
  const [missingPhoto, setMissingPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TabType>("local_evac");
  const [searchQuery, setSearchQuery] = useState("");

  const isSuperadmin = user?.role === "superadmin";
  const canActivate = isSuperadmin || user?.role === "captain";

  useEffect(() => {
    if (isSuperadmin) setActiveTab("global_evac");
  }, [isSuperadmin]);

  useEffect(() => {
    if (!user) return;

    const unsubGlobal = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGlobalEmergency(data.globalEmergency === true);
        setGlobalAlertType(data.globalAlertType || "evacuation");
        setGlobalAlertAck(data.globalAlertAck || []);
        setGlobalEvacAck(data.globalEvacAck || []);
      }
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllUsers(users);
      if (activeWorkplaceId) {
        setWorkplaceUsers(users.filter((u: any) => u.workplaceId === activeWorkplaceId || u.role === "captain"));
      }
    });

    const unsubShifts = onSnapshot(collection(db, "shifts"), (snap) => {
      // Filter active shifts
      const actives = snap.docs.filter(d => d.data().status === "active").map(d => d.data().vigiaId);
      setActiveShifts(actives);
    });

    const unsubIncidents = onSnapshot(collection(db, "incidents"), (snap) => {
      const incs = snap.docs
        .filter(d => d.data().isEmergencyIncident === true)
        .map(d => ({ id: d.id, ...d.data() }));
      setEmergencyIncidents(incs);
      
      // Play a sound if there's a new incident (simple logic, checking length or using audio API if supported)
      // Since it's hard to reliably play audio without interaction, we skip for now,
      // but we could use a simple Audio object if we kept track of previous length
    });

    let unsubWorkplace = () => {};
    if (activeWorkplaceId) {
      unsubWorkplace = onSnapshot(doc(db, "workplaces", activeWorkplaceId), (snap) => {
        if (snap.exists()) {
           const data = snap.data();
           setWorkplaceEmergency(data.isEmergency === true);
           setWorkplaceAlertAck(data.alertAck || []);
           setWorkplaceEvacAck(data.evacAck || []);
        }
      });
    }

    return () => {
      unsubGlobal();
      unsubUsers();
      unsubShifts();
      unsubIncidents();
      unsubWorkplace();
    };
  }, [user, activeWorkplaceId]);

  if (!canActivate) return <div style={{ padding: "2rem" }}>Acesso não autorizado.</div>;

  const toggleGlobal = async () => {
    if (!isSuperadmin) return;
    if (!confirm(globalEmergency ? "Desativar Alerta Global?" : "Tem a certeza que deseja ATIVAR O ALERTA GLOBAL? Isto afetará TODOS os eventos!")) return;
    try {
      if (globalEmergency) {
        await setDoc(doc(db, "settings", "global"), { globalEmergency: false }, { merge: true });
      } else {
        await setDoc(doc(db, "settings", "global"), { 
          globalEmergency: true, 
          globalAlertType: "evacuation",
          globalAlertAck: [user.uid],
          globalEvacAck: []
        }, { merge: true });
      }
    } catch (err) {
      console.error(err);
      alert("Erro.");
    }
  };

  const triggerMissingPerson = async () => {
    if (!isSuperadmin) return;
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
        globalAlertAck: [user.uid],
        globalEvacAck: []
      }, { merge: true });
      
      setMissingDesc("");
      setMissingPhoto(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao disparar alerta.");
    } finally {
      setUploading(false);
    }
  };

  const toggleWorkplace = async () => {
    if (!activeWorkplaceId) return;
    if (!confirm(workplaceEmergency ? "Desativar Emergência Local?" : "Tem a certeza que deseja ATIVAR A EMERGÊNCIA neste local?")) return;
    try {
       if (workplaceEmergency) {
         await setDoc(doc(db, "workplaces", activeWorkplaceId), { isEmergency: false }, { merge: true });
       } else {
         await setDoc(doc(db, "workplaces", activeWorkplaceId), { 
           isEmergency: true,
           alertAck: [user.uid],
           evacAck: []
         }, { merge: true });
       }
    } catch (err) {
      console.error(err);
      alert("Erro.");
    }
  };

  const renderUserTable = (usersToRender: any[], alertAck: string[], evacAck: string[], isEvacuation: boolean) => {
    // Apenas vigias em turno (Capitães e Superadmins sempre aparecem se as regras assim o definirem, mas aqui filtramos vigias sem turno)
    const onShiftUsers = usersToRender.filter(u => {
      if (u.role === "vigia" && !activeShifts.includes(u.id)) return false;
      return true;
    });

    const filtered = onShiftUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const ackCount = filtered.filter(u => alertAck.includes(u.id)).length;
    const evacCount = filtered.filter(u => evacAck.includes(u.id)).length;

    return (
      <div style={{ marginTop: "2rem", background: "var(--color-bg)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid var(--color-border)" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>Acompanhamento em Tempo Real</h3>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                {filtered.length} efetivos em turno
                <span style={{ margin: "0 0.5rem", color: "var(--color-border)" }}>|</span>
                <span style={{ color: "var(--color-success)" }}>{ackCount} Receções</span>
                {isEvacuation && (
                  <>
                    <span style={{ margin: "0 0.5rem", color: "var(--color-border)" }}>|</span>
                    <span style={{ color: "var(--color-success)" }}>{evacCount} Evacuações</span>
                  </>
                )}
              </p>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--color-surface)", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
               <Search size={16} color="var(--color-text-secondary)" />
               <input 
                 type="text" 
                 placeholder="Pesquisar efetivo..." 
                 value={searchQuery} 
                 onChange={(e) => setSearchQuery(e.target.value)}
                 style={{ background: "transparent", border: "none", outline: "none", color: "var(--color-text-primary)", fontSize: "0.9rem", width: "200px" }}
               />
            </div>
         </div>

         <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
               <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                     <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontWeight: 600, color: "var(--color-text-secondary)" }}>Nome & Função</th>
                     <th style={{ padding: "1rem 1.5rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)" }}>Receção do Alerta</th>
                     {isEvacuation && <th style={{ padding: "1rem 1.5rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)" }}>Local Evacuado</th>}
                     <th style={{ padding: "1rem 1.5rem", textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)" }}>Ocorrências</th>
                  </tr>
               </thead>
               <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isEvacuation ? 4 : 3} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                        Nenhum efetivo em turno encontrado.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(u => {
                      const received = alertAck.includes(u.id);
                      const evacuated = evacAck.includes(u.id);
                      // Determine if this user reported an emergency incident in this context
                      // For simplicity, we just check if they have ANY recent emergency incident
                      // Ideally we'd filter by time or specific emergency ID.
                      const userIncidents = emergencyIncidents.filter(inc => inc.vigiaId === u.id);

                      return (
                        <tr key={u.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                           <td style={{ padding: "1rem 1.5rem" }}>
                             <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                               <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "0.8rem", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
                                 {u.name.substring(0,2).toUpperCase()}
                               </div>
                               <div>
                                 <div style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{u.name}</div>
                                 <div style={{ fontSize: "0.75rem", textTransform: "capitalize", color: "var(--color-text-secondary)", marginTop: "0.15rem" }}>{u.role}</div>
                               </div>
                             </div>
                           </td>
                           <td style={{ padding: "1rem 1.5rem", textAlign: "center" }}>
                              {received 
                                ? <span style={{ color: "var(--color-success)", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 500, background: "rgba(34, 197, 94, 0.1)", padding: "0.25rem 0.75rem", borderRadius: "var(--radius-full)" }}><CheckCircle2 size={16}/> Recebido</span> 
                                : <span style={{ color: "var(--color-text-tertiary)", display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "rgba(255, 255, 255, 0.05)", padding: "0.25rem 0.75rem", borderRadius: "var(--radius-full)" }}><Circle size={16}/> Aguarda</span>}
                           </td>
                           {isEvacuation && (
                             <td style={{ padding: "1rem 1.5rem", textAlign: "center" }}>
                               {evacuated 
                                 ? <span style={{ color: "var(--color-success)", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 500, background: "rgba(34, 197, 94, 0.1)", padding: "0.25rem 0.75rem", borderRadius: "var(--radius-full)" }}><CheckCircle2 size={16}/> Evacuado</span> 
                                 : <span style={{ color: "var(--color-warning)", display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "rgba(234, 179, 8, 0.1)", padding: "0.25rem 0.75rem", borderRadius: "var(--radius-full)" }}><Circle size={16}/> Em curso</span>}
                             </td>
                           )}
                           <td style={{ padding: "1rem 1.5rem", textAlign: "center" }}>
                              {userIncidents.length > 0 ? (
                                <button 
                                  onClick={() => setSelectedIncident(userIncidents[userIncidents.length - 1])}
                                  style={{ background: "var(--color-danger)", color: "white", border: "none", borderRadius: "50%", width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: "pulse 2s infinite" }}
                                  title="Ver Ocorrência"
                                >
                                  <AlertTriangle size={16} />
                                </button>
                              ) : (
                                <span style={{ color: "var(--color-text-tertiary)" }}>-</span>
                              )}
                           </td>
                        </tr>
                      );
                    })
                  )}
               </tbody>
            </table>
         </div>
      </div>
    );
  };

  const TabButton = ({ id, icon: Icon, label, color, activeColor }: { id: TabType, icon: any, label: string, color: string, activeColor: string }) => {
    const isActive = activeTab === id;
    return (
      <button 
        onClick={() => setActiveTab(id)}
        style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "1rem 1.5rem",
          background: isActive ? `${activeColor}15` : "transparent",
          color: isActive ? activeColor : "var(--color-text-secondary)",
          border: "none",
          borderBottom: isActive ? `3px solid ${activeColor}` : "3px solid transparent",
          cursor: "pointer",
          fontWeight: isActive ? 600 : 500,
          fontSize: "1rem",
          transition: "all 0.2s ease"
        }}
      >
        <Icon size={18} />
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-surface)", borderRadius: "var(--radius-lg)" }}>
      
      <div style={{ borderBottom: "1px solid var(--color-border)", padding: "0 1rem" }}>
        <div style={{ display: "flex", gap: "1rem", overflowX: "auto" }}>
          {isSuperadmin && (
            <TabButton id="global_evac" icon={Globe} label="Evacuação Total" color="var(--color-text-secondary)" activeColor="var(--color-danger)" />
          )}
          <TabButton id="local_evac" icon={MapPin} label="Alerta de Zona" color="var(--color-text-secondary)" activeColor="#f97316" />
          {isSuperadmin && (
            <TabButton id="missing" icon={Eye} label="Pessoa Desaparecida" color="var(--color-text-secondary)" activeColor="#eab308" />
          )}
        </div>
      </div>

      <div style={{ padding: "2rem", flex: 1, overflowY: "auto" }}>
        
        {activeTab === "global_evac" && isSuperadmin && (
          <div className="animate-fade-in">
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
               <div style={{ maxWidth: "600px" }}>
                 <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "var(--color-text-primary)" }}>Protocolo de Evacuação Total</h2>
                 <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                   A ativação deste protocolo irá bloquear todos os terminais do sistema com um ecrã vermelho intransponível. Exigirá confirmação de receção e posterior confirmação de evacuação de todas as equipas no terreno.
                 </p>
               </div>

               {globalEmergency && globalAlertType === "evacuation" ? (
                 <button onClick={toggleGlobal} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "transparent", border: "2px solid var(--color-danger)", color: "var(--color-danger)", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>
                   DESATIVAR ALERTA GLOBAL
                 </button>
               ) : (
                 <button onClick={toggleGlobal} disabled={globalEmergency && globalAlertType !== "evacuation"} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "var(--color-danger)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: (globalEmergency && globalAlertType !== "evacuation") ? "not-allowed" : "pointer", fontSize: "0.95rem", opacity: (globalEmergency && globalAlertType !== "evacuation") ? 0.5 : 1 }}>
                   <ShieldAlert size={18} />
                   INICIAR EVACUAÇÃO TOTAL
                 </button>
               )}
             </div>

             {globalEmergency && globalAlertType === "evacuation" && (
               <div style={{ background: "rgba(239, 68, 68, 0.05)", borderLeft: "4px solid var(--color-danger)", padding: "1rem 1.5rem", borderRadius: "0 var(--radius-md) var(--radius-md) 0", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                 <div style={{ background: "var(--color-danger)", width: 12, height: 12, borderRadius: "50%", animation: "pulse 2s infinite" }} />
                 <span style={{ color: "var(--color-danger)", fontWeight: 600, letterSpacing: "0.05em" }}>EMERGÊNCIA GLOBAL EM CURSO</span>
               </div>
             )}

             {renderUserTable(allUsers, globalAlertAck, globalEvacAck, true)}
          </div>
        )}

        {activeTab === "local_evac" && (
          <div className="animate-fade-in">
             {!activeWorkplaceId ? (
                <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--color-bg)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)" }}>
                   <MapPin size={48} color="var(--color-text-tertiary)" style={{ margin: "0 auto 1rem auto" }} />
                   <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--color-text-secondary)" }}>Nenhum Local Selecionado</h3>
                   <p style={{ margin: 0, color: "var(--color-text-tertiary)", fontSize: "0.9rem" }}>Selecione um Workplace no topo para aceder ao respetivo painel de emergência.</p>
                </div>
             ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
                    <div style={{ maxWidth: "600px" }}>
                      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                         Evacuação: {activeWorkplace?.name}
                      </h2>
                      <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                        Este protocolo emite um alerta sonoro e visual apenas para os dispositivos dos seguranças alocados a este local.
                      </p>
                    </div>

                    {workplaceEmergency ? (
                      <button onClick={toggleWorkplace} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "transparent", border: "2px solid #f97316", color: "#f97316", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>
                        DESATIVAR ALERTA LOCAL
                      </button>
                    ) : (
                      <button onClick={toggleWorkplace} disabled={globalEmergency} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "#f97316", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: globalEmergency ? "not-allowed" : "pointer", fontSize: "0.95rem", opacity: globalEmergency ? 0.5 : 1 }}>
                        <MapPin size={18} />
                        INICIAR ALERTA DE ZONA
                      </button>
                    )}
                  </div>

                  {globalEmergency && (
                     <div style={{ background: "rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                        <Lock size={16} /> Ações locais desativadas enquanto houver uma Emergência Global em curso.
                     </div>
                  )}

                  {workplaceEmergency && (
                    <div style={{ background: "rgba(249, 115, 22, 0.05)", borderLeft: "4px solid #f97316", padding: "1rem 1.5rem", borderRadius: "0 var(--radius-md) var(--radius-md) 0", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ background: "#f97316", width: 12, height: 12, borderRadius: "50%", animation: "pulse 2s infinite" }} />
                      <span style={{ color: "#f97316", fontWeight: 600, letterSpacing: "0.05em" }}>ALERTA DE ZONA ATIVO</span>
                    </div>
                  )}

                  {renderUserTable(workplaceUsers, workplaceAlertAck, workplaceEvacAck, true)}
                </>
             )}
          </div>
        )}

        {activeTab === "missing" && isSuperadmin && (
          <div className="animate-fade-in">
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
               <div style={{ maxWidth: "600px" }}>
                 <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "var(--color-text-primary)" }}>Alerta de Pessoa Desaparecida</h2>
                 <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                   Dispara um alerta global para todas as equipas focarem a sua atenção na procura. Adicione o máximo de detalhes possível.
                 </p>
               </div>

               {globalEmergency && globalAlertType === "missing_person" && (
                 <button onClick={toggleGlobal} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "transparent", border: "2px solid #eab308", color: "#eab308", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>
                   DESATIVAR ALERTA DE BUSCA
                 </button>
               )}
             </div>

             {globalEmergency && globalAlertType === "missing_person" ? (
                <>
                  <div style={{ background: "rgba(234, 179, 8, 0.05)", borderLeft: "4px solid #eab308", padding: "1rem 1.5rem", borderRadius: "0 var(--radius-md) var(--radius-md) 0", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ background: "#eab308", width: 12, height: 12, borderRadius: "50%", animation: "pulse 2s infinite" }} />
                    <span style={{ color: "#eab308", fontWeight: 600, letterSpacing: "0.05em" }}>BUSCA ATIVA EM CURSO</span>
                  </div>
                  {renderUserTable(allUsers, globalAlertAck, globalEvacAck, false)}
                </>
             ) : (
                <div style={{ background: "var(--color-bg)", padding: "2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", maxWidth: "800px" }}>
                   <div style={{ marginBottom: "1.5rem" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-primary)" }}>Descrição Completa (Obrigatório)</label>
                      <textarea 
                        className="input" 
                        rows={4} 
                        value={missingDesc} 
                        onChange={e => setMissingDesc(e.target.value)} 
                        placeholder="Ex: Criança, aprox. 5 anos, t-shirt azul do porto, chora e procura pela mãe, visto pela última vez perto da Porta 3..."
                        style={{ width: "100%", padding: "1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)", resize: "vertical" }}
                      />
                   </div>

                   <div style={{ marginBottom: "2.5rem" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-primary)" }}>Fotografia de Referência (Opcional mas recomendado)</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e => setMissingPhoto(e.target.files?.[0] || null)} 
                        style={{ width: "100%", padding: "0.75rem", background: "var(--color-surface)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-secondary)" }} 
                      />
                   </div>

                   <div style={{ display: "flex", justifyContent: "flex-end" }}>
                     <button 
                        onClick={triggerMissingPerson} 
                        disabled={uploading || !missingDesc || (globalEmergency && globalAlertType !== "missing_person")} 
                        style={{ 
                          display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 2rem", 
                          background: (uploading || !missingDesc) ? "var(--color-bg)" : "#eab308", 
                          color: (uploading || !missingDesc) ? "var(--color-text-tertiary)" : "#000", 
                          border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: (uploading || !missingDesc) ? "not-allowed" : "pointer", fontSize: "1rem", transition: "all 0.2s" 
                        }}
                      >
                       <Eye size={20} />
                       {uploading ? "A DISPARAR..." : "DISPARAR ALERTA DE BUSCA"}
                     </button>
                   </div>
                </div>
             )}
          </div>
        )}
      </div>

      {/* Incident Modal */}
      {selectedIncident && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "600px", padding: "2rem", position: "relative" }}>
            <button onClick={() => setSelectedIncident(null)} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}>
               ✕
            </button>
            <h2 style={{ margin: "0 0 0.5rem 0", color: "var(--color-danger)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={24} /> Detalhes da Ocorrência
            </h2>
            <div style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem", display: "flex", gap: "1rem" }}>
               <span>Reportado por: <strong>{selectedIncident.vigiaName}</strong></span>
               <span>Local: <strong>{selectedIncident.locatorName}</strong></span>
            </div>

            <div style={{ background: "var(--color-bg)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", marginBottom: "1.5rem" }}>
               <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", textTransform: "uppercase", color: "var(--color-text-secondary)", letterSpacing: "0.05em" }}>Descrição</h4>
               <p style={{ margin: 0, fontSize: "1.1rem", whiteSpace: "pre-wrap", color: "var(--color-text-primary)" }}>
                 {selectedIncident.message}
               </p>
            </div>

            {selectedIncident.photoUrl && (
              <div style={{ marginBottom: "2rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", textTransform: "uppercase", color: "var(--color-text-secondary)", letterSpacing: "0.05em" }}>Evidência Fotográfica</h4>
                <img src={selectedIncident.photoUrl} alt="Ocorrência" style={{ width: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "var(--radius-md)", background: "var(--color-bg)", border: "1px solid var(--color-border)" }} />
              </div>
            )}

            <button 
              onClick={() => setSelectedIncident(null)} 
              style={{
                width: "100%", padding: "1rem", background: "var(--color-surface)", color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontWeight: 600, fontSize: "1rem", cursor: "pointer"
              }}
            >
              FECHAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
