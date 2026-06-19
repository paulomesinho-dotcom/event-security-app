"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { Map, Plus, Trash2 } from "lucide-react";
import { ShiftModel } from "./ShiftModelManager";

export interface AbstractLocation {
  id: string;
  local: string;
  sublocal: string;
  subsublocal: string;
  captainId: string;
  workplaceId?: string;
  shiftModelId?: string; // Legacy support
}

export default function LocationManager() {
  const { user } = useAuth();
  const { activeWorkplaceId, activeWorkplace } = useWorkplace();
  const [locations, setLocations] = useState<AbstractLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [local, setLocal] = useState("");
  const [sublocal, setSublocal] = useState("");
  const [subsublocal, setSubsublocal] = useState("");

  useEffect(() => {
    if (!user || !activeWorkplaceId) {
      setLocations([]);
      setLoading(false);
      return;
    }
    
    const captainId = activeWorkplace?.captainId || user.uid;

    // Fetch Locations
    const qLoc = query(collection(db, "abstract_locations"), where("captainId", "==", captainId));
    const unsubLoc = onSnapshot(qLoc, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setLocations(data.filter(l => l.workplaceId === activeWorkplaceId));
      setLoading(false);
    });

    return () => unsubLoc();
  }, [user, activeWorkplaceId, activeWorkplace]);

  const handleCreate = async () => {
    if (!local || !activeWorkplaceId) return;
    await addDoc(collection(db, "abstract_locations"), {
      local, sublocal, subsublocal, 
      captainId: activeWorkplace?.captainId || user?.uid,
      workplaceId: activeWorkplaceId
    });
    setLocal(""); setSublocal(""); setSubsublocal("");
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
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-success" onClick={handleCreate} disabled={!local}>Gravar</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
        {locations.map(l => (
            <div key={l.id} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", position: "relative" }}>
              <button onClick={() => handleDelete(l.id)} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "transparent", border: "none", color: "var(--color-danger)", cursor: "pointer" }}>
                <Trash2 size={16} />
              </button>
              <h4 style={{ margin: "0 0 0.5rem 0", paddingRight: "1.5rem" }}>{l.local}</h4>
              <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                {l.sublocal && <div>{l.sublocal}</div>}
                {l.subsublocal && <div>{l.subsublocal}</div>}
              </div>
            </div>
        ))}
        {locations.length === 0 && !showForm && <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Nenhum local criado.</p>}
      </div>
    </div>
  );
}
