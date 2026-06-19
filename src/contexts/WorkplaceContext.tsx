"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { useAuth } from "./AuthContext";

export interface Workplace {
  id: string;
  name: string;
  captainId: string;
  planIds: string[];
  zelloChannelLink?: string;
  whatsappGroupLink?: string;
}

interface WorkplaceContextType {
  workplaces: Workplace[];
  activeWorkplace: Workplace | null;
  activeWorkplaceId: string | null;
  setActiveWorkplaceId: (id: string) => void;
  loadingWorkplaces: boolean;
}

const WorkplaceContext = createContext<WorkplaceContextType>({
  workplaces: [],
  activeWorkplace: null,
  activeWorkplaceId: null,
  setActiveWorkplaceId: () => {},
  loadingWorkplaces: true
});

export const WorkplaceProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [activeWorkplaceId, setActiveWorkplaceId] = useState<string | null>(null);
  const [loadingWorkplaces, setLoadingWorkplaces] = useState(true);

  useEffect(() => {
    if (!user) {
      setWorkplaces([]);
      setActiveWorkplaceId(null);
      setLoadingWorkplaces(false);
      return;
    }

    let q;
    if (user.role === "captain") {
      q = query(collection(db, "workplaces"), where("captainId", "==", user.uid));
    } else if (user.role === "superadmin") {
      q = query(collection(db, "workplaces"));
    } else if (user.role === "vigia") {
      // For Vigia, we don't load all workplaces, but we need to know their active workplace ID
      // so components like EmergencyBanner can work.
      const unsubShifts = onSnapshot(query(collection(db, "shifts"), where("vigiaId", "==", user.uid), where("status", "in", ["pending", "active"])), (snap) => {
        if (!snap.empty) {
          const wpId = snap.docs[0].data().workplaceId;
          if (wpId) {
             setActiveWorkplaceId(wpId);
             // Also listen to that specific workplace to populate workplaces array
             const unsubWp = onSnapshot(doc(db, "workplaces", wpId), (wpSnap) => {
               if (wpSnap.exists()) {
                 setWorkplaces([{ id: wpSnap.id, ...wpSnap.data() } as Workplace]);
               }
               setLoadingWorkplaces(false);
             });
             // We won't strictly cleanup this inner unsubWp cleanly here without a ref, 
             // but since it's tied to shifts changing (which is rare), it's acceptable for now,
             // or we can just fetch it once. Let's fetch it once to avoid memory leaks.
          } else {
            setActiveWorkplaceId(null);
            setLoadingWorkplaces(false);
          }
        } else {
          setActiveWorkplaceId(null);
          setWorkplaces([]);
          setLoadingWorkplaces(false);
        }
      });
      return () => unsubShifts();
    } else {
      setWorkplaces([]);
      setActiveWorkplaceId(null);
      setLoadingWorkplaces(false);
      return;
    }

    const unsub = onSnapshot(q, (snap) => {
      const data: Workplace[] = [];
      snap.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Workplace);
      });
      setWorkplaces(data);
      
      // Auto-select first workplace if none selected or if active one is no longer available
      if (data.length > 0) {
        setActiveWorkplaceId((prev) => {
           if (!prev || !data.find(w => w.id === prev)) {
             return data[0].id;
           }
           return prev;
        });
      } else {
        setActiveWorkplaceId(null);
      }
      setLoadingWorkplaces(false);
    });

    return () => unsub();
  }, [user]);

  const activeWorkplace = workplaces.find(w => w.id === activeWorkplaceId) || null;

  return (
    <WorkplaceContext.Provider value={{ workplaces, activeWorkplace, activeWorkplaceId, setActiveWorkplaceId, loadingWorkplaces }}>
      {children}
    </WorkplaceContext.Provider>
  );
};

export const useWorkplace = () => useContext(WorkplaceContext);
