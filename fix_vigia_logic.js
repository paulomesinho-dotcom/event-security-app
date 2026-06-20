const fs = require('fs');

// 1. Fix src/app/dashboard/page.tsx to only show EmergencyBanner to vigia with activeShift
let pagePath = 'src/app/dashboard/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf-8');

// Replace: <EmergencyBanner />
// With: {hasActiveShift && <EmergencyBanner />}
// Note: hasActiveShift is available from `useWorkplace()` in page.tsx
pageContent = pageContent.replace(/<EmergencyBanner \/>/g, '{hasActiveShift ? <EmergencyBanner /> : null}');
fs.writeFileSync(pagePath, pageContent);

// 2. Fix VigiaDashboard.tsx
let vigiaPath = 'src/components/VigiaDashboard.tsx';
let vigiaContent = fs.readFileSync(vigiaPath, 'utf-8');

// a. Sort pendingShifts
vigiaContent = vigiaContent.replace(
    /const pendingShifts = shifts\.filter\(s => s\.status === "pending"\);/g,
    'const pendingShifts = shifts.filter(s => s.status === "pending").sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());'
);

// b. clear activeSuspects if no active shift
// Find the useEffect for suspicious_persons
const searchStr = `  useEffect(() => {\n    const q = query(\n      collection(db, "suspicious_persons"), \n      where("status", "==", "active"),\n      orderBy("createdAt", "desc")\n    );`;
const replaceStr = `  useEffect(() => {\n    if (!shifts.some(s => s.status === "active")) {\n      setActiveSuspects([]);\n      return;\n    }\n    const q = query(\n      collection(db, "suspicious_persons"), \n      where("status", "==", "active"),\n      orderBy("createdAt", "desc")\n    );`;

if (vigiaContent.includes(searchStr)) {
    vigiaContent = vigiaContent.replace(searchStr, replaceStr);
} else {
    // try a more generic replacement
    vigiaContent = vigiaContent.replace(/useEffect\(\(\) => \{\s*const q = query\(\s*collection\(db, "suspicious_persons"\)/g, 
        'useEffect(() => {\n    if (!shifts.some(s => s.status === "active")) { setActiveSuspects([]); return; }\n    const q = query(collection(db, "suspicious_persons")');
}

fs.writeFileSync(vigiaPath, vigiaContent);

console.log("Fixed vigia logic");
