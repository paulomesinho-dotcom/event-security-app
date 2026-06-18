"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { Map, Image as ImageIcon } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

interface Plan {
  id: string;
  name: string;
  imageUrl: string;
  assignedCaptains?: string[];
}

export default function PlanList() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    if (user.role === "captain") {
      // 1. Fetch Zone for Captain
      const qZone = query(collection(db, "workplaces"), where("captainId", "==", user.uid));
      const unsubZone = onSnapshot(qZone, (zoneSnap) => {
        if (zoneSnap.empty) {
          setPlans([]);
          setLoading(false);
          return;
        }
        
        const zoneData = zoneSnap.docs[0].data();
        const planIds: string[] = zoneData.planIds || [];

        if (planIds.length === 0) {
          setPlans([]);
          setLoading(false);
          return;
        }

        // 2. Fetch all plans and filter
        const unsubPlans = onSnapshot(collection(db, "plans"), (planSnap) => {
          const plansData: Plan[] = [];
          planSnap.forEach(doc => {
            if (planIds.includes(doc.id)) {
              plansData.push({ id: doc.id, ...doc.data() } as Plan);
            }
          });
          setPlans(plansData);
          setLoading(false);
        });
      });
      return () => unsubZone();
    } else {
      // Super Admin sees everything
      const unsubPlans = onSnapshot(collection(db, "plans"), (snapshot) => {
        const plansData: Plan[] = [];
        snapshot.forEach((doc) => {
          plansData.push({ id: doc.id, ...doc.data() } as Plan);
        });
        setPlans(plansData);
        setLoading(false);
      });
      return () => unsubPlans();
    }
  }, [user]);

  if (loading) return <div>A carregar plantas...</div>;
  if (plans.length === 0) return <div>Ainda não existem plantas.</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.5rem" }}>
      {plans.map((plan) => (
        <Link href={`/dashboard/plans/${plan.id}`} key={plan.id} style={{ textDecoration: "none" }}>
          <div className="drive-card" style={{ 
            display: "flex", 
            flexDirection: "column",
            height: "100%",
            overflow: "hidden"
          }}>
            {/* Thumbnail Area */}
            <div style={{ 
              height: "140px", 
              background: "var(--color-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderBottom: "1px solid var(--color-border)",
              position: "relative"
            }}>
              {plan.imageUrl ? (
                <img 
                   src={plan.imageUrl} 
                   alt={plan.name} 
                   style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
              ) : (
                <ImageIcon size={48} color="var(--color-text-tertiary)" />
              )}
            </div>
            
            {/* Meta Area */}
            <div style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Map size={20} color="var(--color-primary)" />
              <h4 style={{ color: "var(--color-text-primary)", margin: 0, fontSize: "0.875rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {plan.name}
              </h4>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
