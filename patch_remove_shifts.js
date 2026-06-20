const fs = require('fs');

let content = fs.readFileSync('src/components/CaptainPatrolDashboard.tsx', 'utf8');

// The block to remove is:
//       {shifts.length === 0 ? (
//         <div style={{ textAlign: "center", padding: "4rem 1.5rem", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)" }}>
//           <Calendar size={44} style={{ color: "var(--color-text-tertiary)", marginBottom: "1rem" }} />
//           <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>Ainda no tem turnos atribudos.<br />Aguarde a atribuio pelo seu Capito.</p>
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
//           {/* Removed inline action buttons to put them in fixed bottom bar */}

const regex = /\{shifts\.length === 0 \? \([\s\S]*?\) : \(\s*<div style=\{\{ display: "flex", flexDirection: "column", gap: "1.75rem" \}\}>\s*\{\/\* Removed inline action buttons to put them in fixed bottom bar \*\/\}/;

if (regex.test(content)) {
    content = content.replace(regex, '<div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>');
    
    // Now remove the closing )} at the end
    // It should be before the end of the return statement
    // Let's replace the last 
    //         </div>
    //       )}
    //     </div>
    //   </div>
    const endRegex = /<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*$/;
    content = content.replace(endRegex, '        </div>\n      </div>\n    </div>\n');
    
    fs.writeFileSync('src/components/CaptainPatrolDashboard.tsx', content);
    console.log('Patched correctly!');
} else {
    console.log('Regex did not match!');
}
