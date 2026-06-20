const fs = require('fs');

// 1. Fix src/app/dashboard/page.tsx to show EmergencyBanner if they have activeWorkplaceId (which is true if they have pending OR active shifts)
let pagePath = 'src/app/dashboard/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf-8');

pageContent = pageContent.replace(/const \{ hasActiveShift \} = useWorkplace\(\);/g, 'const { hasActiveShift, activeWorkplaceId } = useWorkplace();');
pageContent = pageContent.replace(/\{hasActiveShift \? <EmergencyBanner \/> : null\}/g, '{activeWorkplaceId ? <EmergencyBanner /> : null}');
fs.writeFileSync(pagePath, pageContent);


// 2. Fix src/components/VigiaDashboard.tsx
let vigiaPath = 'src/components/VigiaDashboard.tsx';
let vigiaContent = fs.readFileSync(vigiaPath, 'utf-8');

// a. Allow bottom nav if there's any pending shift
vigiaContent = vigiaContent.replace(
    /\{activeShift && \(/g,
    '{(activeShift || pendingShifts.length > 0) && ('
);

// b. Allow reportIncident with pending shift
vigiaContent = vigiaContent.replace(
    /if \(!activeShift\) return alert\("Precisa de ter um turno ativo para reportar ocorrncias\."\);/g,
    'const currentShift = activeShift || shifts.find(s => s.status === "pending");\n    if (!currentShift) return alert("Precisa de ter um turno atribuído para reportar ocorrências.");'
);
vigiaContent = vigiaContent.replace(
    /if \(!activeShift\) return alert\("Precisa de ter um turno ativo para reportar ocorrências\."\);/g,
    'const currentShift = activeShift || shifts.find(s => s.status === "pending");\n    if (!currentShift) return alert("Precisa de ter um turno atribuído para reportar ocorrências.");'
);

// We must also fix the activeShift references inside submitIncident (shiftId, locatorName)
vigiaContent = vigiaContent.replace(
    /shiftId: activeShift\.id,/g,
    'shiftId: typeof currentShift !== "undefined" ? currentShift.id : activeShift?.id,'
);
vigiaContent = vigiaContent.replace(
    /locatorName: activeShift\.locatorName,/g,
    'locatorName: typeof currentShift !== "undefined" ? currentShift.locatorName : activeShift?.locatorName,'
);

// We must also update the new suspect button logic to use pending shift if active is not there
vigiaContent = vigiaContent.replace(
    /setSuspectLocal\(activeShiftLocation\?\.local \|\| activeWorkplace\?\.name \|\| activeShift\?\.locatorName \|\| ""\);/g,
    'setSuspectLocal(activeShiftLocation?.local || activeWorkplace?.name || activeShift?.locatorName || (pendingShifts[0]?.locatorName) || "");'
);

fs.writeFileSync(vigiaPath, vigiaContent);

console.log("Fixed vigia dashboard navigation and features");
