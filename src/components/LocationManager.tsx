"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { Map, Plus, Trash2, Clock, X, Save, AlertCircle, Building, MapPin, ChevronLeft, ChevronRight, Eye } from "lucide-react";

export interface AbstractLocation {
  id: string;
  local: string;
  sublocal: string;
  subsublocal: string;
  captainId: string;
  workplaceId?: string;
  customShifts?: any;
}

const periods = ["manha", "tarde"];

export default function LocationManager() {
  const { user } = useAuth();
  const { activeWorkplaceId, activeWorkplace } = useWorkplace();
  const [locations, setLocations] = useState<AbstractLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  // Draft state
  const [draftLocation, setDraftLocation] = useState<Partial<AbstractLocation> | null>(null);
  const [draftShifts, setDraftShifts] = useState<any>({});
  const [isGlobalCreate, setIsGlobalCreate] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!user || !activeWorkplaceId) {
      setLocations([]);
      setLoading(false);
      return;
    }
    
    const qLoc = query(collection(db, "abstract_locations"), where("workplaceId", "in", [activeWorkplaceId, "global"]));
    const unsubLoc = onSnapshot(qLoc, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setLocations(data);
      setLoading(false);
    });

    return () => unsubLoc();
  }, [user, activeWorkplaceId, activeWorkplace]);

  const isLocationInUse = async (id: string) => {
    const snapLocators = await getDocs(query(collection(db, "locators"), where("locationId", "==", id)));
    if (snapLocators.empty) return false;
    for (const locator of snapLocators.docs) {
      const snapAssigns = await getDocs(query(collection(db, "assignments"), where("locatorId", "==", locator.id)));
      if (!snapAssigns.empty) return true;
    }
    return false;
  };

  const openCreateDrawer = () => {
    if (hasUnsavedChanges && !confirm("Tem alterações não guardadas. Sair sem gravar?")) return;
    setIsCreating(true);
    setEditingLocationId(null);
    setIsGlobalCreate(false);
    
    setDraftLocation({ local: "", sublocal: "", subsublocal: "" });
    setDraftShifts({});
    
    setHasUnsavedChanges(false);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = async (loc: AbstractLocation) => {
    if (hasUnsavedChanges && !confirm("Tem alterações não guardadas. Sair sem gravar?")) return;
    
    const inUse = await isLocationInUse(loc.id);
    if (inUse) {
      alert("Este local possui turnos atribuídos e não pode ser editado.");
      return;
    }

    setIsCreating(false);
    setEditingLocationId(loc.id);
    setDraftLocation({ ...loc });
    
    const initial: any = {};
    if (loc.customShifts) {
      for (const d of Object.keys(loc.customShifts)) {
        initial[d] = { manha: { start: "", end: "" }, tarde: { start: "", end: "" } };
        for (const p of periods) {
          const existing = loc.customShifts[d]?.[p] || { start: "", end: "" };
          initial[d][p] = { ...existing };
        }
      }
    }
    setDraftShifts(initial);
    
    setHasUnsavedChanges(false);
    setIsDrawerOpen(true);
  };

  
  const handleAddDate = () => {
    const newDate = prompt("Introduza a data (ex: 2026-08-15 ou 15/ago):");
    if (!newDate) return;
    if (draftShifts[newDate]) {
      alert("Esta data já existe.");
      return;
    }
    setDraftShifts((prev: any) => ({
      ...prev,
      [newDate]: { manha: { start: "", end: "" }, tarde: { start: "", end: "" } }
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveDate = (dateToRemove: string) => {
    if (!confirm(`Remover os horários do dia ${dateToRemove}?`)) return;
    setDraftShifts((prev: any) => {
      const copy = { ...prev };
      delete copy[dateToRemove];
      return copy;
    });
    setHasUnsavedChanges(true);
  };

  const closeDrawer = () => {
    if (hasUnsavedChanges && !confirm("Tem alterações não guardadas. Deseja rejeitar as alterações e fechar?")) return;
    setIsDrawerOpen(false);
    setDraftLocation(null);
    setEditingLocationId(null);
    setHasUnsavedChanges(false);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const inUse = await isLocationInUse(id);
    if (inUse) {
      alert("Este local possui turnos atribuídos e não pode ser apagado.");
      return;
    }
    if (confirm("Eliminar este local?")) {
      await deleteDoc(doc(db, "abstract_locations", id));
      if (editingLocationId === id) {
        setIsDrawerOpen(false);
        setDraftLocation(null);
        setHasUnsavedChanges(false);
      }
    }
  };

  const handleDraftChange = (field: keyof AbstractLocation, value: any) => {
    if (!draftLocation) return;
    setDraftLocation({ ...draftLocation, [field]: value });
    setHasUnsavedChanges(true);
  };

  const handleShiftChange = (date: string, period: string, field: "start" | "end", value: string) => {
    setDraftShifts((prev: any) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [period]: {
          ...prev[date][period],
          [field]: value
        }
      }
    }));
    setHasUnsavedChanges(true);
  };

  const saveChanges = async () => {
    if (!draftLocation || !draftLocation.local) {
      alert("O nome do local é obrigatório.");
      return;
    }

    if (isCreating) {
      if (!activeWorkplaceId) return;
      await addDoc(collection(db, "abstract_locations"), {
        local: draftLocation.local,
        sublocal: draftLocation.sublocal || "",
        subsublocal: draftLocation.subsublocal || "",
        captainId: isGlobalCreate ? "admin" : (activeWorkplace?.captainId || user?.uid),
        workplaceId: isGlobalCreate ? "global" : activeWorkplaceId,
        customShifts: draftShifts
      });
    } else if (editingLocationId) {
      await updateDoc(doc(db, "abstract_locations", editingLocationId), {
        local: draftLocation.local,
        sublocal: draftLocation.sublocal || "",
        subsublocal: draftLocation.subsublocal || "",
        customShifts: draftShifts
      });
    }
    
    setHasUnsavedChanges(false);
    setIsDrawerOpen(false);
  };

  if (loading) return <div style={{ padding: "2rem", color: "var(--color-text-secondary)" }}>A carregar locais...</div>;

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 100px)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ color: "var(--color-primary)", margin: 0, display: "none", alignItems: "center", gap: "0.5rem" }}>
          <Map size={20} /> Gestão de Locais
        </h3>
        <button 
          className="btn btn-primary" 
          onClick={openCreateDrawer}
          style={{ borderRadius: "var(--radius-full)", padding: "0.5rem 1.2rem", fontSize: "0.8rem", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Plus size={16} /> Novo Local
        </button>
      </div>

      {/* Google Drive Style Table */}
      <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {locations.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Local</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Sub-divisões</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Âmbito</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600, textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {locations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(l => {
                const isGlobal = l.workplaceId === "global";
                const canEdit = !isGlobal || user?.role === "superadmin";
                const isEditing = editingLocationId === l.id;

                return (
                  <tr 
                    key={l.id} 
                    style={{ 
                      borderBottom: "1px solid var(--color-border)", 
                      background: isEditing ? "rgba(59, 130, 246, 0.05)" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.2s ease",
                      opacity: canEdit ? 1 : 0.8
                    }}
                    onClick={() => openEditDrawer(l)}
                    onMouseEnter={(e) => { if(!isEditing) e.currentTarget.style.background = "var(--color-bg)" }}
                    onMouseLeave={(e) => { if(!isEditing) e.currentTarget.style.background = "transparent" }}
                  >
                    <td style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <MapPin size={16} color={isGlobal ? "var(--color-text-secondary)" : "var(--color-primary)"} />
                      <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{l.local}</span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column" }}>
                        {l.sublocal && <span>{l.sublocal}</span>}
                        {l.subsublocal && <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>↳ {l.subsublocal}</span>}
                        {!l.sublocal && !l.subsublocal && <span>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      {isGlobal ? (
                        <span style={{ fontSize: "0.75rem", background: "var(--color-primary)", color: "white", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontWeight: 600 }}>Global</span>
                      ) : (
                        <span style={{ fontSize: "0.75rem", background: "var(--color-bg)", color: "var(--color-text-secondary)", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", border: "1px solid var(--color-border)" }}>Local</span>
                      )}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button 
                           onClick={(e) => { e.stopPropagation(); openEditDrawer(l); }} 
                           className="btn btn-secondary" 
                           style={{ padding: "0.4rem", borderRadius: "var(--radius-full)", background: "transparent", border: "none" }}
                           title={canEdit ? "Editar Horários e Detalhes" : "Ver Horários e Detalhes"}
                        >
                          {canEdit ? <Clock size={16} color="var(--color-text-secondary)" /> : <Eye size={16} color="var(--color-text-secondary)" />}
                        </button>
                        {canEdit && (
                          <button 
                             onClick={(e) => handleDelete(l.id, e)} 
                             className="btn btn-danger" 
                             style={{ padding: "0.4rem", borderRadius: "var(--radius-full)", background: "transparent", border: "none" }}
                             title="Eliminar"
                          >
                            <Trash2 size={16} color="var(--color-danger)" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)" }}>
             <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>Nenhum local criado. Clique no botão acima para adicionar.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {locations.length > ITEMS_PER_PAGE && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", padding: "0 0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            A mostrar {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, locations.length)} de {locations.length}
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
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(locations.length / ITEMS_PER_PAGE), p + 1))}
              disabled={currentPage === Math.ceil(locations.length / ITEMS_PER_PAGE)}
              style={{ padding: "0.4rem", borderRadius: "var(--radius-md)", background: "var(--color-surface)", border: "1px solid var(--color-border)", cursor: currentPage === Math.ceil(locations.length / ITEMS_PER_PAGE) ? "not-allowed" : "pointer", opacity: currentPage === Math.ceil(locations.length / ITEMS_PER_PAGE) ? 0.5 : 1 }}
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
        position: "fixed", top: 0, right: isDrawerOpen ? 0 : "-600px", width: "100%", maxWidth: "500px", height: "100vh", 
        background: "var(--color-surface)", boxShadow: "-4px 0 15px rgba(0,0,0,0.1)", zIndex: 10000,
        transition: "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)", display: "flex", flexDirection: "column"
      }}>
        
        {/* Drawer Header */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-bg)" }}>
          <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MapPin size={20} color="var(--color-primary)" />
            {isCreating ? "Novo Local" : "Editar Local e Horários"}
          </h3>
          <button onClick={closeDrawer} style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", padding: "0.5rem" }}>
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {draftLocation && (() => {
            const isReadOnly = draftLocation.workplaceId === "global" && user?.role !== "superadmin";

            return (
            <>
              {isCreating && user?.role === "superadmin" && (
                <div style={{ background: "rgba(59, 130, 246, 0.05)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", color: "var(--color-primary)", fontWeight: 600, fontSize: "0.8rem" }}>
                    <input 
                       type="checkbox" 
                       checked={isGlobalCreate} 
                       onChange={e => setIsGlobalCreate(e.target.checked)} 
                       style={{ accentColor: "var(--color-primary)", width: "1rem", height: "1rem" }}
                    />
                    Local Global (Disponível para todos os Workplaces)
                  </label>
                </div>
              )}

              {/* Informação do Local */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7 }}>Identificação</h4>
                
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Local (Nível 1) *</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={draftLocation.local || ""} 
                    onChange={(e) => handleDraftChange("local", e.target.value)}
                    placeholder="Ex: Entrada Sul"
                    style={{ padding: "0.6rem", opacity: isReadOnly ? 0.7 : 1 }}
                    disabled={isReadOnly}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Sublocal (Opcional)</label>
                    <input 
                      type="text" 
                      className="input" 
                      value={draftLocation.sublocal || ""} 
                      onChange={(e) => handleDraftChange("sublocal", e.target.value)}
                      placeholder="Ex: Porta 3"
                      style={{ padding: "0.6rem", opacity: isReadOnly ? 0.7 : 1 }}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Sub-sublocal (Opcional)</label>
                    <input 
                      type="text" 
                      className="input" 
                      value={draftLocation.subsublocal || ""} 
                      onChange={(e) => handleDraftChange("subsublocal", e.target.value)}
                      placeholder="Ex: Catraca Esquerda"
                      style={{ padding: "0.6rem", opacity: isReadOnly ? 0.7 : 1 }}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "0.5rem 0" }} />

              {/* Horários */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Clock size={14} /> Horários de Turnos (Opcional)
                  </h4>
                  {!isReadOnly && (
                    <button onClick={handleAddDate} className="btn btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", borderRadius: "var(--radius-full)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Plus size={14} /> Adicionar Dia
                    </button>
                  )}
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {Object.keys(draftShifts).sort().map(date => (
                    <div key={date} style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                          <h5 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-primary)" }}>Dia {date}</h5>
                          {!isReadOnly && (
                            <button onClick={() => handleRemoveDate(date)} style={{ background: "transparent", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: "0.2rem", display: "flex" }} title="Remover Dia">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                          {periods.map(period => (
                              <div key={period} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", width: "60px" }}>{period}</label>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                                    <input 
                                      type="time" 
                                      className="input" 
                                      value={draftShifts[date]?.[period]?.start || ""} 
                                      onChange={(e) => handleShiftChange(date, period, "start", e.target.value)}
                                      style={{ padding: "0.4rem", flex: 1, fontSize: "0.85rem", background: "var(--color-surface)", opacity: isReadOnly ? 0.7 : 1 }}
                                      disabled={isReadOnly}
                                    />
                                    <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>às</span>
                                    <input 
                                      type="time" 
                                      className="input" 
                                      value={draftShifts[date]?.[period]?.end || ""} 
                                      onChange={(e) => handleShiftChange(date, period, "end", e.target.value)}
                                      style={{ padding: "0.4rem", flex: 1, fontSize: "0.85rem", background: "var(--color-surface)", opacity: isReadOnly ? 0.7 : 1 }}
                                      disabled={isReadOnly}
                                    />
                                </div>
                              </div>
                          ))}
                        </div>
                    </div>
                  ))}
                </div>
              </div>

            </>
          );})()}

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
              {(draftLocation?.workplaceId === "global" && user?.role !== "superadmin") ? "Fechar" : "Cancelar"}
            </button>
            {!(draftLocation?.workplaceId === "global" && user?.role !== "superadmin") && (
              <button 
                className="btn btn-primary" 
                onClick={saveChanges} 
                disabled={!hasUnsavedChanges || !draftLocation?.local}
                style={{ flex: 2, padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", opacity: (!hasUnsavedChanges || !draftLocation?.local) ? 0.5 : 1 }}
              >
                <Save size={18} /> {isCreating ? "Criar Local" : "Gravar Alterações"}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
