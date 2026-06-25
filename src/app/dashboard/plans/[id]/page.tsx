"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import dynamic from "next/dynamic";
const MapViewer = dynamic(() => import("@/components/MapViewer"), { ssr: false });
import { ArrowLeft, Bell } from "lucide-react";
import { AbstractLocation } from "@/components/LocationManager";
import NotificationModal from "@/components/NotificationModal";

interface Locator {
  id: string;
  x: number;
  y: number;
  name: string;
  locationId?: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  teamId?: string;
}

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { activeWorkplace, activeWorkplaceId } = useWorkplace();
  
  const planId = params.id as string;
  
  const [plan, setPlan] = useState<{ name: string; imageUrl: string } | null>(null);
  const [locators, setLocators] = useState<Locator[]>([]);
  const [loading, setLoading] = useState(true);

  // Captain Data
  const [locations, setLocations] = useState<AbstractLocation[]>([]);
      
  // Modal add locator
  const [showLocModal, setShowLocModal] = useState(false);
  const [newLocCoords, setNewLocCoords] = useState<{x: number, y: number} | null>(null);
  const [newLocName, setNewLocName] = useState("");
  const [newLocColor, setNewLocColor] = useState("#ef4444"); // default red
  const [selectedLocationId, setSelectedLocationId] = useState("");

  // Modal assign shift
    const [selectedLocator, setSelectedLocator] = useState<Locator | null>(null);
  const [showLocatorInfoModal, setShowLocatorInfoModal] = useState(false);
        
  // Toggle Mode for adding pins
  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [isDragPinMode, setIsDragPinMode] = useState(false);

  // Shifts for selected pin
  const [locatorShifts, setLocatorShifts] = useState<any[]>([]);
  const [locatorUsers, setLocatorUsers] = useState<Record<string, string>>({});

  // Custom notification modal
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifPersonId, setNotifPersonId] = useState("");

  useEffect(() => {
    if (!selectedLocator || !showLocatorInfoModal) {
      setLocatorShifts([]);
      return;
    }
    const unsub = onSnapshot(query(collection(db, "shifts"), where("locatorId", "==", selectedLocator.id)), async snap => {
      const s = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setLocatorShifts(s);
      
      const uMap: Record<string, string> = { ...locatorUsers };
      for (const shift of s) {
        if (shift.personId && !uMap[shift.personId]) {
           const uSnap = await getDoc(doc(db, "users", shift.personId));
           if (uSnap.exists()) {
             uMap[shift.personId] = uSnap.data().name;
           }
        }
      }
      setLocatorUsers(uMap);
    });
    return () => unsub();
  }, [selectedLocator, showLocatorInfoModal]);

  const handleSendNotification = (vigiaId: string) => {
    setNotifPersonId(vigiaId);
    setShowNotifModal(true);
  };

  useEffect(() => {
    const fetchPlan = async () => {
      const docRef = doc(db, "plans", planId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPlan(docSnap.data() as any);
      } else {
        router.push("/dashboard");
      }
    };
    fetchPlan();

    const unsubLocators = onSnapshot(query(collection(db, "locators"), where("planId", "==", planId)), (snapshot) => {
      setLocators(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Locator)));
      setLoading(false);
    });

    return () => unsubLocators();
  }, [planId, router]);

  useEffect(() => {
    if (user?.role !== "captain" || !activeWorkplaceId) return;

    // Verify if current plan belongs to active workplace
    if (activeWorkplace && activeWorkplace.planIds && !activeWorkplace.planIds.includes(planId)) {
      router.push("/dashboard");
      return;
    }

    // Fetch Locations
    const unsubLocs = onSnapshot(query(collection(db, "abstract_locations"), where("workplaceId", "in", [activeWorkplaceId, "global"])), snap => {
       setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as AbstractLocation)));
    });

    return () => { unsubLocs(); };
  }, [user, activeWorkplaceId, activeWorkplace, planId, router]);

  const handleAddLocatorClick = (x: number, y: number) => {
    if (user?.role !== "captain") return;
    setNewLocCoords({ x, y });
    setIsAddPinMode(false); // Turn off pin mode once clicked to prevent accidental clicks after
    setShowLocModal(true);
  };

  const saveLocator = async () => {
    if (!newLocCoords || !newLocName || !selectedLocationId) return;
    await addDoc(collection(db, "locators"), {
      planId,
      x: newLocCoords.x,
      y: newLocCoords.y,
      name: newLocName,
      color: newLocColor,
      locationId: selectedLocationId,
      captainId: user?.uid
    });
    setShowLocModal(false);
    setNewLocName(""); setNewLocColor("#ef4444"); setSelectedLocationId(""); setNewLocCoords(null);
  };

  const handleLocatorClick = async (loc: Locator) => {
    if (user?.role !== "captain") return;
    setSelectedLocator(loc);
    setShowLocatorInfoModal(true);
  };

  
  
  const deleteLocator = async (locId: string) => {
    if (!confirm("Tem a certeza que deseja apagar este pino e todas as escalas associadas?")) return;
    try {
      await deleteDoc(doc(db, "locators", locId));
      // Delete associated assignments and shifts
      const qAssignments = query(collection(db, "assignments"), where("locatorId", "==", locId));
      const snapAssignments = await getDocs(qAssignments);
      for (const d of snapAssignments.docs) {
         await deleteDoc(doc(db, "assignments", d.id));
      }
      
      const qShifts = query(collection(db, "shifts"), where("locatorId", "==", locId));
      const snapShifts = await getDocs(qShifts);
      for (const d of snapShifts.docs) {
         await deleteDoc(doc(db, "shifts", d.id));
      }

      setLocators(prev => prev.filter(l => l.id !== locId));
      setShowLocatorInfoModal(false);
      setSelectedLocator(null);
      
      alert("Pino apagado com sucesso.");
    } catch (err) {
      console.error(err);
      alert("Erro ao apagar pino.");
    }
  };

  

  const handleLocatorDragEnd = async (locatorId: string, x: number, y: number) => {
    if (user?.role !== "captain") return;
    try {
      await updateDoc(doc(db, "locators", locatorId), { x, y });
      setLocators(prev => prev.map(l => l.id === locatorId ? { ...l, x, y } : l));
    } catch (err) {
      console.error("Erro ao mover o pino:", err);
      alert("Erro ao guardar a nova posição do pino.");
    }
  };

  if (loading || !plan) return <div style={{ padding: "2rem" }}>A carregar a planta...</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <button onClick={() => router.push("/dashboard")} className="btn" style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-secondary)" }}>
        <ArrowLeft size={16} /> Voltar ao Painel
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: "0.25rem" }}>{plan.name}</h2>
          {user?.role === "captain" && (
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
              Pode arrastar os pinos para os mover, ou clicar num para atribuir Vigias à escala.
            </span>
          )}
        </div>
        {user?.role === "captain" && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button 
               className={`btn ${isDragPinMode ? 'btn-warning' : 'btn-outline'}`}
               onClick={() => setIsDragPinMode(!isDragPinMode)}
               style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
               {isDragPinMode ? "Bloquear Pinos" : "Mover Pinos"}
            </button>
            <button 
               className={`btn ${isAddPinMode ? 'btn-danger' : 'btn-primary'}`}
               onClick={() => setIsAddPinMode(!isAddPinMode)}
               style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
               {isAddPinMode ? "Cancelar Inserção" : "Adicionar Pino ao Mapa"}
            </button>
          </div>
        )}
      </div>

      <div style={{ height: "65vh", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <MapViewer 
           imageUrl={plan.imageUrl} 
           locators={locators} 
           onAddLocator={isAddPinMode ? handleAddLocatorClick : undefined} 
           onLocatorClick={handleLocatorClick} 
           onLocatorDragEnd={handleLocatorDragEnd}
           isAddPinMode={isAddPinMode}
           isDragPinMode={isDragPinMode}
        />
      </div>

      {/* Modal for new Locator */}
      {showLocModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass" style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px" }}>
            <h3>Nova Posição de Segurança</h3>
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Nome da Posição do Pino no Mapa</label>
                <input type="text" className="input" value={newLocName} onChange={(e) => setNewLocName(e.target.value)} placeholder="Ex: Pino Principal Sul" autoFocus />
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Cor do Pino</label>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                   {["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"].map(c => (
                     <div 
                        key={c}
                        onClick={() => setNewLocColor(c)}
                        style={{ 
                          width: "24px", height: "24px", borderRadius: "50%", background: c, cursor: "pointer",
                          border: newLocColor === c ? "3px solid var(--color-primary)" : "2px solid transparent",
                          outline: newLocColor === c ? "2px solid white" : "none"
                        }}
                     />
                   ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Ligar a um Local Abstrato</label>
                <select className="input" value={selectedLocationId} onChange={e => setSelectedLocationId(e.target.value)}>
                   <option value="">Selecione o Local criado...</option>
                   {locations.map(l => (
                     <option key={l.id} value={l.id}>
                        {l.local} {l.sublocal ? `- ${l.sublocal}` : ''} {l.subsublocal ? `- ${l.subsublocal}` : ''}
                     </option>
                   ))}
                </select>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>Os horários de turno predefinidos para este Local serão aplicados automaticamente.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <button className="btn btn-secondary" onClick={() => setShowLocModal(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveLocator} disabled={!newLocName || !selectedLocationId} style={{ flex: 1 }}>Criar Pino</button>
            </div>
          </div>
        </div>
      )}

      
      {/* Modal Locator Info */}
      {showLocatorInfoModal && selectedLocator && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass" style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "450px" }}>
            <h3 style={{ margin: 0, marginBottom: "1rem" }}>Pino: {selectedLocator.name}</h3>
            
            <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "1.5rem" }}>
              <h4 style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem", marginTop: 0 }}>Turnos Associados:</h4>
              {locatorShifts.length === 0 ? (
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Não há turnos atribuídos a este pino.</p>
              ) : (
                locatorShifts.map(shift => (
                  <div key={shift.id} style={{ padding: "0.75rem", background: "rgba(255,255,255,0.05)", borderRadius: "var(--radius-md)", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                         <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>{shift.name}</p>
                         <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{shift.days} | {shift.time}</p>
                         <p style={{ margin: 0, fontSize: "0.85rem", marginTop: "0.25rem" }}>
                           Vigia: <strong style={{ color: "var(--color-primary)" }}>{locatorUsers[shift.personId] || "A carregar..."}</strong>
                         </p>
                         <p style={{ margin: 0, fontSize: "0.75rem", marginTop: "0.25rem", color: shift.status === "active" ? "#10b981" : "var(--color-text-secondary)" }}>
                           Estado: {shift.status === "active" ? "Em Curso" : shift.status === "completed" ? "Terminado" : "Pendente"}
                         </p>
                      </div>
                      <button 
                        onClick={() => handleSendNotification(shift.personId)}
                        className="btn btn-outline"
                        style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem", height: "fit-content" }}
                      >
                        Notificar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "1.5rem", textAlign: "center" }}>
              Para gerir a escala de turnos aceda à <strong>Página de Turnos</strong>.
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
               <button type="button" className="btn btn-secondary" onClick={() => setShowLocatorInfoModal(false)} style={{ flex: 1 }}>Fechar</button>
               <button 
                 onClick={(e) => { e.preventDefault(); deleteLocator(selectedLocator.id); }}
                 style={{ flex: 1 }}
                 className="btn btn-danger"
               >
                 Apagar Pino
               </button>
            </div>
          </div>
        </div>
      )}

      <NotificationModal
        isOpen={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        selectedPersonId={notifPersonId}
        usersMap={locatorUsers}
        allVigiaIds={locatorShifts.map(s => s.personId)}
      />
    </div>
  );
}
