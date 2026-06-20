const fs = require('fs');

let banner = fs.readFileSync('src/components/EmergencyBanner.tsx', 'utf-8');

// 1. Import useRef
if (!banner.includes('useRef')) {
  banner = banner.replace('import { useState, useEffect } from "react";', 'import { useState, useEffect, useRef } from "react";');
}

// 2. Add prevGlobalEmergencyRef
if (!banner.includes('prevGlobalEmergencyRef')) {
  banner = banner.replace('const [globalEmergency, setGlobalEmergency] = useState(false);', 'const [globalEmergency, setGlobalEmergency] = useState(false);\n  const prevGlobalEmergencyRef = useRef(false);');
}

// 3. Fix the condition in global emergency listener
banner = banner.replace(
  'if (!initialLoadGlobal && data.globalEmergency === true && !globalEmergency)',
  'if (!initialLoadGlobal && data.globalEmergency === true && !prevGlobalEmergencyRef.current)'
);

// 4. Update the ref
if (!banner.includes('prevGlobalEmergencyRef.current = data.globalEmergency === true;')) {
  banner = banner.replace(
    'setGlobalEmergency(data.globalEmergency === true);',
    'prevGlobalEmergencyRef.current = data.globalEmergency === true;\n        setGlobalEmergency(data.globalEmergency === true);'
  );
}

// 5. Add onClick and cursor to the toast container
banner = banner.replace(
  '<div style={{ position: "fixed", top: 10, left: 10, right: 10, zIndex: 9999, display: "flex", flexDirection: "column", gap: "0.5rem" }}>',
  '<div onClick={() => stopAlertBeeps()} style={{ position: "fixed", top: 10, left: 10, right: 10, zIndex: 9999, display: "flex", flexDirection: "column", gap: "0.5rem", cursor: "pointer" }}>'
);

// 6. Add "Clique para silenciar" to the Local Emergency Toast
banner = banner.replace(
  '<div style={{ fontSize: "1rem" }}>{em.name}</div>',
  '<div style={{ fontSize: "1rem" }}>{em.name}</div>\n                <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", opacity: 0.8 }}>(Clique em qualquer parte deste aviso para silenciar o alarme)</div>'
);

fs.writeFileSync('src/components/EmergencyBanner.tsx', banner);
console.log('Fixed banner globals and toasts.');
