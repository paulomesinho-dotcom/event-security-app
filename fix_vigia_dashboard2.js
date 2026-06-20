const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'VigiaDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Info to lucide imports if not there
if (!content.includes('Info,')) {
    content = content.replace('Crosshair, UserX } from "lucide-react";', 'Crosshair, UserX, Info } from "lucide-react";');
}

// 2. Change signature
content = content.replace('export default function VigiaDashboard() {', 'export default function VigiaDashboard({ onOpenInfo }: { onOpenInfo?: () => void }) {');

// 3. Add showIncidentsList state
content = content.replace(
  'const [showIncidentModal, setShowIncidentModal] = useState(false);',
  'const [showIncidentModal, setShowIncidentModal] = useState(false);\n  const [showIncidentsList, setShowIncidentsList] = useState(false);'
);

// 4. Change "Histórico" button to "Informação"
content = content.replace(
  /<button onClick=\{\(\) => setShowHistoryModal\(true\)\}[\s\S]*?Histórico<\/span>\s*<\/button>/,
  `<button onClick={() => onOpenInfo && onOpenInfo()} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", flex: "1 0 auto" }}>
        <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "var(--color-bg)", border: "1.5px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", position: "relative" }}>
          <Info size={20} />
        </div>
        <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Informação</span>
      </button>`
);

// 5. Change "Ocorrência" bottom bar button to open showIncidentsList
content = content.replace(
  'onClick={() => setShowIncidentModal(true)} style={{ display: "flex"',
  'onClick={() => setShowIncidentsList(true)} style={{ display: "flex"'
);

// 6. Rewrite the Incident Reporting Modal section and remove History Modal
// First, find the incident modal block: `{showIncidentModal && (...)}`
// And the history modal block: `{showHistoryModal && (...)}`

// We will replace both with the new `showIncidentsList` + `showIncidentModal`

const historyModalRegex = /\{showHistoryModal && \([\s\S]*?Histórico de Ocorrências[\s\S]*?\}\s*\)\}/;
content = content.replace(historyModalRegex, '');

const incidentModalRegex = /\{showIncidentModal && \([\s\S]*?ENVIAR OCORRÊNCIA"\}\s*<\/button>\s*<\/div>\s*<\/div>\s*\)\}/;

const newIncidentStructure = `
      {showIncidentsList && !showIncidentModal && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #1e0a3c, #5b1030)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(239,68,68,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(239,68,68,0.25)", border: "1.5px solid rgba(239,68,68,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileWarning size={18} color="#fca5a5" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#fee2e2", fontSize: "1rem", fontWeight: 700 }}>Ocorrências</h3>
                {myIncidents.length > 0 && <p style={{ margin: 0, fontSize: "0.75rem", color: "#fca5a5" }}>{myIncidents.length} registadas</p>}
              </div>
            </div>
            <button onClick={() => setShowIncidentsList(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18}/></button>
          </div>
          <div style={{ padding: "1rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "3rem" }}>
            <button 
              onClick={() => setShowIncidentModal(true)}
              style={{ padding: "1rem 1.25rem", background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.95rem", boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}>
              <AlertTriangle size={20} /> NOVA OCORRÊNCIA
            </button>
            
            {myIncidents.length === 0 ? (
               <div style={{ textAlign: "center", padding: "3rem 2rem", color: "var(--color-text-secondary)" }}>
                 <FileWarning size={40} style={{ opacity: 0.3, margin: "0 auto 1rem", display: "block" }} />
                 <p style={{ margin: 0 }}>Nenhuma ocorrência registada.</p>
               </div>
            ) : (
               myIncidents.map((inc, idx) => (
                 <div key={idx} style={{ background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", padding: "1rem" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                     <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                       {new Date(inc.createdAt).toLocaleString("pt-PT")}
                     </span>
                     <span style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", fontSize: "0.7rem", fontWeight: 700 }}>
                       REGISTADA
                     </span>
                   </div>
                   <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "var(--color-text-primary)", whiteSpace: "pre-wrap" }}>
                     {inc.description}
                   </p>
                   {inc.photoUrl && (
                     <div style={{ marginTop: "0.5rem" }}>
                       <img src={inc.photoUrl} alt="Anexo" style={{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "var(--radius-sm)" }} />
                     </div>
                   )}
                 </div>
               ))
            )}
          </div>
        </div>
      )}

      {showIncidentModal && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 10001, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "var(--color-surface)", width: "100%", display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #1e0a3c, #5b1030)", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(239,68,68,0.3)", border: "1.5px solid rgba(239,68,68,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={18} color="#fca5a5" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#fee2e2", fontSize: "1rem", fontWeight: 700 }}>Reportar Ocorrência</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#fca5a5" }}>Alerta imediato para o Capitão</p>
                </div>
              </div>
              <button onClick={() => setShowIncidentModal(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
            </div>
            
            <div style={{ padding: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-danger)", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "0.04em" }}>Descrição *</label>
                <textarea 
                  className="input" 
                  rows={4} 
                  value={incidentText} 
                  onChange={e => setIncidentText(e.target.value)}
                  placeholder="Descreva a situação em detalhe..."
                  style={{ resize: "vertical" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "0.04em" }}>Fotografia (Opcional)</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <label style={{ flex: 1, padding: "0.75rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                    <Camera size={16} /> Câmara
                    <input type="file" accept="image/*" capture="environment" onChange={e => setIncidentPhoto(e.target.files?.[0] || null)} style={{ display: "none" }} />
                  </label>
                  <label style={{ flex: 1, padding: "0.75rem", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                    <ImageIcon size={16} /> Galeria
                    <input type="file" accept="image/*" onChange={e => setIncidentPhoto(e.target.files?.[0] || null)} style={{ display: "none" }} />
                  </label>
                </div>
                {incidentPhoto && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--color-success)", fontWeight: 600 }}>✓ Anexo: {incidentPhoto.name}</p>}
              </div>

              <button 
                onClick={(e) => {
                  e.preventDefault();
                  submitIncident();
                }} 
                disabled={incidentUploading || !incidentText}
                style={{
                  width: "100%", padding: "1rem", background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "white",
                  border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "1rem",
                  cursor: (incidentUploading || !incidentText) ? "not-allowed" : "pointer",
                  opacity: (incidentUploading || !incidentText) ? 0.6 : 1,
                  marginTop: "auto"
                }}
              >
                {incidentUploading ? "A ENVIAR..." : "ENVIAR OCORRÊNCIA"}
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(incidentModalRegex, newIncidentStructure);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('VigiaDashboard.tsx updated.');
