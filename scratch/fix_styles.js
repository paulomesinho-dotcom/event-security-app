const fs = require('fs');

function revertStyles(filePath) {
  let c = fs.readFileSync(filePath, 'utf8');

  // Revert the gradient back to the original for Rádio, Occurrences, and modals
  c = c.replace(/background: "linear-gradient\(135deg, #f97316, #ea580c\)"/g, 'background: "linear-gradient(135deg, #1e0a3c, #5b1030)"');

  // Fix button background: change back to Google blue
  c = c.replace(/style=\{\{\s*width: "100%", padding: "1\.2rem", background: "linear-gradient\(135deg, #1e0a3c, #5b1030\)"/g, 'style={{ width: "100%", padding: "1.2rem", background: "linear-gradient(135deg, #4285F4, #1A73E8)"');

  // Also change the notification button box-shadow color to match blue
  c = c.replace(/boxShadow: "0 4px 16px rgba\(249,115,22,0\.4\)"/g, 'boxShadow: "0 4px 16px rgba(66, 133, 244, 0.4)"');

  // Remove the <p> under Rádios e Alertas
  c = c.replace(/<p style=\{\{ margin: 0, fontSize: "0\.75rem", color: "#fdba74" \}\}>Rádios e Alertas<\/p>\s*/g, '');

  // Remove the <p> under Alerta Geral para Equipas
  c = c.replace(/<p style=\{\{ margin: 0, fontSize: "0\.75rem", color: "#ffffff" \}\}>Alerta Geral para Equipas<\/p>\s*/g, '');
  
  // Also fix the text colors in the modals back to what they were or something sensible
  // For global alert modal icon circle, if we reverted the gradient, maybe we leave it as is?
  // User just wanted Google blue for the button, and gradient reverted for header.
  
  fs.writeFileSync(filePath, c);
  console.log('Fixed styles in ' + filePath);
}

revertStyles('src/components/CaptainPatrolDashboard.tsx');
revertStyles('src/components/VigiaDashboard.tsx');
