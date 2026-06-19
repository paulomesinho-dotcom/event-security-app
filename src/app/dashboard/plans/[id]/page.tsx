"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import dynamic from "next/dynamic";
const MapViewer = dynamic(() => import("@/components/MapViewer"), { ssr: false });
import { ArrowLeft, Bell } from "lucide-react";
import { AbstractLocation } from "@/components/LocationManager";
import { ShiftModel } from "@/components/ShiftModelManager";

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
  
  const planId = params.id as string;
  
  const [plan, setPlan] = useState<{ name: string; imageUrl: string } | null>(null);
  const [locators, setLocators] = useState<Locator[]>([]);
  const [loading, setLoading] = useState(true);

  // Captain Data
  const [locations, setLocations] = useState<AbstractLocation[]>([]);
  const [shiftModels, setShiftModels] = useState<ShiftModel[]>([]);
  const [availableVigias, setAvailableVigias] = useState<User[]>([]);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);

  // Modal add locator
  const [showLocModal, setShowLocModal] = useState(false);
  const [newLocCoords, setNewLocCoords] = useState<{x: number, y: number} | null>(null);
  const [newLocName, setNewLocName] = useState("");
  const [newLocColor, setNewLocColor] = useState("#ef4444"); // default red
  const [selectedLocationId, setSelectedLocationId] = useState("");

  // Modal assign shift
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedLocator, setSelectedLocator] = useState<Locator | null>(null);
  const [selectedVigia, setSelectedVigia] = useState("");
  const [selectedShiftModelId, setSelectedShiftModelId] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [currentAssignments, setCurrentAssignments] = useState<any[]>([]);

  // Toggle Mode for adding pins
  const [isAddPinMode, setIsAddPinMode] = useState(false);

  // Custom notification modal
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifMessage, setNotifMessage] = useState("");

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
    if (user?.role !== "captain") return;

    // Fetch Locations
    const unsubLocs = onSnapshot(query(collection(db, "abstract_locations"), where("captainId", "==", user.uid)), snap => {
       setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as AbstractLocation)));
    });

    // Fetch Shift Models
    const unsubModels = onSnapshot(query(collection(db, "shift_models"), where("captainId", "==", user.uid)), snap => {
       setShiftModels(snap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftModel)));
    });

    // Fetch Vigias (Team + Loans)
    const fetchVigias = async () => {
      const allVigias: User[] = [];
      const teamSnap = await getDocs(query(collection(db, "users"), where("teamId", "==", user.uid)));
      teamSnap.forEach(d => allVigias.push({ id: d.id, ...d.data() } as User));

      const loanSnap = await getDocs(query(collection(db, "loans"), where("toCaptainId", "==", user.uid), where("status", "==", "active")));
      for (const ld of loanSnap.docs) {
         const vigiaSnap = await getDoc(doc(db, "users", ld.data().vigiaId));
         if (vigiaSnap.exists()) {
            allVigias.push({ id: vigiaSnap.id, ...vigiaSnap.data() } as User);
         }
      }
      setAvailableVigias(allVigias);
    };
    fetchVigias();

    // Fetch All Assignments for conflict checking
    const unsubAssignments = onSnapshot(query(collection(db, "assignments"), where("captainId", "==", user.uid)), snap => {
       setAllAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubLocs(); unsubModels(); unsubAssignments(); };
  }, [user]);

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

    // Fetch existing assignments
    const qAssignment = query(collection(db, "assignments"), where("locatorId", "==", loc.id));
    const snap = await getDocs(qAssignment);
    const assigns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setCurrentAssignments(assigns);
    setSelectedVigia("");
    setSelectedShiftModelId("");
    setSelectedPeriodId("");

    setShowShiftModal(true);
  };

  const assignShift = async () => {
    if (!selectedLocator || !selectedVigia || !selectedShiftModelId || !selectedPeriodId) return;

    const modelInfo = shiftModels.find(m => m.id === selectedShiftModelId) as any;
    const periodInfo = modelInfo?.periods?.find((p: any) => p.id === selectedPeriodId);
    
    if (!modelInfo || !periodInfo) return;

    const modelDates = modelInfo?.dates ? modelInfo.dates.join(", ") : (modelInfo?.days || "");

    // Check for conflicts
    const qConflicts = query(collection(db, "assignments"), 
      where("vigiaId", "==", selectedVigia), 
      where("dates", "==", modelDates)
    );
    const conflictsSnap = await getDocs(qConflicts);
    let hasConflict = false;
    
    conflictsSnap.forEach(d => {
       const a = d.data();
       // Conflict if periods overlap exactly (simplification: same period id or legacy logic)
       if (a.periodId === selectedPeriodId || a.period === "both") {
          hasConflict = true;
       }
    });

    if (hasConflict) {
       alert("Erro: O vigia selecionado já tem um turno atribuído neste período/datas!");
       return;
    }

    const locationInfo = locations.find(l => l.id === selectedLocator.locationId);

    // Save modern assignment
    const assignmentData = {
       vigiaId: selectedVigia,
       locationId: selectedLocator.locationId,
       locatorId: selectedLocator.id,
       shiftModelId: selectedShiftModelId,
       periodId: selectedPeriodId,
       periodName: periodInfo.name,
       dates: modelDates,
       captainId: user?.uid
    };

    const ref = await addDoc(collection(db, "assignments"), assignmentData);
    const assignmentRefId = ref.id;

    const shiftTimeStr = `${periodInfo.name} (${periodInfo.start} - ${periodInfo.end})`;

    await addDoc(collection(db, "shifts"), {
       assignmentId: assignmentRefId,
       locatorId: selectedLocator.id,
       locatorName: selectedLocator.name,
       local: locationInfo?.local || "",
       sublocal: locationInfo?.sublocal || "",
       subsublocal: locationInfo?.subsublocal || "",
       planId,
       personId: selectedVigia,
       captainId: user?.uid,
       name: `${locationInfo?.local || selectedLocator.name} - ${periodInfo.name}`,
       time: shiftTimeStr,
       days: modelDates,
       status: "pending",
       startTime: new Date().toISOString(),
    });

    setShowShiftModal(false);
    setSelectedLocator(null);
    setSelectedVigia("");
    setSelectedShiftModelId("");
    setSelectedPeriodId("");
    setCurrentAssignments([]);
    alert("Escala gravada com sucesso!");
  };

  const deleteAssignment = async (assignId: string) => {
    if (!confirm("Tem a certeza que deseja remover este vigia desta localização?")) return;
    try {
      await deleteDoc(doc(db, "assignments", assignId));
      const qShifts = query(collection(db, "shifts"), where("assignmentId", "==", assignId));
      const snap = await getDocs(qShifts);
      for (const d of snap.docs) {
         await deleteDoc(doc(db, "shifts", d.id));
      }
      setCurrentAssignments(prev => prev.filter(a => a.id !== assignId));
    } catch (err) {
      console.error(err);
      alert("Erro ao remover a escala.");
    }
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
      setShowShiftModal(false);
      setSelectedLocator(null);
      setCurrentAssignments([]);
      alert("Pino apagado com sucesso.");
    } catch (err) {
      console.error(err);
      alert("Erro ao apagar pino.");
    }
  };

  const sendNotification = async () => {
    if (!selectedVigia || !notifMessage.trim()) return;

    // 1. Save to Firestore (for in-app notification when app is open)
    await addDoc(collection(db, "notifications"), {
      vigiaId: selectedVigia,
      message: notifMessage.trim(),
      read: false,
      createdAt: new Date().toISOString()
    });

    // 2. Send FCM push notification (works when app is closed/background)
    try {
      const res = await fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vigiaId: selectedVigia,
          message: notifMessage.trim(),
          title: "Porto 2026 Security"
        })
      });
      const data = await res.json();
      if (data.code === "NO_FCM_TOKEN") {
        console.info("Vigia ainda não activou notificações push — notificação in-app enviada.");
      }
    } catch (e) {
      console.warn("FCM push falhou (funciona apenas com HTTPS):", e);
    }

    setNotifMessage("");
    setShowNotifModal(false);
    alert("Notificação enviada com sucesso!");
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
          <button 
             className={`btn ${isAddPinMode ? 'btn-danger' : 'btn-primary'}`}
             onClick={() => setIsAddPinMode(!isAddPinMode)}
             style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
             {isAddPinMode ? "Cancelar Inserção" : "Adicionar Pino ao Mapa"}
          </button>
        )}
      </div>

      <MapViewer 
         imageUrl={plan.imageUrl} 
         locators={locators} 
         onAddLocator={isAddPinMode ? handleAddLocatorClick : undefined} 
         onLocatorClick={handleLocatorClick} 
         onLocatorDragEnd={handleLocatorDragEnd}
         isAddPinMode={isAddPinMode}
      />

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
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>O Modelo de Turno associado a este Local será utilizado nas atribuições.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <button className="btn btn-secondary" onClick={() => setShowLocModal(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveLocator} disabled={!newLocName || !selectedLocationId} style={{ flex: 1 }}>Criar Pino</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Assign Shift */}
      {showShiftModal && selectedLocator && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass" style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "450px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0 }}>Gerir Escalas: {selectedLocator.name}</h3>
              <button 
                onClick={(e) => { e.preventDefault(); deleteLocator(selectedLocator.id); }}
                style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--color-danger)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "0.25rem 0.75rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
              >
                Apagar Pino
              </button>
            </div>
            {/* Lista de Escalas Atuais */}
            {currentAssignments.length > 0 && (
              <div style={{ marginBottom: "2rem" }}>
                <h4 style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "0.5rem" }}>Vigias Escalados:</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {currentAssignments.map(assign => {
                    const vName = availableVigias.find(v => v.id === assign.vigiaId)?.name || "Vigia Removido";
                    const pName = assign.periodName || (assign.period === "morning" ? "Manhã" : assign.period === "afternoon" ? "Tarde" : "Dia Inteiro");
                    return (
                      <div key={assign.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-bg)", padding: "0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                        <div>
                          <strong>{vName}</strong>
                          <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Turno: {pName}</div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button 
                            onClick={(e) => {
                               e.preventDefault();
                               setSelectedVigia(assign.vigiaId);
                               setNotifMessage("");
                               setShowNotifModal(true);
                            }}
                            style={{ background: "transparent", border: "none", color: "var(--color-primary)", cursor: "pointer", padding: "0.5rem" }}
                            title="Notificar Vigia"
                          >
                            <Bell size={18} />
                          </button>
                          <button 
                            onClick={(e) => { e.preventDefault(); deleteAssignment(assign.id); }}
                            style={{ background: "transparent", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: "0.5rem" }}
                            title="Remover Vigia"
                          >
                            Apagar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={assignShift} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h4 style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "0", borderTop: currentAssignments.length > 0 ? "1px solid var(--color-border)" : "none", paddingTop: currentAssignments.length > 0 ? "1.5rem" : "0" }}>
                Adicionar Novo Turno
              </h4>
              <>
                  <div>
                    <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Modelo de Turno</label>
                    <select className="input" value={selectedShiftModelId} onChange={(e) => { setSelectedShiftModelId(e.target.value); setSelectedPeriodId(""); }}>
                      <option value="">-- Selecione o Modelo --</option>
                      {shiftModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>

                  {selectedShiftModelId && (
                    <div>
                      <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Período a Cumprir</label>
                      <select className="input" value={selectedPeriodId} onChange={(e) => setSelectedPeriodId(e.target.value)}>
                        <option value="">-- Selecione o Período --</option>
                        {shiftModels.find(m => m.id === selectedShiftModelId)?.periods?.map((p: any) => (
                           <option key={p.id} value={p.id}>{p.name} ({p.start} - {p.end})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedPeriodId && (() => {
                     const mod = shiftModels.find(m => m.id === selectedShiftModelId) as any;
                     const modelDatesStr = mod?.dates ? mod.dates.join(", ") : (mod?.days || "");
                     const modelDatesArr = modelDatesStr.split(",").map((s: string) => s.trim()).filter((s: string) => s);

                     const busyVigias = allAssignments.filter(a => {
                        // Check if it's the exact same period, or overlapping legacy periods
                        if (a.periodId !== selectedPeriodId && a.period !== "both") return false;
                        
                        // Check if dates overlap
                        const aDatesArr = (a.dates || "").split(",").map((s: string) => s.trim()).filter((s: string) => s);
                        return aDatesArr.some((d: string) => modelDatesArr.includes(d));
                     }).map(a => a.vigiaId);

                     const filteredVigias = availableVigias.filter(v => !busyVigias.includes(v.id));

                     return (
                        <div>
                          <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Vigia</label>
                          <select className="input" value={selectedVigia} onChange={(e) => setSelectedVigia(e.target.value)}>
                            <option value="">-- Selecione o Vigia Livre --</option>
                            {filteredVigias.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                          {busyVigias.length > 0 && <p style={{ fontSize: "0.75rem", color: "var(--color-danger)", marginTop: "0.25rem" }}>{busyVigias.length} vigia(s) oculto(s) por indisponibilidade neste turno.</p>}
                        </div>
                     );
                  })()}
                </>
            </form>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", flexDirection: "column" }}>
               <button className="btn btn-primary" onClick={assignShift} disabled={!selectedVigia}>Adicionar Turno</button>
               <button type="button" className="btn" onClick={() => setShowShiftModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Notification Modal */}
      {showNotifModal && selectedVigia && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "460px", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "rgba(239,68,68,0.1)", padding: "0.75rem", borderRadius: "50%" }}>
                <Bell size={20} color="var(--color-danger)" />
              </div>
              <div>
                <h3 style={{ margin: 0 }}>Enviar Notificação</h3>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                  Para: <strong>{availableVigias.find(v => v.id === selectedVigia)?.name || "Vigia"}</strong>
                </p>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.5rem" }}>Mensagem Personalizada</label>
              <textarea
                className="input"
                rows={4}
                placeholder="Ex: Por favor dirija-se ao posto de controlo principal com urgência."
                value={notifMessage}
                onChange={e => setNotifMessage(e.target.value)}
                style={{ resize: "vertical", lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {["Dirija-se ao posto de controlo.", "Contacte o Capitão de Zona com urgência.", "Há uma ocorrência na sua área. Atenção redobrada."].map(preset => (
                <button key={preset} onClick={() => setNotifMessage(preset)} style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", borderRadius: "999px", border: "1px solid var(--color-border)", background: notifMessage === preset ? "var(--color-primary-light)" : "var(--color-bg)", color: notifMessage === preset ? "var(--color-primary)" : "var(--color-text-secondary)", cursor: "pointer" }}>
                  {preset}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn" onClick={() => setShowNotifModal(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn btn-danger" onClick={sendNotification} disabled={!notifMessage.trim()} style={{ flex: 1 }}>Enviar Notificação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
