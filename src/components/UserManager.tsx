"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Users, Mail, Edit2, X, Save, AlertCircle, User as UserIcon, ChevronLeft, ChevronRight, Search, Filter, Trash2 } from "lucide-react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCongregation, setSelectedCongregation] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCongregation]);

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftUser, setDraftUser] = useState<Partial<User> | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  const resetPassword = async (email?: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const openEditDrawer = (user: User) => {
    if (hasUnsavedChanges && !confirm("Tem alterações não guardadas. Sair sem gravar?")) return;
    setEditingUserId(user.id);
    setDraftUser({ ...user });
    setHasUnsavedChanges(false);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (hasUnsavedChanges && !confirm("Tem alterações não guardadas. Deseja rejeitar as alterações e fechar?")) return;
    setIsDrawerOpen(false);
    setDraftUser(null);
    setEditingUserId(null);
    setHasUnsavedChanges(false);
  };

  const handleDraftChange = (field: keyof User, value: any) => {
    if (!draftUser) return;
    setDraftUser({ ...draftUser, [field]: value });
    setHasUnsavedChanges(true);
  };

  const saveChanges = async () => {
    if (!draftUser || !editingUserId) return;
    
    try {
      await updateDoc(doc(db, "users", editingUserId), { 
        role: draftUser.role,
        contact: draftUser.contact || "",
        congregation: draftUser.congregation || ""
      });
      setHasUnsavedChanges(false);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Error updating user", error);
      alert("Erro ao atualizar o utilizador.");
    }
  };

  const handleDeleteUser = async (user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.role === "superadmin") {
      alert("Não é possível eliminar um Superadmin.");
      return;
    }
    if (confirm(`Tem a certeza que pretende eliminar permanentemente o utilizador ${user.name}? Esta ação não pode ser desfeita e irá remover os dados e histórico de ${user.email || user.name}.`)) {
      try {
        await deleteDoc(doc(db, "users", user.id));
        if (editingUserId === user.id) {
          closeDrawer();
        }
      } catch (error) {
        console.error("Error deleting user", error);
        alert("Ocorreu um erro ao tentar eliminar o utilizador.");
      }
    }
  };

  if (loading) return <div style={{ padding: "2rem", color: "var(--color-text-secondary)" }}>A carregar utilizadores...</div>;

  const allCongregations = Array.from(new Set(users.map(u => u.congregation).filter(Boolean))).sort();

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCongregation = selectedCongregation ? u.congregation === selectedCongregation : true;
    return matchesSearch && matchesCongregation;
  });

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 100px)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0, fontWeight: 500, color: "var(--color-text-primary)", fontSize: "1.25rem", display: "none" }}>Gestão de Utilizadores</h3>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", marginBottom: "1.5rem" }}>
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

      {/* Google Drive Style Table */}
      <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {users.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Utilizador</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Contacto / Congregação</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Permissões</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 600, textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(u => {
                const isEditing = editingUserId === u.id;
                const isSuperadmin = u.role === 'superadmin';

                return (
                  <tr 
                    key={u.id} 
                    style={{ 
                      borderBottom: "1px solid var(--color-border)", 
                      background: isEditing ? "rgba(59, 130, 246, 0.05)" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.2s ease"
                    }}
                    onClick={() => openEditDrawer(u)}
                    onMouseEnter={(e) => { if(!isEditing) e.currentTarget.style.background = "var(--color-bg)" }}
                    onMouseLeave={(e) => { if(!isEditing) e.currentTarget.style.background = "transparent" }}
                  >
                    <td style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <UserIcon size={16} color="var(--color-primary)" />
                      <div>
                        <div style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{u.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{u.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-primary)" }}>{u.contact || "—"}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{u.congregation || "—"}</div>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <span style={{ 
                        fontSize: "0.7rem", 
                        padding: "0.2rem 0.6rem", 
                        borderRadius: "var(--radius-full)",
                        fontWeight: 600,
                        background: isSuperadmin ? 'rgba(239, 68, 68, 0.1)' : u.role === 'captain' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)',
                        color: isSuperadmin ? 'var(--color-danger)' : u.role === 'captain' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        display: "inline-block"
                      }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button 
                           onClick={(e) => { e.stopPropagation(); resetPassword(u.email, e); }} 
                           className="btn btn-secondary" 
                           style={{ padding: "0.4rem", borderRadius: "var(--radius-full)", background: "transparent", border: "none" }}
                           title="Redefinir Palavra-passe"
                        >
                          <Mail size={16} color="var(--color-text-secondary)" />
                        </button>
                        <button 
                           onClick={(e) => { e.stopPropagation(); openEditDrawer(u); }} 
                           className="btn btn-secondary" 
                           style={{ padding: "0.4rem", borderRadius: "var(--radius-full)", background: "transparent", border: "none" }}
                           title="Editar Utilizador"
                        >
                          <Edit2 size={16} color="var(--color-text-secondary)" />
                        </button>
                        {!isSuperadmin && (
                          <button 
                             onClick={(e) => handleDeleteUser(u, e)} 
                             className="btn btn-danger" 
                             style={{ padding: "0.4rem", borderRadius: "var(--radius-full)", background: "transparent", border: "none" }}
                             title="Eliminar Utilizador"
                          >
                            <Trash2 size={16} color="var(--color-danger)" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
             <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>Nenhum utilizador encontrado.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredUsers.length > ITEMS_PER_PAGE && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", padding: "0 0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            A mostrar {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length}
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
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredUsers.length / ITEMS_PER_PAGE), p + 1))}
              disabled={currentPage === Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)}
              style={{ padding: "0.4rem", borderRadius: "var(--radius-md)", background: "var(--color-surface)", border: "1px solid var(--color-border)", cursor: currentPage === Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) ? "not-allowed" : "pointer", opacity: currentPage === Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) ? 0.5 : 1 }}
            >
              <ChevronRight size={16} color="var(--color-text-primary)" />
            </button>
          </div>
        </div>
      )}

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", zIndex: 9999, transition: "opacity 0.3s" }} onClick={closeDrawer} />
      )}

      {/* Side Drawer */}
      <div style={{ 
        position: "fixed", top: 0, right: isDrawerOpen ? 0 : "-500px", width: "100%", maxWidth: "450px", height: "100vh", 
        background: "var(--color-surface)", boxShadow: "-4px 0 15px rgba(0,0,0,0.1)", zIndex: 10000,
        transition: "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)", display: "flex", flexDirection: "column"
      }}>
        
        {/* Drawer Header */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-bg)" }}>
          <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UserIcon size={20} color="var(--color-primary)" />
            Editar Utilizador
          </h3>
          <button onClick={closeDrawer} style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", padding: "0.5rem" }}>
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {draftUser && (
            <>
              {/* General Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7 }}>Informação da Conta</h4>
                
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Nome</label>
                  <input type="text" className="input" value={draftUser.name || ""} disabled style={{ padding: "0.6rem", background: "var(--color-bg)", opacity: 0.7 }} />
                </div>
                
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Email</label>
                  <input type="text" className="input" value={draftUser.email || ""} disabled style={{ padding: "0.6rem", background: "var(--color-bg)", opacity: 0.7 }} />
                </div>
                
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Permissões (Cargo)</label>
                  <select 
                    className="input" 
                    value={draftUser.role || "vigia"} 
                    onChange={(e) => handleDraftChange("role", e.target.value)}
                    disabled={draftUser.role === 'superadmin'}
                    style={{ padding: "0.6rem", opacity: draftUser.role === 'superadmin' ? 0.7 : 1 }}
                  >
                    <option value="vigia">Vigia</option>
                    <option value="captain">Capitão</option>
                    {draftUser.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                  </select>
                  {draftUser.role === 'superadmin' && <span style={{ fontSize: "0.75rem", color: "var(--color-danger)", marginTop: "0.25rem", display: "block" }}>Um Superadmin não pode ser alterado por aqui.</span>}
                </div>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "0.5rem 0" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7 }}>Outros Dados</h4>
                
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Contacto</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={draftUser.contact || ""} 
                    onChange={(e) => handleDraftChange("contact", e.target.value)}
                    style={{ padding: "0.6rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Congregação</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={draftUser.congregation || ""} 
                    onChange={(e) => handleDraftChange("congregation", e.target.value)}
                    style={{ padding: "0.6rem" }}
                  />
                </div>
              </div>
            </>
          )}

        </div>

        {/* Drawer Footer / Save Banner */}
        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--color-border)", background: hasUnsavedChanges ? "var(--color-bg)" : "var(--color-surface)", transition: "background 0.3s", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {hasUnsavedChanges && (
             <div style={{ background: "#fef3c7", color: "#d97706", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", border: "1px solid #fcd34d" }}>
                <AlertCircle size={16} />
                Tem alterações por gravar!
             </div>
          )}
          
          <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
            <button className="btn btn-secondary" onClick={closeDrawer} style={{ flex: 1, padding: "0.75rem" }}>
              Cancelar
            </button>
            <button 
              className="btn btn-primary" 
              onClick={saveChanges} 
              disabled={!hasUnsavedChanges}
              style={{ flex: 2, padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", opacity: (!hasUnsavedChanges) ? 0.5 : 1 }}
            >
              <Save size={18} /> Gravar Alterações
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
