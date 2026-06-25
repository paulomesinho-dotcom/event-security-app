const fs = require('fs');
const glob = require('glob'); // Not available? I'll use standard fs methods.

// 1. Fix globals.css
let cssFile = 'src/app/globals.css';
let cssContent = fs.readFileSync(cssFile, 'utf8');

cssContent = cssContent.replace(
  /\.quill-content-preview\s*\{[\s\S]*?\}\s*\.quill-content-preview\s*\*\s*\{[\s\S]*?\}/,
  `.quill-content-preview { 
  word-break: normal !important; 
  overflow-wrap: normal !important; 
  hyphens: none !important; 
  white-space: pre-wrap !important;
}
.quill-content-preview * { 
  word-break: normal !important; 
  overflow-wrap: normal !important; 
  hyphens: none !important; 
  white-space: pre-wrap !important;
}`
);

fs.writeFileSync(cssFile, cssContent);

// 2. Fix all wordBreak: "break-word" in tsx files to prevent other cuts
const walk = function(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk('src');
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let original = c;
  c = c.replace(/wordBreak:\s*"break-word"/g, 'wordBreak: "normal", overflowWrap: "anywhere"');
  if (c !== original) {
    fs.writeFileSync(f, c);
  }
});

console.log("Fixed all wordBreak properties!");
