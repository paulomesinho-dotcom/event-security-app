const fs = require('fs');
const path = require('path');

const captainFile = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(captainFile, 'utf8');

// 1. Add state for collapsible
if (!content.includes('expandedIncidentId')) {
  content = content.replace(
    /const \[incidentTab, setIncidentTab\] = useState<"ativas" \| "arquivadas">/g,
    `const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);\n  const [incidentTab, setIncidentTab] = useState<"ativas" | "arquivadas">`
  );
}

// 2. Replace the incident card mapping block
const oldCardRegex = /<div key=\{idx\} style=\{\{ flexShrink: 0, background: "var\(--color-surface\)", borderRadius: "var\(--radius-md\)", border: "1px solid var\(--color-border\)", padding: "1rem", position: "relative" \}\}>[\s\S]*?<\/div>\s*\)\)\s*\)/;

const newCardHTML = `<div key={inc.id || idx} style={{ flexShrink: 0, background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden", position: "relative" }}>
                     <div 
                       onClick={() => setExpandedIncidentId(expandedIncidentId === inc.id ? null : inc.id)} 
                       style={{ padding: "1rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                     >
                       <div>
                         <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 600, display: "block", marginBottom: "0.2rem" }}>
                           {new Date(inc.createdAt).toLocaleString("pt-PT")}
                         </span>
                         <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--color-text-primary)" }}>
                           {inc.vigiaName || "Equipa de Segurança"}
                         </span>
                       </div>
                       <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                         <span style={{ background: incidentTab === "ativas" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: incidentTab === "ativas" ? "#ef4444" : "#10b981", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", fontSize: "0.7rem", fontWeight: 700 }}>
                           {incidentTab === "ativas" ? "ATIVA" : "RESOLVIDA"}
                         </span>
                         <span style={{ color: "var(--color-text-tertiary)", fontSize: "1.2rem", transform: expandedIncidentId === inc.id ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.2s" }}>›</span>
                       </div>
                     </div>
                     
                     {expandedIncidentId === inc.id && (
                       <div style={{ padding: "0 1rem 1rem 1rem", borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
                         <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "var(--color-text-primary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                           {inc.description}
                         </p>
                         {inc.photoUrl && (
                           <div style={{ marginTop: "0.5rem" }}>
                             <img src={inc.photoUrl} alt="Anexo" style={{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "var(--radius-sm)" }} />
                           </div>
                         )}
                         {incidentTab === "ativas" && (
                           <button
                             onClick={async (e) => {
                               e.stopPropagation();
                               if(confirm("Tem a certeza que deseja fechar esta ocorrência?")) {
                                 try {
                                   await updateDoc(doc(db, "incidents", inc.id), { status: "resolved", resolvedAt: new Date().toISOString(), resolvedBy: user?.name || user?.email || "Capitão" });
                                 } catch(err) { alert("Erro ao fechar"); }
                               }
                             }}
                             style={{ marginTop: "1rem", width: "100%", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                           >
                             FECHAR OCORRÊNCIA
                           </button>
                         )}
                       </div>
                     )}
                   </div>
                 ))
              )`;

content = content.replace(oldCardRegex, newCardHTML);
fs.writeFileSync(captainFile, content);


// VigiaDashboard.tsx
const vigiaFile = path.join(__dirname, '../src/components/VigiaDashboard.tsx');
let vigiaContent = fs.readFileSync(vigiaFile, 'utf8');

if (!vigiaContent.includes('expandedIncidentId')) {
  vigiaContent = vigiaContent.replace(
    /const \[incidentTab, setIncidentTab\] = useState<"ativas" \| "arquivadas">/g,
    `const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);\n  const [incidentTab, setIncidentTab] = useState<"ativas" | "arquivadas">`
  );
}

// In vigia app, we don't need the close button, but maybe we can add it? "nas ativas também está colapsiavle e só ao abrir tem a informaçáo e os botpoes de fechar e resolver". The user said "botões de fechar e resolver", so Vigia CAN close their own occurrences? Yes!
const vigiaNewCardHTML = `<div key={inc.id || idx} style={{ flexShrink: 0, background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden", position: "relative" }}>
                     <div 
                       onClick={() => setExpandedIncidentId(expandedIncidentId === inc.id ? null : inc.id)} 
                       style={{ padding: "1rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                     >
                       <div>
                         <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 600, display: "block", marginBottom: "0.2rem" }}>
                           {new Date(inc.createdAt).toLocaleString("pt-PT")}
                         </span>
                         <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--color-text-primary)" }}>
                           {inc.vigiaName || "A sua ocorrência"}
                         </span>
                       </div>
                       <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                         <span style={{ background: incidentTab === "ativas" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: incidentTab === "ativas" ? "#ef4444" : "#10b981", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", fontSize: "0.7rem", fontWeight: 700 }}>
                           {incidentTab === "ativas" ? "ATIVA" : "RESOLVIDA"}
                         </span>
                         <span style={{ color: "var(--color-text-tertiary)", fontSize: "1.2rem", transform: expandedIncidentId === inc.id ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.2s" }}>›</span>
                       </div>
                     </div>
                     
                     {expandedIncidentId === inc.id && (
                       <div style={{ padding: "0 1rem 1rem 1rem", borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
                         <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "var(--color-text-primary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                           {inc.description}
                         </p>
                         {inc.photoUrl && (
                           <div style={{ marginTop: "0.5rem" }}>
                             <img src={inc.photoUrl} alt="Anexo" style={{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "var(--radius-sm)" }} />
                           </div>
                         )}
                         {incidentTab === "ativas" && (
                           <button
                             onClick={async (e) => {
                               e.stopPropagation();
                               if(confirm("Tem a certeza que deseja fechar esta ocorrência?")) {
                                 try {
                                   await updateDoc(doc(db, "incidents", inc.id), { status: "resolved", resolvedAt: new Date().toISOString(), resolvedBy: user?.name || user?.email || "Vigia" });
                                 } catch(err) { alert("Erro ao fechar"); }
                               }
                             }}
                             style={{ marginTop: "1rem", width: "100%", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                           >
                             FECHAR OCORRÊNCIA
                           </button>
                         )}
                       </div>
                     )}
                   </div>
                 ))
              )`;

vigiaContent = vigiaContent.replace(oldCardRegex, vigiaNewCardHTML);
fs.writeFileSync(vigiaFile, vigiaContent);

console.log("Made occurrences collapsible");
