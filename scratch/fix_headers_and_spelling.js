const fs = require('fs');

const fixGradientsAndSpelling = (filePath) => {
  let c = fs.readFileSync(filePath, 'utf8');

  // Fix MENSAGEM DO CAPITO spelling
  c = c.replace(/MENSAGEM DO CAPITO/g, 'MENSAGEM DO CAPITÃO');
  c = c.replace(/MENSAGEM DO CAPITO/g, 'MENSAGEM DO CAPITÃO');
  c = c.replace(/CAPITO/g, 'CAPITÃO');
  c = c.replace(/OcorrǦncias/g, 'Ocorrências');
  c = c.replace(/OcorrǦncia/g, 'Ocorrência');

  // Fix Suspects header gradient
  // It's currently: <div style={{ background: "linear-gradient(135deg, #1e0a3c, #2d1060)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(168,85,247,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  // We want to make it the bright purple gradient: #7c3aed, #a855f7
  // Or maybe #6b21a8, #9333ea so it's not too bright. Let's use #7c3aed, #a855f7
  const oldSuspectHeader = /background: "linear-gradient\(135deg, #1e0a3c, #2d1060\)", padding: "1\.25rem 1\.5rem",\s*borderBottom: "1px solid rgba\(168,85,247,0\.3\)"/g;
  c = c.replace(oldSuspectHeader, 'background: "linear-gradient(135deg, #6b21a8, #9333ea)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(168,85,247,0.3)"');

  // Fix Occurrences header gradient
  // It's currently: <div style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(239,68,68,0.3)"
  // We want to make it the bright red gradient: #dc2626, #ef4444
  const oldIncidentHeader = /background: "linear-gradient\(135deg, #f97316, #ea580c\)", padding: "1\.25rem 1\.5rem",\s*borderBottom: "1px solid rgba\(239,68,68,0\.3\)"/g;
  c = c.replace(oldIncidentHeader, 'background: "linear-gradient(135deg, #b91c1c, #ef4444)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(239,68,68,0.3)"');

  // Fix activePanel === 'incidents' header if it has the #1e0a3c dark gradient (in case it wasn't orange)
  const oldIncidentHeaderDark = /background: "linear-gradient\(135deg, #1e0a3c, #5b1030\)", padding: "1\.25rem 1\.5rem",\s*borderBottom: "1px solid rgba\(239,68,68,0\.3\)"/g;
  c = c.replace(oldIncidentHeaderDark, 'background: "linear-gradient(135deg, #b91c1c, #ef4444)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(239,68,68,0.3)"');

  fs.writeFileSync(filePath, c);
};

fixGradientsAndSpelling('src/components/VigiaDashboard.tsx');
fixGradientsAndSpelling('src/components/CaptainPatrolDashboard.tsx');

console.log('Fixed headers and spelling');
