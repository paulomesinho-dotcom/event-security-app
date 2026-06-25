const fs = require('fs');
const path = require('path');

function fixModal(filePath) {
  let c = fs.readFileSync(filePath, 'utf8');
  if (!c.includes('selectedPhoto &&')) {
    const modalHTML = `\n      {selectedPhoto && (
        <div onClick={() => setSelectedPhoto(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <img src={selectedPhoto} alt="Zoomed" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "var(--radius-md)" }} />
          <button onClick={() => setSelectedPhoto(null)} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✕</button>
        </div>
      )}`;
      
    if (c.includes('</MapModal>')) {
      c = c.replace('</MapModal>\n      )}', `</MapModal>\n      )}${modalHTML}`);
    } else {
      // VigiaDashboard might not have MapModal at the end
      // Let's just insert it before the last </div>
      const lastDivIndex = c.lastIndexOf('</div>');
      c = c.slice(0, lastDivIndex) + modalHTML + '\n    ' + c.slice(lastDivIndex);
    }
    fs.writeFileSync(filePath, c);
    console.log('Fixed ' + filePath);
  } else {
    console.log('Modal already exists in ' + filePath);
  }
}

fixModal(path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx'));
fixModal(path.join(__dirname, '../src/components/VigiaDashboard.tsx'));
