const fs = require('fs');

let content = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf-8');

// 1. MapModal Import
if (!content.includes('import MapModal')) {
    content = content.replace('import { MapPin', 'import MapModal from "./MapModal";\nimport { MapPin');
}

// 2. mapModalData State
if (!content.includes('mapModalData')) {
    content = content.replace('const [selectedSuspect, setSelectedSuspect] = useState<any>(null);', 'const [selectedSuspect, setSelectedSuspect] = useState<any>(null);\n    const [mapModalData, setMapModalData] = useState<any>(null);');
}

// 3. fetchLocationData plan details
const a1 = `                     setActiveShiftLocation({
                        local: absData.local || "",
                        sublocal: absData.sublocal || "",
                        subsublocal: absData.subsublocal || ""
                     });`;
const b1 = `                     let planImageUrl = "";
                     if (locData.planId) {
                       const planDoc = await getDoc(doc(db, "plans", locData.planId));
                       if (planDoc.exists()) planImageUrl = planDoc.data().imageUrl;
                     }
                     setActiveShiftLocation({
                        local: absData.local || "",
                        sublocal: absData.sublocal || "",
                        subsublocal: absData.subsublocal || "",
                        planId: locData.planId,
                        planImageUrl,
                        pinX: locData.x,
                        pinY: locData.y
                     });`;
if (content.includes(a1)) {
    content = content.replace(a1, b1);
}

// 4. Incident AddDoc
const a2 = `        await addDoc(collection(db, "incidents"), {
          vigiaId: user.uid,
          vigiaName: user.name || "Vigia",
          shiftId: activeShift.id,
          workplaceId: activeWorkplaceId || "Sem Local",
          locatorName: activeShift.locatorName,
          description: incidentText,
          photoUrl,
          timestamp: new Date().toISOString(),
          status: "aberta"
        });`;
const b2 = `        await addDoc(collection(db, "incidents"), {
          vigiaId: user.uid,
          vigiaName: user.name || "Vigia",
          shiftId: activeShift.id,
          workplaceId: activeWorkplaceId || "Sem Local",
          locatorName: activeShift.locatorName,
          description: incidentText,
          photoUrl,
          timestamp: new Date().toISOString(),
          status: "aberta",
          planId: activeShiftLocation?.planId || "",
          planImageUrl: activeShiftLocation?.planImageUrl || "",
          pinX: activeShiftLocation?.pinX || 0,
          pinY: activeShiftLocation?.pinY || 0
        });`;
if (content.includes(a2)) {
    content = content.replace(a2, b2);
}

// 5. Suspects AddDoc
const a3 = `        await addDoc(collection(db, "suspicious_persons"), {
          workplaceId: activeWorkplaceId || "Sem Local",
          vigiaId: user.uid,
          vigiaName: user.name || "Vigia",
          shiftId: activeShift.id,
          initialLocation: suspectLocal + (suspectSublocal ? \` - \${suspectSublocal}\` : "") + (suspectSubsublocal ? \` - \${suspectSubsublocal}\` : ""),
          direction: suspectDirection,
          description: suspectDesc,
          photoUrl,
          timestamp: new Date().toISOString(),
          status: "em_acompanhamento"
        });`;
const b3 = `        await addDoc(collection(db, "suspicious_persons"), {
          workplaceId: activeWorkplaceId || "Sem Local",
          vigiaId: user.uid,
          vigiaName: user.name || "Vigia",
          shiftId: activeShift.id,
          initialLocation: suspectLocal + (suspectSublocal ? \` - \${suspectSublocal}\` : "") + (suspectSubsublocal ? \` - \${suspectSubsublocal}\` : ""),
          direction: suspectDirection,
          description: suspectDesc,
          photoUrl,
          timestamp: new Date().toISOString(),
          status: "em_acompanhamento",
          planId: activeShiftLocation?.planId || "",
          planImageUrl: activeShiftLocation?.planImageUrl || "",
          pinX: activeShiftLocation?.pinX || 0,
          pinY: activeShiftLocation?.pinY || 0
        });`;
if (content.includes(a3)) {
    content = content.replace(a3, b3);
}

