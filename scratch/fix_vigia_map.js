const fs = require('fs');

let content = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf8');

// Import MapModal
if (!content.includes('import MapModal')) {
  content = content.replace('import MapViewer from "./MapViewer";', 'import MapViewer from "./MapViewer";\nimport MapModal from "./MapModal";');
}

// Add mapModalData state
if (!content.includes('mapModalData')) {
  const stateRegex = /const \[selectedSuspect, setSelectedSuspect\] = useState<any>\(null\);/;
  content = content.replace(stateRegex, 'const [selectedSuspect, setSelectedSuspect] = useState<any>(null);\n  const [mapModalData, setMapModalData] = useState<any>(null);');
}

// Replace Google Maps links
content = content.replace(/<a href=\{`https:\/\/maps\.google\.com.*?\<\/a>/g, `
                          {(selectedSuspect?.planImageUrl) && (
                            <button 
                              onClick={() => setMapModalData({ planImageUrl: selectedSuspect.planImageUrl, pinX: selectedSuspect.pinX, pinY: selectedSuspect.pinY, title: "Localização" })} 
                              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginTop: "0.75rem", fontSize: "0.8rem", color: "#a855f7", textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              <MapPin size={14} /> Ver na Planta
                            </button>
                          )}
`);

// Add MapModal at the end
if (!content.includes('<MapModal')) {
  const mapModalJSX = `
      {mapModalData && (
        <MapModal
          data={{
            title: mapModalData.title,
            planImageUrl: mapModalData.planImageUrl,
            pinX: mapModalData.pinX,
            pinY: mapModalData.pinY
          }}
          onClose={() => setMapModalData(null)}
        />
      )}
  `;
  content = content.replace('    </div>\n  );\n}\n', mapModalJSX + '    </div>\n  );\n}\n');
}

fs.writeFileSync('src/components/VigiaDashboard.tsx', content, 'utf8');
