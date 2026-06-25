const fs = require('fs');
const path = require('path');

let c = fs.readFileSync(path.join(__dirname, '../src/components/VigiaDashboard.tsx'), 'utf8');

c = c.replace(/\{zelloLink && \([\s\S]*?<a href=\{zelloLink\}[\s\S]*?<\/div>[\s\S]*?<\/a>[\s\S]*?\)\}/, `<button
            onClick={() => setActivePanel(activePanel === "zello" ? null : "zello")}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto"
            }}
          >
            <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "rgba(249, 115, 22, 0.15)", border: "1.5px solid rgba(249,115,22,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316" }}>
              <Radio size={20} fill="currentColor" />
            </div>
            <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#f97316" }}>Rádio</span>
          </button>`);

// Now that we have the button, we can inject the Zello panel
const injectScript = require('./inject_zello.js');
// But I can't easily require it, I'll just copy the injection logic
// Add state for global notification modal
if (!c.includes('const [showGlobalAlertModal, setShowGlobalAlertModal]')) {
  c = c.replace(/const \[activePanel, setActivePanel\] = useState<string \| null>\(null\);/, 
    `const [activePanel, setActivePanel] = useState<string | null>(null);\n  const [showGlobalAlertModal, setShowGlobalAlertModal] = useState(false);\n  const [globalAlertText, setGlobalAlertText] = useState("");\n  const [sendingGlobalAlert, setSendingGlobalAlert] = useState(false);`);
}

// Add sendGlobalAlert function
if (!c.includes('const sendGlobalAlert = async ()')) {
  const fnHTML = `
  const sendGlobalAlert = async () => {
    if (!globalAlertText) return;
    setSendingGlobalAlert(true);
    try {
      await fetch("/api/send-notification-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: globalAlertText,
          senderName: user?.name || user?.email,
          title: "NOTIFICAÇÃO GLOBAL"
        })
      });
      alert("Notificação enviada para todos!");
      setGlobalAlertText("");
      setShowGlobalAlertModal(false);
      setActivePanel(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar notificação.");
    } finally {
      setSendingGlobalAlert(false);
    }
  };
`;
  // Insert before the return statement of the component
  const returnIndex = c.lastIndexOf('return (');
  c = c.slice(0, returnIndex) + fnHTML + c.slice(returnIndex);
}

// Add the panels just after the other activePanels
if (!c.includes(`activePanel === 'zello' && !showGlobalAlertModal`)) {
  const panelsHTML = `
      {activePanel === 'zello' && !showGlobalAlertModal && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #1e0a3c, #5b1030)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(249,115,22,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(249,115,22,0.25)", border: "1.5px solid rgba(249,115,22,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Radio size={18} color="#fdba74" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#ffedd5", fontSize: "1rem", fontWeight: 700 }}>Comunicações</h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#fdba74" }}>Rádios e Alertas</p>
              </div>
            </div>
            <button onClick={() => setActivePanel(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18}/></button>
          </div>
          
          <div style={{ padding: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
            <button 
              onClick={() => setShowGlobalAlertModal(true)}
              style={{ width: "100%", padding: "1.2rem", background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "white", border: "none", borderRadius: "var(--radius-lg)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontSize: "1rem", boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}
            >
              <Bell size={24} /> NOTIFICAR TODOS
            </button>

            <div style={{ height: "1px", background: "var(--color-border)", margin: "0.5rem 0" }} />
            <h4 style={{ margin: "0 0 0.5rem", color: "var(--color-text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Canais Zello</h4>

            {activeWorkplace?.zelloChannelLink ? (
              <a href={activeWorkplace.zelloChannelLink} style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: "var(--radius-lg)", fontWeight: 700, color: "var(--color-text-primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1rem" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316" }}><Radio size={20} /></div>
                Rádio Vigias
              </a>
            ) : (
              <div style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.75rem", opacity: 0.5 }}>
                 <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Radio size={20} /></div>
                 Canal Vigias não configurado
              </div>
            )}

            {(activeWorkplace as any)?.zelloGroupLink ? (
              <a href={(activeWorkplace as any).zelloGroupLink} style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "var(--radius-lg)", fontWeight: 700, color: "var(--color-text-primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1rem" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7" }}><Radio size={20} /></div>
                Rádio Capitães/Coord.
              </a>
            ) : (
              <div style={{ padding: "1.2rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.75rem", opacity: 0.5 }}>
                 <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Radio size={20} /></div>
                 Canal Capitães não configurado
              </div>
            )}
          </div>
        </div>
      )}

      {showGlobalAlertModal && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 10001, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #1e0a3c, #5b1030)", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(239,68,68,0.3)", border: "1.5px solid rgba(239,68,68,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bell size={18} color="#fca5a5" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#fee2e2", fontSize: "1rem", fontWeight: 700 }}>Notificar Todos</h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#fca5a5" }}>Alerta Geral para Equipas</p>
              </div>
            </div>
            <button onClick={() => setShowGlobalAlertModal(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
          </div>
          <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>Mensagem de Alerta</label>
              <textarea 
                className="input" 
                rows={5} 
                value={globalAlertText} 
                onChange={e => setGlobalAlertText(e.target.value)}
                placeholder="Escreva a mensagem que todos os vigias vão receber no telemóvel..."
                style={{ resize: "vertical" }}
              />
            </div>
            <button 
              onClick={sendGlobalAlert} 
              disabled={sendingGlobalAlert || !globalAlertText}
              style={{
                width: "100%", padding: "1rem", background: "var(--color-danger)", color: "white",
                border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "1rem",
                cursor: (sendingGlobalAlert || !globalAlertText) ? "not-allowed" : "pointer",
                opacity: (sendingGlobalAlert || !globalAlertText) ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
              }}
            >
              {sendingGlobalAlert ? "A ENVIAR..." : "ENVIAR ALERTA"}
            </button>
          </div>
        </div>
      )}
`;

  // Insert just before the bottom bar
  const bottomBarIndex = c.lastIndexOf('<div className="vigia-app-bottom-bar"');
  if (bottomBarIndex !== -1) {
    c = c.slice(0, bottomBarIndex) + panelsHTML + '\n      ' + c.slice(bottomBarIndex);
  }
}

if (!c.includes('Bell')) {
  c = c.replace(/import \{([\s\S]*?)\} from "lucide-react";/, (match, p1) => {
    const imports = new Set(p1.split(',').map(s => s.trim()));
    imports.add('Bell');
    imports.add('Radio');
    return `import { ${Array.from(imports).join(', ')} } from "lucide-react";`;
  });
}

fs.writeFileSync(path.join(__dirname, '../src/components/VigiaDashboard.tsx'), c);
console.log('Fixed VigiaDashboard');
