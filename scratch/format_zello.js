const fs = require('fs');

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // Insert helper function if not exists
  if (!content.includes('const formatZelloLink')) {
    content = content.replace(
      'export default function',
      `const formatZelloLink = (link) => {
  if (!link) return "#";
  link = link.trim();
  if (link.startsWith("http://") || link.startsWith("https://") || link.startsWith("zello://")) return link;
  return \`zello://\${link}\`;
};

export default function`
    );
  }

  // Replace hrefs
  content = content.replace(
    /href=\{activeWorkplace\.zelloChannelLink\}/g,
    'href={formatZelloLink(activeWorkplace.zelloChannelLink)}'
  );

  content = content.replace(
    /href=\{activeWorkplace\.zelloGroupLink\}/g,
    'href={formatZelloLink(activeWorkplace.zelloGroupLink)}'
  );

  fs.writeFileSync(file, content);
};

fixFile('src/components/VigiaDashboard.tsx');
fixFile('src/components/CaptainPatrolDashboard.tsx');

console.log("Fixed Zello links for deep linking!");
