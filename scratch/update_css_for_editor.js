const fs = require('fs');

let cssFile = 'src/app/globals.css';
let cssContent = fs.readFileSync(cssFile, 'utf8');

// Replace .ql-editor and .quill-wrapper CSS blocks with the new .wysiwyg-wrapper styles
cssContent = cssContent.replace(
  /\.quill-wrapper \{[\s\S]*?\}\s*\.quill-wrapper \.ql-toolbar \{[\s\S]*?\}\s*\.quill-wrapper \.ql-container \{[\s\S]*?\}/,
  `.wysiwyg-wrapper {
    background: var(--color-surface);
    color: var(--color-text-primary);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
  }
  .rsw-toolbar {
    border-bottom: 1px solid var(--color-border) !important;
    background: #f8f9fa !important;
  }
  .rsw-editor {
    min-height: 150px;
  }`
);

// Update .quill-content-preview, .ql-editor to include .rsw-editor instead
cssContent = cssContent.replace(/\.quill-content-preview, \.ql-editor/g, '.quill-content-preview, .rsw-editor');

fs.writeFileSync(cssFile, cssContent);

console.log("Updated globals.css for react-simple-wysiwyg");
