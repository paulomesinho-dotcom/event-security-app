const fs = require('fs');

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // Revert Vigias channel link
  content = content.replace(
    /href=\{activeWorkplace\.zelloChannelLink\.startsWith\("http"\) \? activeWorkplace\.zelloChannelLink : `https:\/\/\$\{activeWorkplace\.zelloChannelLink\}`\} target="_blank" rel="noopener noreferrer"/g,
    'href={activeWorkplace.zelloChannelLink}'
  );

  // Revert Captains group link
  content = content.replace(
    /href=\{activeWorkplace\.zelloGroupLink\.startsWith\("http"\) \? activeWorkplace\.zelloGroupLink : `https:\/\/\$\{activeWorkplace\.zelloGroupLink\}`\} target="_blank" rel="noopener noreferrer"/g,
    'href={activeWorkplace.zelloGroupLink}'
  );

  fs.writeFileSync(file, content);
};

fixFile('src/components/VigiaDashboard.tsx');
fixFile('src/components/CaptainPatrolDashboard.tsx');

console.log("Reverted external links!");
