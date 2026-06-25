const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/app/dashboard/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Replace the "Gestão (PC)" button with user's name
const oldMobileButtons = `<button onClick={() => setIsPatrolMode(false)} className="btn btn-secondary" style={{ padding: "0.4rem 0.65rem", fontSize: "0.75rem" }}>Gestão (PC)</button>`;
const newMobileText = `<span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", marginRight: "0.5rem" }}>{user?.name || user?.email?.split('@')[0]}</span>`;

content = content.replace(oldMobileButtons, newMobileText);

// 2. Remove the "Modo Patrulha" button from the normal desktop view
const oldDesktopButton = `{(user?.role === "captain" || user?.role === "superadmin") && (
                 <button 
                   onClick={() => setIsPatrolMode(true)}
                   className="btn btn-primary"
                   style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", borderRadius: "100px", display: "flex", alignItems: "center", gap: "0.3rem" }}
                   title="Ativar Modo Patrulha (Mobile)"
                 >
                   <MapPin size={14} /> <span className="hidden-mobile">Modo Patrulha</span>
                 </button>
              )}`;

content = content.replace(oldDesktopButton, ``);

fs.writeFileSync(file, content);
console.log("Removed mode toggle buttons and added username to patrol nav");
