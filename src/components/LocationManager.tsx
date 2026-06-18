"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Map, Plus, Trash2 } from "lucide-react";
import { ShiftModel } from "./ShiftModelManager";

export interface AbstractLocation {
  id: string;
  local: string;
  sublocal: string;
  subsublocal: string;
  shiftModelId: string;
  captainId: string;
}

export default function LocationManager() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<AbstractLocation[]>([]);
  const [models, setModels] = useState<ShiftModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [local, setLocal] = useState("");
  const [sublocal, setSublocal] = useState("");
  const [subsublocal, setSubsublocal] = useState("");
  const [shiftModelId, setShiftModelId] = useState("");

  useEffect(() => {
    if (!user) return;
    
    // Fetch Locations
    const qLoc = query(collection(db, "abstract_locations"), where("captainId", "==", user.uid));
    const unsubLoc = onSnapshot(qLoc, (snap) => {
      setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as AbstractLocation)));
    });

    // Fetch Shift Models
    const qMod = query(collection(db, "shift_models"), where("captainId", "==", user.uid));
    const unsubMod = onSnapshot(qMod, (snap) => {
      setModels(snap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftModel)));
      setLoading(false);
    });

    return () => { unsubLoc(); unsubMod(); };
  }, [user]);

  const handleCreate = async () => {
    if (!local || !shiftModelId) return;
    await addDoc(collection(db, "abstract_locations"), {
      local, sublocal, subsublocal, shiftModelId, captainId: user?.uid
    });
    setLocal(""); setSublocal(""); setSubsublocal(""); setShiftModelId("");
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Eliminar este local?")) {
      await deleteDoc(doc(db, "abstract_locations", id));
    }
  };

  if (loading) return <div>A carregar locais...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ color: "var(--color-primary)", margin: 0, display: "none", alignItems: "center", gap: "0.5rem" }}>
          <Map size={20} /> Gestão de Locais
        </h3>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Novo Local
        </button>
      </div>

      {showForm && (
        <div style={{ padding: "1.5rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", border: "1px solid var(--color-border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
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
            <div>
              <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Modelo de Turno Aplicável</label>
              <select className="input" value={shiftModelId} onChange={e => setShiftModelId(e.target.value)} required>
                 <option value="">Selecione um Modelo...</option>
                 {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-success" onClick={handleCreate} disabled={!local || !shiftModelId}>Gravar</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
        {locations.map(l => {
          const m = models.find(mod => mod.id === l.shiftModelId);
          return (
            <div key={l.id} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", position: "relative" }}>
              <button onClick={() => handleDelete(l.id)} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "transparent", border: "none", color: "var(--color-danger)", cursor: "pointer" }}>
                <Trash2 size={16} />
              </button>
              <h4 style={{ margin: "0 0 0.5rem 0", paddingRight: "1.5rem" }}>{l.local}</h4>
              <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                {l.sublocal && <div>{l.sublocal}</div>}
                {l.subsublocal && <div>{l.subsublocal}</div>}
                <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--color-border)", color: "var(--color-primary)" }}>
                   <strong>Turno:</strong> {m ? m.name : "Desconhecido"}
                </div>
              </div>
            </div>
          )
        })}
        {locations.length === 0 && !showForm && <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Nenhum local criado.</p>}
      </div>
    </div>
  );
}
