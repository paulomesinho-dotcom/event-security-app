const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'VigiaDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Import playAlertBeeps
if (!content.includes('playAlertBeeps')) {
  const importPos = content.indexOf('import { db }');
  content = content.slice(0, importPos) + 'import { playAlertBeeps } from "@/lib/audioAlert";\n' + content.slice(importPos);
}

// 2. Modify unsubIncidents
const incidentsFind = 'const unsubIncidents = onSnapshot(qIncidents, (snap) => {\n      setIncidents(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));\n    });';
const incidentsReplace = `const unsubIncidents = onSnapshot(qIncidents, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
          if (Date.now() - createdAt < 15000) {
            if (data.type === 'Emergência' || data.type === 'Pessoa Desaparecida') {
              playAlertBeeps();
            }
          }
        }
      });
      setIncidents(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });`;
content = content.replace(incidentsFind, incidentsReplace);

// 3. Modify unsubSuspects
const suspectsFind = 'const unsubSuspects = onSnapshot(qSuspects, (snap) => {\n      setSuspects(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));\n    });';
const suspectsReplace = `const unsubSuspects = onSnapshot(qSuspects, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
          if (Date.now() - createdAt < 15000) {
            playAlertBeeps();
          }
        }
      });
      setSuspects(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });`;
content = content.replace(suspectsFind, suspectsReplace);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('VigiaDashboard.tsx patched with audio alerts');
