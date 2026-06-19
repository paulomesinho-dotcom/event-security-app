"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { Clock, Plus, Trash2 } from "lucide-react";

export interface ShiftPeriod {
  id: string;
  name: string;
  start: string;
  end: string;
}

export interface ShiftModel {
  id: string;
  name: string;
  dates: string[]; // Replaced days string with array of dates
  periods: ShiftPeriod[];
  // Legacy support
  morningStart?: string;
  morningEnd?: string;
  afternoonStart?: string;
  afternoonEnd?: string;
  captainId: string;
  days?: string; 
  workplaceId?: string;
}

export default function ShiftModelManager() {
  const { user } = useAuth();
  const { activeWorkplaceId, activeWorkplace } = useWorkplace();
  const [models, setModels] = useState<ShiftModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  
  // Dynamic periods
  const [periods, setPeriods] = useState<ShiftPeriod[]>([]);
  const [periodName, setPeriodName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  useEffect(() => {
    if (!user || !activeWorkplaceId) {
      setModels([]);
      setLoading(false);
      return;
    }
    
    const q = query(collection(db, "shift_models"), where("captainId", "==", activeWorkplace?.captainId || user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const filtered = data.filter(m => m.workplaceId === activeWorkplaceId);
      setModels(filtered);
      setLoading(false);
    });
    return () => unsub();
  }, [user, activeWorkplaceId, activeWorkplace]);

  const handleCreate = async () => {
    if (!name || dates.length === 0 || periods.length === 0 || !activeWorkplaceId) return;
    await addDoc(collection(db, "shift_models"), {
      name, dates, periods,
      captainId: activeWorkplace?.captainId || user?.uid,
      workplaceId: activeWorkplaceId
    });
    setName(""); setDates([]); setCurrentDate(""); setPeriods([]);
    setShowForm(false);
  };

  const handleAddDate = () => {
    if (currentDate && !dates.includes(currentDate)) {
       setDates([...dates, currentDate].sort());
       setCurrentDate("");
    }
  };

  const handleRemoveDate = (dToRemove: string) => {
    setDates(dates.filter(d => d !== dToRemove));
  };

  const handleAddPeriod = () => {
    if (periodName && periodStart && periodEnd) {
      setPeriods([...periods, { id: Date.now().toString(), name: periodName, start: periodStart, end: periodEnd }]);
      setPeriodName(""); setPeriodStart(""); setPeriodEnd("");
    }
  };

  const handleRemovePeriod = (idToRemove: string) => {
    setPeriods(periods.filter(p => p.id !== idToRemove));
  };

  const handleDelete = async (id: string) => {
    if (confirm("Eliminar este modelo de turno?")) {
      await deleteDoc(doc(db, "shift_models", id));
    }
  };

  if (loading) return <div>A carregar modelos...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ color: "var(--color-primary)", margin: 0, display: "none", alignItems: "center", gap: "0.5rem" }}>
          <Clock size={20} /> Modelos de Turno
        </h3>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Novo Modelo
        </button>
      </div>

      {showForm && (
        <div style={{ padding: "1.5rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", border: "1px solid var(--color-border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Designação do Modelo</label>
                <input type="text" className="input" placeholder="Ex: Fim de Semana, Evento X" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Datas</label>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                   <input type="date" className="input" value={currentDate} onChange={e => setCurrentDate(e.target.value)} />
                   <button className="btn btn-secondary" onClick={handleAddDate} disabled={!currentDate}>Adicionar</button>
                </div>
                {dates.length > 0 && (
                   <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {dates.map(d => (
                         <span key={d} style={{ fontSize: "0.75rem", background: "var(--color-primary-light)", color: "var(--color-primary)", padding: "0.2rem 0.5rem", borderRadius: "4px", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            {d}
                            <span style={{ cursor: "pointer", fontWeight: "bold" }} onClick={() => handleRemoveDate(d)}>×</span>
                         </span>
                      ))}
                   </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.5rem" }}>
              <label style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text-primary)", display: "block", marginBottom: "1rem" }}>Períodos do Turno</label>
              
              {periods.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                  {periods.map(p => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
                      <div>
                        <strong style={{ color: "var(--color-primary)" }}>{p.name}</strong>
                        <span style={{ color: "var(--color-text-secondary)", marginLeft: "1rem", fontSize: "0.9rem" }}>{p.start} - {p.end}</span>
                      </div>
                      <button onClick={() => handleRemovePeriod(p.id)} style={{ background: "transparent", border: "none", color: "var(--color-danger)", cursor: "pointer" }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border)" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Nome do Período</label>
                  <input type="text" className="input" placeholder="Ex: Período 1, Manhã, Turno da Noite" value={periodName} onChange={e => setPeriodName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Início</label>
                  <input type="time" className="input" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Fim</label>
                  <input type="time" className="input" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                </div>
                <button className="btn btn-secondary" onClick={handleAddPeriod} disabled={!periodName || !periodStart || !periodEnd}>
                  <Plus size={16} /> Adicionar Período
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-success" onClick={handleCreate} disabled={!name || dates.length === 0 || periods.length === 0}>Gravar Modelo</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {models.map(m => (
          <div key={m.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", position: "relative" }}>
            <button onClick={() => handleDelete(m.id)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "transparent", border: "none", color: "var(--color-danger)", cursor: "pointer" }}>
              <Trash2 size={18} />
            </button>
            <h4 style={{ margin: "0 0 0.5rem 0", paddingRight: "2rem", color: "var(--color-text-primary)", fontSize: "1.1rem" }}>{m.name}</h4>
            <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
              <strong>Datas:</strong> {m.dates && m.dates.length > 0 ? m.dates.join(", ") : m.days || "--"}
            </div>
            
            <div>
               <strong style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.5rem" }}>Períodos:</strong>
               {m.periods && m.periods.length > 0 ? (
                 <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                   {m.periods.map(p => (
                     <div key={p.id} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "0.5rem 0.75rem", borderRadius: "4px", fontSize: "0.85rem" }}>
                       <span style={{ color: "var(--color-primary)" }}>{p.name}</span>
                       <span style={{ color: "var(--color-text-secondary)" }}>{p.start} - {p.end}</span>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div style={{ fontSize: "0.85rem", color: "var(--color-text-tertiary)" }}>
                   {/* Legacy support display */}
                   {m.morningStart && m.morningEnd && <div>Manhã: {m.morningStart} - {m.morningEnd}</div>}
                   {m.afternoonStart && m.afternoonEnd && <div>Tarde: {m.afternoonStart} - {m.afternoonEnd}</div>}
                   {!m.morningStart && !m.afternoonStart && <span>Sem períodos definidos.</span>}
                 </div>
               )}
            </div>
          </div>
        ))}
        {models.length === 0 && !showForm && <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Sem modelos criados. Clique em "Novo Modelo" para começar.</p>}
      </div>
    </div>
  );
}
