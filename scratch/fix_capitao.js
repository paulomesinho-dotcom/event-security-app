const fs = require('fs');

const fixEncodingExact = (filePath) => {
  let c = fs.readFileSync(filePath, 'utf8');

  // Find CAPITÍO and replace with CAPITÃO
  c = c.replace(/CAPIT\xEDO/g, 'CAPIT\xC3O');
  // Also any other weird ones
  c = c.replace(/CAPIT\xEDo/g, 'Capit\xE3o');

  fs.writeFileSync(filePath, c);
};

fixEncodingExact('src/components/VigiaDashboard.tsx');
fixEncodingExact('src/components/CaptainPatrolDashboard.tsx');
console.log('Fixed CAPITÍO');
