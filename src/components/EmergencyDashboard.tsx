
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { AlertTriangle, Users, CheckCircle2, Circle, Search, MapPin } from "lucide-react";

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

  const [missingDesc, setMissingDesc] = useState("");
  const [missingPhoto, setMissingPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"evacuation" | "missing">("evacuation");
  const [searchQuery, setSearchQuery] = useState("");

  const canActivate = user?.role === "superadmin" || user?.role === "captain";

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
      unsubWorkplace();
    };
  }, [user, activeWorkplaceId]);

  if (!canActivate) return <div style={{ padding: "2rem" }}>Acesso não autorizado.</div>;

  const toggleGlobal = async () => {
    if (user?.role !== "superadmin") return;
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
    const filtered = usersToRender.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
      <div style={{ marginTop: "1rem" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Acompanhamento ({filtered.length})</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--color-bg)", padding: "0.5rem 1rem", borderRadius: "var(--radius-full)" }}>
               <Search size={16} color="var(--color-text-secondary)" />
               <input 
                 type="text" 
                 placeholder="Pesquisar..." 
                 value={searchQuery} 
                 onChange={(e) => setSearchQuery(e.target.value)}
                 style={{ background: "transparent", border: "none", outline: "none", color: "var(--color-text-primary)", fontSize: "0.9rem" }}
               />
            </div>
         </div>
         <div className="table-container">
            <table className="data-table">
               <thead>
                  <tr>
                     <th>Nome</th>
                     <th>Função</th>
                     <th style={{ textAlign: "center" }}>Receção do Alerta</th>
                     {isEvacuation && <th style={{ textAlign: "center" }}>Local Evacuado</th>}
                  </tr>
               </thead>
               <tbody>
                  {filtered.map(u => {
                    const received = alertAck.includes(u.id);
                    const evacuated = evacAck.includes(u.id);
                    return (
                      <tr key={u.id}>
                         <td><div style={{ fontWeight: 500 }}>{u.name}</div></td>
                         <td><span style={{ fontSize: "0.8rem", textTransform: "capitalize", background: "rgba(255,255,255,0.1)", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-md)" }}>{u.role}</span></td>
                         <td style={{ textAlign: "center" }}>
                            {received 
                              ? <span style={{ color: "var(--color-success)", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}><CheckCircle2 size={16}/> Confirmado</span> 
                              : <span style={{ color: "var(--color-text-tertiary)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><Circle size={16}/> Pendente</span>}
                         </td>
                         {isEvacuation && (
                           <td style={{ textAlign: "center" }}>
                             {evacuated 
                               ? <span style={{ color: "var(--color-success)", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}><CheckCircle2 size={16}/> Evacuado</span> 
                               : <span style={{ color: "var(--color-warning)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><Circle size={16}/> Em curso</span>}
                           </td>
                         )}
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {user.role === "superadmin" && (
        <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", border: globalEmergency ? "2px solid var(--color-danger)" : "1px solid var(--color-border)" }}>
           <h2 style={{ margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem", color: globalEmergency ? "var(--color-danger)" : "var(--color-text-primary)" }}>
              <AlertTriangle size={24} />
              Gestão de Emergência Global
           </h2>

           {globalEmergency ? (
             <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(239, 68, 68, 0.1)", padding: "1.5rem", borderRadius: "var(--radius-md)", marginBottom: "2rem" }}>
                   <div>
                     <h3 style={{ margin: 0, color: "var(--color-danger)", fontSize: "1.25rem" }}>ALERTA GLOBAL ATIVO</h3>
                     <p style={{ margin: "0.5rem 0 0 0", color: "var(--color-text-secondary)" }}>Tipo: <strong>{globalAlertType === "missing_person" ? "Pessoa Desaparecida" : "Evacuação"}</strong></p>
                   </div>
                   <button onClick={toggleGlobal} className="btn btn-danger" style={{ padding: "1rem 2rem", fontSize: "1rem" }}>
                     DESATIVAR ALERTA GLOBAL
                   </button>
                </div>
                {renderUserTable(allUsers, globalAlertAck, globalEvacAck, globalAlertType === "evacuation")}
             </div>
           ) : (
             <div>
               <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", marginBottom: "1.5rem" }}>
                  <button onClick={() => setActiveTab("evacuation")} style={{ padding: "1rem 2rem", background: activeTab === "evacuation" ? "rgba(255,255,255,0.05)" : "transparent", border: "none", borderBottom: activeTab === "evacuation" ? "2px solid var(--color-danger)" : "2px solid transparent", color: "var(--color-text-primary)", fontWeight: 600, cursor: "pointer", fontSize: "1rem" }}>Evacuação Total</button>
                  <button onClick={() => setActiveTab("missing")} style={{ padding: "1rem 2rem", background: activeTab === "missing" ? "rgba(255,255,255,0.05)" : "transparent", border: "none", borderBottom: activeTab === "missing" ? "2px solid #eab308" : "2px solid transparent", color: "var(--color-text-primary)", fontWeight: 600, cursor: "pointer", fontSize: "1rem" }}>Pessoa Desaparecida</button>
               </div>

               {activeTab === "evacuation" && (
                 <div style={{ maxWidth: "600px" }}>
                   <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6 }}>Ao ativar a evacuação total, todos os vigias e capitães receberão um ecrã de aviso intransponível até confirmarem a receção. Terão também de confirmar a evacuação dos seus respetivos locais.</p>
                   <button onClick={toggleGlobal} className="btn btn-danger" style={{ padding: "1rem 2rem", fontSize: "1rem" }}>
                     🚨 ATIVAR EMERGÊNCIA GLOBAL DE EVACUAÇÃO
                   </button>
                 </div>
               )}

               {activeTab === "missing" && (
                 <div style={{ maxWidth: "600px" }}>
                   <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6 }}>Este alerta notifica todos os terminais com fotografia e descrição para procurarem por uma pessoa (ex: criança perdida).</p>
                   <div style={{ marginBottom: "1.5rem" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Descrição Completa (Obrigatório)</label>
                      <textarea className="input" rows={4} value={missingDesc} onChange={e => setMissingDesc(e.target.value)} placeholder="Ex: Criança, 5 anos, t-shirt azul, chora e procura pelos pais..."></textarea>
                   </div>
                   <div style={{ marginBottom: "2rem" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Fotografia Recente (Opcional)</label>
                      <input type="file" accept="image/*" onChange={e => setMissingPhoto(e.target.files?.[0] || null)} className="input" style={{ padding: "0.75rem" }} />
                   </div>
                   <button onClick={triggerMissingPerson} disabled={uploading || !missingDesc} className="btn" style={{ padding: "1rem 2rem", fontSize: "1rem", background: uploading || !missingDesc ? "var(--color-border)" : "#eab308", color: uploading || !missingDesc ? "var(--color-text-tertiary)" : "white" }}>
                     {uploading ? "A DISPARAR..." : "👀 DISPARAR ALERTA DE PESSOA DESAPARECIDA"}
                   </button>
                 </div>
               )}
             </div>
           )}
        </div>
      )}

      {activeWorkplaceId && !globalEmergency && (
        <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", border: workplaceEmergency ? "2px solid #f97316" : "1px solid var(--color-border)" }}>
           <h2 style={{ margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem", color: workplaceEmergency ? "#f97316" : "var(--color-text-primary)" }}>
              <MapPin size={24} />
              Emergência Local: {activeWorkplace?.name}
           </h2>

           {workplaceEmergency ? (
             <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(249, 115, 22, 0.1)", padding: "1.5rem", borderRadius: "var(--radius-md)", marginBottom: "2rem" }}>
                   <div>
                     <h3 style={{ margin: 0, color: "#f97316", fontSize: "1.25rem" }}>ALERTA LOCAL DE EVACUAÇÃO ATIVO</h3>
                     <p style={{ margin: "0.5rem 0 0 0", color: "var(--color-text-secondary)" }}>Todos os elementos deste local estão notificados.</p>
                   </div>
                   <button onClick={toggleWorkplace} style={{ padding: "1rem 2rem", fontSize: "1rem", background: "transparent", border: "2px solid #f97316", color: "#f97316", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer" }}>
                     DESATIVAR ALERTA LOCAL
                   </button>
                </div>
                {renderUserTable(workplaceUsers, workplaceAlertAck, workplaceEvacAck, true)}
             </div>
           ) : (
             <div style={{ maxWidth: "600px" }}>
               <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6 }}>Este alerta fará soar os avisos apenas nos terminais associados ao Workplace <strong>{activeWorkplace?.name}</strong>.</p>
               <button onClick={toggleWorkplace} style={{ padding: "1rem 2rem", fontSize: "1rem", background: "#f97316", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer" }}>
                 📍 ATIVAR EMERGÊNCIA NESTE LOCAL
               </button>
             </div>
           )}
        </div>
      )}

      {!activeWorkplaceId && user.role !== "superadmin" && (
         <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>Selecione um Workplace para aceder aos controlos de emergência locais.</div>
      )}
    </div>
  );
}

