const fs = require('fs');
['src/components/CaptainPatrolDashboard.tsx', 'src/components/VigiaDashboard.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/(activePanel === 'zello'[^]*?background: ")linear-gradient\(135deg, #1e0a3c, #5b1030\)/g, '$1linear-gradient(135deg, #c2410c, #3b0764)');
  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
});
