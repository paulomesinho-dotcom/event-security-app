"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, collection, addDoc, getDocs, query, where, updateDoc, orderBy, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { AlertTriangle, CheckCircle2, Circle, Search, MapPin, Globe, Eye, Lock, ShieldAlert, Clock, PlayCircle, X, FileWarning } from "lucide-react";
import dynamic from "next/dynamic";
import SuspectManager from "@/components/SuspectManager";

const MapViewer = dynamic(() => import("@/components/MapViewer"), { ssr: false });

type TabType = "global_evac" | "local_evac" | "missing" | "suspects" | "history";

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
  const [activeShifts, setActiveShifts] = useState<any[]>([]);
  const [workplaces, setWorkplaces] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [emergencyIncidents, setEmergencyIncidents] = useState<any[]>([]);
  const [allEmergencyIncidents, setAllEmergencyIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [selectedMapShift, setSelectedMapShift] = useState<any>(null);
  const [mapPlanUrl, setMapPlanUrl] = useState("");
  const [mapLocator, setMapLocator] = useState<any>(null);

  const [missingDesc, setMissingDesc] = useState("");
  const [missingPhoto, setMissingPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showMissingForm, setShowMissingForm] = useState(false);
  
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
    });

    const unsubWorkplaces = onSnapshot(collection(db, "workplaces"), (snap) => {
       setWorkplaces(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qHistory = query(collection(db, "emergency_history"), orderBy("startTime", "desc"));
    const unsubHistory = onSnapshot(qHistory, (snap) => {
       const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       setHistory(docs);
    });

    const unsubShifts = onSnapshot(collection(db, "shifts"), (snap) => {
      const actives = snap.docs.filter(d => d.data().status === "active").map(d => ({ id: d.id, ...d.data() }));
      setActiveShifts(actives);
    });

    const unsubIncidents = onSnapshot(collection(db, "incidents"), (snap) => {
      const allIncs = snap.docs
        .filter(d => d.data().isEmergencyIncident === true)
        .map(d => ({ id: d.id, ...(d.data() as any) }));
      setAllEmergencyIncidents(allIncs);
      setEmergencyIncidents(allIncs.filter(inc => inc.status === "open"));
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
      unsubWorkplaces();
      unsubHistory();
      unsubShifts();
      unsubIncidents();
      unsubWorkplace();
    };
  }, [user, activeWorkplaceId]);

  if (!canActivate) return <div style={{ padding: "2rem" }}>Acesso não autorizado.</div>;

  const closeEmergencyHistory = async (type: "global" | "workplace", workplaceId?: string) => {
    try {
      const qConstraints: any[] = [where("status", "==", "active"), where("type", "==", type)];
      if (type === "global") {
        qConstraints.push(where("alertType", "==", "evacuation"));
      }
      if (type === "workplace" && workplaceId) {
        qConstraints.push(where("workplaceId", "==", workplaceId));
      }
      const qHistory = query(collection(db, "emergency_history"), ...qConstraints);
      const snap = await getDocs(qHistory);
      const promises = snap.docs.map(d => {
         const data = type === "global" ? { alertAck: globalAlertAck, evacAck: globalEvacAck } : { alertAck: workplaceAlertAck, evacAck: workplaceEvacAck };
         return updateDoc(doc(db, "emergency_history", d.id), {
            status: "closed",
            endTime: new Date().toISOString(),
            finalAlertAck: data.alertAck,
            finalEvacAck: data.evacAck,
         });
      });
      await Promise.all(promises);
    } catch(e) { console.error("Error closing history", e); }
  };

  const createEmergencyHistory = async (type: "global" | "workplace", alertType: string, workplaceId?: string, extraData?: any) => {
    try {
      await addDoc(collection(db, "emergency_history"), {
         type,
         alertType,
         workplaceId: workplaceId || null,
         status: "active",
         startTime: new Date().toISOString(),
         initiatedBy: user?.uid,
         ...extraData
      });
    } catch(e) { console.error("Error creating history", e); }
  };

  const clearDashboardManual = async () => {
     const activeMissing = history.filter(h => h.status === "active" && h.alertType === "missing_person");
     if (globalEmergency || workplaceEmergency || activeMissing.length > 0) {
        alert("Não pode limpar o ecrã durante uma emergência ativa. Desative a emergência primeiro.");
        return;
     }
     if (!confirm("Tem a certeza que deseja limpar as receções e dados de evacuação do ecrã?")) return;
     try {
        if (activeTab === "global_evac" || activeTab === "missing") {
           await setDoc(doc(db, "settings", "global"), { globalAlertAck: [], globalEvacAck: [] }, { merge: true });
           const promises = emergencyIncidents.map(inc => updateDoc(doc(db, "incidents", inc.id), { status: "resolved" }));
           await Promise.all(promises);
        } else if (activeWorkplaceId) {
           await setDoc(doc(db, "workplaces", activeWorkplaceId), { alertAck: [], evacAck: [] }, { merge: true });
           const wpIncs = emergencyIncidents.filter(inc => inc.workplaceId === activeWorkplaceId);
           const promises = wpIncs.map(inc => updateDoc(doc(db, "incidents", inc.id), { status: "resolved" }));
           await Promise.all(promises);
        }
        alert("Ecrã limpo com sucesso.");
     } catch (err) {
        console.error(err);
        alert("Erro ao limpar ecrã.");
     }
  };

  const viewMap = async (shift: any) => {
    try {
      const planDoc = await getDoc(doc(db, "plans", shift.planId));
      if (planDoc.exists()) setMapPlanUrl(planDoc.data().imageUrl);
      else setMapPlanUrl("");
      
      const locDoc = await getDoc(doc(db, "locators", shift.locatorId));
      if (locDoc.exists()) setMapLocator({ id: locDoc.id, ...locDoc.data() });
      else setMapLocator(null);
      
      setSelectedMapShift(shift);
    } catch(e) {
      console.error(e);
      alert("Erro ao carregar mapa.");
    }
  };

  const toggleGlobal = async () => {
    if (!isSuperadmin) return;
    if (!confirm(globalEmergency ? "Desativar Alerta Global?" : "Tem a certeza que deseja ATIVAR O ALERTA GLOBAL? Isto afetará TODOS os eventos!")) return;
    try {
      if (globalEmergency) {
        await closeEmergencyHistory("global");
        await setDoc(doc(db, "settings", "global"), { globalEmergency: false }, { merge: true });
      } else {
        await setDoc(doc(db, "settings", "global"), { 
          globalEmergency: true, 
          globalAlertType: "evacuation",
          globalAlertAck: [user.uid],
          globalEvacAck: []
        }, { merge: true });
        await createEmergencyHistory("global", "evacuation");
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
      
      await createEmergencyHistory("global", "missing_person", undefined, {
        description: missingDesc,
        photoUrl,
        alertAck: [user.uid]
      });
      
      setMissingDesc("");
      setMissingPhoto(null);
      setShowMissingForm(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao disparar alerta.");
    } finally {
      setUploading(false);
    }
  };

  const closeMissingPerson = async (id: string) => {
    const resolution = prompt("Qual o desfecho desta ocorrência? (ex: Pessoa encontrada pela equipa)");
    if (resolution === null) return;
    
    try {
      await updateDoc(doc(db, "emergency_history", id), {
        status: "closed",
        endTime: new Date().toISOString(),
        resolution: resolution.trim() || "Sem detalhes"
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao fechar ocorrência.");
    }
  };

  const toggleWorkplace = async () => {
    if (!activeWorkplaceId) return;
    if (!confirm(workplaceEmergency ? "Desativar Emergência Local?" : "Tem a certeza que deseja ATIVAR A EMERGÊNCIA neste local?")) return;
    try {
       if (workplaceEmergency) {
         await closeEmergencyHistory("workplace", activeWorkplaceId);
         await setDoc(doc(db, "workplaces", activeWorkplaceId), { isEmergency: false }, { merge: true });
       } else {
         await setDoc(doc(db, "workplaces", activeWorkplaceId), { 
           isEmergency: true,
           alertAck: [user.uid],
           evacAck: []
         }, { merge: true });
         await createEmergencyHistory("workplace", "evacuation", activeWorkplaceId);
       }
    } catch (err) {
      console.error(err);
      alert("Erro.");
    }
  };

  const renderUserTable = (usersToRender: any[], alertAck: string[], evacAck: string[], isEvacuation: boolean, targetWorkplaceId: string | null) => {
    const onShiftUsers = usersToRender.filter(u => {
      if (u.role === "vigia") {
         const hasShift = activeShifts.some((s: any) => 
            s.personId === u.id && 
            (targetWorkplaceId === null || s.workplaceId === targetWorkplaceId || !s.workplaceId)
         );
         if (!hasShift) return false;
      }
      return true;
    });

    const filtered = onShiftUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const ackCount = filtered.filter(u => alertAck.includes(u.id)).length;
    const evacCount = filtered.filter(u => evacAck.includes(u.id)).length;

    return (
      <div style={{ marginTop: "2rem" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem 0 0.5rem 0" }}>
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
            <table className="drive-table">
               <thead>
                  <tr>
                     <th>Efetivo & Função</th>
                     <th>Workplace & Posição</th>
                     <th style={{ textAlign: "center" }}>Estado de Alerta</th>
                     {isEvacuation && <th style={{ textAlign: "center" }}>Estado do Local</th>}
                     <th style={{ textAlign: "right" }}>Ações / Ocorrências</th>
                  </tr>
               </thead>
               <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isEvacuation ? 5 : 4} style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "3rem" }}>
                        Nenhum efetivo em turno encontrado.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(u => {
                      const received = alertAck.includes(u.id);
                      const evacuated = evacAck.includes(u.id);
                      const userIncidents = emergencyIncidents.filter(inc => inc.vigiaId === u.id);

                      const shiftForUser = activeShifts.find((s: any) => s.personId === u.id);
                      const wpForShift = shiftForUser ? workplaces.find(w => w.planIds?.includes(shiftForUser.planId)) : null;
                      const workplaceName = wpForShift ? wpForShift.name : (shiftForUser ? "Desconhecido" : "Sem Turno Ativo");
                      const locatorName = shiftForUser ? shiftForUser.locatorName : "Sem Posição";
                      const activeIncident = userIncidents.length > 0 ? userIncidents[userIncidents.length - 1] : null;
                      const isExpanded = selectedIncident && activeIncident && selectedIncident.id === activeIncident.id;

                      return (
                        <React.Fragment key={u.id}>
                        <tr style={{ background: isExpanded ? "var(--color-bg)" : "transparent" }}>
                           <td>
                             <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                               <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.8rem" }}>
                                 {u.name.substring(0,2).toUpperCase()}
                               </div>
                               <div>
                                 <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{u.name}</div>
                                 <div style={{ fontSize: "0.75rem", textTransform: "capitalize", color: "var(--color-text-secondary)", marginTop: "0.15rem" }}>{u.role}</div>
                               </div>
                             </div>
                           </td>

                           <td>
                             <div style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{workplaceName}</div>
                             <div 
                               onClick={() => shiftForUser && viewMap(shiftForUser)} 
                               style={{ fontSize: "0.75rem", color: shiftForUser ? "var(--color-primary)" : "var(--color-text-secondary)", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.25rem", cursor: shiftForUser ? "pointer" : "default", textDecoration: shiftForUser ? "underline" : "none" }}
                               title={shiftForUser ? "Ver no Mapa" : ""}
                             >
                               <MapPin size={12} /> {locatorName}
                             </div>
                           </td>

                           <td style={{ textAlign: "center" }}>
                              <span style={{ 
                                display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 600,
                                background: received ? "rgba(16, 185, 129, 0.1)" : "rgba(255, 255, 255, 0.05)",
                                color: received ? "var(--color-success)" : "var(--color-text-tertiary)"
                              }}>
                                {received ? <CheckCircle2 size={12}/> : <Circle size={12}/>}
                                {received ? "Recebido" : "Aguarda"}
                              </span>
                           </td>

                           {isEvacuation && (
                             <td style={{ textAlign: "center" }}>
                               {shiftForUser ? (
                                 <span style={{ 
                                   display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 600,
                                   background: evacuated ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                   color: evacuated ? "var(--color-success)" : "#f59e0b"
                                 }}>
                                   {evacuated ? <CheckCircle2 size={12}/> : <Circle size={12}/>}
                                   {evacuated ? "Evacuado" : "Em Curso"}
                                 </span>
                               ) : (
                                 <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", fontWeight: 600 }}>N/A</span>
                               )}
                             </td>
                           )}

                           <td>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
                                {activeIncident && (
                                  <button 
                                    onClick={() => setSelectedIncident(isExpanded ? null : activeIncident)}
                                    style={{ background: isExpanded ? "var(--color-surface)" : "var(--color-danger)", color: isExpanded ? "var(--color-text-primary)" : "white", border: isExpanded ? "1px solid var(--color-border)" : "none", borderRadius: "var(--radius-md)", padding: "0.4rem 0.75rem", display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", animation: isExpanded ? "none" : "pulse 2s infinite", fontSize: "0.75rem", fontWeight: 500 }}
                                    title="Ver Ocorrência"
                                  >
                                    {isExpanded ? <X size={14} /> : <AlertTriangle size={14} />} 
                                    {isExpanded ? "Fechar" : "Ocorrência"}
                                  </button>
                                )}
                              </div>
                           </td>
                        </tr>
                        {isExpanded && activeIncident && (
                           <tr>
                             <td colSpan={isEvacuation ? 5 : 4} style={{ padding: 0 }}>
                                <div style={{ padding: "1.5rem", background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)", animation: "fade-in 0.2s ease" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-danger)", marginBottom: "1rem" }}>
                                    <AlertTriangle size={18} /> <h4 style={{ margin: 0 }}>Detalhe da Ocorrência</h4>
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                                    <div>
                                      <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-tertiary)", marginBottom: "0.25rem", textTransform: "uppercase" }}>Data / Hora</span>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.9rem" }}><Clock size={14} color="var(--color-text-secondary)" /> {new Date(activeIncident.createdAt).toLocaleString("pt-PT")}</div>
                                    </div>
                                    <div>
                                      <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-tertiary)", marginBottom: "0.25rem", textTransform: "uppercase" }}>Local / Posição</span>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.9rem" }}>
                                        <MapPin size={14} color="var(--color-text-secondary)" /> 
                                        {workplaces.find((w: any) => w.id === activeIncident.workplaceId)?.name ? `${workplaces.find((w: any) => w.id === activeIncident.workplaceId)?.name} - ` : ""}{activeIncident.locatorName}
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Mensagem</span>
                                    <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.5, color: "var(--color-text-primary)", whiteSpace: "pre-wrap" }}>
                                      {activeIncident.message}
                                    </p>
                                  </div>
                                  {activeIncident.photoUrl && (
                                    <div style={{ marginTop: "1.5rem" }}>
                                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Fotografia Anexa</span>
                                      <a href={activeIncident.photoUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)", width: "fit-content" }}>
                                        <img src={activeIncident.photoUrl} alt="Ocorrência" style={{ maxHeight: "250px", objectFit: "contain", display: "block" }} />
                                      </a>
                                    </div>
                                  )}
                                </div>
                             </td>
                           </tr>
                         )}
                         </React.Fragment>
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
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.6rem 1rem",
          background: isActive ? `${activeColor}15` : "transparent",
          color: isActive ? activeColor : "var(--color-text-secondary)",
          border: "none",
          borderBottom: isActive ? `3px solid ${activeColor}` : "3px solid transparent",
          cursor: "pointer",
          fontWeight: isActive ? 600 : 500,
          fontSize: "0.875rem",
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
      
      <div style={{ borderBottom: "1px solid var(--color-border)", padding: "0 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "1rem", overflowX: "auto" }}>
          {isSuperadmin && (
            <TabButton id="global_evac" icon={Globe} label="Evacuação Total" color="var(--color-text-secondary)" activeColor="var(--color-danger)" />
          )}
          <TabButton id="local_evac" icon={MapPin} label="Alerta de Zona" color="var(--color-text-secondary)" activeColor="#f97316" />
          {isSuperadmin && (
            <TabButton id="missing" icon={Eye} label="Pessoa Desaparecida" color="var(--color-text-secondary)" activeColor="#eab308" />
          )}
          <TabButton id="suspects" icon={Search} label="Suspeitos" color="var(--color-text-secondary)" activeColor="#a855f7" />
          <TabButton id="history" icon={Clock} label="Histórico" color="var(--color-text-secondary)" activeColor="var(--color-primary)" />
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          {!globalEmergency && !workplaceEmergency && activeTab !== "history" && (
             <button 
               onClick={clearDashboardManual}
               style={{ background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
             >
               Limpar Ecrã
             </button>
          )}
        </div>
      </div>

      <div style={{ padding: "1rem", flex: 1, overflowY: "auto" }}>
        
        {activeTab === "global_evac" && isSuperadmin && (
          <div className="animate-fade-in">
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
               <div style={{ maxWidth: "600px" }}>
                 <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--color-text-primary)" }}>Protocolo de Evacuação Total</h2>
                 <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.4, margin: 0, fontSize: "0.85rem" }}>
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

             {globalEmergency && globalAlertType === "evacuation" ? (
               <>
                 <div style={{ background: "rgba(239, 68, 68, 0.05)", borderLeft: "4px solid var(--color-danger)", padding: "0.75rem 1rem", borderRadius: "0 var(--radius-md) var(--radius-md) 0", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                   <div style={{ background: "var(--color-danger)", width: 10, height: 10, borderRadius: "50%", animation: "pulse 2s infinite" }} />
                   <span style={{ color: "var(--color-danger)", fontWeight: 600, letterSpacing: "0.05em", fontSize: "0.85rem" }}>EMERGÊNCIA GLOBAL EM CURSO</span>
                 </div>
                 {renderUserTable(allUsers, globalAlertAck, globalEvacAck, true, null)}
               </>
             ) : (
                <div style={{ textAlign: "center", padding: "4rem", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)", marginBottom: "2rem" }}>
                   <ShieldAlert size={48} color="var(--color-text-tertiary)" style={{ margin: "0 auto 1rem auto" }} />
                   <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--color-text-secondary)" }}>Nenhuma emergência em curso</h3>
                   <p style={{ margin: 0, color: "var(--color-text-tertiary)", fontSize: "0.85rem" }}>Apenas ative este protocolo em caso de evacuação total do recinto.</p>
                </div>
             )}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <div style={{ maxWidth: "600px" }}>
                      <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                         Evacuação: {activeWorkplace?.name}
                      </h2>
                      <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.4, margin: 0, fontSize: "0.85rem" }}>
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

                  {workplaceEmergency ? (
                    <>
                      <div style={{ background: "rgba(249, 115, 22, 0.05)", borderLeft: "4px solid #f97316", padding: "0.75rem 1rem", borderRadius: "0 var(--radius-md) var(--radius-md) 0", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ background: "#f97316", width: 10, height: 10, borderRadius: "50%", animation: "pulse 2s infinite" }} />
                        <span style={{ color: "#f97316", fontWeight: 600, letterSpacing: "0.05em", fontSize: "0.85rem" }}>ALERTA DE ZONA ATIVO</span>
                      </div>
                      {renderUserTable(allUsers, workplaceAlertAck, workplaceEvacAck, true, activeWorkplaceId)}
                    </>
                  ) : !globalEmergency && (
                    <div style={{ textAlign: "center", padding: "4rem", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)", marginBottom: "2rem" }}>
                       <MapPin size={48} color="var(--color-text-tertiary)" style={{ margin: "0 auto 1rem auto" }} />
                       <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--color-text-secondary)" }}>Nenhuma emergência em curso</h3>
                       <p style={{ margin: 0, color: "var(--color-text-tertiary)", fontSize: "0.85rem" }}>Pode iniciar um alerta de zona se necessário.</p>
                    </div>
                  )}
                </>
             )}
          </div>
        )}

        {activeTab === "missing" && isSuperadmin && (
          <div className="animate-fade-in">
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
               <div style={{ maxWidth: "600px" }}>
                 <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--color-text-primary)" }}>Pessoas Desaparecidas</h2>
                 <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.4, margin: 0, fontSize: "0.85rem" }}>
                   Pode haver várias buscas em simultâneo. Inicie uma nova busca para alertar toda a equipa.
                 </p>
               </div>
               <button 
                 onClick={() => setShowMissingForm(true)}
                 style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "#eab308", color: "#000", border: "none", borderRadius: "var(--radius-full)", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
               >
                 <span style={{ fontSize: "1.2rem" }}>+</span> NOVO ALERTA
               </button>
             </div>

             {showMissingForm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "1rem" }}>
                  <div style={{ background: "var(--color-bg)", width: "100%", maxWidth: "600px", borderRadius: "var(--radius-xl)", overflow: "hidden", animation: "slideUp 0.3s ease-out" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid var(--color-border)" }}>
                      <h3 style={{ margin: 0, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-primary)" }}>
                        <Search size={24} color="#eab308" />
                        Nova Pessoa Desaparecida
                      </h3>
                      <button onClick={() => setShowMissingForm(false)} style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                        <X size={24} />
                      </button>
                    </div>
                    
                    <div style={{ padding: "1.5rem" }}>
                      <div style={{ marginBottom: "1.5rem" }}>
                         <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-primary)" }}>Descrição Completa (Obrigatório)</label>
                         <textarea 
                           className="input" 
                           rows={4} 
                           value={missingDesc} 
                           onChange={e => setMissingDesc(e.target.value)} 
                           placeholder="Ex: Criança, aprox. 5 anos, t-shirt azul do porto, chora e procura pela mãe..."
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

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                        <button onClick={() => setShowMissingForm(false)} style={{ padding: "0.85rem 1.5rem", background: "transparent", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer" }}>
                          Cancelar
                        </button>
                        <button 
                           onClick={triggerMissingPerson} 
                           disabled={uploading || !missingDesc} 
                           style={{ 
                             display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 2rem", 
                             background: (uploading || !missingDesc) ? "var(--color-surface)" : "#eab308", 
                             color: (uploading || !missingDesc) ? "var(--color-text-tertiary)" : "#000", 
                             border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: (uploading || !missingDesc) ? "not-allowed" : "pointer" 
                           }}
                         >
                          <Eye size={20} />
                          {uploading ? "A DISPARAR..." : "DISPARAR ALERTA"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
             )}

             {(() => {
                const activeMissing = history.filter(h => h.status === "active" && h.alertType === "missing_person");
                if (activeMissing.length === 0) return (
                   <div style={{ textAlign: "center", padding: "4rem", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)" }}>
                     <Search size={48} color="var(--color-text-tertiary)" style={{ margin: "0 auto 1rem auto" }} />
                     <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--color-text-secondary)" }}>Nenhuma busca ativa</h3>
                     <p style={{ margin: 0, color: "var(--color-text-tertiary)", fontSize: "0.85rem" }}>Se alguém se perder, inicie um novo alerta para notificar toda a equipa imediatamente.</p>
                   </div>
                );
                
                return (
                  <div>
                    <h3 style={{ margin: "0 0 1rem 0", color: "var(--color-text-primary)", fontSize: "1.2rem" }}>Buscas em Curso ({activeMissing.length})</h3>
                    {activeMissing.map(am => (
                      <div key={am.id} style={{ background: "var(--color-surface)", border: "1px solid #eab308", borderRadius: "var(--radius-lg)", marginBottom: "2rem", overflow: "hidden" }}>
                        <div style={{ background: "rgba(234, 179, 8, 0.1)", padding: "1.5rem", display: "flex", gap: "1.5rem", borderBottom: "1px solid rgba(234, 179, 8, 0.2)" }}>
                          {am.photoUrl && (
                            <img src={am.photoUrl} alt="Missing" style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <span style={{ display: "inline-block", background: "#eab308", color: "#000", padding: "0.25rem 0.5rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem" }}>
                                  Iniciado às {new Date(am.startTime).toLocaleTimeString("pt-PT")}
                                </span>
                                <p style={{ margin: 0, color: "var(--color-text-primary)", fontSize: "1rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{am.description}</p>
                              </div>
                              <button onClick={() => closeMissingPerson(am.id)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "var(--color-bg)", border: "2px solid #eab308", color: "#eab308", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>
                                FECHAR OCORRÊNCIA
                              </button>
                            </div>
                          </div>
                        </div>
                        <div style={{ padding: "0 1rem 1rem 1rem" }}>
                          {renderUserTable(allUsers, am.alertAck || [], [], false, null)}
                        </div>
                      </div>
                     ))}
                   </div>
                 );
              })()}
           </div>
         )}

         {activeTab === "suspects" && (
           <div className="animate-fade-in">
             <SuspectManager />
           </div>
         )}

         {activeTab === "history" && (
          <div className="animate-fade-in">
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-primary)" }}>
                   Histórico de Emergências
                </h2>
             </div>
             
             <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {history.length === 0 ? (
                   <div style={{ textAlign: "center", padding: "4rem", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)" }}>
                     <ShieldAlert size={48} color="var(--color-text-tertiary)" style={{ margin: "0 auto 1rem auto" }} />
                     <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--color-text-secondary)" }}>Nenhum registo encontrado</h3>
                   </div>
                ) : (
                    history.map((item) => {
                      const wp = workplaces.find(w => w.id === item.workplaceId);
                      const isGlobal = item.type === "global";
                      
                      const startDate = item.startTime ? new Date(item.startTime).toLocaleString("pt-PT") : "--";
                      const endDate = item.endTime ? new Date(item.endTime).toLocaleString("pt-PT") : "--";
                      
                      const itemIncidents = allEmergencyIncidents.filter(inc => {
                        const incTime = new Date(inc.createdAt).getTime();
                        const sTime = new Date(item.startTime).getTime();
                        const eTime = item.endTime ? new Date(item.endTime).getTime() : Infinity;
                        
                        if (incTime < sTime || incTime > eTime) return false;
                        if (!isGlobal && inc.workplaceId !== item.workplaceId) return false;
                        return true;
                      });

                      return (
                         <div key={item.id} style={{ background: "var(--color-bg)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden", padding: "1.5rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: itemIncidents.length > 0 ? "1.5rem" : 0 }}>
                               <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: isGlobal ? "rgba(239, 68, 68, 0.1)" : "rgba(249, 115, 22, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                     {isGlobal ? <Globe size={20} color="var(--color-danger)" /> : <MapPin size={20} color="#f97316" />}
                                  </div>
                                  <div>
                                     <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.1rem" }}>
                                        {isGlobal ? "Alerta Global" : `Alerta Local: ${wp?.name || "Local Desconhecido"}`}
                                     </h3>
                                     <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", display: "flex", gap: "1rem" }}>
                                        <span><strong>Tipo:</strong> {item.alertType === "evacuation" ? "Evacuação" : "Pessoa Desaparecida"}</span>
                                        <span><strong>Estado:</strong> {item.status === "active" ? "Em Curso" : "Fechado"}</span>
                                     </div>
                                  </div>
                               </div>
                               <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                                    <span style={{ color: "var(--color-text-tertiary)", textTransform: "uppercase", fontSize: "0.7rem", fontWeight: 600, marginRight: "0.5rem" }}>Início</span> 
                                    {startDate}
                                  </div>
                                  <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                                    <span style={{ color: "var(--color-text-tertiary)", textTransform: "uppercase", fontSize: "0.7rem", fontWeight: 600, marginRight: "0.5rem" }}>Fim</span> 
                                    {endDate}
                                  </div>
                               </div>
                            </div>

                            {item.resolution && (
                                <div style={{ background: "rgba(16, 185, 129, 0.05)", padding: "1rem", borderRadius: "var(--radius-md)", marginTop: "1rem", borderLeft: "4px solid #10b981" }}>
                                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase", marginBottom: "0.25rem" }}>Desfecho da Ocorrência</span>
                                  <p style={{ margin: 0, color: "var(--color-text-primary)", fontSize: "0.95rem", whiteSpace: "pre-wrap" }}>{item.resolution}</p>
                                </div>
                             )}

                            {itemIncidents.length > 0 && (
                               <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.5rem" }}>
                                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                     <FileWarning size={16} /> Ocorrências Registadas ({itemIncidents.length})
                                  </h4>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                     {itemIncidents.map(inc => {
                                        const incWp = workplaces.find((w: any) => w.id === inc.workplaceId);
                                        const locText = incWp ? `${incWp.name} - ${inc.locatorName}` : inc.locatorName;
                                        return (
                                           <div key={inc.id} style={{ background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "1rem", border: "1px solid var(--color-border)" }}>
                                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                 <span style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                    <MapPin size={14} color="var(--color-text-secondary)" /> {locText}
                                                 </span>
                                                 <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                                    <Clock size={12} /> {new Date(inc.createdAt).toLocaleString("pt-PT")}
                                                 </span>
                                              </div>
                                              <p style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>{inc.message}</p>
                                              
                                              {inc.photoUrl && (
                                                 <a href={inc.photoUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)" }}>
                                                    <img src={inc.photoUrl} alt="Foto da ocorrência" style={{ height: "100px", objectFit: "contain", display: "block" }} />
                                                 </a>
                                              )}
                                              <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--color-text-tertiary)" }}>
                                                 Reportado por: {inc.vigiaName || "Vigia"}
                                              </div>
                                           </div>
                                        );
                                     })}
                                  </div>
                               </div>
                            )}
                         </div>
                      );
                   })
                )}
             </div>
          </div>
        )}
      {/* Modal removed. Incidents now expand inline in the table. */}

      {/* Map Modal */}
      {selectedMapShift && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", animation: "fade-in 0.2s ease", background: "#e5e7eb" }}>
            <button 
              onClick={() => setSelectedMapShift(null)} 
              style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10, background: "var(--color-surface)", border: "none", color: "var(--color-text-primary)", cursor: "pointer", display: "flex", padding: "0.75rem", borderRadius: "50%", boxShadow: "var(--shadow-lg)" }}
            >
               <X size={24} />
            </button>
            {mapPlanUrl ? (
               <MapViewer 
                  imageUrl={mapPlanUrl}
                  locators={mapLocator ? [mapLocator] : []}
               />
            ) : (
               <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", flexDirection: "column", gap: "1rem" }}>
                 <MapPin size={32} opacity={0.5} />
                 <p>A carregar mapa...</p>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
