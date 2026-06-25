const fs = require('fs');

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    'const formatZelloLink = (link) => {',
    'const formatZelloLink = (link: string | undefined) => {'
  );

  fs.writeFileSync(file, content);
};

fixFile('src/components/VigiaDashboard.tsx');
fixFile('src/components/CaptainPatrolDashboard.tsx');

console.log("Fixed TS errors!");
