"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { Clock, Plus, Trash2 } from "lucide-react";

export interface ShiftModel {
  id: string;
  name: string;
  dates: string[]; // Replaced days string with array of dates
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  captainId: string;
  days?: string; // Legacy support
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
  const [morningStart, setMorningStart] = useState("");
  const [morningEnd, setMorningEnd] = useState("");
  const [afternoonStart, setAfternoonStart] = useState("");
  const [afternoonEnd, setAfternoonEnd] = useState("");

  useEffect(() => {
    if (!user || !activeWorkplaceId) {
      setModels([]);
      setLoading(false);
      return;
    }
    
    // We query by captainId to get all legacy models, but filter by workplaceId in memory if available
    const q = query(collection(db, "shift_models"), where("captainId", "==", activeWorkplace?.captainId || user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // Show models that belong to this workplace OR legacy models that have no workplaceId
      const filtered = data.filter(m => m.workplaceId === activeWorkplaceId || !m.workplaceId);
      setModels(filtered);
      setLoading(false);
    });
    return () => unsub();
  }, [user, activeWorkplaceId, activeWorkplace]);

  const handleCreate = async () => {
    if (!name || dates.length === 0 || (!morningStart && !afternoonStart) || !activeWorkplaceId) return;
    await addDoc(collection(db, "shift_models"), {
      name, dates, morningStart, morningEnd, afternoonStart, afternoonEnd, 
      captainId: activeWorkplace?.captainId || user?.uid,
      workplaceId: activeWorkplaceId
    });
    setName(""); setDates([]); setCurrentDate(""); setMorningStart(""); setMorningEnd(""); setAfternoonStart(""); setAfternoonEnd("");
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Designação</label>
              <input type="text" className="input" placeholder="Ex: Fim de Semana" value={name} onChange={e => setName(e.target.value)} />
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
            
            <div>
              <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Manhã (Início - Fim)</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                 <input type="time" className="input" value={morningStart} onChange={e => setMorningStart(e.target.value)} />
                 <input type="time" className="input" value={morningEnd} onChange={e => setMorningEnd(e.target.value)} />
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Tarde (Início - Fim)</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                 <input type="time" className="input" value={afternoonStart} onChange={e => setAfternoonStart(e.target.value)} />
                 <input type="time" className="input" value={afternoonEnd} onChange={e => setAfternoonEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-success" onClick={handleCreate}>Gravar</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
        {models.map(m => (
          <div key={m.id} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", position: "relative" }}>
            <button onClick={() => handleDelete(m.id)} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "transparent", border: "none", color: "var(--color-danger)", cursor: "pointer" }}>
              <Trash2 size={16} />
            </button>
            <h4 style={{ margin: "0 0 0.5rem 0", paddingRight: "1.5rem" }}>{m.name}</h4>
            <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
              <strong>Datas:</strong> {m.dates ? m.dates.join(", ") : m.days || "--"}<br/>
              <strong>Manhã:</strong> {m.morningStart && m.morningEnd ? `${m.morningStart} - ${m.morningEnd}` : "--"}<br/>
              <strong>Tarde:</strong> {m.afternoonStart && m.afternoonEnd ? `${m.afternoonStart} - ${m.afternoonEnd}` : "--"}
            </div>
          </div>
        ))}
        {models.length === 0 && !showForm && <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Sem modelos criados.</p>}
      </div>
    </div>
  );
}
