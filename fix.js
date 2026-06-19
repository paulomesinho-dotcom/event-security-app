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

// 7. Update Maps Link
const a5 = `<a href={\`https://maps.google.com/?q=\${upd.lat && upd.lng ? \`\${upd.lat},\${upd.lng}\` : encodeURIComponent("Porto " + selectedSuspect.initialLocation)}\`} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "#a855f7", textDecoration: "underline" }}>(Ver Local no Mapa)</a>`;
const b5 = `{upd.planImageUrl && upd.pinX && upd.pinY ? (<button onClick={() => setMapModalData({ planImageUrl: upd.planImageUrl, pinX: upd.pinX, pinY: upd.pinY, title: upd.local })} style={{ background: "transparent", border: "none", color: "#a855f7", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: "0.8rem" }}>(Ver Local na Planta)</button>) : (<a href={\`https://maps.google.com/?q=\${upd.lat && upd.lng ? \`\${upd.lat},\${upd.lng}\` : encodeURIComponent("Porto " + selectedSuspect.initialLocation)}\`} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "#a855f7", textDecoration: "underline" }}>(Ver Local no Mapa)</a>)}`;
if (content.includes(a5)) {
    content = content.replace(a5, b5);
}

// 8. Extract Modals and add MapModal
if (!content.includes('<MapModal')) {
    content = content.replace('overflow: "hidden" }}>', 'overflow: "hidden" }}>\n      <MapModal data={mapModalData} onClose={() => setMapModalData(null)} />');
}

const modalsStart = content.indexOf('{/* Modals for Suspicious Persons */}');
const styleStart = content.indexOf('<style>{`');

if (modalsStart !== -1 && styleStart !== -1 && modalsStart < styleStart) {
    const modalsStr = content.substring(modalsStart, styleStart);
    content = content.slice(0, modalsStart) + content.slice(styleStart);
    
    // Find the end of the root wrapper. It is the second to last closing div.
    const bottomBarIndex = content.lastIndexOf('<div className="vigia-app-bottom-bar">');
    if (bottomBarIndex !== -1) {
        // Insert modals AFTER vigia-app-bottom-bar closing.
        const endOfBottomBar = content.lastIndexOf('</div>\n    </div>');
        if (endOfBottomBar !== -1) {
            content = content.slice(0, endOfBottomBar) + '</div>\n\n    ' + modalsStr + '\n    </div>' + content.slice(endOfBottomBar + 15);
        } else {
           console.log("Could not find end of bottom bar");
        }
    } else {
       console.log("Could not find bottom bar");
    }
} else {
   console.log("Could not find Modals block");
}

fs.writeFileSync('src/components/VigiaDashboard.tsx', content, 'utf-8');
console.log('Success');
