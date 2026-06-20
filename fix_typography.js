const fs = require('fs');

// 1. Fix whiteSpace -> add wordBreak to all files
const filesToPatch = [
    'src/components/EmergencyBanner.tsx',
    'src/components/EmergencyDashboard.tsx',
    'src/components/IncidentManager.tsx',
    'src/components/VigiaDashboard.tsx'
];

filesToPatch.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    // We might run this multiple times, so prevent duplication
    content = content.replace(/whiteSpace: "pre-wrap", wordBreak: "break-word"/g, 'whiteSpace: "pre-wrap"');
    content = content.replace(/whiteSpace: "pre-wrap"/g, 'whiteSpace: "pre-wrap", wordBreak: "break-word"');
    fs.writeFileSync(file, content);
});


// 2. Condense the Missing Person form in EmergencyDashboard.tsx
let ed = fs.readFileSync('src/components/EmergencyDashboard.tsx', 'utf-8');

const oldForm = `{showMissingForm ? (
                <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--color-border)", animation: "slideUp 0.3s ease-out", display: "flex", flexDirection: "column", marginBottom: "2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2rem", borderBottom: "1px solid var(--color-border)" }}>
                    <h3 style={{ margin: 0, fontSize: "1.35rem", display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--color-text-primary)" }}>
                      <Search size={28} color="#eab308" />
                      Nova Pessoa Desaparecida
                    </h3>
                    <button onClick={() => setShowMissingForm(false)} style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                      <X size={28} />
                    </button>
                  </div>
                  
                  <div style={{ padding: "2rem", maxWidth: "800px" }}>
                    <div style={{ marginBottom: "2rem" }}>
                       <label style={{ display: "block", marginBottom: "0.75rem", fontWeight: 600, color: "var(--color-text-primary)", fontSize: "1.1rem" }}>Descriǜo Completa (Obrigatrio)</label>
                       <textarea 
                         className="input" 
                         rows={5} 
                         value={missingDesc} 
                         onChange={e => setMissingDesc(e.target.value)} 
                         placeholder="Ex: Criana, aprox. 5 anos, t-shirt azul do porto, chora e procura pela mǜe..."
                         style={{ width: "100%", padding: "1.25rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)", resize: "vertical", fontSize: "1rem" }}
                       />
                    </div>

                    <div style={{ marginBottom: "3rem" }}>
                       <label style={{ display: "block", marginBottom: "0.75rem", fontWeight: 600, color: "var(--color-text-primary)", fontSize: "1.1rem" }}>Fotografia de ReferǦncia (Opcional mas recomendado)</label>
                       <input 
                         type="file" 
                         accept="image/*" 
                         onChange={e => setMissingPhoto(e.target.files?.[0] || null)} 
                         style={{ width: "100%", padding: "1rem", background: "var(--color-bg)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-secondary)", fontSize: "1rem" }} 
                       />
                    </div>

                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button onClick={() => setShowMissingForm(false)} style={{ flex: 1, padding: "1rem", background: "transparent", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", fontSize: "1.1rem" }}>
                        CANCELAR
                      </button>
                      <button 
                         onClick={triggerMissingPerson} 
                         disabled={uploading || !missingDesc} 
                         style={{ 
                           flex: 2, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", padding: "1rem", 
                           background: (uploading || !missingDesc) ? "var(--color-bg)" : "#eab308", 
                           color: (uploading || !missingDesc) ? "var(--color-text-tertiary)" : "#000", 
                           border: "none", borderRadius: "var(--radius-md)", fontWeight: 800, cursor: (uploading || !missingDesc) ? "not-allowed" : "pointer", fontSize: "1.1rem" 
                         }}
                       >
                        <Eye size={24} />
                        {uploading ? "A DISPARAR ALERTA..." : "DISPARAR ALERTA"}
                      </button>
                    </div>
                  </div>
                </div>`;

// Wait, because of encoding issues with `ç` and `ã` in previous regexes/replace, let's use a regex that matches them no matter the encoding
const patternToCondense = /\{showMissingForm \? \([\s\S]*?A DISPARAR ALERTA\.\.\." : "DISPARAR ALERTA"\}\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/div>/;

const newFormCondensed = `{showMissingForm ? (
                <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", animation: "slideUp 0.3s ease-out", display: "flex", flexDirection: "column", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem", borderBottom: "1px solid var(--color-border)" }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-primary)" }}>
                      <Search size={22} color="#eab308" />
                      Nova Pessoa Desaparecida
                    </h3>
                    <button onClick={() => setShowMissingForm(false)} style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", padding: "0.25rem" }}>
                      <X size={22} />
                    </button>
                  </div>
                  
                  <div style={{ padding: "1.25rem", maxWidth: "800px" }}>
                    <div style={{ marginBottom: "1.25rem" }}>
                       <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.95rem" }}>Descrição Completa (Obrigatório)</label>
                       <textarea 
                         className="input" 
                         rows={4} 
                         value={missingDesc} 
                         onChange={e => setMissingDesc(e.target.value)} 
                         placeholder="Ex: Criança, aprox. 5 anos, t-shirt azul do porto, chora e procura pela mãe..."
                         style={{ width: "100%", padding: "0.85rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)", resize: "vertical", fontSize: "0.9rem" }}
                       />
                    </div>

                    <div style={{ marginBottom: "1.5rem" }}>
                       <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.95rem" }}>Fotografia de Referência (Opcional mas recomendado)</label>
                       <input 
                         type="file" 
                         accept="image/*" 
                         onChange={e => setMissingPhoto(e.target.files?.[0] || null)} 
                         style={{ width: "100%", padding: "0.6rem", background: "var(--color-bg)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-secondary)", fontSize: "0.9rem" }} 
                       />
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <button onClick={() => setShowMissingForm(false)} style={{ flex: 1, padding: "0.75rem", background: "transparent", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}>
                        CANCELAR
                      </button>
                      <button 
                         onClick={triggerMissingPerson} 
                         disabled={uploading || !missingDesc} 
                         style={{ 
                           flex: 2, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", padding: "0.75rem", 
                           background: (uploading || !missingDesc) ? "var(--color-bg)" : "#eab308", 
                           color: (uploading || !missingDesc) ? "var(--color-text-tertiary)" : "#000", 
                           border: "none", borderRadius: "var(--radius-md)", fontWeight: 800, cursor: (uploading || !missingDesc) ? "not-allowed" : "pointer", fontSize: "0.95rem" 
                         }}
                       >
                        <Eye size={20} />
                        {uploading ? "A DISPARAR ALERTA..." : "DISPARAR ALERTA"}
                      </button>
                    </div>
                  </div>
                </div>`;

ed = ed.replace(patternToCondense, newFormCondensed);

fs.writeFileSync('src/components/EmergencyDashboard.tsx', ed);

console.log('Fixes applied.');
