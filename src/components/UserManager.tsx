"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Users, ShieldAlert, Mail } from "lucide-react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

interface User {
  id: string;
  name: string;
  role: string;
  email?: string;
  teamId?: string;
  contact?: string;
  congregation?: string;
}

export default function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snap) => {
      const uData: User[] = [];
      snap.forEach(d => uData.push({ id: d.id, ...d.data() } as User));
      setUsers(uData);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const changeRole = async (userId: string, newRole: string) => {
    if (!confirm(`Tem a certeza que deseja alterar as permissões deste utilizador para ${newRole}?`)) return;
    
    setUpdating(userId);
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
    } catch (error) {
      console.error("Error updating role", error);
      alert("Erro ao atualizar o utilizador.");
    } finally {
      setUpdating(null);
    }
  };

  const resetPassword = async (email?: string) => {
    if (!email) {
      alert("Este utilizador não tem email registado.");
      return;
    }
    if (!confirm(`Enviar email de redefinição de palavra-passe para ${email}?`)) return;
    
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      alert(`Email de redefinição enviado com sucesso para ${email}!`);
    } catch (error) {
      console.error("Error sending reset email", error);
      alert("Ocorreu um erro ao tentar enviar o email. Verifique se o utilizador é válido.");
    }
  };

  if (loading) return <div>A carregar utilizadores...</div>;

  return (
    <div>
      <h3 style={{ color: "var(--color-primary)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Users size={20} /> Gestão de Utilizadores
      </h3>
      
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--color-surface)", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)" }}>
          <thead style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
            <tr>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Utilizador</th>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Detalhes</th>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cargo</th>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                
                <td style={{ padding: "0.5rem 0.75rem", verticalAlign: "middle" }}>
                  <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.875rem" }}>{u.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{u.email}</div>
                </td>
                
                <td style={{ padding: "0.5rem 0.75rem", verticalAlign: "middle" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{u.contact || "Sem contacto"}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{u.congregation || "S/ Congregação"}</div>
                </td>
                
                <td style={{ padding: "0.5rem 0.75rem", verticalAlign: "middle" }}>
                  <span style={{ 
                    fontSize: "0.7rem", 
                    padding: "0.2rem 0.4rem", 
                    borderRadius: "4px",
                    fontWeight: 600,
                    background: u.role === 'superadmin' ? 'var(--color-danger)' : u.role === 'captain' ? 'var(--color-primary)' : 'var(--color-border)',
                    color: u.role === 'vigia' ? 'var(--color-text-primary)' : 'white',
                    display: "inline-block"
                  }}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                
                <td style={{ padding: "0.5rem 0.75rem", verticalAlign: "middle" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <select 
                      className="input" 
                      style={{ padding: "0.2rem 0.4rem", width: "100px", fontSize: "0.75rem", margin: 0, height: "auto" }}
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      disabled={updating === u.id || u.role === 'superadmin'}
                    >
                      <option value="vigia">Vigia</option>
                      <option value="captain">Capitão</option>
                    </select>

                    <button 
                      title="Enviar Email de Redefinição de Password"
                      onClick={() => resetPassword(u.email)}
                      className="btn btn-secondary" 
                      style={{ padding: "0.3rem 0.5rem" }}
                    >
                      <Mail size={14} />
                    </button>
                  </div>
                </td>
                
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
