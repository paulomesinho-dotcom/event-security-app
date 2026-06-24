"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import { UserPlus, Users, ArrowRightLeft, Search, Filter, Trash2, X, User as UserIcon, ChevronLeft, ChevronRight } from "lucide-react";

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
  fromWorkplaceId: string;
  toWorkplaceId: string;
  status: "active" | "returned";
}

export default function TeamManager() {
  const { user } = useAuth();
  const { activeWorkplace } = useWorkplace();
  const [vigiasLivre, setVigiasLivre] = useState<User[]>([]);
  const [minhaEquipa, setMinhaEquipa] = useState<User[]>([]);
  const [vigiasCedidos, setVigiasCedidos] = useState<{loan: Loan, vigia: User}[]>([]);
  const [outrosWorkplaces, setOutrosWorkplaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<"equipa" | "banco">("equipa");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCongregation, setSelectedCongregation] = useState("");

  // Loan State
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanVigiaId, setLoanVigiaId] = useState("");
  const [loanToWorkplaceId, setLoanToWorkplaceId] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedCongregation]);

  useEffect(() => {
    if (!user || !activeWorkplace) {
      setVigiasLivre([]);
      setMinhaEquipa([]);
      setLoading(false);
      return;
    }

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
      
      setVigiasLivre(livres.sort((a, b) => a.name.localeCompare(b.name)));
      setMinhaEquipa(meus.sort((a, b) => a.name.localeCompare(b.name)));
      
      const unsubLoans = onSnapshot(query(collection(db, "loans"), where("toWorkplaceId", "==", activeWorkplace.id), where("status", "==", "active")), (loanSnap) => {
         const cedidosData: {loan: Loan, vigia: User}[] = [];
         loanSnap.forEach(ld => {
            const loan = { id: ld.id, ...ld.data() } as Loan;
            const vigiaMatch = todosVigias.find(v => v.id === loan.vigiaId);
            if (vigiaMatch) {
               cedidosData.push({ loan, vigia: vigiaMatch });
            }
         });
         setVigiasCedidos(cedidosData.sort((a, b) => a.vigia.name.localeCompare(b.vigia.name)));
      });

      return () => unsubLoans();
    });

    const unsubWps = onSnapshot(query(collection(db, "workplaces")), (snap) => {
       const wps: any[] = [];
       snap.forEach(d => {
         if (d.id !== activeWorkplace.id) wps.push({ id: d.id, ...d.data() });
       });
       setOutrosWorkplaces(wps);
       setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubWps();
    };
  }, [user, activeWorkplace]);

  const addToTeam = async (vigiaId: string) => {
    if (!activeWorkplace) return;
    await updateDoc(doc(db, "users", vigiaId), { teamId: user?.uid, workplaceId: activeWorkplace.id });
    // Switch back to "equipa" tab to see the newly added vigia
    setActiveTab("equipa");
  };

  const removeFromTeam = async (vigiaId: string) => {
    if (confirm("Remover da sua equipa?")) {
       await updateDoc(doc(db, "users", vigiaId), { teamId: null, workplaceId: null });
    }
  };

  const processLoan = async () => {
    if (!loanVigiaId || !loanToWorkplaceId || !activeWorkplace) return;
    await addDoc(collection(db, "loans"), {
       vigiaId: loanVigiaId,
       fromWorkplaceId: activeWorkplace.id,
       toWorkplaceId: loanToWorkplaceId,
       status: "active",
       createdAt: new Date().toISOString()
    });
    setShowLoanModal(false);
    setLoanVigiaId("");
    setLoanToWorkplaceId("");
    alert("Vigia cedido com sucesso.");
  };

  // Filter Logic
  const allCongregations = Array.from(new Set([
    ...vigiasLivre.map(v => v.congregation),
    ...minhaEquipa.map(v => v.congregation),
    ...vigiasCedidos.map(({vigia}) => vigia.congregation)
  ].filter(Boolean))).sort();

  const filterFn = (v: User) => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCongregation = selectedCongregation ? v.congregation === selectedCongregation : true;
    return matchesSearch && matchesCongregation;
  };

  const filteredEquipa = minhaEquipa.filter(filterFn);
  const filteredCedidos = vigiasCedidos.filter(({vigia}) => filterFn(vigia));
  const filteredLivres = vigiasLivre.filter(filterFn);

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>A carregar equipa...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "1.5rem" }}>
      {/* Header and Tabs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)", display: "none", alignItems: "center", gap: "0.5rem" }}>
            <Users size={24} color="var(--color-primary)" />
            Equipa Local
          </h2>
          
          <div style={{ display: "flex", gap: "0.5rem", background: "var(--color-surface)", padding: "0.35rem", borderRadius: "var(--radius-full)", border: "1px solid var(--color-border)" }}>
            <button 
              onClick={() => setActiveTab("equipa")}
              style={{
                padding: "0.4rem 1rem", borderRadius: "var(--radius-full)", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, transition: "all 0.2s",
                background: activeTab === "equipa" ? "var(--color-primary)" : "transparent",
                color: activeTab === "equipa" ? "white" : "var(--color-text-secondary)"
              }}
            >
              A Minha Equipa ({minhaEquipa.length + vigiasCedidos.length})
            </button>
            <button 
              onClick={() => setActiveTab("banco")}
              style={{
                padding: "0.4rem 1rem", borderRadius: "var(--radius-full)", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, transition: "all 0.2s",
                background: activeTab === "banco" ? "var(--color-primary)" : "transparent",
                color: activeTab === "banco" ? "white" : "var(--color-text-secondary)"
              }}
            >
              Adicionar Vigias ({vigiasLivre.length})
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
          <div style={{ flex: "1 1 250px", position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)" }} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: "2.75rem", width: "100%" }}
            />
          </div>
          <div style={{ flex: "1 1 200px", position: "relative" }}>
            <Filter size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)" }} />
            <select 
              className="input" 
              value={selectedCongregation} 
              onChange={(e) => setSelectedCongregation(e.target.value)}
              style={{ paddingLeft: "2.75rem", width: "100%", cursor: "pointer" }}
            >
              <option value="">Todas as Congregações</option>
              {allCongregations.map((c, i) => (
                <option key={i} value={c as string}>{c as string}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List Container - Google Drive Style Table */}
      <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        
        {activeTab === "equipa" && (
          <>
            {filteredEquipa.length === 0 && filteredCedidos.length === 0 ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--color-text-secondary)", background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
                <Users size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
                <p style={{ margin: 0 }}>Nenhum vigia encontrado na equipa com os filtros atuais.</p>
                {(searchQuery || selectedCongregation) && (
                   <button onClick={() => { setSearchQuery(""); setSelectedCongregation(""); }} className="btn btn-secondary" style={{ marginTop: "1rem" }}>Limpar Filtros</button>
                )}
                {!searchQuery && !selectedCongregation && (
                   <button onClick={() => setActiveTab("banco")} className="btn btn-primary" style={{ marginTop: "1rem" }}>Ir para Adicionar Vigias</button>
                )}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Nome do Vigia</th>
                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Congregação</th>
                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Estado</th>
                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipa.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(v => (
                    <tr key={v.id} style={{ borderBottom: "1px solid var(--color-border)", background: "transparent", transition: "background 0.2s ease", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-bg)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <UserIcon size={16} color="var(--color-primary)" />
                        <span style={{ fontWeight: 500, color: "var(--color-text-primary)", fontSize: "0.85rem" }}>{v.name}</span>
                      </td>
                      <td style={{ padding: "1rem 1.5rem", color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
                        {v.congregation || "N/A"}
                      </td>
                      <td style={{ padding: "1rem 1.5rem" }}>
                        <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 600 }}>EFETIVO</span>
                      </td>
                      <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button onClick={() => { setLoanVigiaId(v.id); setShowLoanModal(true); }} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "var(--radius-full)", background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-primary)", display: "flex", alignItems: "center" }} title="Ceder a outro Workplace">
                            <ArrowRightLeft size={14} style={{ marginRight: "0.3rem" }} /> Ceder
                          </button>
                          <button onClick={() => removeFromTeam(v.id)} className="btn btn-danger" style={{ padding: "0.4rem", borderRadius: "var(--radius-full)", background: "transparent", border: "none" }} title="Remover da equipa">
                            <Trash2 size={16} color="var(--color-danger)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCedidos.slice(Math.max(0, (currentPage - 1) * ITEMS_PER_PAGE - filteredEquipa.length), Math.max(0, currentPage * ITEMS_PER_PAGE - filteredEquipa.length)).map(({loan, vigia}) => (
                    <tr key={loan.id} style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(168, 85, 247, 0.03)", transition: "background 0.2s ease" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(168, 85, 247, 0.08)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(168, 85, 247, 0.03)"}>
                      <td style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <UserIcon size={16} color="var(--color-primary)" />
                        <span style={{ fontWeight: 500, color: "var(--color-primary)", fontSize: "0.85rem" }}>{vigia.name}</span>
                      </td>
                      <td style={{ padding: "1rem 1.5rem", color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
                        {vigia.congregation || "N/A"}
                      </td>
                      <td style={{ padding: "1rem 1.5rem" }}>
                        <span style={{ background: "rgba(168, 85, 247, 0.15)", color: "var(--color-primary)", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 600 }}>CEDIDO</span>
                      </td>
                      <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", fontStyle: "italic" }}>Gerido noutro local</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === "banco" && (
          <>
            {filteredLivres.length === 0 ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--color-text-secondary)", background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
                <UserPlus size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
                <p style={{ margin: 0 }}>Nenhum vigia livre encontrado com os filtros atuais.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Nome do Vigia</th>
                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Congregação</th>
                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Estado</th>
                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLivres.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(v => (
                    <tr key={v.id} style={{ borderBottom: "1px solid var(--color-border)", background: "transparent", transition: "background 0.2s ease", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-bg)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <UserIcon size={16} color="var(--color-text-primary)" />
                        <span style={{ fontWeight: 500, color: "var(--color-text-primary)", fontSize: "0.85rem" }}>{v.name}</span>
                      </td>
                      <td style={{ padding: "1rem 1.5rem", color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
                        {v.congregation || "N/A"}
                      </td>
                      <td style={{ padding: "1rem 1.5rem" }}>
                        <span style={{ background: "rgba(255, 255, 255, 0.1)", color: "var(--color-text-secondary)", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 600 }}>LIVRE</span>
                      </td>
                      <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button onClick={() => addToTeam(v.id)} className="btn btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", borderRadius: "var(--radius-full)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <UserPlus size={14} /> Adicionar à Equipa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* Pagination Livres */}
            {filteredLivres.length > ITEMS_PER_PAGE && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", padding: "0 0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                  A mostrar {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredLivres.length)} de {filteredLivres.length}
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: "0.4rem", borderRadius: "var(--radius-md)", background: "var(--color-surface)", border: "1px solid var(--color-border)", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={16} color="var(--color-text-primary)" />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredLivres.length / ITEMS_PER_PAGE), p + 1))}
                    disabled={currentPage === Math.ceil(filteredLivres.length / ITEMS_PER_PAGE)}
                    style={{ padding: "0.4rem", borderRadius: "var(--radius-md)", background: "var(--color-surface)", border: "1px solid var(--color-border)", cursor: currentPage === Math.ceil(filteredLivres.length / ITEMS_PER_PAGE) ? "not-allowed" : "pointer", opacity: currentPage === Math.ceil(filteredLivres.length / ITEMS_PER_PAGE) ? 0.5 : 1 }}
                  >
                    <ChevronRight size={16} color="var(--color-text-primary)" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Cedência */}
      {showLoanModal && (
         <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "450px", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-xl)" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                 <h3 style={{ margin: 0, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><ArrowRightLeft size={20} color="var(--color-primary)" /> Ceder Vigia</h3>
                 <button onClick={() => setShowLoanModal(false)} style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}><X size={20}/></button>
               </div>
               
               <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                 O Vigia selecionado ficará disponível para ser alocado em turnos no Workplace de destino. Ele continuará associado a si.
               </p>
               
               <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "2rem" }}>
                 <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Selecione o Destino</label>
                 <select className="input" value={loanToWorkplaceId} onChange={e => setLoanToWorkplaceId(e.target.value)} style={{ padding: "0.75rem", fontSize: "1rem", cursor: "pointer" }}>
                    <option value="">Escolha um Workplace...</option>
                    {outrosWorkplaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                 </select>
               </div>
               
               <div style={{ display: "flex", gap: "1rem" }}>
                  <button className="btn btn-secondary" onClick={() => setShowLoanModal(false)} style={{ flex: 1 }}>Cancelar</button>
                  <button className="btn btn-primary" onClick={processLoan} disabled={!loanToWorkplaceId} style={{ flex: 2 }}>Confirmar Cedência</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
