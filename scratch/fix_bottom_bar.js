const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /\{\/\*\s*BOTTOM NAVIGATION BAR\s*—\s*flex sibling of scrollable content\s*\*\/\}\s*<div className="vigia-app-bottom-bar" style=\{\{ zIndex: 20000 \}\}>[\s\S]*?<span style=\{\{ fontSize: "0\.65rem", fontWeight: 600, color: "var\(--color-text-secondary\)" \}\}>Informação<\/span>\s*<\/button>\s*<\/div>/m;

content = content.replace(regex, `{/* BOTTOM NAVIGATION BAR — flex sibling of scrollable content */}
    <div className="vigia-app-bottom-bar" style={{ zIndex: 20000 }}>
        {/* Zello */}
        <button
          onClick={() => setActivePanel(activePanel === "zello" ? "home" : "zello")}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto"
          }}
        >
          <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "rgba(249, 115, 22, 0.15)", border: "1.5px solid rgba(249,115,22,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316" }}>
            <Radio size={20} fill="currentColor" />
          </div>
          <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#f97316" }}>Rádio</span>
        </button>

        {/* Suspects */}
        <button
          onClick={() => { stopAlertBeeps(); setActivePanel(activePanel === "suspects" ? "home" : "suspects"); }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto"
          }}
        >
          <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: activeSuspects.length > 0 ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.08)", border: activeSuspects.length > 0 ? "1.5px solid rgba(168,85,247,0.7)" : "1.5px solid rgba(168,85,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7", position: "relative", animation: activeSuspects.length > 0 ? "suspectPulse 3s ease-in-out infinite" : "none" }}>
            <UserX size={20} />
            {activeSuspects.length > 0 && (
              <span style={{ position: "absolute", top: "-3px", right: "-3px", background: "#a855f7", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "0.6rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeSuspects.length}</span>
            )}
          </div>
          <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#a855f7" }}>Suspeito</span>
        </button>

        {/* Incidents */}
        <button
          onClick={() => { stopAlertBeeps(); setActivePanel(activePanel === "incidents" ? "home" : "incidents"); }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto"
          }}
        >
          <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "linear-gradient(135deg, #dc2626, #ef4444)", boxShadow: "0 3px 12px rgba(239,68,68,0.45)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <FileWarning size={20} />
          </div>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#ef4444" }}>Ocorrência</span>
        </button>

        {/* Info */}
        <button
          onClick={() => setActivePanel(activePanel === "info" ? "home" : "info")}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto"
          }}
        >
          <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "var(--color-bg)", border: "1.5px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", position: "relative" }}>
            <Info size={20} />
          </div>
          <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Informação</span>
        </button>
      </div>`);

fs.writeFileSync(file, content);
console.log('Done replacing bottom bar');
