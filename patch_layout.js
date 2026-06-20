const fs = require('fs');
let content = fs.readFileSync('src/app/layout.tsx', 'utf-8');

if (!content.includes('AckModal')) {
  content = content.replace('import { WorkplaceProvider } from "@/contexts/WorkplaceContext";', 'import { WorkplaceProvider } from "@/contexts/WorkplaceContext";\nimport AckModal from "@/components/AckModal";');
  
  content = content.replace('{children}\n          </WorkplaceProvider>', '{children}\n            <AckModal />\n          </WorkplaceProvider>');
  
  fs.writeFileSync('src/app/layout.tsx', content);
  console.log('layout.tsx patched with AckModal.');
} else {
  console.log('AckModal already exists in layout.tsx');
}
