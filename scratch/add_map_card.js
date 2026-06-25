const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const injection = `
      {activeWorkplace?.plans && activeWorkplace.plans.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>O Seu Local</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {activeWorkplace.plans.map((p: any) => (
              <button 
                key={p.id}
                onClick={() => setMapModalData({ title: p.name, planImageUrl: p.imageUrl })}
                style={{ width: "100%", padding: "1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", color: "var(--color-text-primary)", fontWeight: 600, fontSize: "0.95rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
                    <MapPin size={16} />
                  </div>
                  {p.name}
                </div>
                <span style={{ fontSize: "1.2rem", color: "var(--color-text-tertiary)" }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}
`;

content = content.replace(
  /<div style=\{\{ display: "flex", flexDirection: "column", gap: "1\.75rem" \}\}>\s*\{\/\* Secção Principal: Estado da Equipa \*\/\}/g,
  `<div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
${injection}
          {/* Secção Principal: Estado da Equipa */}`
);

fs.writeFileSync(file, content);
console.log('Done!');
