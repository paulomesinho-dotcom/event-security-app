const fs = require('fs');

let content = fs.readFileSync('src/components/TeamManager.tsx', 'utf8');

// Adicionar à Equipa
content = content.replace(
  /<button onClick=\{\(\) => addToTeam\(v\.id\)\} className="btn btn-primary" style=\{\{ padding: "0\.25rem 0\.75rem", fontSize: "0\.75rem", display: "flex", alignItems: "center", gap: "0\.4rem" \}\}>/g,
  '<button onClick={() => addToTeam(v.id)} className="btn btn-primary action-btn primary-action" style={{ padding: "0.35rem 1rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem", borderRadius: "100px", fontWeight: 600 }}>'
);

// Ceder
content = content.replace(
  /<button onClick=\{\(\) => \{ setLoanVigiaId\(v\.id\); setShowLoanModal\(true\); \}\} className="btn" style=\{\{ padding: "0\.2rem 0\.5rem", fontSize: "0\.75rem", background: "rgba\(255,255,255,0\.05\)", color: "var\(--color-text-primary\)" \}\} title="Ceder a outro Workplace">/g,
  '<button onClick={() => { setLoanVigiaId(v.id); setShowLoanModal(true); }} className="action-btn ghost-action" title="Ceder a outro Workplace">'
);

// Remover
content = content.replace(
  /<button onClick=\{\(\) => removeFromTeam\(v\.id\)\} className="btn" style=\{\{ padding: "0\.2rem 0\.5rem", fontSize: "0\.75rem", background: "rgba\(239, 68, 68, 0\.1\)", color: "#ef4444" \}\} title="Remover da equipa">/g,
  '<button onClick={() => removeFromTeam(v.id)} className="action-btn ghost-danger-action" title="Remover da equipa">'
);

// Inject custom styles for these new action buttons
const newStyles = `
        .hover-row:hover {
          background: rgba(128,128,128,0.08) !important;
        }
        .action-btn {
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ghost-action {
          padding: 0.35rem 0.85rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 100px;
          background: transparent;
          color: var(--color-text-secondary);
        }
        .ghost-action:hover {
          background: rgba(255,255,255,0.05);
          color: var(--color-text-primary);
        }
        .ghost-danger-action {
          padding: 0.35rem 0.6rem;
          font-size: 0.75rem;
          border-radius: 100px;
          background: transparent;
          color: rgba(239, 68, 68, 0.6);
        }
        .ghost-danger-action:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .primary-action {
          box-shadow: 0 2px 8px rgba(168, 85, 247, 0.2);
        }
        .primary-action:hover {
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.35);
          transform: translateY(-1px);
        }
`;

content = content.replace(
  /\.hover-row:hover \{\n\s*background: rgba\(128,128,128,0\.08\) !important;\n\s*\}/,
  newStyles.trim()
);

fs.writeFileSync('src/components/TeamManager.tsx', content);
console.log("Made buttons more beautiful");
