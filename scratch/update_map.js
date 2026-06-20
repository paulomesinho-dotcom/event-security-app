const fs = require('fs');

// 1. Update MapViewer.tsx
let mv = fs.readFileSync('src/components/MapViewer.tsx', 'utf8');

// Add isDragPinMode to Props
mv = mv.replace(
  'isAddPinMode?: boolean;',
  'isAddPinMode?: boolean;\n  isDragPinMode?: boolean;'
);

// Add to component signature
mv = mv.replace(
  'isAddPinMode }: MapViewerProps',
  'isAddPinMode, isDragPinMode = false }: MapViewerProps'
);

// In the pin mousedown:
mv = mv.replace(
  'if (!onLocatorDragEnd) return;',
  'if (!onLocatorDragEnd || !isDragPinMode) return;'
);

// In the pin touchstart:
mv = mv.replace(
  'if (!onLocatorDragEnd || e.touches.length > 1) return;',
  'if (!onLocatorDragEnd || !isDragPinMode || e.touches.length > 1) return;'
);

// Write back MapViewer.tsx
fs.writeFileSync('src/components/MapViewer.tsx', mv, 'utf8');


// 2. Update page.tsx
let page = fs.readFileSync('src/app/dashboard/plans/[id]/page.tsx', 'utf8');

// Add isDragPinMode state
page = page.replace(
  'const [isAddPinMode, setIsAddPinMode] = useState(false);',
  'const [isAddPinMode, setIsAddPinMode] = useState(false);\n  const [isDragPinMode, setIsDragPinMode] = useState(false);'
);

// Add the button
page = page.replace(
  '{user?.role === "captain" && (\n          <button',
  '{user?.role === "captain" && (\n          <div style={{ display: "flex", gap: "0.5rem" }}>\n            <button \n              className={`btn ${isDragPinMode ? \\'btn-warning\\' : \\'btn-outline\\'}`}\n              onClick={() => setIsDragPinMode(!isDragPinMode)}\n            >\n              {isDragPinMode ? "Bloquear Pinos" : "Mover Pinos"}\n            </button>\n            <button'
);

// Close the div wrapping the buttons
page = page.replace(
  '              {isAddPinMode ? "Cancelar Inserção" : "Adicionar Pino ao Mapa"}\n          </button>\n        )}',
  '              {isAddPinMode ? "Cancelar Inserção" : "Adicionar Pino ao Mapa"}\n            </button>\n          </div>\n        )}'
);

// Pass isDragPinMode to MapViewer
page = page.replace(
  'isAddPinMode={isAddPinMode}',
  'isAddPinMode={isAddPinMode}\n         isDragPinMode={isDragPinMode}'
);

// Wrap MapViewer in a constrained height div to fix vertical pan
page = page.replace(
  '<MapViewer \n         imageUrl={plan.imageUrl}',
  '<div style={{ height: "65vh", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>\n      <MapViewer \n         imageUrl={plan.imageUrl}'
);

page = page.replace(
  'isAddPinMode={isAddPinMode}\n         isDragPinMode={isDragPinMode}\n      />',
  'isAddPinMode={isAddPinMode}\n         isDragPinMode={isDragPinMode}\n      />\n      </div>'
);

fs.writeFileSync('src/app/dashboard/plans/[id]/page.tsx', page, 'utf8');
console.log('Done');
