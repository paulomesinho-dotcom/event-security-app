"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Plus, Trash2, Edit2, X, Save, AlertCircle, Users, Map as MapIcon, Link as LinkIcon, Menu, Building, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Edit/Create Workplace State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkplaceId, setEditingWorkplaceId] = useState<string | null>(null);
  
  const [draftWorkplace, setDraftWorkplace] = useState<Partial<Workplace> | null>(null);
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

  const openCreateDrawer = () => {
    if (hasUnsavedChanges && !confirm("Tem alterações não guardadas. Sair sem gravar?")) return;
    setIsCreating(true);
    setEditingWorkplaceId(null);
    setDraftWorkplace({ name: "", captainId: "", planIds: [], zelloChannelLink: "", zelloGroupLink: "", whatsappGroupLink: "" });
    setHasUnsavedChanges(false);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (workplace: Workplace) => {
    if (hasUnsavedChanges && !confirm("Tem alterações não guardadas. Sair sem gravar?")) return;
    setIsCreating(false);
    setEditingWorkplaceId(workplace.id);
    setDraftWorkplace({ ...workplace, planIds: workplace.planIds || [] });
    setHasUnsavedChanges(false);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (hasUnsavedChanges && !confirm("Tem alterações não guardadas. Deseja rejeitar as alterações e fechar?")) return;
    setIsDrawerOpen(false);
    setDraftWorkplace(null);
    setHasUnsavedChanges(false);
    setEditingWorkplaceId(null);
    setIsCreating(false);
  };

  const handleDeleteWorkplace = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm("Tem a certeza que deseja eliminar este Workplace? Os turnos e locadores associados ficarão órfãos.")) {
      await deleteDoc(doc(db, "workplaces", id));
      if (editingWorkplaceId === id) {
        setIsDrawerOpen(false);
        setDraftWorkplace(null);
        setHasUnsavedChanges(false);
      }
    }
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
    if (!draftWorkplace) return;
    
    if (!draftWorkplace.name) {
      alert("Nome do workplace é obrigatório.");
      return;
    }

    if (isCreating) {
      await addDoc(collection(db, "workplaces"), draftWorkplace);
    } else if (editingWorkplaceId) {
      await updateDoc(doc(db, "workplaces", editingWorkplaceId), draftWorkplace);
    }
    
    setHasUnsavedChanges(false);
    setIsDrawerOpen(false);
  };

  if (loading) return <div style={{ padding: "2rem", color: "var(--color-text-secondary)" }}>A carregar workplaces...</div>;

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 100px)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0, fontWeight: 500, color: "var(--color-text-primary)", fontSize: "1.25rem", display: "none" }}>Workplaces</h3>
        <button 
          className="btn btn-primary" 
          onClick={openCreateDrawer}
          style={{ borderRadius: "var(--radius-full)", padding: "0.5rem 1.2rem", fontSize: "0.8rem", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Plus size={16} /> Novo Workplace
        </button>
      </div>

      {/* Google Drive Style Table */}
      <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {workplaces.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Nome do Workplace</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Responsável</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Plantas</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600, textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {workplaces.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(workplace => {
                const captain = captains.find(c => c.id === workplace.captainId);
                const isEditing = editingWorkplaceId === workplace.id;

                return (
                  <tr 
                    key={workplace.id} 
                    style={{ 
                      borderBottom: "1px solid var(--color-border)", 
                      background: isEditing ? "rgba(59, 130, 246, 0.05)" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.2s ease"
                    }}
                    onClick={() => openEditDrawer(workplace)}
                    onMouseEnter={(e) => { if(!isEditing) e.currentTarget.style.background = "var(--color-bg)" }}
                    onMouseLeave={(e) => { if(!isEditing) e.currentTarget.style.background = "transparent" }}
                  >
                    <td style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <Building size={16} color="var(--color-primary)" />
                      <span style={{ fontWeight: 500, color: "var(--color-text-primary)", fontSize: "1rem" }}>{workplace.name}</span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Users size={14} color="var(--color-text-secondary)" />
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{captain?.name || "Desconhecido"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                       <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "var(--color-bg)", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", border: "1px solid var(--color-border)", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                         <MapIcon size={12} />
                         {(workplace.planIds || []).length} plantas
                       </div>
                    </td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button 
                           onClick={(e) => { e.stopPropagation(); openEditDrawer(workplace); }} 
                           className="btn btn-secondary" 
                           style={{ padding: "0.4rem", borderRadius: "var(--radius-full)", background: "transparent", border: "none" }}
                           title="Editar"
                        >
                          <Edit2 size={16} color="var(--color-text-secondary)" />
                        </button>
                        <button 
                           onClick={(e) => handleDeleteWorkplace(workplace.id, e)} 
                           className="btn btn-danger" 
                           style={{ padding: "0.4rem", borderRadius: "var(--radius-full)", background: "transparent", border: "none" }}
                           title="Eliminar"
                        >
                          <Trash2 size={16} color="var(--color-danger)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
             <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>Ainda não existem workplaces criados. Clique no botão acima para criar o primeiro.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {workplaces.length > ITEMS_PER_PAGE && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", padding: "0 0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            A mostrar {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, workplaces.length)} de {workplaces.length}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: "0.4rem", borderRadius: "var(--radius-md)", background: "var(--color-surface)", border: "1px solid var(--color-border)", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={16} color="var(--color-text-primary)" />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(workplaces.length / ITEMS_PER_PAGE), p + 1))}
              disabled={currentPage === Math.ceil(workplaces.length / ITEMS_PER_PAGE)}
              style={{ padding: "0.4rem", borderRadius: "var(--radius-md)", background: "var(--color-surface)", border: "1px solid var(--color-border)", cursor: currentPage === Math.ceil(workplaces.length / ITEMS_PER_PAGE) ? "not-allowed" : "pointer", opacity: currentPage === Math.ceil(workplaces.length / ITEMS_PER_PAGE) ? 0.5 : 1 }}
            >
              <ChevronRight size={16} color="var(--color-text-primary)" />
            </button>
          </div>
        </div>
      )}

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", zIndex: 9999, transition: "opacity 0.3s" }} onClick={closeDrawer} />
      )}

      {/* Side Drawer */}
      <div style={{ 
        position: "fixed", top: 0, right: isDrawerOpen ? 0 : "-500px", width: "100%", maxWidth: "450px", height: "100vh", 
        background: "var(--color-surface)", boxShadow: "-4px 0 15px rgba(0,0,0,0.1)", zIndex: 10000,
        transition: "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)", display: "flex", flexDirection: "column"
      }}>
        
        {/* Drawer Header */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-bg)" }}>
          <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Building size={20} color="var(--color-primary)" />
            {isCreating ? "Novo Workplace" : "Editar Workplace"}
          </h3>
          <button onClick={closeDrawer} style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", padding: "0.5rem" }}>
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {draftWorkplace && (
            <>
              {/* General Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7 }}>Informação Geral</h4>
                
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Nome do Workplace</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={draftWorkplace.name || ""} 
                    onChange={(e) => handleDraftChange("name", e.target.value)}
                    placeholder="Nome da zona"
                    style={{ padding: "0.6rem" }}
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Capitão / Responsável</label>
                  <select 
                    className="input" 
                    value={draftWorkplace.captainId || ""} 
                    onChange={(e) => handleDraftChange("captainId", e.target.value)}
                    style={{ padding: "0.6rem" }}
                  >
                    <option value="">Selecione um Capitão...</option>
                    {captains.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Plans Selection */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <MapIcon size={14} /> Plantas Atribuídas
                </h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", background: "var(--color-bg)", padding: "0.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  {plans.map(plan => {
                    const isAssigned = (draftWorkplace.planIds || []).includes(plan.id);
                    return (
                      <label key={plan.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.6rem", borderRadius: "var(--radius-sm)", background: isAssigned ? "rgba(59, 130, 246, 0.05)" : "transparent", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = isAssigned ? "rgba(59, 130, 246, 0.1)" : "rgba(0,0,0,0.02)"} onMouseLeave={e => e.currentTarget.style.background = isAssigned ? "rgba(59, 130, 246, 0.05)" : "transparent"}>
                        <input 
                          type="checkbox" 
                          checked={isAssigned} 
                          onChange={() => togglePlanInDraft(plan.id)} 
                          style={{ cursor: "pointer", width: "1.1rem", height: "1.1rem", accentColor: "var(--color-primary)" }} 
                        />
                        <span style={{ fontSize: "0.8rem", fontWeight: isAssigned ? 600 : 400, color: isAssigned ? "var(--color-primary)" : "var(--color-text-primary)" }}>{plan.name}</span>
                      </label>
                    );
                  })}
                  {plans.length === 0 && <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", padding: "0.5rem" }}>Nenhuma planta carregada.</span>}
                </div>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "0.5rem 0" }} />

              {/* Links */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <LinkIcon size={14} /> Canais de Comunicação
                </h4>
                
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Zello — Canal Vigias</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={draftWorkplace.zelloChannelLink || ""} 
                    onChange={(e) => handleDraftChange("zelloChannelLink", e.target.value)}
                    placeholder="zello://canal-vigias"
                    style={{ padding: "0.6rem" }}
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
                    style={{ padding: "0.6rem" }}
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
                    style={{ padding: "0.6rem" }}
                  />
                </div>
              </div>
            </>
          )}

        </div>

        {/* Drawer Footer / Save Banner */}
        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--color-border)", background: hasUnsavedChanges ? "var(--color-bg)" : "var(--color-surface)", transition: "background 0.3s", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {hasUnsavedChanges && (
             <div style={{ background: "#fef3c7", color: "#d97706", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", border: "1px solid #fcd34d" }}>
                <AlertCircle size={16} />
                Tem alterações por gravar!
             </div>
          )}
          
          <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
            <button className="btn btn-secondary" onClick={closeDrawer} style={{ flex: 1, padding: "0.75rem" }}>
              Cancelar
            </button>
            <button 
              className="btn btn-primary" 
              onClick={saveChanges} 
              disabled={!hasUnsavedChanges || !draftWorkplace?.name}
              style={{ flex: 2, padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", opacity: (!hasUnsavedChanges || !draftWorkplace?.name) ? 0.5 : 1 }}
            >
              <Save size={18} /> {isCreating ? "Criar Workplace" : "Gravar Alterações"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
