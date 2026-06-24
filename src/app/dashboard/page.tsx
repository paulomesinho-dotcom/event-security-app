"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, LayoutDashboard, Users, Map, Settings, Clock, MapPin, Building, Plus, Search, HelpCircle, Menu, ChevronDown, AlertTriangle, FileWarning, UserX, Info } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { updatePassword } from "firebase/auth";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";

import Image from "next/image";
import PlanUploader from "@/components/PlanUploader";
import PlanList from "@/components/PlanList";
import CaptainSummaryTable from "@/components/CaptainSummaryTable";
import WorkplaceManager from "@/components/WorkplaceManager";
import UserManager from "@/components/UserManager";
import TeamManager from "@/components/TeamManager";
import VigiaDashboard from "@/components/VigiaDashboard";
import ShiftsPage from "@/components/ShiftsPage";
import LocationManager from "@/components/LocationManager";
import SettingsModal from "@/components/SettingsModal";
import EmergencyBanner from "@/components/EmergencyBanner";
import EmergencyDashboard from "@/components/EmergencyDashboard";
import IncidentManager from "@/components/IncidentManager";
import SuspectManager from "@/components/SuspectManager";
import InformationManager from "@/components/InformationManager";
import InformationModal from "@/components/InformationModal";
import CaptainPatrolDashboard from "@/components/CaptainPatrolDashboard";
import { useWorkplace } from "@/contexts/WorkplaceContext";
import dynamic from "next/dynamic";

const MapViewer = dynamic(() => import("@/components/MapViewer"), { ssr: false });

