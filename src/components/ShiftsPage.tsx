"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs, addDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";

interface Locator {
  id: string;
  name: string;
  locationId: string;
  planId: string;
}

interface AbstractLocation { customShifts?: any;
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
  date: string; // e.g. "10/jul"
  period: "manha" | "tarde";
  vigiaId: string;
  shiftId?: string; // Reference to the created shift
}

export default function ShiftsPage() {
  const { user } = useAuth();
  const { activeWorkplaceId } = useWorkplace();

  const [locators, setLocators] = useState<Locator[]>([]);
  const [locations, setLocations] = useState<Record<string, AbstractLocation>>({});
  const [availableVigias, setAvailableVigias] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const dates = ["10/jul", "11/jul", "12/jul"] as const;
  const periods = ["manha", "tarde"] as const;

  type DateKey = typeof dates[number];
  type PeriodKey = typeof periods[number];

  useEffect(() => {
    if (!user || user.role !== "captain" || !activeWorkplaceId) return;

    let currentLocs: Record<string, AbstractLocation> = {};
    let currentLocators: Locator[] = [];
    let currentAssigns: Assignment[] = [];

    const fetchVigias = async () => {
        const allVigias: User[] = [];
        const addedIds = new Set<string>();

        const teamSnap = await getDocs(query(collection(db, "users"), where("workplaceId", "==", activeWorkplaceId)));
        teamSnap.forEach(d => {
          allVigias.push({ id: d.id, ...d.data() } as User);
          addedIds.add(d.id);
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
             if (vigiaSnap.exists()) {
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

    const unsubLocators = onSnapshot(query(collection(db, "locators"), where("captainId", "==", user.uid)), snapLocators => {
      const locatorsData = snapLocators.docs.map(d => ({ id: d.id, ...d.data() } as Locator));
      currentLocators = locatorsData;
      setLocators(locatorsData);
      fetchVigias();
    });

    const unsubAssignments = onSnapshot(query(collection(db, "assignments"), where("captainId", "==", user.uid)), snapAssigns => {
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

    return () => {
       unsubLocs();
       unsubLocators();
       unsubAssignments();
    }
  }, [user, activeWorkplaceId]);

  const handleAssign = async (locator: Locator, date: DateKey, period: PeriodKey, vigiaId: string) => {
    // Find existing assignment for this cell
    const existing = assignments.find(a => a.locatorId === locator.id && a.date === date && a.period === period);
    
    try {
      // If setting to empty, delete existing
      if (!vigiaId) {
        if (existing) {
          await deleteDoc(doc(db, "assignments", existing.id));
          if (existing.shiftId) {
            await deleteDoc(doc(db, "shifts", existing.shiftId));
          }
        }
        return;
      }

      // Find local info
      const loc = locations[locator.locationId];
      if (!loc) return;
      const localName = loc.local;
      const shiftTimes = loc.customShifts?.[date]?.[period];
      if (!shiftTimes) return;

      // Create new shift doc for Vigia app
      // Map 10/jul to 2026-07-10 for sorting
      let isoStart = new Date().toISOString();
      if (date === "10/jul") isoStart = `2026-07-10T${shiftTimes.start}:00Z`;
      if (date === "11/jul") isoStart = `2026-07-11T${shiftTimes.start}:00Z`;
      if (date === "12/jul") isoStart = `2026-07-12T${shiftTimes.start}:00Z`;

      const shiftData = {
        locatorId: locator.id,
        locatorName: locator.name,
        local: localName,
        planId: locator.planId,
        personId: vigiaId,
        captainId: user?.uid,
        name: `${localName} - ${period === "manha" ? "Manhã" : "Tarde"}`,
        time: `${period === "manha" ? "Manhã" : "Tarde"} (${shiftTimes.start} - ${shiftTimes.end})`,
        days: date,
        status: "pending",
        startTime: isoStart,
      };

      const shiftRef = await addDoc(collection(db, "shifts"), shiftData);

      // Create or update assignment
      const assignmentData = {
        locatorId: locator.id,
        locationId: locator.locationId,
        date,
        period,
        vigiaId,
        captainId: user?.uid,
        shiftId: shiftRef.id
      };

      if (existing) {
        // Delete old shift if it exists
        if (existing.shiftId) {
          await deleteDoc(doc(db, "shifts", existing.shiftId));
        }
        // Update assignment
        await deleteDoc(doc(db, "assignments", existing.id));
        await addDoc(collection(db, "assignments"), assignmentData);
      } else {
        await addDoc(collection(db, "assignments"), assignmentData);
      }
    } catch (e) {
      console.error("Erro ao atribuir turno:", e);
      alert("Ocorreu um erro ao guardar o turno.");
    }
  };

  if (loading) return <div style={{ padding: "2rem" }}>A carregar turnos...</div>;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
        <thead>
          <tr>
            <th rowSpan={2} style={thStyle}>Pino (Local)</th>
            {dates.map(d => (
              <th key={d} colSpan={2} style={{ ...thStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center" }}>
                {d}
              </th>
            ))}
          </tr>
          <tr>
            {dates.map(d => (
               periods.map(p => (
                 <th key={`${d}-${p}`} style={{ ...thStyle, fontSize: "0.8rem", textAlign: "center", background: "var(--color-bg)" }}>
                   {p === "manha" ? "Manhã" : "Tarde"}
                 </th>
               ))
            ))}
          </tr>
        </thead>
        <tbody>
          {locators.map(locator => {
            const loc = locations[locator.locationId];
            if (!loc) return null;
            const localName = loc.local || "Desconhecido";

            return (
              <tr key={locator.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={tdStyle}>
                  <strong>{locator.name}</strong><br/>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{localName}</span>
                </td>

                {dates.map(d => (
                  periods.map(p => {
                    const shiftTime = loc.customShifts?.[d]?.[p];
                    const existingAssignment = assignments.find(a => a.locatorId === locator.id && a.date === d && a.period === p);

                    // Find all vigias assigned to THIS specific date and period across ALL locators
                    const busyVigiasInPeriod = assignments.filter(a => a.date === d && a.period === p).map(a => a.vigiaId);

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
                              style={{ padding: "0.25rem", fontSize: "0.8rem", height: "auto" }}
                              value={existingAssignment?.vigiaId || ""}
                              onChange={(e) => handleAssign(locator, d, p, e.target.value)}
                            >
                              <option value="">-- Livre --</option>
                              {availableVigias.map(v => {
                                const isBusy = busyVigiasInPeriod.includes(v.id) && existingAssignment?.vigiaId !== v.id;
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
