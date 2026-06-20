const fs = require('fs');

let content = fs.readFileSync('src/components/TeamManager.tsx', 'utf8');

// For the container of the list:
content = content.replace(
  /display: "flex", flexDirection: "column", gap: "0", paddingBottom: "2rem", background: "var\(--color-surface\)", borderRadius: "var\(--radius-md\)", border: "1px solid var\(--color-border\)"/g,
  'display: "flex", flexDirection: "column", gap: "0", paddingBottom: "2rem"'
);

fs.writeFileSync('src/components/TeamManager.tsx', content);
console.log("Removed container frame");
