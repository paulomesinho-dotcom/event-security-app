"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { Map, Plus, Trash2, Clock, X, Save } from "lucide-react";

export interface AbstractLocation {
  id: string;
  local: string;
  sublocal: string;
  subsublocal: string;
  captainId: string;
  workplaceId?: string;
  customShifts?: any;
}

const dates = ["10/jul", "11/jul", "12/jul"];
const periods = ["manha", "tarde"];

export default function LocationManager() {
  const { user } = useAuth();
  const { activeWorkplaceId, activeWorkplace } = useWorkplace();
  const [locations, setLocations] = useState<AbstractLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [local, setLocal] = useState("");
  const [sublocal, setSublocal] = useState("");
  const [subsublocal, setSubsublocal] = useState("");
  const [createDraftShifts, setCreateDraftShifts] = useState<any>({});
  const [isGlobalCreate, setIsGlobalCreate] = useState(false);

  const [editingScheduleFor, setEditingScheduleFor] = useState<AbstractLocation | null>(null);
  const [draftShifts, setDraftShifts] = useState<any>({});

  useEffect(() => {
    if (!user || !activeWorkplaceId) {
      setLocations([]);
      setLoading(false);
      return;
    }
    
    const captainId = activeWorkplace?.captainId || user.uid;

    const qLoc = query(collection(db, "abstract_locations"), where("workplaceId", "in", [activeWorkplaceId, "global"]));
    const unsubLoc = onSnapshot(qLoc, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setLocations(data);
      setLoading(false);
    });

    return () => unsubLoc();
  }, [user, activeWorkplaceId, activeWorkplace]);

  const handleOpenCreateForm = () => {
    setLocal(""); setSublocal(""); setSubsublocal("");
    setIsGlobalCreate(false);
    const initial: any = {};
    for (const d of dates) {
      initial[d] = { manha: { start: "", end: "" }, tarde: { start: "", end: "" } };
    }
    setCreateDraftShifts(initial);
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!local || !activeWorkplaceId) return;
    await addDoc(collection(db, "abstract_locations"), {
      local, sublocal, subsublocal, 
      captainId: isGlobalCreate ? "admin" : (activeWorkplace?.captainId || user?.uid),
      workplaceId: isGlobalCreate ? "global" : activeWorkplaceId,
      customShifts: createDraftShifts
    });
    setLocal(""); setSublocal(""); setSubsublocal("");
    setShowForm(false);
  };

  const isLocationInUse = async (id: string) => {
    const snapLocators = await getDocs(query(collection(db, "locators"), where("locationId", "==", id)));
    if (snapLocators.empty) return false;
    for (const locator of snapLocators.docs) {
      const snapAssigns = await getDocs(query(collection(db, "assignments"), where("locatorId", "==", locator.id)));
      if (!snapAssigns.empty) return true;
    }
    return false;
  };

  const handleDelete = async (id: string) => {
    const inUse = await isLocationInUse(id);
    if (inUse) {
      alert("Este local possui turnos atribuídos e não pode ser apagado.");
      return;
    }
    if (confirm("Eliminar este local?")) {
      await deleteDoc(doc(db, "abstract_locations", id));
    }
  };

  const openScheduleEditor = async (loc: AbstractLocation) => {
    const inUse = await isLocationInUse(loc.id);
    if (inUse) {
      alert("Este local possui turnos atribuídos e não pode ser editado.");
      return;
    }
    setEditingScheduleFor(loc);
    const initial: any = {};
    for (const d of dates) {
      initial[d] = { manha: { start: "", end: "" }, tarde: { start: "", end: "" } };
      for (const p of periods) {
        const existing = loc.customShifts?.[d]?.[p] || { start: "", end: "" };
        initial[d][p] = { ...existing };
      }
    }
    setDraftShifts(initial);
  };

  const saveSchedule = async () => {
    if (!editingScheduleFor) return;
    await updateDoc(doc(db, "abstract_locations", editingScheduleFor.id), {
      customShifts: draftShifts
    });
    setEditingScheduleFor(null);
  };

  if (loading) return <div>A carregar locais...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ color: "var(--color-primary)", margin: 0, display: "none", alignItems: "center", gap: "0.5rem" }}>
          <Map size={20} /> Gestão de Locais
        </h3>
        <button className="btn btn-primary" onClick={handleOpenCreateForm}>
          <Plus size={16} /> Novo Local
        </button>
      </div>

      {showForm && (
        <div style={{ padding: "1.5rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", border: "1px solid var(--color-border)" }}>
          {user?.role === "superadmin" && (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", color: "var(--color-primary)" }}>
                <input type="checkbox" checked={isGlobalCreate} onChange={e => setIsGlobalCreate(e.target.checked)} />
                Local Global (Disponível em todos os workplaces)
              </label>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Local (Nível 1)</label>
              <input type="text" className="input" placeholder="Ex: Entrada Sul" value={local} onChange={e => setLocal(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Sublocal (Opcional)</label>
              <input type="text" className="input" placeholder="Ex: Porta 3" value={sublocal} onChange={e => setSublocal(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Sub-sublocal (Opcional)</label>
              <input type="text" className="input" placeholder="Ex: Catraca Esquerda" value={subsublocal} onChange={e => setSubsublocal(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem", borderTop: "1px solid var(--color-border)", paddingTop: "1.5rem" }}>
             <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "var(--color-text-primary)" }}>Horários do Local (Opcional)</h4>
             <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
               {dates.map(date => (
                 <div key={date} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h5 style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "var(--color-primary)" }}>Dia {date}</h5>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                       {periods.map(period => (
                         <div key={period}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.5rem", textTransform: "uppercase" }}>Turno da {period}</label>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                               <input 
                                 type="time" 
                                 className="input" 
                                 value={createDraftShifts[date]?.[period]?.start || ""} 
                                 onChange={(e) => setCreateDraftShifts({ ...createDraftShifts, [date]: { ...createDraftShifts[date], [period]: { ...createDraftShifts[date][period], start: e.target.value } } })}
                                 style={{ padding: "0.4rem", flex: 1, fontSize: "0.85rem" }}
                               />
                               <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>às</span>
                               <input 
                                 type="time" 
                                 className="input" 
                                 value={createDraftShifts[date]?.[period]?.end || ""} 
                                 onChange={(e) => setCreateDraftShifts({ ...createDraftShifts, [date]: { ...createDraftShifts[date], [period]: { ...createDraftShifts[date][period], end: e.target.value } } })}
                                 style={{ padding: "0.4rem", flex: 1, fontSize: "0.85rem" }}
                               />
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
             </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-success" onClick={handleCreate} disabled={!local}>Gravar Local</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
        {locations.map(l => (
            <div key={l.id} style={{ background: "var(--color-surface)", padding: "1.25rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", position: "relative" }}>
              {(l.workplaceId !== "global" || user?.role === "superadmin") && (
                <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => openScheduleEditor(l)} title="Editar Horários" style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", padding: "0.25rem" }}>
                    <Clock size={16} />
                  </button>
                  <button onClick={() => handleDelete(l.id)} title="Eliminar Local" style={{ background: "transparent", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: "0.25rem" }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <h4 style={{ margin: "0 0 0.5rem 0", paddingRight: "3rem", fontSize: "1.1rem" }}>
                {l.local} {l.workplaceId === "global" && <span style={{ fontSize: "0.7rem", background: "var(--color-primary)", color: "white", padding: "0.1rem 0.3rem", borderRadius: "4px", verticalAlign: "middle" }}>Global</span>}
              </h4>
              <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                {l.sublocal && <div>{l.sublocal}</div>}
                {l.subsublocal && <div>{l.subsublocal}</div>}
              </div>
            </div>
        ))}
        {locations.length === 0 && !showForm && <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Nenhum local criado.</p>}
      </div>

      {editingScheduleFor && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "600px", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-xl)", maxHeight: "90vh", overflowY: "auto" }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
               <h3 style={{ margin: 0, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Clock size={20} color="var(--color-primary)" /> Horários: {editingScheduleFor.local}</h3>
               <button onClick={() => setEditingScheduleFor(null)} style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}><X size={20}/></button>
             </div>

             <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
               {dates.map(date => (
                 <div key={date} style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h5 style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "var(--color-primary)" }}>Dia {date}</h5>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                       {periods.map(period => (
                         <div key={period}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.5rem", textTransform: "uppercase" }}>Turno da {period}</label>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                               <input 
                                 type="time" 
                                 className="input" 
                                 value={draftShifts[date]?.[period]?.start || ""} 
                                 onChange={(e) => setDraftShifts({ ...draftShifts, [date]: { ...draftShifts[date], [period]: { ...draftShifts[date][period], start: e.target.value } } })}
                                 style={{ padding: "0.4rem", flex: 1 }}
                               />
                               <span style={{ color: "var(--color-text-secondary)" }}>às</span>
                               <input 
                                 type="time" 
                                 className="input" 
                                 value={draftShifts[date]?.[period]?.end || ""} 
                                 onChange={(e) => setDraftShifts({ ...draftShifts, [date]: { ...draftShifts[date], [period]: { ...draftShifts[date][period], end: e.target.value } } })}
                                 style={{ padding: "0.4rem", flex: 1 }}
                               />
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
             </div>

             <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => setEditingScheduleFor(null)} style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-text-primary)" }}>Cancelar</button>
                <button className="btn btn-primary" onClick={saveSchedule} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Save size={16} /> Gravar Horários
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
