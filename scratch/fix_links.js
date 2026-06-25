const fs = require('fs');

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix Vigias channel link
  content = content.replace(
    /href=\{activeWorkplace\.zelloChannelLink\}/g,
    'href={activeWorkplace.zelloChannelLink.startsWith("http") ? activeWorkplace.zelloChannelLink : `https://${activeWorkplace.zelloChannelLink}`} target="_blank" rel="noopener noreferrer"'
  );

  // Fix Captains group link
  content = content.replace(
    /href=\{activeWorkplace\.zelloGroupLink\}/g,
    'href={activeWorkplace.zelloGroupLink.startsWith("http") ? activeWorkplace.zelloGroupLink : `https://${activeWorkplace.zelloGroupLink}`} target="_blank" rel="noopener noreferrer"'
  );

  fs.writeFileSync(file, content);
};

fixFile('src/components/VigiaDashboard.tsx');
fixFile('src/components/CaptainPatrolDashboard.tsx');

console.log("Fixed external links!");
