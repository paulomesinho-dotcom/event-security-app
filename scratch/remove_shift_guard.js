const fs = require('fs');
const path = require('path');

const captainFile = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let captainContent = fs.readFileSync(captainFile, 'utf8');

captainContent = captainContent.replace(
  /if \(!currentShift\) return alert\("Precisa de ter um turno atribuído para reportar ocorrências\."\);/,
  `// if (!currentShift) return alert("Precisa de ter um turno atribuído para reportar ocorrências.");`
);

fs.writeFileSync(captainFile, captainContent);

const vigiaFile = path.join(__dirname, '../src/components/VigiaDashboard.tsx');
let vigiaContent = fs.readFileSync(vigiaFile, 'utf8');

vigiaContent = vigiaContent.replace(
  /if \(!currentShift\) return alert\("Precisa de ter um turno atribuído para reportar ocorrências\."\);/,
  `// if (!currentShift) return alert("Precisa de ter um turno atribuído para reportar ocorrências.");`
);

// Also we should check if VigiaDashboard hides the bottom bar completely, but the user specifically asked "para abrir uma ocorrencia não preciso de turno ativo" - this implies they probably clicked the button and got the alert! If the button wasn't there, they wouldn't know they couldn't open it.

fs.writeFileSync(vigiaFile, vigiaContent);

console.log('Removed shift guard for occurrences');
