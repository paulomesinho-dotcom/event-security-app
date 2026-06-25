const fs = require('fs');
let content = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf8');

const pendingShiftOld = `<h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                                  {shift.local || shift.locatorName}
                                </h4>`;
const pendingShiftNew = `<div style={{ marginBottom: "0.2rem" }}>
                                  {workplaces.find(w => w.planIds?.includes(shift.planId)) && (
                                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                      {workplaces.find(w => w.planIds?.includes(shift.planId))?.name}
                                    </span>
                                  )}
                                </div>
                                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                                  {shift.local || shift.locatorName}
                                </h4>`;

const normalize = (str) => str.replace(/\s+/g, '');
const normalizedContent = normalize(content);
const normalizedOld = normalize(pendingShiftOld);

if (normalizedContent.includes(normalizedOld)) {
    let regexStr = pendingShiftOld.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    content = content.replace(new RegExp(regexStr), pendingShiftNew);
    fs.writeFileSync('src/components/VigiaDashboard.tsx', content);
    console.log("Updated pending shift layout successfully!");
} else {
    console.log("Could not find pendingShiftOld. Normalized old length:", normalizedOld.length);
}
