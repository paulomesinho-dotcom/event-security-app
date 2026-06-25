const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// I need to close the `)}` that I left open in the "DETETADO SUSPEITO" button in line 1095.
// Let's find exactly this block:
/*
            <button 
              onClick={() => {
                setSuspectLocal(activeShiftLocation?.local || activeWorkplace?.name || activeShift?.locatorName || (pendingShifts[0]?.locatorName) || "");
                setSuspectSublocal(activeShiftLocation?.sublocal || "");
                setSuspectSubsublocal(activeShiftLocation?.subsublocal || "");
                setShowNewSuspectModal(true);
              }}
              style={{ padding: "1rem 1.25rem", background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.95rem", boxShadow: "0 4px 16px rgba(168,85,247,0.4)" }}>
              <Crosshair size={20} /> DETETADO SUSPEITO
            </button>
              )}
*/
content = content.replace(/<Crosshair size=\{20\} \/> DETETADO SUSPEITO\s*<\/button>\s*\)\}\s*\{\(suspectTab/g, '<Crosshair size={20} /> DETETADO SUSPEITO\n            </button>\n              )}\n              {(suspectTab');

// Wait! I actually DID successfully insert `)}` but it wasn't valid syntax because I DID NOT insert `{suspectTab === "ativos" && (` around the button!
// I need to add `{suspectTab === "ativos" && (` before `<button \n              onClick={() => {\n                setSuspectLocal`.
content = content.replace(/<button \s*onClick=\{\(\) => \{\s*setSuspectLocal\(/g, '{suspectTab === "ativos" && (\n            <button \n              onClick={() => {\n                setSuspectLocal(');

// Now I also need to verify line 1102, which is currently `activeSuspects.map(sus => (`
// I need to change it to `(suspectTab === "ativos" ? activeSuspects : archivedSuspects).map(sus => (`
content = content.replace(/activeSuspects\.map\(sus => \(/g, '(suspectTab === "ativos" ? activeSuspects : archivedSuspects).map(sus => (');

fs.writeFileSync(file, content);
console.log('Fixed');