// 6. Suspect Updates AddDoc
const a4 = `        await addDoc(collection(db, "suspicious_person_updates"), {
          suspectId: selectedSuspect.id,
          vigiaId: user.uid,
          vigiaName: user.name || "Vigia",
          type: updateType,
          message: updateMessage,
          photoUrl,
          timestamp: new Date().toISOString(),
          local: activeShiftLocation?.local || activeWorkplace?.name || activeShift?.locatorName || "",
          sublocal: activeShiftLocation?.sublocal || "",
          subsublocal: activeShiftLocation?.subsublocal || ""
        });`;
const b4 = `        await addDoc(collection(db, "suspicious_person_updates"), {
          suspectId: selectedSuspect.id,
          vigiaId: user.uid,
          vigiaName: user.name || "Vigia",
          type: updateType,
          message: updateMessage,
          photoUrl,
          timestamp: new Date().toISOString(),
          local: activeShiftLocation?.local || activeWorkplace?.name || activeShift?.locatorName || "",
          sublocal: activeShiftLocation?.sublocal || "",
          subsublocal: activeShiftLocation?.subsublocal || "",
          planImageUrl: activeShiftLocation?.planImageUrl || "",
          pinX: activeShiftLocation?.pinX || 0,
          pinY: activeShiftLocation?.pinY || 0
        });`;
if (content.includes(a4)) {
    content = content.replace(a4, b4);
}

// 7. Map Modal Component Injection
if (!content.includes('<MapModal')) {
    content = content.replace('overflow: "hidden" }}>', 'overflow: "hidden" }}>\n      <MapModal data={mapModalData} onClose={() => setMapModalData(null)} />');
}

// 8. Replace map links
content = content.replace(
    /(<a href=\{`https:\/\/maps\.google\.com\/\?q=\$\{selectedSuspect\.lat[^}]+\}\}[^>]+>\(Mapa\)<\/a>)/g,
    `{selectedSuspect.planImageUrl && selectedSuspect.pinX && selectedSuspect.pinY ? (<button onClick={() => setMapModalData({ planImageUrl: selectedSuspect.planImageUrl, pinX: selectedSuspect.pinX, pinY: selectedSuspect.pinY, title: selectedSuspect.initialLocation })} style={{ background: "transparent", border: "none", color: "#a855f7", textDecoration: "underline", cursor: "pointer", padding: 0, marginLeft: "4px" }}>(Ver Planta)</button>) : $1}`
);

content = content.replace(
    /(<a href=\{`https:\/\/maps\.google\.com\/\?q=\$\{upd\.lat[^}]+\}\}[^>]+>\(Ver Local no Mapa\)<\/a>)/g,
    `{upd.planImageUrl && upd.pinX && upd.pinY ? (<button onClick={() => setMapModalData({ planImageUrl: upd.planImageUrl, pinX: upd.pinX, pinY: upd.pinY, title: upd.local })} style={{ background: "transparent", border: "none", color: "#a855f7", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: "0.8rem" }}>(Ver Local na Planta)</button>) : $1}`
);

// 9. Move Modals out of vigia-app-main
const modalsStart = content.indexOf('{/* Modals for Suspicious Persons */}');
const styleStart = content.indexOf('<style>{`');

if (modalsStart !== -1 && styleStart !== -1 && modalsStart < styleStart) {
    // Find where the modals block actually starts (including preceding spaces)
    const blockStart = content.lastIndexOf('\n', modalsStart) + 1;
    
    // Extract the modals block (up to exactly before <style>)
    const modalsBlock = content.substring(blockStart, styleStart);
    
    // Remove modals from inside vigia-app-main
    content = content.substring(0, blockStart) + content.substring(styleStart);
    
    // In HEAD, the bottom bar is a sibling of vigia-app-main, and the root wrapper ends after bottom bar.
    // We want to insert the modals just before the very last </div> which closes the root wrapper.
    const lastDivIndex = content.lastIndexOf('</div>\n  );\n}');
    if (lastDivIndex !== -1) {
        content = content.substring(0, lastDivIndex) + '\n    ' + modalsBlock + '\n    ' + content.substring(lastDivIndex);
    }
}

fs.writeFileSync('src/components/VigiaDashboard.tsx', content, 'utf-8');
console.log('Success!');
