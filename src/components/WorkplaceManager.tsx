"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Plus, Trash2, Edit2, X } from "lucide-react";

interface Workplace {
  id: string;
  name: string;
  captainId: string;
  planIds: string[];
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

  // Edit Workplace State
  const [editingWorkplace, setEditingWorkplace] = useState<Workplace | null>(null);

  useEffect(() => {
    // Fetch Workplaces
    const unsubWorkplaces = onSnapshot(query(collection(db, "workplaces")), (snap) => {
      setWorkplaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as Workplace)));
    });

    // Fetch Captains
    const unsubUsers = onSnapshot(query(collection(db, "users")), (snap) => {
      const caps: User[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.role === "captain") caps.push({ id: d.id, ...data } as User);
      });
      setCaptains(caps);
    });

    // Fetch Plans
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
    });
    setNewWorkplaceName("");
    setNewWorkplaceCaptain("");
    setShowNewWorkplace(false);
  };

  const handleDeleteWorkplace = async (id: string) => {
    if (confirm("Tem a certeza que deseja eliminar este Workplace? Os turnos e locadores associados ficarão órfãos.")) {
      await deleteDoc(doc(db, "workplaces", id));
    }
  };

  const togglePlanInWorkplace = async (workplace: Workplace, planId: string) => {
    const isIncluded = workplace.planIds?.includes(planId) || false;
    const newPlanIds = isIncluded 
      ? workplace.planIds.filter(id => id !== planId)
      : [...(workplace.planIds || []), planId];
    
    await updateDoc(doc(db, "workplaces", workplace.id), { planIds: newPlanIds });
  };

  if (loading) return <div>A carregar workplaces...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ color: "var(--color-primary)", margin: 0, display: "none" }}>Gestão de Workplaces</h3>
        <button className="btn btn-primary" onClick={() => setShowNewWorkplace(true)}>
          <Plus size={16} /> Novo Workplace
        </button>
      </div>

      {showNewWorkplace && (
        <div style={{ padding: "1.5rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", border: "1px solid var(--color-border)" }}>
          <h4>Criar Novo Workplace</h4>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Nome</label>
              <input type="text" className="input" value={newWorkplaceName} onChange={e => setNewWorkplaceName(e.target.value)} placeholder="ex: Zona Norte" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Capitão Responsável</label>
              <select className="input" value={newWorkplaceCaptain} onChange={e => setNewWorkplaceCaptain(e.target.value)}>
                <option value="">Selecione um Capitão</option>
                {captains.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button className="btn btn-success" onClick={handleCreateWorkplace} disabled={!newWorkplaceName || !newWorkplaceCaptain}>Gravar</button>
            <button className="btn btn-secondary" onClick={() => setShowNewWorkplace(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {workplaces.length === 0 && !showNewWorkplace ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Ainda não existem workplaces criados.</p>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {workplaces.map(workplace => {
            const captain = captains.find(c => c.id === workplace.captainId);
            const isEditing = editingWorkplace?.id === workplace.id;

            return (
              <div key={workplace.id} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ background: "var(--color-surface)", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: isEditing ? "1px solid var(--color-border)" : "none" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{workplace.name}</h4>
                    <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Capitão: {captain?.name || "Desconhecido"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => setEditingWorkplace(isEditing ? null : workplace)} className="btn btn-secondary" style={{ padding: "0.5rem" }}>
                      {isEditing ? <X size={16} /> : <Edit2 size={16} />}
                    </button>
                    <button onClick={() => handleDeleteWorkplace(workplace.id)} className="btn btn-danger" style={{ padding: "0.5rem" }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Editor Body */}
                {isEditing && (
                  <div style={{ padding: "1.5rem", background: "var(--color-bg)", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                    
                    {/* Plans Assignment */}
                    <div style={{ flex: "1 1 300px" }}>
                      <h5 style={{ marginBottom: "0.5rem" }}>Plantas Atribuídas</h5>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "200px", overflowY: "auto", paddingRight: "0.5rem" }}>
                        {plans.map(plan => {
                          const isAssigned = workplace.planIds?.includes(plan.id);
                          return (
                            <label key={plan.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", background: "var(--color-surface)", padding: "0.5rem", borderRadius: "var(--radius-md)", border: `1px solid ${isAssigned ? 'var(--color-primary)' : 'var(--color-border)'}` }}>
                              <input type="checkbox" checked={isAssigned || false} onChange={() => togglePlanInWorkplace(workplace, plan.id)} style={{ cursor: "pointer" }} />
                              <span style={{ fontSize: "0.875rem", color: isAssigned ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>{plan.name}</span>
                            </label>
                          );
                        })}
                        {plans.length === 0 && <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Nenhuma planta disponível.</span>}
                      </div>
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
