const fs = require('fs');

['src/components/CaptainPatrolDashboard.tsx', 'src/components/VigiaDashboard.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/linear-gradient\(135deg, #c2410c, #3b0764\)/g, 'linear-gradient(135deg, #3b0764, #c2410c)');
  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
});
