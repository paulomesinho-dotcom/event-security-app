const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const replacement = `
            {selectedSuspect.status === "active" && (
            <form onSubmit={handleAddSuspectUpdate} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-lg)", border: "1px solid rgba(168,85,247,0.2)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
`;

content = content.replace(
  /<form onSubmit=\{handleAddSuspectUpdate\} style=\{\{ background: "var\(--color-surface\)", padding: "1rem", borderRadius: "var\(--radius-lg\)", border: "1px solid rgba\(168,85,247,0\.2\)", display: "flex", flexDirection: "column", gap: "0\.75rem" \}\}>/g,
  replacement
);

const endReplacement = `
              <button type="submit" disabled={updateUploading || (!updateMessage && (updateType === 'resolvido' || updateType === 'falso_alarme'))} style={{ background: updateUploading ? "rgba(168,85,247,0.3)" : "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", padding: "0.75rem", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700, cursor: updateUploading ? "not-allowed" : "pointer", boxShadow: updateUploading ? "none" : "0 4px 12px rgba(168,85,247,0.35)" }}>
                {updateUploading ? "A enviar..." : "ENVIAR ATUALIZAÇÃO"}
              </button>
            </form>
            )}
`;

content = content.replace(
  /<button type="submit" disabled=\{updateUploading \|\| \(!updateMessage && \(updateType === 'resolvido' \|\| updateType === 'falso_alarme'\)\)\} style=\{\{ background: updateUploading \? "rgba\(168,85,247,0\.3\)" : "linear-gradient\(135deg, #7c3aed, #a855f7\)", color: "white", padding: "0\.75rem", border: "none", borderRadius: "var\(--radius-md\)", fontWeight: 700, cursor: updateUploading \? "not-allowed" : "pointer", boxShadow: updateUploading \? "none" : "0 4px 12px rgba\(168,85,247,0\.35\)" \}\}>\s*\{updateUploading \? "A enviar\.\.\." : "ENVIAR ATUALIZAÇíO"\}\s*<\/button>\s*<\/form>/g,
  endReplacement
);

fs.writeFileSync(file, content);
console.log('Update form hidden for non-active');
