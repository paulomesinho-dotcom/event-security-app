const fs = require('fs');
const path = require('path');

const captainFile = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(captainFile, 'utf8');

// 1. Fix inc.description -> inc.message
content = content.replace(/\{inc\.description\}/g, '{inc.message}');

// 2. Add selectedPhoto state if not exists
if (!content.includes('selectedPhoto')) {
  content = content.replace(
    /const \[expandedIncidentId, setExpandedIncidentId\] = useState<string \| null>\(null\);/,
    `const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);\n  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);`
  );
}

// 3. Make photo clickable in incidents
content = content.replace(
  /<img src=\{inc\.photoUrl\} alt="Anexo" style=\{\{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "var\(--radius-sm\)" \}\} \/>/g,
  `<img onClick={(e) => { e.stopPropagation(); setSelectedPhoto(inc.photoUrl); }} src={inc.photoUrl} alt="Anexo" style={{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "var(--radius-sm)", cursor: "zoom-in" }} />`
);

// 4. Add the Photo Modal at the end of the return statement (before the last closing div)
const photoModalHTML = `
        {selectedPhoto && (
          <div 
            onClick={() => setSelectedPhoto(null)} 
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          >
            <img src={selectedPhoto} alt="Zoomed" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "var(--radius-md)" }} />
            <button 
              onClick={() => setSelectedPhoto(null)} 
              style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
`;
// Replace the very end of the file. Assuming the file ends with:
//       </div>
//     </div>
//   );
// }
content = content.replace(/<\/div>\s*<\/div>\s*\);\s*\}\s*$/g, photoModalHTML);

fs.writeFileSync(captainFile, content);


// VigiaDashboard.tsx
const vigiaFile = path.join(__dirname, '../src/components/VigiaDashboard.tsx');
let vigiaContent = fs.readFileSync(vigiaFile, 'utf8');

vigiaContent = vigiaContent.replace(/\{inc\.description\}/g, '{inc.message}');

if (!vigiaContent.includes('selectedPhoto')) {
  vigiaContent = vigiaContent.replace(
    /const \[expandedIncidentId, setExpandedIncidentId\] = useState<string \| null>\(null\);/,
    `const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);\n  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);`
  );
}

vigiaContent = vigiaContent.replace(
  /<img src=\{inc\.photoUrl\} alt="Anexo" style=\{\{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "var\(--radius-sm\)" \}\} \/>/g,
  `<img onClick={(e) => { e.stopPropagation(); setSelectedPhoto(inc.photoUrl); }} src={inc.photoUrl} alt="Anexo" style={{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "var(--radius-sm)", cursor: "zoom-in" }} />`
);

// We need to also add the selectedPhoto modal to VigiaDashboard at the bottom
vigiaContent = vigiaContent.replace(/<\/div>\s*<\/div>\s*\);\s*\}\s*$/g, photoModalHTML);

fs.writeFileSync(vigiaFile, vigiaContent);

console.log("Fixed description->message and added photo modal");
