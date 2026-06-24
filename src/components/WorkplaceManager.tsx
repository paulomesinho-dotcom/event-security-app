"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Plus, Trash2, Edit2, X, Save, AlertCircle } from "lucide-react";

interface Workplace {
  id: string;
  name: string;
  captainId: string;
  planIds: string[];
  zelloChannelLink?: string;
  zelloGroupLink?: string;
  whatsappGroupLink?: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface Plan {
  id: string;
  name: string;
}

export default function WorkplaceManager() {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [captains, setCaptains] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // New Workplace State
  const [showNewWorkplace, setShowNewWorkplace] = useState(false);
  const [newWorkplaceName, setNewWorkplaceName] = useState("");
  const [newWorkplaceCaptain, setNewWorkplaceCaptain] = useState("");
  const [newWorkplaceZelloLink, setNewWorkplaceZelloLink] = useState("");

  // Edit Workplace State
  const [editingWorkplaceId, setEditingWorkplaceId] = useState<string | null>(null);
  const [draftWorkplace, setDraftWorkplace] = useState<Workplace | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const unsubWorkplaces = onSnapshot(query(collection(db, "workplaces")), (snap) => {
      setWorkplaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as Workplace)));
    });

    const unsubUsers = onSnapshot(query(collection(db, "users")), (snap) => {
      const caps: User[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.role === "captain" || data.role === "superadmin") caps.push({ id: d.id, ...data } as User);
      });
      setCaptains(caps);
    });

    const unsubPlans = onSnapshot(query(collection(db, "plans")), (snap) => {
      setPlans(snap.docs.map(d => ({ id: d.id, name: d.data().name } as Plan)));
      setLoading(false);
    });

    return () => {
      unsubWorkplaces();
      unsubUsers();
      unsubPlans();
    };
  }, []);

  const handleCreateWorkplace = async () => {
    if (!newWorkplaceName || !newWorkplaceCaptain) return;
    await addDoc(collection(db, "workplaces"), {
      name: newWorkplaceName,
      captainId: newWorkplaceCaptain,
      planIds: [],
      zelloChannelLink: newWorkplaceZelloLink
    });
    setNewWorkplaceName("");
    setNewWorkplaceCaptain("");
    setNewWorkplaceZelloLink("");
    setShowNewWorkplace(false);
  };

  const handleDeleteWorkplace = async (id: string) => {
    if (confirm("Tem a certeza que deseja eliminar este Workplace? Os turnos e locadores associados ficarão órfãos.")) {
      await deleteDoc(doc(db, "workplaces", id));
      if (editingWorkplaceId === id) {
        setEditingWorkplaceId(null);
        setDraftWorkplace(null);
        setHasUnsavedChanges(false);
      }
    }
  };

  const startEditing = (workplace: Workplace) => {
    if (hasUnsavedChanges && !confirm("Tem alterações não guardadas. Tem a certeza que deseja sair sem gravar?")) {
      return;
    }
    setEditingWorkplaceId(workplace.id);
    setDraftWorkplace({ ...workplace, planIds: workplace.planIds || [] });
    setHasUnsavedChanges(false);
    setShowNewWorkplace(false);
  };

  const cancelEditing = () => {
    if (hasUnsavedChanges && !confirm("Tem alterações não guardadas. Deseja rejeitar as alterações e fechar?")) {
      return;
    }
    setEditingWorkplaceId(null);
    setDraftWorkplace(null);
    setHasUnsavedChanges(false);
  };

  const handleDraftChange = (field: keyof Workplace, value: any) => {
    if (!draftWorkplace) return;
    setDraftWorkplace({ ...draftWorkplace, [field]: value });
    setHasUnsavedChanges(true);
  };

  const togglePlanInDraft = (planId: string) => {
    if (!draftWorkplace) return;
    const currentPlans = draftWorkplace.planIds || [];
    const isIncluded = currentPlans.includes(planId);
    const newPlans = isIncluded ? currentPlans.filter(id => id !== planId) : [...currentPlans, planId];
    
    setDraftWorkplace({ ...draftWorkplace, planIds: newPlans });
    setHasUnsavedChanges(true);
  };

  const saveChanges = async () => {
    if (!draftWorkplace || !editingWorkplaceId) return;
    
    // Ensure name and captain aren't empty
    if (!draftWorkplace.name || !draftWorkplace.captainId) {
      alert("Nome e Capitão são obrigatórios.");
      return;
    }

    const docRef = doc(db, "workplaces", editingWorkplaceId);
    const updateData: any = {
      name: draftWorkplace.name,
      captainId: draftWorkplace.captainId,
      planIds: draftWorkplace.planIds || [],
    };
    if (draftWorkplace.zelloChannelLink !== undefined) updateData.zelloChannelLink = draftWorkplace.zelloChannelLink;
    if (draftWorkplace.zelloGroupLink !== undefined) updateData.zelloGroupLink = draftWorkplace.zelloGroupLink;
    if (draftWorkplace.whatsappGroupLink !== undefined) updateData.whatsappGroupLink = draftWorkplace.whatsappGroupLink;

    await updateDoc(docRef, updateData);
    
    setEditingWorkplaceId(null);
    setDraftWorkplace(null);
    setHasUnsavedChanges(false);
  };

  if (loading) return <div style={{ padding: "2rem", color: "var(--color-text-secondary)" }}>A carregar workplaces...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0, fontWeight: 500, color: "var(--color-text-primary)", fontSize: "1.25rem", display: "none" }}>Workplaces</h3>
        {!showNewWorkplace && (
          <button 
            className="btn btn-primary" 
            onClick={() => {
              if (hasUnsavedChanges && !confirm("Tem alterações não guardadas no editor atual. Continuar e perder as alterações?")) return;
              setShowNewWorkplace(true);
              setEditingWorkplaceId(null);
              setHasUnsavedChanges(false);
            }}
            style={{ borderRadius: "var(--radius-full)", padding: "0.5rem 1rem", fontSize: "0.875rem", boxShadow: "var(--shadow-sm)" }}
          >
            <Plus size={16} style={{ marginRight: "0.5rem" }} /> Novo Workplace
          </button>
        )}
      </div>

      {showNewWorkplace && (
        <div style={{ padding: "1.5rem", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", marginBottom: "1.5rem", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
          <h4 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 500 }}>Criar Novo Workplace</h4>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Nome do Workplace</label>
              <input type="text" className="input" value={newWorkplaceName} onChange={e => setNewWorkplaceName(e.target.value)} placeholder="ex: Estádio (Todo)" style={{ padding: "0.6rem" }} />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Capitão / Responsável</label>
              <select className="input" value={newWorkplaceCaptain} onChange={e => setNewWorkplaceCaptain(e.target.value)} style={{ padding: "0.6rem" }}>
                <option value="">Selecione um Capitão...</option>
                {captains.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Link Canal Zello (Opcional)</label>
              <input type="text" className="input" value={newWorkplaceZelloLink} onChange={e => setNewWorkplaceZelloLink(e.target.value)} placeholder="ex: zello://porto2026" style={{ padding: "0.6rem" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button className="btn btn-primary" onClick={handleCreateWorkplace} disabled={!newWorkplaceName || !newWorkplaceCaptain}>
              Gravar Workplace
            </button>
            <button className="btn btn-secondary" onClick={() => setShowNewWorkplace(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Google Drive Style Table Header */}
      {workplaces.length > 0 && !showNewWorkplace && (
         <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "1rem", padding: "0.75rem 1.5rem", borderBottom: "1px solid var(--color-border)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
            <div>Nome do Workplace</div>
            <div>Responsável</div>
            <div>Plantas Alocadas</div>
            <div style={{ width: "80px", textAlign: "right" }}>Ações</div>
         </div>
      )}

      {workplaces.length === 0 && !showNewWorkplace ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)" }}>
           <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>Ainda não existem workplaces criados. Clique no botão acima para criar o primeiro.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {workplaces.map(workplace => {
            const captain = captains.find(c => c.id === workplace.captainId);
            const isEditing = editingWorkplaceId === workplace.id;

            return (
              <div key={workplace.id} style={{ 
                 borderBottom: "1px solid var(--color-border)", 
                 background: isEditing ? "var(--color-bg)" : "var(--color-surface)",
                 transition: "background 0.2s ease"
              }}>
                {/* List Row */}
                <div style={{ 
                   display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "1rem", alignItems: "center",
                   padding: "0.75rem 1.5rem", cursor: isEditing ? "default" : "pointer"
                }} onClick={() => { if (!isEditing) startEditing(workplace); }}>
                  <div style={{ fontWeight: 500, color: "var(--color-text-primary)", fontSize: "0.9rem" }}>{workplace.name}</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{captain?.name || "Desconhecido"}</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{(workplace.planIds || []).length} plantas</div>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button 
                       onClick={(e) => { e.stopPropagation(); isEditing ? cancelEditing() : startEditing(workplace); }} 
                       className="btn btn-secondary" 
                       style={{ padding: "0.4rem", borderRadius: "var(--radius-full)" }}
                       title={isEditing ? "Cancelar Edição" : "Editar"}
                    >
                      {isEditing ? <X size={14} /> : <Edit2 size={14} />}
                    </button>
                    {!isEditing && (
                       <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteWorkplace(workplace.id); }} 
                          className="btn btn-danger" 
                          style={{ padding: "0.4rem", borderRadius: "var(--radius-full)", background: "transparent", border: "1px solid transparent", color: "var(--color-danger)" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.borderColor = "#fca5a5"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
                          title="Eliminar"
                       >
                         <Trash2 size={14} />
                       </button>
                    )}
                  </div>
                </div>

                {/* Editor Body */}
                {isEditing && draftWorkplace && (
                  <div style={{ padding: "1.5rem", background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "2px solid var(--color-primary)", display: "flex", gap: "2rem", flexWrap: "wrap", position: "relative" }}>
                    
                    {hasUnsavedChanges && (
                       <div style={{ position: "absolute", top: "0", left: "50%", transform: "translate(-50%, -50%)", background: "#fef3c7", color: "#d97706", padding: "0.25rem 1rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem", border: "1px solid #fcd34d", boxShadow: "var(--shadow-sm)" }}>
                          <AlertCircle size={12} />
                          Alterações por guardar
                       </div>
                    )}

                    <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Nome do Workplace</label>
                        <input 
                          type="text" 
                          className="input" 
                          value={draftWorkplace.name} 
                          onChange={(e) => handleDraftChange("name", e.target.value)}
                          placeholder="Nome da zona"
                          style={{ padding: "0.5rem" }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Capitão / Responsável</label>
                        <select 
                          className="input" 
                          value={draftWorkplace.captainId} 
                          onChange={(e) => handleDraftChange("captainId", e.target.value)}
                          style={{ padding: "0.5rem" }}
                        >
                          <option value="">Selecione um Capitão...</option>
                          {captains.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      <div style={{ marginTop: "0.5rem" }}>
                         <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Zello — Canal Vigias</label>
                         <input 
                           type="text" 
                           className="input" 
                           value={draftWorkplace.zelloChannelLink || ""} 
                           onChange={(e) => handleDraftChange("zelloChannelLink", e.target.value)}
                           placeholder="zello://canal-vigias"
                           style={{ padding: "0.5rem" }}
                         />
                      </div>

                      <div>
                         <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Zello — Canal Capitães</label>
                         <input 
                           type="text" 
                           className="input" 
                           value={draftWorkplace.zelloGroupLink || ""} 
                           onChange={(e) => handleDraftChange("zelloGroupLink", e.target.value)}
                           placeholder="zello://canal-capitaes"
                           style={{ padding: "0.5rem" }}
                         />
                      </div>

                      <div>
                         <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Grupo WhatsApp (Opcional)</label>
                         <input 
                           type="text" 
                           className="input" 
                           value={draftWorkplace.whatsappGroupLink || ""} 
                           onChange={(e) => handleDraftChange("whatsappGroupLink", e.target.value)}
                           placeholder="https://chat.whatsapp.com/..."
                           style={{ padding: "0.5rem" }}
                         />
                      </div>
                    </div>

                    {/* Plans Assignment */}
                    <div style={{ flex: "1 1 300px" }}>
                      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.5rem" }}>Plantas Atribuídas ao Workplace</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: "250px", overflowY: "auto", paddingRight: "0.5rem", background: "var(--color-bg)", padding: "0.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                        {plans.map(plan => {
                          const isAssigned = (draftWorkplace.planIds || []).includes(plan.id);
                          return (
                            <label key={plan.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.5rem", borderRadius: "var(--radius-sm)", background: isAssigned ? "rgba(59, 130, 246, 0.05)" : "transparent", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = isAssigned ? "rgba(59, 130, 246, 0.1)" : "rgba(0,0,0,0.02)"} onMouseLeave={e => e.currentTarget.style.background = isAssigned ? "rgba(59, 130, 246, 0.05)" : "transparent"}>
                              <input 
                                type="checkbox" 
                                checked={isAssigned} 
                                onChange={() => togglePlanInDraft(plan.id)} 
                                style={{ cursor: "pointer", width: "1.1rem", height: "1.1rem", accentColor: "var(--color-primary)" }} 
                              />
                              <span style={{ fontSize: "0.875rem", fontWeight: isAssigned ? 600 : 400, color: isAssigned ? "var(--color-primary)" : "var(--color-text-primary)" }}>{plan.name}</span>
                            </label>
                          );
                        })}
                        {plans.length === 0 && <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", padding: "0.5rem" }}>Nenhuma planta carregada.</span>}
                      </div>
                    </div>

                    <div style={{ flexBasis: "100%", display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
                      <button className="btn btn-secondary" onClick={cancelEditing}>
                        Cancelar
                      </button>
                      <button 
                        className="btn btn-primary" 
                        onClick={saveChanges} 
                        disabled={!hasUnsavedChanges || !draftWorkplace.name || !draftWorkplace.captainId}
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem", opacity: (!hasUnsavedChanges || !draftWorkplace.name || !draftWorkplace.captainId) ? 0.5 : 1 }}
                      >
                        <Save size={16} /> Gravar Alterações
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
