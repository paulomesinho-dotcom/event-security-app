"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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
