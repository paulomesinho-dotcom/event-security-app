const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. ZELLO PANEL
content = content.replace(
  /{\/\* ── ZELLO PANEL ─────────────────────────────────────── \*\/}\s*{\s*activePanel === "zello" && \(\s*<div style=\{panelStyle\}>\s*\{sectionTitle\("Rádio \/ Comunicação", <Radio size=\{14\} color="#f97316" \/>\)\}/g,
  `{/* ── ZELLO PANEL ─────────────────────────────────────── */}
        {activePanel === "zello" && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #1e0a3c, #431407)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(249,115,22,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(249,115,22,0.25)", border: "1.5px solid rgba(249,115,22,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Radio size={18} color="#fdba74" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#ffedd5", fontSize: "1rem", fontWeight: 700 }}>Rádio / Comunicação</h3>
                </div>
              </div>
              <button onClick={() => setActivePanel("home")} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18}/></button>
            </div>
            <div style={{ padding: "1rem", flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "3rem" }}>`
);

// 2. INCIDENTS PANEL
content = content.replace(
  /{\/\* ── INCIDENTS PANEL ─────────────────────────────────── \*\/}\s*{\s*activePanel === "incidents" && \(\s*<div style=\{panelStyle\}>\s*\{sectionTitle\(\`Ocorrências \(\$\{openIncidents\.length\} abertas\)\`, <FileWarning size=\{14\} color="#ef4444" \/>\)\}/g,
  `{/* ── INCIDENTS PANEL ─────────────────────────────────── */}
        {activePanel === "incidents" && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #1e0a3c, #5b1030)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(239,68,68,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(239,68,68,0.25)", border: "1.5px solid rgba(239,68,68,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileWarning size={18} color="#fca5a5" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#fee2e2", fontSize: "1rem", fontWeight: 700 }}>Ocorrências</h3>
                  {openIncidents.length > 0 && <p style={{ margin: 0, fontSize: "0.75rem", color: "#fca5a5" }}>{openIncidents.length} abertas</p>}
                </div>
              </div>
              <button onClick={() => setActivePanel("home")} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18}/></button>
            </div>
            <div style={{ padding: "1rem", flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "3rem" }}>`
);

// 3. SUSPECTS PANEL
content = content.replace(
  /{\/\* ── SUSPECTS PANEL ─────────────────────────────────── \*\/}\s*{\s*activePanel === "suspects" && \(\s*<div style=\{panelStyle\}>\s*<div style=\{\{ display: "flex", justifyContent: "space-between", alignItems: "center" \}\}>\s*\{sectionTitle\(\`Suspeitos Ativos \(\$\{activeSuspects\.length\}\)\`, <UserX size=\{14\} color="#a855f7" \/>\)\}\s*<button onClick=\{\(\) => setShowNewSuspectModal\(true\)\} style=\{\{\s*background: "#a855f7", border: "none", color: "white", borderRadius: "var\(--radius-full\)",\s*padding: "0\.4rem 0\.9rem", fontWeight: 700, fontSize: "0\.78rem", cursor: "pointer"\s*\}\}>\+ Novo<\/button>\s*<\/div>/g,
  `{/* ── SUSPECTS PANEL ─────────────────────────────────── */}
        {activePanel === "suspects" && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #1e0a3c, #2d1060)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(168,85,247,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(168,85,247,0.25)", border: "1.5px solid rgba(168,85,247,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserX size={18} color="#d8b4fe" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#e9d5ff", fontSize: "1rem", fontWeight: 700 }}>Pessoas Suspeitas</h3>
                  {activeSuspects.length > 0 && <p style={{ margin: 0, fontSize: "0.75rem", color: "#c084fc" }}>{activeSuspects.length} em acompanhamento</p>}
                </div>
              </div>
              <button onClick={() => setActivePanel("home")} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18}/></button>
            </div>
            <div style={{ padding: "1rem", flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "3rem" }}>
              <button 
                onClick={() => setShowNewSuspectModal(true)}
                style={{ padding: "1rem 1.25rem", background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.95rem", boxShadow: "0 4px 16px rgba(168,85,247,0.4)" }}>
                <Crosshair size={20} /> DETETADO SUSPEITO
              </button>`
);

// Suspects Modal inside CaptainPatrolDashboard.tsx
content = content.replace(
  /{\/\* New suspect modal \*\/}\s*\{showNewSuspectModal && \(\s*<div style=\{\{\s*position: "fixed", inset: 0, zIndex: 9000, background: "rgba\(0,0,0,0\.7\)",\s*display: "flex", alignItems: "flex-end"\s*\}\}>\s*<div style=\{\{\s*width: "100%", background: "var\(--color-surface\)", borderRadius: "var\(--radius-xl\) var\(--radius-xl\) 0 0",\s*padding: "1\.5rem", display: "flex", flexDirection: "column", gap: "0\.75rem",\s*maxHeight: "90vh", overflowY: "auto"\s*\}\}>\s*<div style=\{\{ display: "flex", justifyContent: "space-between", alignItems: "center" \}\}>\s*<h3 style=\{\{ margin: 0, fontSize: "1rem", fontWeight: 800 \}\}>Novo Suspeito<\/h3>\s*<button onClick=\{\(\) => setShowNewSuspectModal\(false\)\} style=\{\{ background: "none", border: "none", cursor: "pointer" \}\}><X size=\{20\} \/><\/button>\s*<\/div>/g,
  `{/* New suspect modal */}
            {showNewSuspectModal && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "var(--color-bg)", zIndex: 10001, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ background: "var(--color-surface)", width: "100%", display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
                  <div style={{ background: "linear-gradient(135deg, #1e0a3c, #2d1060)", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(168,85,247,0.3)", border: "1.5px solid rgba(168,85,247,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Crosshair size={18} color="#d8b4fe" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, color: "#e9d5ff", fontSize: "1rem", fontWeight: 700 }}>Novo Suspeito Detetado</h3>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#c084fc" }}>Alerta imediato para todos os vigias</p>
                      </div>
                    </div>
                    <button onClick={() => setShowNewSuspectModal(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
                  </div>
                  <div style={{ padding: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.1rem" }}>`
);

// Close out the suspects modal padding correctly
content = content.replace(
  /<button type="submit" disabled=\{suspectUploading\} style=\{\{ background: "#a855f7", border: "none", color: "white", borderRadius: "var\(--radius-md\)", padding: "0\.75rem", fontWeight: 700, fontSize: "0\.9rem", cursor: "pointer" \}\}>\s*\{suspectUploading \? "A guardar\.\.\." : "Registar Suspeito"\}\s*<\/button>\s*<\/form>\s*<\/div>\s*<\/div>/g,
  `<button type="submit" disabled={suspectUploading || !suspectDesc} style={{ background: suspectUploading || !suspectDesc ? "rgba(168,85,247,0.3)" : "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", padding: "0.9rem", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "1rem", cursor: (suspectUploading || !suspectDesc) ? "not-allowed" : "pointer", boxShadow: (suspectUploading || !suspectDesc) ? "none" : "0 4px 16px rgba(168,85,247,0.4)", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      <Crosshair size={20} />
                      {suspectUploading ? "A Enviar..." : "LANÇAR ALERTA"}
                    </button>
                  </form>
                  </div>
                </div>
              </div>`
);


// 4. INFO PANEL
content = content.replace(
  /{\/\* ── INFO PANEL ─────────────────────────────────────── \*\/}\s*{\s*activePanel === "info" && \(\s*<div style=\{panelStyle\}>\s*\{sectionTitle\("Informações Úteis", <Info size=\{14\} color="#38bdf8" \/>\)\}/g,
  `{/* ── INFO PANEL ─────────────────────────────────────── */}
        {activePanel === "info" && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #1e0a3c, #102a43)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(56,189,248,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(56,189,248,0.25)", border: "1.5px solid rgba(56,189,248,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Info size={18} color="#bae6fd" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#e0f2fe", fontSize: "1rem", fontWeight: 700 }}>Informações Úteis</h3>
                </div>
              </div>
              <button onClick={() => setActivePanel("home")} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18}/></button>
            </div>
            <div style={{ padding: "1rem", flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "3rem" }}>`
);

fs.writeFileSync(file, content);
console.log('Done!');
