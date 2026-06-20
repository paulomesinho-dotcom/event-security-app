const fs = require('fs');

let content = fs.readFileSync('src/components/TeamManager.tsx', 'utf8');

// Header padding
content = content.replace(
  /padding: "0\.5rem 1\.25rem"/g,
  'padding: "0.25rem 0.75rem"'
);
content = content.replace(
  /marginBottom: "0\.5rem"/g,
  'marginBottom: "0.25rem"'
);
// Row padding
content = content.replace(
  /padding: "1rem 1\.25rem"/g,
  'padding: "0.4rem 0.75rem"'
);

// Font sizes for text
content = content.replace(
  /fontSize: "0\.95rem"/g,
  'fontSize: "0.85rem"'
);
content = content.replace(
  /fontSize: "0\.9rem"/g,
  'fontSize: "0.8rem"'
);
// Badges
content = content.replace(
  /padding: "0\.3rem 0\.6rem", borderRadius: "var\(--radius-full\)", fontSize: "0\.75rem"/g,
  'padding: "0.15rem 0.4rem", borderRadius: "var(--radius-sm)", fontSize: "0.65rem"'
);

// Buttons in row
content = content.replace(
  /padding: "0\.4rem 0\.8rem", fontSize: "0\.8rem"/g,
  'padding: "0.2rem 0.5rem", fontSize: "0.75rem"'
);
content = content.replace(
  /padding: "0\.4rem 1\.25rem", fontSize: "0\.85rem"/g,
  'padding: "0.25rem 0.75rem", fontSize: "0.75rem"'
);

// List container gap
content = content.replace(
  /display: "flex", flexDirection: "column", gap: "0\.5rem", paddingBottom: "2rem"/g,
  'display: "flex", flexDirection: "column", gap: "0.15rem", paddingBottom: "2rem"'
);

// Make grid columns slightly more balanced
content = content.replace(
  /gridTemplateColumns: "2fr 2fr 1fr 1fr"/g,
  'gridTemplateColumns: "2.5fr 2fr 1fr 1.5fr"'
);

fs.writeFileSync('src/components/TeamManager.tsx', content);
console.log("Made rows denser");
