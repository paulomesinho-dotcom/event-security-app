const fs = require('fs');

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    '.quill-content-preview { word-break: normal; overflow-wrap: break-word; hyphens: none; white-space: pre-wrap; }',
    `.quill-content-preview { 
  word-break: normal !important; 
  overflow-wrap: break-word !important; 
  hyphens: none !important; 
  white-space: normal !important;
}
.quill-content-preview * { 
  word-break: normal !important; 
  overflow-wrap: break-word !important; 
  hyphens: none !important; 
}`
  );

  fs.writeFileSync(file, content);
};

fixFile('src/app/globals.css');

console.log("Forced normal word-breaking for quill preview!");
