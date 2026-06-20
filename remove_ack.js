const fs = require('fs');

let layout = fs.readFileSync('src/app/layout.tsx', 'utf-8');
layout = layout.replace('import AckModal from "@/components/AckModal";\n', '');
layout = layout.replace('<AckModal />\n            ', '');
fs.writeFileSync('src/app/layout.tsx', layout);

if (fs.existsSync('src/components/AckModal.tsx')) {
  fs.unlinkSync('src/components/AckModal.tsx');
}
console.log('AckModal removed');
