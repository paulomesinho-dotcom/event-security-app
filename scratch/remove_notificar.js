const fs = require('fs');

let content = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf8');

const regex = /<button[\s\S]*?Notificar Capitão[\s\S]*?<\/button>/;
const match = content.match(regex);
if (match) {
  content = content.replace(regex, '');
  fs.writeFileSync('src/components/VigiaDashboard.tsx', content, 'utf8');
  console.log('Removed button Notificar Capitão');
} else {
  // Try with the mangled Capitǜo or whatever
  const regex2 = /<button[\s\S]*?Notificar Capit[\s\S]*?<\/button>/;
  const match2 = content.match(regex2);
  if (match2) {
    content = content.replace(regex2, '');
    fs.writeFileSync('src/components/VigiaDashboard.tsx', content, 'utf8');
    console.log('Removed button Notificar Capit (mangled)');
  } else {
    console.log('Button not found');
  }
}
