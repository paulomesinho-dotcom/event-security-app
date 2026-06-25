const fs = require('fs');

function fixImport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/import\s+\{([\s\S]*?)\}\s+from\s+"firebase\/firestore";/, (match, p1) => {
    const imports = new Set(p1.split(',').map(s => s.trim()).filter(Boolean));
    imports.add('arrayUnion');
    return `import { ${Array.from(imports).join(', ')} } from "firebase/firestore";`;
  });

  fs.writeFileSync(filePath, content);
  console.log('Fixed imports in ' + filePath);
}

fixImport('src/components/CaptainPatrolDashboard.tsx');
fixImport('src/components/VigiaDashboard.tsx');
