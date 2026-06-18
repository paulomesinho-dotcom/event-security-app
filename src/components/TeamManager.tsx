"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { UserPlus, Users, ArrowRightLeft } from "lucide-react";

interface User {
  id: string;
  name: string;
  role: string;
  teamId?: string; // legacy
  workplaceId?: string;
  congregation?: string;
}

interface Loan {
  id: string;
  vigiaId: string;
  fromCaptainId: string;
  toCaptainId: string;
  status: "active" | "returned";
}

export default function TeamManager() {
  const { user } = useAuth();
  const { activeWorkplace } = useWorkplace();
  const [vigiasLivre, setVigiasLivre] = useState<User[]>([]);
  const [minhaEquipa, setMinhaEquipa] = useState<User[]>([]);
  const [vigiasCedidos, setVigiasCedidos] = useState<{loan: Loan, vigia: User}[]>([]);
  const [outrosCapitaes, setOutrosCapitaes] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Loan State
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanVigiaId, setLoanVigiaId] = useState("");
  const [loanToCaptainId, setLoanToCaptainId] = useState("");

  useEffect(() => {
    if (!user || !activeWorkplace) {
      setVigiasLivre([]);
      setMinhaEquipa([]);
      setLoading(false);
      return;
    }

    // Fetch all vigias
    const unsubUsers = onSnapshot(query(collection(db, "users"), where("role", "==", "vigia")), (snap) => {
      const livres: User[] = [];
      const meus: User[] = [];
      const todosVigias: User[] = [];
      
      snap.forEach(d => {
        const u = { id: d.id, ...d.data() } as User;
        todosVigias.push(u);
        if (!u.workplaceId) livres.push(u);
        if (u.workplaceId === activeWorkplace.id) meus.push(u);
      });
      setVigiasLivre(livres);
      setMinhaEquipa(meus);
      
      // Also fetch loans where we are the receiver
      const unsubLoans = onSnapshot(query(collection(db, "loans"), where("toCaptainId", "==", user.uid), where("status", "==", "active")), (loanSnap) => {
         const cedidosData: {loan: Loan, vigia: User}[] = [];
         loanSnap.forEach(ld => {
            const loan = { id: ld.id, ...ld.data() } as Loan;
            const vigiaMatch = todosVigias.find(v => v.id === loan.vigiaId);
            if (vigiaMatch) {
               cedidosData.push({ loan, vigia: vigiaMatch });
            }
         });
         setVigiasCedidos(cedidosData);
      });

      return () => unsubLoans();
    });

    // Fetch other captains
    const unsubCaps = onSnapshot(query(collection(db, "users"), where("role", "==", "captain")), (snap) => {
       const caps: User[] = [];
       snap.forEach(d => {
         if (d.id !== user.uid) caps.push({ id: d.id, ...d.data() } as User);
       });
       setOutrosCapitaes(caps);
       setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubCaps();
    };
  }, [user, activeWorkplace]);

  const addToTeam = async (vigiaId: string) => {
    if (!activeWorkplace) return;
    await updateDoc(doc(db, "users", vigiaId), { teamId: user?.uid, workplaceId: activeWorkplace.id });
  };

  const removeFromTeam = async (vigiaId: string) => {
    if (confirm("Remover da sua equipa?")) {
       await updateDoc(doc(db, "users", vigiaId), { teamId: null, workplaceId: null });
    }
  };

  const processLoan = async () => {
    if (!loanVigiaId || !loanToCaptainId) return;
    await addDoc(collection(db, "loans"), {
       vigiaId: loanVigiaId,
       fromCaptainId: user?.uid,
       toCaptainId: loanToCaptainId,
       status: "active",
       createdAt: new Date().toISOString()
    });
    setShowLoanModal(false);
    setLoanVigiaId("");
    setLoanToCaptainId("");
    alert("Vigia cedido com sucesso.");
  };

  if (loading) return <div>A carregar equipa...</div>;

  return (
    <div>
      <h3 style={{ color: "var(--color-primary)", marginBottom: "1.5rem", display: "none", alignItems: "center", gap: "0.5rem" }}>
        <Users size={20} /> A Minha Equipa
      </h3>

      <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
         {/* Minha Equipa Oficial */}
         <div>
            <h4 style={{ marginBottom: "1rem" }}>Vigias Efetivos ({minhaEquipa.length})</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
               {minhaEquipa.map(v => (
                 <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface)", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <div>
                      <span style={{ display: "block", fontWeight: 500 }}>{v.name}</span>
                      {v.congregation && <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{v.congregation}</span>}
                    </div>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button onClick={() => { setLoanVigiaId(v.id); setShowLoanModal(true); }} className="btn btn-secondary" style={{ padding: "0.25rem", fontSize: "0.75rem" }} title="Ceder a outro capitão">
                        <ArrowRightLeft size={14} />
                      </button>
                      <button onClick={() => removeFromTeam(v.id)} className="btn btn-danger" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Remover</button>
                    </div>
                 </div>
               ))}
               {minhaEquipa.length === 0 && <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Não tem vigias na sua equipa.</p>}
            </div>
         </div>

         {/* Vigias Cedidos a mim */}
         {vigiasCedidos.length > 0 && (
           <div>
              <h4 style={{ marginBottom: "1rem" }}>Vigias Cedidos (Empréstimos)</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                 {vigiasCedidos.map(({vigia, loan}) => (
                   <div key={loan.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-primary-light)", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-primary)" }}>
                      <div>
                        <span style={{ display: "block", fontWeight: 500 }}>{vigia.name}</span>
                        {vigia.congregation && <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-primary)", opacity: 0.8 }}>{vigia.congregation}</span>}
                      </div>
                   </div>
                 ))}
              </div>
           </div>
         )}

         {/* Banco de Vigias Livres */}
         <div>
            <h4 style={{ marginBottom: "1rem" }}>Vigias Disponíveis (Banco)</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "250px", overflowY: "auto" }}>
               {vigiasLivre.map(v => (
                 <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-bg)", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border)" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 500 }}>{v.name}</span>
                      {v.congregation && <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{v.congregation}</span>}
                    </div>
                    <button onClick={() => addToTeam(v.id)} className="btn btn-primary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                      <UserPlus size={14} /> Adicionar
                    </button>
                 </div>
               ))}
               {vigiasLivre.length === 0 && <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Não há vigias livres.</p>}
            </div>
         </div>
      </div>

      {/* Modal de Cedência */}
      {showLoanModal && (
         <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
          }}>
            <div className="glass" style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px" }}>
               <h3>Ceder Vigia</h3>
               <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
                 O Vigia selecionado poderá ser integrado nas escalas do capitão de destino.
               </p>
               <select className="input" value={loanToCaptainId} onChange={e => setLoanToCaptainId(e.target.value)}>
                  <option value="">Selecione o Capitão Destino</option>
                  {outrosCapitaes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                  <button className="btn btn-secondary" onClick={() => setShowLoanModal(false)} style={{ flex: 1 }}>Cancelar</button>
                  <button className="btn btn-primary" onClick={processLoan} disabled={!loanToCaptainId} style={{ flex: 1 }}>Confirmar Cedência</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
