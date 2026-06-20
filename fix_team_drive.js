const fs = require('fs');

let content = fs.readFileSync('src/components/TeamManager.tsx', 'utf8');

// For the container of the list:
content = content.replace(
  /display: "flex", flexDirection: "column", gap: "0\.15rem", paddingBottom: "2rem"/g,
  'display: "flex", flexDirection: "column", gap: "0", paddingBottom: "2rem", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)"'
);

// For the headers:
content = content.replace(
  /padding: "0\.25rem 0\.75rem", color: "var\(--color-text-secondary\)", fontSize: "0\.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0\.05em", borderBottom: "1px solid var\(--color-border\)", marginBottom: "0\.25rem"/g,
  'padding: "0.75rem 1rem", color: "var(--color-text-secondary)", fontSize: "0.85rem", fontWeight: 600, borderBottom: "1px solid var(--color-border)", marginBottom: "0"'
);

// For the "Efetivo" row:
content = content.replace(
  /background: "var\(--color-surface\)", borderRadius: "var\(--radius-md\)", border: "1px solid var\(--color-border\)", transition: "all 0\.2s", cursor: "default"/g,
  'background: "transparent", borderBottom: "1px solid var(--color-border)", borderRadius: "0", transition: "background 0.1s", cursor: "pointer"'
);
content = content.replace(
  /background: "var\(--color-surface\)", borderRadius: "var\(--radius-md\)", border: "1px dashed var\(--color-border\)", transition: "all 0\.2s"/g,
  'background: "transparent", borderBottom: "1px solid var(--color-border)", borderRadius: "0", transition: "background 0.1s", cursor: "pointer"'
);


// For the "Cedido" row:
content = content.replace(
  /background: "linear-gradient\(90deg, rgba\(168, 85, 247, 0\.05\) 0%, var\(--color-surface\) 100%\)", borderRadius: "var\(--radius-md\)", border: "1px solid rgba\(168, 85, 247, 0\.3\)", transition: "all 0\.2s", cursor: "default"/g,
  'background: "rgba(168, 85, 247, 0.03)", borderBottom: "1px solid var(--color-border)", borderRadius: "0", transition: "background 0.1s", cursor: "pointer"'
);

// Update padding in rows to match Drive's airy but connected rows
content = content.replace(
  /padding: "0\.4rem 0\.75rem"/g,
  'padding: "0.6rem 1rem"'
);

// Remove the shadow and transform from hover
content = content.replace(
  /transform: translateY\(-1px\);\n\s*box-shadow: var\(--shadow-sm\);/g,
  ''
);
// Change hover background to a subtle gray/drive-like highlight
content = content.replace(
  /background: rgba\(255,255,255,0\.03\) !important;/g,
  'background: rgba(128,128,128,0.08) !important;'
);

fs.writeFileSync('src/components/TeamManager.tsx', content);
console.log("Applied Google Drive layout");
