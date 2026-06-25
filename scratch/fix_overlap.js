const fs = require('fs');

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix info items
  content = content.replace(
    /style=\{\{ background: "var\(--color-surface\)", borderRadius: "var\(--radius-md\)", border: "1px solid var\(--color-border\)", overflow: "hidden" \}\}/g,
    'style={{ flexShrink: 0, background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden" }}'
  );

  // Fix archived incidents
  content = content.replace(
    /style=\{\{ background: "var\(--color-surface\)", borderRadius: "var\(--radius-md\)", padding: "1rem", border: "1px solid var\(--color-border\)" \}\}/g,
    'style={{ flexShrink: 0, background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "1rem", border: "1px solid var(--color-border)" }}'
  );

  fs.writeFileSync(file, content);
};

fixFile('src/components/VigiaDashboard.tsx');

console.log("Added flexShrink: 0 to VigiaDashboard items to prevent overlap!");
