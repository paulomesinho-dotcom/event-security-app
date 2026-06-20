const fs = require('fs');
const files = [
  'src/components/EmergencyDashboard.tsx', 
  'src/components/VigiaDashboard.tsx', 
  'src/components/IncidentManager.tsx', 
  'src/components/EmergencyBanner.tsx'
];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    let content = fs.readFileSync(f, 'utf-8');
    
    // Replace flex: 1 with flex: 1, minWidth: 0 inside style objects
    // But avoid double-adding if it's already there
    content = content.replace(/flex:\s*1\s*(?=[,}])/g, 'flex: 1, minWidth: 0');
    // clean up any potential minWidth: 0, minWidth: 0
    content = content.replace(/minWidth:\s*0,\s*minWidth:\s*0/g, 'minWidth: 0');
    
    fs.writeFileSync(f, content);
});
console.log("Flex containers fixed");
