const fs = require('fs');

let cssFile = 'src/app/globals.css';
let cssContent = fs.readFileSync(cssFile, 'utf8');

cssContent = cssContent.replace(
  /\.quill-content-preview\s*\{[\s\S]*?\}\s*\.quill-content-preview\s*\*\s*\{[\s\S]*?\}/,
  `.quill-content-preview, .ql-editor { 
  word-break: normal !important; 
  word-wrap: break-word !important;
  overflow-wrap: break-word !important; 
  hyphens: none !important; 
  -webkit-hyphens: none !important;
  -ms-hyphens: none !important;
  white-space: pre-wrap !important;
  line-break: auto !important;
}
.quill-content-preview *, .ql-editor * { 
  word-break: normal !important; 
  word-wrap: break-word !important;
  overflow-wrap: break-word !important; 
  hyphens: none !important; 
  -webkit-hyphens: none !important;
  -ms-hyphens: none !important;
  white-space: pre-wrap !important;
  line-break: auto !important;
  max-width: 100%;
}`
);

fs.writeFileSync(cssFile, cssContent);

console.log("Applied break-word fix to .ql-editor as well!");
