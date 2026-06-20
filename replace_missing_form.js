const fs = require('fs');

let content = fs.readFileSync('src/components/EmergencyDashboard.tsx', 'utf-8');

const missingTabStart = `{activeTab === "missing" && (
               <div className="animate-fade-in">`;

const oldHeader = `<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 
"2rem" }}>
                 <div style={{ maxWidth: "600px" }}>
                   <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: 
"var(--color-text-primary)" }}>Pessoas Desaparecidas</h2>
                   <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.4, margin: 0, fontSize: "0.85rem" 
}}>
                     Pode haver vǭrias buscas em simultǽneo. Inicie uma nova busca para alertar toda a equipa.
                   </p>
                 </div>
                 {isSuperadmin && (
                 <button 
                   onClick={() => setShowMissingForm(true)}
                   style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "#eab308", color: "#000", border: "none", borderRadius: "var(--radius-full)", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
                 >
                   <span style={{ fontSize: "1.2rem" }}>+</span> NOVO ALERTA
                 </button>
                 )}
               </div>`;

// Replace the old header with nothing for now, we'll put it in the else branch
content = content.replace(oldHeader, `<!--MISSING_HEADER-->`);


const oldModal = `{showMissingForm && (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "1rem" }}>
                    <div style={{ background: "var(--color-bg)", width: "100%", maxWidth: "600px", borderRadius: "var(--radius-xl)", maxHeight: "90vh", overflowY: "auto", animation: "slideUp 0.3s ease-out", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid var(--color-border)" }}>
                        <h3 style={{ margin: 0, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-primary)" }}>
                          <Search size={24} color="#eab308" />
                          Nova Pessoa Desaparecida
                        </h3>
                        <button onClick={() => setShowMissingForm(false)} style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                          <X size={24} />
                        </button>
                      </div>
                      
                      <div style={{ padding: "1.5rem" }}>
                        <div style={{ marginBottom: "1.5rem" }}>
                           <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-primary)" }}>Descriǜo Completa (Obrigatrio)</label>
                           <textarea 
                             className="input" 
                             rows={4} 
                             value={missingDesc} 
                             onChange={e => setMissingDesc(e.target.value)} 
                             placeholder="Ex: Criana, aprox. 5 anos, t-shirt azul do porto, chora e procura pela mǜe..."
                             style={{ width: "100%", padding: "1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)", resize: "vertical" }}
                           />
                        </div>
  
                        <div style={{ marginBottom: "2.5rem" }}>
                           <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-primary)" }}>Fotografia de ReferǦncia (Opcional mas recomendado)</label>
                           <input 
                             type="file" 
                             accept="image/*" 
                             onChange={e => setMissingPhoto(e.target.files?.[0] || null)} 
                             style={{ width: "100%", padding: "0.75rem", background: "var(--color-surface)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-secondary)" }} 
                           />
                        </div>
  
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                          <button onClick={() => setShowMissingForm(false)} style={{ padding: "0.85rem 1.5rem", background: "transparent", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontWeight: 600, cursor: "pointer" }}>
                            Cancelar
                          </button>
                          <button 
                             onClick={triggerMissingPerson} 
                             disabled={uploading || !missingDesc} 
                             style={{ 
                               display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 2rem", 
                               background: (uploading || !missingDesc) ? "var(--color-surface)" : "#eab308", 
                               color: (uploading || !missingDesc) ? "var(--color-text-tertiary)" : "#000", 
                               border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: (uploading || !missingDesc) ? "not-allowed" : "pointer" 
                             }}
                           >
                            <Eye size={20} />
                            {uploading ? "A DISPARAR..." : "DISPARAR ALERTA"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
               )}`;

const newForm = `{showMissingForm ? (
                    <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--color-border)", animation: "slideUp 0.3s ease-out", display: "flex", flexDirection: "column" }}>
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
                    </div>
               ) : (
                 <>
                   <!--REPLACED_HEADER-->`;

content = content.replace(oldModal, newForm);

const replacedHeader = `<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
                 <div style={{ maxWidth: "600px" }}>
                   <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--color-text-primary)" }}>Pessoas Desaparecidas</h2>
                   <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.4, margin: 0, fontSize: "0.85rem" }}>
                     Pode haver vǭrias buscas em simultǽneo. Inicie uma nova busca para alertar toda a equipa.
                   </p>
                 </div>
                 {isSuperadmin && (
                 <button 
                   onClick={() => setShowMissingForm(true)}
                   style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "#eab308", color: "#000", border: "none", borderRadius: "var(--radius-full)", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
                 >
                   <span style={{ fontSize: "1.2rem" }}>+</span> NOVO ALERTA
                 </button>
                 )}
               </div>`;

content = content.replace('<!--REPLACED_HEADER-->', replacedHeader);
content = content.replace('<!--MISSING_HEADER-->', '');

// Add the closing tag for the fragment right before the end of the missing tab
content = content.replace(`{activeMissing.length})</h3>`, `{activeMissing.length})</h3>`); // anchor
// Wait, we need to close the <> tag after the list.
content = content.replace(`);
               })()}`, `);
               })()}
               </>
             )}`);

fs.writeFileSync('src/components/EmergencyDashboard.tsx', content);
console.log('Fixed modal -> full page form.');