function WorkplaceSwitcher() {
  const { workplaces, activeWorkplaceId, setActiveWorkplaceId, loadingWorkplaces } = useWorkplace();
  const [isOpen, setIsOpen] = useState(false);
  
  if (loadingWorkplaces) return <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>A carregar...</div>;
  if (workplaces.length === 0) return <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Nenhum Workplace</div>;
  
  const activeName = workplaces.find(w => w.id === activeWorkplaceId)?.name || "Selecione...";

  return (
    <div style={{ position: "relative" }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.5rem 1rem", fontSize: "1rem", 
          background: "var(--color-surface)", color: "var(--color-text-primary)",
          border: "1px solid var(--color-border)", borderRadius: "var(--radius-full)",
          cursor: "pointer", transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-bg)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "var(--color-surface)"}
      >
        <Building size={16} color="var(--color-primary)" />
        <span style={{ fontWeight: 600 }}>{activeName}</span>
        <ChevronDown size={14} style={{ marginLeft: "0.25rem", opacity: 0.7, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {isOpen && (
        <>
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} onClick={() => setIsOpen(false)} />
          <div style={{ 
            position: "absolute", top: "calc(100% + 0.5rem)", right: 0,
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)", padding: "0.5rem",
            minWidth: "200px", boxShadow: "var(--shadow-lg)", zIndex: 100,
            display: "flex", flexDirection: "column", gap: "0.25rem"
          }}>
            {workplaces.map(w => (
              <button 
                key={w.id} 
                onClick={() => { setActiveWorkplaceId(w.id); setIsOpen(false); }}
                style={{ 
                  textAlign: "left", padding: "0.5rem 0.75rem", 
                  background: w.id === activeWorkplaceId ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  color: w.id === activeWorkplaceId ? "var(--color-primary)" : "var(--color-text-primary)",
                  border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
                  fontSize: "0.875rem", fontWeight: w.id === activeWorkplaceId ? 600 : 400
                }}
                onMouseEnter={(e) => { if(w.id !== activeWorkplaceId) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { if(w.id !== activeWorkplaceId) e.currentTarget.style.background = "transparent"; }}
              >
                {w.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Shows the active workplace name for the Vigia nav bar
function VigiaWorkplaceName() {
  const { user } = useAuth();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "vigia") return;
    const fetchWorkplace = async () => {
      try {
        const q = query(collection(db, "shifts"), where("vigiaId", "==", user.uid), where("status", "in", ["pending", "active"]));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const shift = snap.docs[0].data();
          if (shift.workplaceId) {
            const wpDoc = await getDoc(doc(db, "workplaces", shift.workplaceId));
            if (wpDoc.exists()) setName((wpDoc.data() as any).name);
          }
        }
      } catch (_) {}
    };
    fetchWorkplace();
  }, [user]);

  if (!name) return null;
  return (
    <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", fontWeight: 500, marginTop: "0.1rem", display: "block" }}>
      📍 {name}
    </span>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { hasActiveShift, activeWorkplaceId } = useWorkplace();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPatrolMode, setIsPatrolMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState("");

  const handleUpdatePassword = async () => {
    if (!auth.currentUser) return;
    if (newPass.length < 6) {
       setPassMsg("A password deve ter pelo menos 6 caracteres.");
       return;
    }
    try {
      await updatePassword(auth.currentUser, newPass);
      setPassMsg("Palavra-passe atualizada com sucesso!");
      setNewPass("");
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
         setPassMsg("Sessão expirada. Por favor saia da conta e entre novamente para alterar a password.");
      } else {
         setPassMsg("Erro ao alterar password. Tente novamente.");
      }
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (!loading && user && user.role === "captain") {
      if (window.innerWidth <= 768) {
        setIsPatrolMode(true);
      }
    }
    // Set default tabs based on role
    if (user && activeTab === "overview") {
       if (user.role === "superadmin") setActiveTab("workplaces");
       if (user.role === "captain") setActiveTab("team");
    }
  }, [user, loading, router, activeTab]);

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  if (loading || !user) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>A carregar o painel...</div>;
  }

  // Vigia Dashboard — Mobile-first, 100dvh flex layout
  // VigiaDashboard renders a Fragment with 2 flex children:
  //   1. scrollable content (flex: 1, overflow-y: auto)
  //   2. bottom navigation bar (flex-shrink: 0)
  if (user.role === "vigia") {
    return (
      <div className="vigia-app-root">
        {activeWorkplaceId ? <EmergencyBanner /> : null}
        <nav className="vigia-app-nav" style={{ 
          display: "flex", justifyContent: "space-between", padding: "0.85rem 1rem", 
          backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <Image src="/logo.jpg" alt="Porto 2026 Logo" width={44} height={44} style={{ borderRadius: "var(--radius-md)", objectFit: "cover", flexShrink: 0 }} />
            <div>
              <h1 style={{ fontSize: "1.2rem", color: "var(--color-primary)", fontWeight: 800, margin: 0, lineHeight: 1.1 }}>Porto 2026</h1>
              <VigiaWorkplaceName />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--color-primary)", fontWeight: 600 }}>{user.name}</span>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: "0.4rem 0.65rem", fontSize: "0.8rem" }}><LogOut size={15} /></button>
          </div>
        </nav>
        <VigiaDashboard />
      </div>
    );
  }

  // Google Drive Style Sidebar NavItem (Adapted for Navy background)
  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => {
    const isActive = activeTab === id;
    return (
      <button 
        onClick={() => {
          setActiveTab(id);
          setIsSidebarOpen(false); // Close sidebar on mobile after clicking
        }}
        style={{
          display: "flex", alignItems: "center", gap: "1rem",
          padding: "0.6rem 1.25rem", width: "100%",
          background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
          color: isActive ? "#ffffff" : "rgba(255,255,255,0.7)",
          border: "none",
          borderRadius: "var(--radius-full)", // Pill shape
          textAlign: "left", cursor: "pointer",
          fontWeight: isActive ? 600 : 500,
          fontSize: "0.875rem",
          transition: "all 0.2s"
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
      >
        <Icon size={18} color={isActive ? "#ffffff" : "rgba(255,255,255,0.7)"} />
        {label}
      </button>
    );
  };

  // If Captain is in Patrol Mode, render the Mobile Dashboard wrapper
  if (user.role === "captain" && isPatrolMode) {
    return (
      <div className="vigia-app-root">
        {activeWorkplaceId ? <EmergencyBanner /> : null}
        <nav className="vigia-app-nav" style={{ 
          display: "flex", justifyContent: "space-between", padding: "0.85rem 1rem", 
          backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <Image src="/logo.jpg" alt="Porto 2026 Logo" width={44} height={44} style={{ borderRadius: "var(--radius-md)", objectFit: "cover", flexShrink: 0 }} />
            <div>
              <h1 style={{ fontSize: "1.2rem", color: "var(--color-primary)", fontWeight: 800, margin: 0, lineHeight: 1.1 }}>Porto 2026</h1>
              <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", fontWeight: 500, marginTop: "0.1rem", display: "block" }}>
                📍 MODO PATRULHA
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", marginRight: "0.5rem" }} className="hidden-mobile">{user?.name || user?.email?.split('@')[0]}</span>
            <button onClick={() => setIsPatrolMode(false)} className="btn btn-secondary" style={{ padding: "0.4rem", fontSize: "0.75rem", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "0.3rem" }} title="Voltar ao Painel de Gestão">
              <LayoutDashboard size={16} /> <span className="hidden-mobile">Gestão</span>
            </button>
            <button onClick={handleLogout} className="btn" style={{ padding: "0.4rem", fontSize: "0.75rem", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "var(--radius-md)" }} title="Terminar Sessão"><LogOut size={16} /></button>
          </div>
        </nav>
        <CaptainPatrolDashboard />
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)", overflow: "hidden" }}>
      {activeWorkplaceId ? <EmergencyBanner /> : null}
      <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden" }}>
      
      {/* Mobile Sidebar Overlay */}
      <div 
         className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
         onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar (Full Height) */}
      <aside className={`sidebar-container ${isSidebarOpen ? 'open' : ''}`} style={{ height: "100%", overflowY: "auto", flexShrink: 0 }}>
        
        {/* Logo inside Sidebar */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem", padding: "0.5rem" }}>
          <Image src="/logo.jpg" alt="Porto 2026 Logo" width={36} height={36} style={{ borderRadius: "var(--radius-sm)", objectFit: "cover" }} />
          <span style={{ fontSize: "1.2rem", color: "#ffffff", fontWeight: 500 }}>Porto 2026</span>
        </div>

        {/* Navigation Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          
          {user.role === "superadmin" && (
            <>
              <NavItem id="workplaces" icon={Building} label="Workplaces" />
              <NavItem id="users" icon={Users} label="Gestão de Acessos" />
              <NavItem id="global_plans" icon={Map} label="Biblioteca de Plantas" />
              <NavItem id="emergency" icon={AlertTriangle} label="Painel de Emergência" />
              
              <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "0.5rem 1rem" }} />
              <div style={{ padding: "0.25rem 1rem", fontSize: "0.65rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Workplace Atual</div>
            </>
          )}

          {(user.role === "captain" || user.role === "superadmin") && (
            <>
              <NavItem id="team" icon={Users} label="Equipa do Local" />
              <NavItem id="shifts" icon={Clock} label="Página de Turnos" />
              <NavItem id="locations" icon={MapPin} label="Estrutura de Locais" />
              <NavItem id="plans" icon={Map} label="Plantas & Escalas" />
              <NavItem id="incidents" icon={FileWarning} label="Ocorrências" />
              <NavItem id="suspects" icon={UserX} label="Suspeitos" />
              <NavItem id="information" icon={Info} label="Informações" />
              <NavItem id="emergency" icon={AlertTriangle} label="Painel de Emergência" />
              <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "0.5rem 1rem" }} />
              <NavItem id="summary" icon={LayoutDashboard} label="Resumo Global" />
            </>
          )}
        </div>
      </aside>

      {/* Main Content Area (Header + Main) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
        
        {/* Global Top Navbar */}
        <header style={{ 
          height: "64px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          padding: "0 1.5rem",
          background: "var(--color-bg)"
        }}>
          {/* Mobile Menu Toggle */}
          <button 
             className="menu-toggle-btn"
             onClick={() => setIsSidebarOpen(true)}
             style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0.5rem" }}
          >
            <Menu size={24} color="var(--color-text-primary)" />
          </button>

          {/* User Welcome and Workplace Switcher */}
          <div style={{ flex: 1, margin: "0 1rem", fontSize: "1rem", color: "var(--color-text-secondary)", fontWeight: 500, display: "flex", alignItems: "center", gap: "1rem" }}>
            <div className="hidden-mobile" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="hidden-mobile">Olá,</span>
              <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>{user?.name || "Utilizador"}</span>
            </div>
            {(user?.role === "captain" || user?.role === "superadmin") && <WorkplaceSwitcher />}
          </div>

          {/* User Actions Right */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {user?.role === "captain" && (
               <button 
                 onClick={() => setIsPatrolMode(true)}
                 className="btn btn-primary"
                 style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", borderRadius: "100px", display: "flex", alignItems: "center", gap: "0.3rem" }}
                 title="Ativar Modo Patrulha (Mobile)"
               >
                 <MapPin size={14} /> <span className="hidden-mobile">Modo Patrulha</span>
               </button>
            )}
            <HelpCircle size={24} color="var(--color-text-secondary)" style={{ cursor: "pointer", display: "none" }} className="hidden-mobile" />
            {user?.role === "superadmin" && (
              <div title="Configurações Globais" style={{ display: "flex", alignItems: "center" }}>
                <Settings size={24} color="var(--color-text-secondary)" style={{ cursor: "pointer" }} onClick={() => setShowSettings(true)} />
              </div>
            )}
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "0.5rem", cursor: "pointer" }} onClick={() => setShowProfile(true)} title="Definições da Conta">
               {/* Fake Avatar */}
               <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.875rem" }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
               </div>
            </div>
          </div>
        </header>

        {/* Dynamic Main View */}
        <main style={{ 
          flex: 1, 
          background: "var(--color-surface)", 
          margin: "0 0.5rem 0.5rem 0.5rem", 
          borderRadius: "1rem", 
          overflowY: "auto",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ padding: "1.5rem", width: "100%" }}>
            
            {/* Dynamic Content Title */}
            <h2 style={{ marginBottom: "1.5rem", color: "var(--color-text-primary)", fontWeight: 400, fontSize: "1.25rem" }}>
              {activeTab === 'workplaces' && "Gestão de Workplaces"}
              {activeTab === 'users' && "Gestão de Acessos"}
              {activeTab === 'global_plans' && "Biblioteca Global de Plantas"}
              {activeTab === 'plans' && "Plantas & Escalas do Workplace"}
              {activeTab === 'team' && "Equipa do Local"}
              {activeTab === 'shifts' && "Página de Turnos"}
              {activeTab === 'locations' && "Estrutura de Locais"}
              {activeTab === 'incidents' && "Gestão de Ocorrências"}
              {activeTab === 'suspects' && "Gestão de Suspeitos"}
              {activeTab === 'information' && "Informações"}
              {activeTab === 'summary' && "Resumo Global"}
            </h2>

            {/* SUPER ADMIN ROUTING */}
            {user.role === "superadmin" && (
              <div className="animate-fade-in">
                {activeTab === "workplaces" && <WorkplaceManager />}
                {activeTab === "users" && <UserManager />}
                {activeTab === "global_plans" && <PlanUploader />}
              </div>
            )}

            {/* SHARED ROUTING (Captain + Superadmin Workplace context) */}
            {(user.role === "captain" || user.role === "superadmin") && (
              <div className="animate-fade-in">
                {activeTab === "team" && <TeamManager />}
                {activeTab === "shifts" && <ShiftsPage />}
                {activeTab === "locations" && <LocationManager />}
                {activeTab === "incidents" && <IncidentManager />}
                {activeTab === "suspects" && <SuspectManager />}
                {activeTab === "information" && <InformationManager readOnly={user.role !== "superadmin"} />}
                {activeTab === "emergency" && <EmergencyDashboard />}
                
                {activeTab === "plans" && (
                  <div>
                    <p style={{ fontSize: "0.875rem", marginTop: 0, marginBottom: "1.5rem", color: "var(--color-text-secondary)" }}>
                      Selecione uma planta do seu Workplace para criar posições e distribuir a escala.
                    </p>
                    <PlanList />
                  </div>
                )}

                {activeTab === "summary" && <CaptainSummaryTable />}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Profile / Settings Modal */}
      {showProfile && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass" style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px" }}>
            <h3 style={{ marginBottom: "1.5rem" }}>O Meu Perfil</h3>
            
            <div style={{ marginBottom: "1.5rem" }}>
               <p style={{ margin: 0, fontWeight: "bold" }}>{user.name}</p>
               <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>{user.email || "Sem email associado"}</p>
               <span style={{ display: "inline-block", marginTop: "0.5rem", fontSize: "0.75rem", background: "var(--color-border)", padding: "0.25rem 0.5rem", borderRadius: "var(--radius-sm)", fontWeight: "bold" }}>
                  Role: {user?.role ? user.role.toUpperCase() : "DESCONHECIDO"}
               </span>
            </div>

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.5rem", marginBottom: "1.5rem" }}>
               <h4 style={{ marginBottom: "1rem" }}>Alterar Palavra-passe</h4>
               <input 
                  type="password" 
                  className="input" 
                  placeholder="Nova Palavra-passe (min 6)" 
                  value={newPass} 
                  onChange={e => setNewPass(e.target.value)} 
                  style={{ marginBottom: "0.5rem" }}
               />
               <button className="btn btn-primary" onClick={handleUpdatePassword} disabled={!newPass} style={{ width: "100%" }}>
                  Atualizar Password
               </button>
               {passMsg && <p style={{ fontSize: "0.875rem", marginTop: "0.5rem", color: passMsg.includes("sucesso") ? "var(--color-success)" : "var(--color-danger)" }}>{passMsg}</p>}
            </div>

            <div style={{ display: "flex", gap: "1rem", borderTop: "1px solid var(--color-border)", paddingTop: "1.5rem" }}>
               <button className="btn" onClick={() => setShowProfile(false)} style={{ flex: 1 }}>Fechar</button>
               <button className="btn btn-secondary" onClick={handleLogout} style={{ flex: 1, color: "var(--color-danger)", borderColor: "var(--color-danger)" }}>
                  <LogOut size={16} style={{ display: "inline", marginRight: "0.5rem" }}/> Sair
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      </div>
    </div>
  );
}
