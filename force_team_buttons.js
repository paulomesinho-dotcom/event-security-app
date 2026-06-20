const fs = require('fs');

let content = fs.readFileSync('src/components/TeamManager.tsx', 'utf8');

// Ensure Ceder has an explicit rounded pill look
content = content.replace(
  /className="action-btn ghost-action" title="Ceder a outro Workplace"/g,
  'className="action-btn ghost-action" style={{ padding: "0.35rem 0.85rem", fontSize: "0.75rem", borderRadius: "100px", fontWeight: 600, background: "rgba(168, 85, 247, 0.08)", color: "var(--color-primary)", display: "flex", alignItems: "center" }} title="Ceder a outro Workplace"'
);

// Ensure Remover has an explicit rounded pill look
content = content.replace(
  /className="action-btn ghost-danger-action" title="Remover da equipa"/g,
  'className="action-btn ghost-danger-action" style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem", borderRadius: "100px", fontWeight: 600, background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", display: "flex", alignItems: "center" }} title="Remover da equipa"'
);

fs.writeFileSync('src/components/TeamManager.tsx', content);
console.log("Forced button styles");
