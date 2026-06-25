const fs = require('fs');
const path = require('path');

let file = path.join(__dirname, '../src/components/InformationManager.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace imports
content = content.replace(
  /import dynamic from "next\/dynamic";\s*import "react-quill-new\/dist\/quill.snow.css";\s*const ReactQuill = dynamic\(\(\) => import\("react-quill-new"\), \{ ssr: false \}\);\s*const quillModules = \{[\s\S]*?\};\s*/,
  'import { Editor, EditorProvider } from "react-simple-wysiwyg";\n'
);

// Replace ReactQuill usage
content = content.replace(
  /<div className="quill-wrapper">[\s\S]*?<ReactQuill[\s\S]*?\/>[\s\S]*?<\/div>/,
  `<div className="wysiwyg-wrapper">
              <EditorProvider>
                <Editor 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  placeholder="Escreva a informação aqui..."
                  style={{ minHeight: '150px', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                />
              </EditorProvider>
            </div>`
);

fs.writeFileSync(file, content);
console.log("Replaced react-quill with react-simple-wysiwyg");
