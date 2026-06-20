const fs = require('fs');

function removeEllipsis(file) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf-8');
    
    // Replace the truncation styles with wrapping styles
    content = content.replace(/whiteSpace:\s*"nowrap",\s*overflow:\s*"hidden",\s*textOverflow:\s*"ellipsis"/g, 'whiteSpace: "pre-wrap", wordBreak: "break-word"');
    
    fs.writeFileSync(file, content);
    console.log("Fixed " + file);
}

removeEllipsis('src/components/IncidentManager.tsx');
removeEllipsis('src/components/SuspectManager.tsx');
