const fs = require('fs');

let cssFile = 'src/app/globals.css';
let cssContent = fs.readFileSync(cssFile, 'utf8');

cssContent = cssContent.replace(
  /\.quill-content-preview\s*\{[\s\S]*?\}\s*\.quill-content-preview\s*\*\s*\{[\s\S]*?\}/,
  `.quill-content-preview { 
  word-break: normal !important; 
  word-wrap: normal !important;
  overflow-wrap: normal !important; 
  hyphens: none !important; 
  -webkit-hyphens: none !important;
  -ms-hyphens: none !important;
  white-space: normal !important;
  line-break: auto !important;
}
.quill-content-preview * { 
  word-break: normal !important; 
  word-wrap: normal !important;
  overflow-wrap: normal !important; 
  hyphens: none !important; 
  -webkit-hyphens: none !important;
  -ms-hyphens: none !important;
  white-space: normal !important;
  line-break: auto !important;
}`
);

fs.writeFileSync(cssFile, cssContent);

console.log("Applied absolute normal text rules to globals.css!");
