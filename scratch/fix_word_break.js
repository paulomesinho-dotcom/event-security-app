const fs = require('fs');

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    '.quill-content-preview { word-break: normal; overflow-wrap: break-word; hyphens: auto; }',
    '.quill-content-preview { word-break: normal; overflow-wrap: break-word; hyphens: none; white-space: pre-wrap; }'
  );

  fs.writeFileSync(file, content);
};

fixFile('src/app/globals.css');

console.log("Fixed word breaking in globals.css!");
