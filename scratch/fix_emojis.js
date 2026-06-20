const fs = require('fs');
const path = require('path');

const replacements = {
  'Â·': '·',
  'ðŸ“ ': '📍',
  'ðŸ§\xAD': '🧭',
  'â€”': '—',
  'EVACUAÇíO': 'EVACUAÇÃO',
  'RECEÇíO': 'RECEÇÃO'
};

function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
    else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
      const orig = fs.readFileSync(fullPath, 'utf8');
      let content = orig;
      for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
      }
      if (content !== orig) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed emojis in', fullPath);
      }
    }
  });
}
walk('src');
