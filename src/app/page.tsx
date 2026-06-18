"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-fade-in" style={{ textAlign: 'center' }}>
        <h1 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Event Security</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>A carregar...</p>
      </div>
    </div>
  );
}
