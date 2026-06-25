"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs, addDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { EVENT_TABS } from "@/constants/events";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { Save } from "lucide-react";

interface Locator {
  id: string;
  name: string;
  locationId: string;
  planId: string;
}

interface AbstractLocation { 
  customShifts?: any;
  id: string;
  local: string;
}

interface User {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  locatorId: string;
  locationId?: string;
  date: string;
  period: "manha" | "tarde" | "noite" | string;
  vigiaId: string;
  shiftId?: string;
}

interface ShiftData {
  status: string;
}

export default function ShiftsPage() {
  const { user } = useAuth();
  const { activeWorkplaceId, workplaces } = useWorkplace();

  const [locators, setLocators] = useState<Locator[]>([]);
  const [locations, setLocations] = useState<Record<string, AbstractLocation>>({});
  const [availableVigias, setAvailableVigias] = useState<User[]>([]);
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [shifts, setShifts] = useState<Record<string, ShiftData>>({});
  
  const [draftAssignments, setDraftAssignments] = useState<Assignment[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState(EVENT_TABS[0].id);
  const currentTab = EVENT_TABS.find(t => t.id === activeTab) || EVENT_TABS[0];

  const targetCaptainId = user?.role === "captain" ? user.uid : workplaces.find(w => w.id === activeWorkplaceId)?.captainId;

  type DateKey = string;
  type PeriodKey = string;

  useEffect(() => {
    if (!user || (user.role !== "captain" && user.role !== "superadmin") || !activeWorkplaceId) return;
    if (!targetCaptainId) return;

    let currentLocs: Record<string, AbstractLocation> = {};
    let currentLocators: Locator[] = [];
    let currentAssigns: Assignment[] = [];

    const fetchVigias = async () => {
        const allVigias: User[] = [];
        const addedIds = new Set<string>();

        const loanedOutIds = new Set<string>();
        const loanOutSnap = await getDocs(query(collection(db, "loans"), where("fromWorkplaceId", "==", activeWorkplaceId), where("status", "==", "active")));
        loanOutSnap.forEach(d => {
          loanedOutIds.add(d.data().vigiaId);
        });

        const teamSnap = await getDocs(query(collection(db, "users"), where("workplaceId", "==", activeWorkplaceId)));
        teamSnap.forEach(d => {
          if (!loanedOutIds.has(d.id)) {
            allVigias.push({ id: d.id, ...d.data() } as User);
            addedIds.add(d.id);
          }
        });

        const loanSnap = await getDocs(query(collection(db, "loans"), where("toWorkplaceId", "==", activeWorkplaceId), where("status", "==", "active")));
        for (const ld of loanSnap.docs) {
          const vigiaSnap = await getDoc(doc(db, "users", ld.data().vigiaId));
          if (vigiaSnap.exists() && !addedIds.has(vigiaSnap.id)) {
            allVigias.push({ id: vigiaSnap.id, ...vigiaSnap.data() } as User);
            addedIds.add(vigiaSnap.id);
          }
        }

        for (const a of currentAssigns) {
          const locator = currentLocators.find(l => l.id === a.locatorId);
          if (a.vigiaId && locator && currentLocs[locator.locationId] && !addedIds.has(a.vigiaId)) {
             const vigiaSnap = await getDoc(doc(db, "users", a.vigiaId));
             if (vigiaSnap.exists() && !loanedOutIds.has(vigiaSnap.id)) {
               allVigias.push({ id: vigiaSnap.id, ...vigiaSnap.data(), name: vigiaSnap.data().name + " (Outro Local)" } as User);
               addedIds.add(vigiaSnap.id);
             }
          }
        }
        setAvailableVigias(allVigias);
        setLoading(false);
    };

    const unsubLocs = onSnapshot(query(collection(db, "abstract_locations"), where("workplaceId", "in", [activeWorkplaceId, "global"])), snap => {
      const locs: Record<string, AbstractLocation> = {};
      snap.docs.forEach(d => {
        locs[d.id] = { id: d.id, ...d.data() } as AbstractLocation;
      });
      currentLocs = locs;
      setLocations(locs);
      fetchVigias();
    });

    const activeWorkplace = workplaces.find(w => w.id === activeWorkplaceId);

    const unsubLocators = onSnapshot(query(collection(db, "locators"), where("captainId", "==", targetCaptainId)), snapLocators => {
      const locatorsData = snapLocators.docs
        .map(d => ({ id: d.id, ...d.data() } as Locator))
        .filter(loc => activeWorkplace?.planIds?.includes(loc.planId));
      currentLocators = locatorsData;
      setLocators(locatorsData);
      fetchVigias();
    });

    const unsubAssignments = onSnapshot(query(collection(db, "assignments"), where("captainId", "==", targetCaptainId)), snapAssigns => {
      const assigns: Assignment[] = [];
      snapAssigns.docs.forEach(d => {
        const data = d.data();
        if (data.date && data.period) {
          assigns.push({ id: d.id, ...data } as Assignment);
        }
      });
      currentAssigns = assigns;
      setAssignments(assigns);
      fetchVigias();
    });

    const unsubShifts = onSnapshot(query(collection(db, "shifts"), where("captainId", "==", targetCaptainId)), snapShifts => {
      const sMap: Record<string, ShiftData> = {};
      snapShifts.docs.forEach(d => {
        sMap[d.id] = { status: d.data().status };
      });
      setShifts(sMap);
    });

    return () => {
       unsubLocs();
       unsubLocators();
       unsubAssignments();
       unsubShifts();
    }
  }, [user, activeWorkplaceId, workplaces]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setDraftAssignments([...assignments]);
    }
  }, [assignments, hasUnsavedChanges]);

  const handleAssignDraft = (locatorId: string, date: DateKey, period: PeriodKey, vigiaId: string) => {
    const existingIndex = draftAssignments.findIndex(a => a.locatorId === locatorId && a.date === date && a.period === period);
    
    let newDrafts = [...draftAssignments];
    if (existingIndex >= 0) {
      if (!vigiaId) {
        newDrafts.splice(existingIndex, 1);
      } else {
        newDrafts[existingIndex] = { ...newDrafts[existingIndex], vigiaId };
      }
    } else if (vigiaId) {
      const locator = locators.find(l => l.id === locatorId);
      if(locator) {
          newDrafts.push({
            id: `temp-${Date.now()}-${Math.random()}`,
            locatorId,
            locationId: locator.locationId,
            date,
            period,
            vigiaId,
            shiftId: ""
          });
      }
    }
    setDraftAssignments(newDrafts);
    setHasUnsavedChanges(true);
  };

  const isShiftLocked = (assignment: Assignment | undefined) => {
    if (!assignment || !assignment.shiftId) return false;
    const shift = shifts[assignment.shiftId];
    return shift && (shift.status === "active" || shift.status === "completed");
  };

  const createShiftAndAssignment = async (draft: Assignment) => {
      const locator = locators.find(l => l.id === draft.locatorId);
      if (!locator) return;
      const loc = locations[locator.locationId];
      if (!loc) return;
      const shiftTimes = loc.customShifts?.[draft.date]?.[draft.period];
      if (!shiftTimes) return;
      
      let isoStart = new Date().toISOString();
      if (draft.date.includes("-")) {
        isoStart = `${draft.date}T${shiftTimes.start}:00Z`;
      } else {
        const mMap: any = {"jan":"01","fev":"02","mar":"03","abr":"04","mai":"05","jun":"06","jul":"07","ago":"08","set":"09","out":"10","nov":"11","dez":"12"};
        const parts = draft.date.split("/");
        if (parts.length === 2 && mMap[parts[1]]) {
           isoStart = `2026-${mMap[parts[1]]}-${parts[0].padStart(2, '0')}T${shiftTimes.start}:00Z`;
        }
      }

      const shiftData = {
        locatorId: locator.id,
        locatorName: locator.name,
        local: loc.local,
        planId: locator.planId,
        personId: draft.vigiaId,
        captainId: targetCaptainId,
        name: `${loc.local} - ${draft.period === "manha" ? "Manhã" : draft.period === "tarde" ? "Tarde" : "Noite"}`,
        time: `${draft.period === "manha" ? "Manhã" : draft.period === "tarde" ? "Tarde" : "Noite"} (${shiftTimes.start} - ${shiftTimes.end})`,
        days: draft.date,
        status: "pending",
        startTime: isoStart,
      };

      const shiftRef = await addDoc(collection(db, "shifts"), shiftData);

      const assignmentData = {
        locatorId: locator.id,
        locationId: locator.locationId,
        date: draft.date,
        period: draft.period,
        vigiaId: draft.vigiaId,
        captainId: targetCaptainId,
        shiftId: shiftRef.id
      };
      await addDoc(collection(db, "assignments"), assignmentData);
  };

  const removeShiftAndAssignment = async (original: Assignment) => {
      await deleteDoc(doc(db, "assignments", original.id));
      if (original.shiftId) {
        await deleteDoc(doc(db, "shifts", original.shiftId));
      }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const draft of draftAssignments) {
         const original = assignments.find(a => a.locatorId === draft.locatorId && a.date === draft.date && a.period === draft.period);
         if (!original && draft.vigiaId) {
            await createShiftAndAssignment(draft);
            await fetch('/api/send-notification', { method: 'POST', body: JSON.stringify({ vigiaId: draft.vigiaId, title: "Novo Turno", message: "Foi-lhe atribuído um novo turno." }) });
              await addDoc(collection(db, "notifications"), { vigiaId: draft.vigiaId, message: "Foi-lhe atribuído um novo turno.", read: false, createdAt: new Date().toISOString(), title: "Novo Turno" });
         } else if (original && original.vigiaId !== draft.vigiaId) {
            await removeShiftAndAssignment(original);
            await fetch('/api/send-notification', { method: 'POST', body: JSON.stringify({ vigiaId: original.vigiaId, title: "Turno Removido", message: "Um dos teus turnos foi removido." }) });
              await addDoc(collection(db, "notifications"), { vigiaId: original.vigiaId, message: "Um dos teus turnos foi removido.", read: false, createdAt: new Date().toISOString(), title: "Turno Removido" });
            
            await createShiftAndAssignment(draft);
            await fetch('/api/send-notification', { method: 'POST', body: JSON.stringify({ vigiaId: draft.vigiaId, title: "Novo Turno", message: "Foi-lhe atribuído um novo turno." }) });
              await addDoc(collection(db, "notifications"), { vigiaId: draft.vigiaId, message: "Foi-lhe atribuído um novo turno.", read: false, createdAt: new Date().toISOString(), title: "Novo Turno" });
         }
      }

      for (const original of assignments) {
         const draft = draftAssignments.find(a => a.locatorId === original.locatorId && a.date === original.date && a.period === original.period);
         if (!draft) {
            await removeShiftAndAssignment(original);
            await fetch('/api/send-notification', { method: 'POST', body: JSON.stringify({ vigiaId: original.vigiaId, title: "Turno Removido", message: "Um dos teus turnos foi removido." }) });
              await addDoc(collection(db, "notifications"), { vigiaId: original.vigiaId, message: "Um dos teus turnos foi removido.", read: false, createdAt: new Date().toISOString(), title: "Turno Removido" });
         }
      }

      setHasUnsavedChanges(false);
      alert("Alterações guardadas com sucesso!");
    } catch(e) {
      console.error(e);
      alert("Erro ao guardar as alterações.");
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: "2rem" }}>A carregar turnos...</div>;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
          {EVENT_TABS.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", border: "none", background: activeTab === tab.id ? "var(--color-primary)" : "var(--color-bg)", color: activeTab === tab.id ? "white" : "var(--color-text-secondary)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {hasUnsavedChanges && (
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="btn btn-primary" 
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", border: "none", background: "#10b981", color: "white", fontWeight: "bold", cursor: saving ? "not-allowed" : "pointer" }}
          >
            <Save size={16} /> {saving ? "A Guardar..." : "Guardar Alterações"}
          </button>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
          <thead>
            <tr>
              <th rowSpan={2} style={thStyle}>Pino (Local)</th>
              {currentTab.dates.map(d => (
                <th key={d} colSpan={currentTab.periods.length} style={{ ...thStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center" }}>
                  {d}
                </th>
              ))}
            </tr>
            <tr>
              {currentTab.dates.map(d => (
                 currentTab.periods.map(p => (
                   <th key={`${d}-${p}`} style={{ ...thStyle, fontSize: "0.8rem", textAlign: "center", background: "var(--color-bg)" }}>
                     {p === "manha" ? "Manhã" : p === "tarde" ? "Tarde" : "Noite"}
                   </th>
                 ))
              ))}
            </tr>
          </thead>
        <tbody>
          {locators.map(locator => {
            const loc = locations[locator.locationId];
            if (!loc) return null;
            
            const hasShiftsInCurrentTab = currentTab.dates.some(d => 
              currentTab.periods.some(p => {
                const shift = loc.customShifts?.[d]?.[p];
                return shift && shift.start && shift.end;
              })
            );
            if (!hasShiftsInCurrentTab) return null;

            const localName = loc.local || "Desconhecido";

            return (
              <tr key={locator.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={tdStyle}>
                  <strong>{locator.name}</strong><br/>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{localName}</span>
                </td>

                {currentTab.dates.map(d => (
                    currentTab.periods.map(p => {
                    const shiftTime = loc.customShifts?.[d]?.[p];
                    const draftAssignment = draftAssignments.find(a => a.locatorId === locator.id && a.date === d && a.period === p);
                    const originalAssignment = assignments.find(a => a.locatorId === locator.id && a.date === d && a.period === p);

                    const locked = isShiftLocked(originalAssignment);

                    const busyVigiasInPeriod = draftAssignments.filter(a => a.date === d && a.period === p).map(a => a.vigiaId);

                    return (
                      <td key={`${locator.id}-${d}-${p}`} style={{ ...tdStyle, textAlign: "center", verticalAlign: "top" }}>
                        {!shiftTime ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>N/A</span>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--color-primary)", fontWeight: 600 }}>
                              {shiftTime.start} - {shiftTime.end}
                            </span>
                            <select 
                              className="input" 
                              disabled={locked}
                              style={{ padding: "0.25rem", fontSize: "0.8rem", height: "auto", background: locked ? "#e5e7eb" : "var(--color-surface)", cursor: locked ? "not-allowed" : "pointer" }}
                              value={draftAssignment?.vigiaId || ""}
                              onChange={(e) => handleAssignDraft(locator.id, d, p, e.target.value)}
                            >
                              <option value="">-- Livre --</option>
                              {availableVigias.map(v => {
                                const isBusy = busyVigiasInPeriod.includes(v.id) && draftAssignment?.vigiaId !== v.id;
                                return (
                                  <option key={v.id} value={v.id} disabled={isBusy}>
                                    {v.name} {isBusy ? "(Ocupado)" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                      </td>
                    )
                  })
                ))}
              </tr>
            );
          })}
          {locators.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                Não existem pinos criados no mapa. Crie pinos nas plantas para gerir os turnos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  padding: "0.75rem",
  textAlign: "left" as const,
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  borderBottom: "2px solid var(--color-border)",
};

const tdStyle = {
  padding: "0.75rem",
  background: "var(--color-surface)",
};
