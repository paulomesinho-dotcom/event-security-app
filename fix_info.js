const fs = require('fs');

// 1. Fix InformationManager.tsx (remove line clamp)
let infoManagerPath = 'src/components/InformationManager.tsx';
let infoContent = fs.readFileSync(infoManagerPath, 'utf-8');
infoContent = infoContent.replace(/display:\s*"-webkit-box",\s*WebkitLineClamp:\s*2,\s*WebkitBoxOrient:\s*"vertical",\s*overflow:\s*"hidden"/g, 'wordBreak: "break-word"');
fs.writeFileSync(infoManagerPath, infoContent);

// 2. Fix globals.css (prevent horizontal overflow in quill)
let cssPath = 'src/app/globals.css';
let cssContent = fs.readFileSync(cssPath, 'utf-8');

if (!cssContent.includes('word-break: break-word')) {
    cssContent = cssContent.replace(
        '.quill-content-preview ul, .quill-content-preview ol', 
        '.quill-content-preview { word-break: break-word; overflow-wrap: anywhere; }\n.quill-content-preview * { max-width: 100%; }\n.quill-content-preview ul, .quill-content-preview ol'
    );
    fs.writeFileSync(cssPath, cssContent);
}

console.log("Fixed information display");
