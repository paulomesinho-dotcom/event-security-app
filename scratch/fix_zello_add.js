const fs = require('fs');

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // We find the block of formatZelloLink and replace it.
  const oldFunc = /const formatZelloLink = \(link: string \| undefined\) => \{([\s\S]*?)return \`zello:\/\/\$\{link\}\`;\n\};/;
  
  const newFunc = `const formatZelloLink = (link: string | undefined) => {
  if (!link) return "#";
  link = link.trim();
  if (link.startsWith("http://") || link.startsWith("https://")) return link;
  
  let formatted = link.startsWith("zello://") ? link : \`zello://\${link}\`;
  if (!formatted.includes("?add_channel")) {
    formatted += "?add_channel";
  }
  return formatted;
};`;

  content = content.replace(oldFunc, newFunc);
  fs.writeFileSync(file, content);
};

fixFile('src/components/VigiaDashboard.tsx');
fixFile('src/components/CaptainPatrolDashboard.tsx');

console.log("Added ?add_channel to Zello links!");
