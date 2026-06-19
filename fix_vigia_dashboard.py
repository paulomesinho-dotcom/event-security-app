import re

with open("src/components/VigiaDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add MapModal import
content = content.replace('import { MapPin', 'import MapModal from "./MapModal";\nimport { MapPin')

# 2. Add mapModalData state
content = content.replace(
    'const [selectedSuspect, setSelectedSuspect] = useState<any>(null);',
    'const [selectedSuspect, setSelectedSuspect] = useState<any>(null);\n    const [mapModalData, setMapModalData] = useState<any>(null);'
)

# 3. Add plan fields to fetchLocationData
a1 = '''                     setActiveShiftLocation({
                        local: absData.local || "",
                        sublocal: absData.sublocal || "",
                        subsublocal: absData.subsublocal || ""
                     });'''
b1 = '''                     let planImageUrl = "";
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
                     });'''
content = content.replace(a1, b1)

# 4. Update incidents addDoc
a2 = '''        await addDoc(collection(db, "incidents"), {
          vigiaId: user.uid,
          vigiaName: user.name || "Vigia",
          shiftId: activeShift.id,
          workplaceId: activeWorkplaceId || "Sem Local",
          locatorName: activeShift.locatorName,
          description: incidentText,
          photoUrl,
          timestamp: new Date().toISOString(),
          status: "aberta"
        });'''
b2 = '''        await addDoc(collection(db, "incidents"), {
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
        });'''
content = content.replace(a2, b2)

# 5. Update suspects addDoc
a3 = '''        await addDoc(collection(db, "suspicious_persons"), {
          workplaceId: activeWorkplaceId || "Sem Local",
          vigiaId: user.uid,
          vigiaName: user.name || "Vigia",
          shiftId: activeShift.id,
          initialLocation: suspectLocal + (suspectSublocal ? ` - ${suspectSublocal}` : "") + (suspectSubsublocal ? ` - ${suspectSubsublocal}` : ""),
          direction: suspectDirection,
          description: suspectDesc,
          photoUrl,
          timestamp: new Date().toISOString(),
          status: "em_acompanhamento"
        });'''
b3 = '''        await addDoc(collection(db, "suspicious_persons"), {
          workplaceId: activeWorkplaceId || "Sem Local",
          vigiaId: user.uid,
          vigiaName: user.name || "Vigia",
          shiftId: activeShift.id,
          initialLocation: suspectLocal + (suspectSublocal ? ` - ${suspectSublocal}` : "") + (suspectSubsublocal ? ` - ${suspectSubsublocal}` : ""),
          direction: suspectDirection,
          description: suspectDesc,
          photoUrl,
          timestamp: new Date().toISOString(),
          status: "em_acompanhamento",
          planId: activeShiftLocation?.planId || "",
          planImageUrl: activeShiftLocation?.planImageUrl || "",
          pinX: activeShiftLocation?.pinX || 0,
          pinY: activeShiftLocation?.pinY || 0
        });'''
content = content.replace(a3, b3)

# 6. Update suspect updates addDoc
a4 = '''        await addDoc(collection(db, "suspicious_person_updates"), {
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
        });'''
b4 = '''        await addDoc(collection(db, "suspicious_person_updates"), {
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
        });'''
content = content.replace(a4, b4)

# 7. Update Map Links
a5 = '''<a href={`https://maps.google.com/?q=${upd.lat && upd.lng ? `${upd.lat},${upd.lng}` : encodeURIComponent("Porto " + selectedSuspect.initialLocation)}`} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "#a855f7", textDecoration: "underline" }}>(Ver Local no Mapa)</a>'''
b5 = '''{upd.planImageUrl && upd.pinX && upd.pinY ? (<button onClick={() => setMapModalData({ planImageUrl: upd.planImageUrl, pinX: upd.pinX, pinY: upd.pinY, title: upd.local })} style={{ background: "transparent", border: "none", color: "#a855f7", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: "0.8rem" }}>(Ver Local na Planta)</button>) : (<a href={`https://maps.google.com/?q=${upd.lat && upd.lng ? `${upd.lat},${upd.lng}` : encodeURIComponent("Porto " + selectedSuspect.initialLocation)}`} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "#a855f7", textDecoration: "underline" }}>(Ver Local no Mapa)</a>)}'''
content = content.replace(a5, b5)

# 8. Wrap root and extract modals
# Find return ( <>
return_match = re.search(r'return\s*\(\s*<>', content)
if return_match:
    content = content[:return_match.start()] + 'return (\n    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>\n      <MapModal data={mapModalData} onClose={() => setMapModalData(null)} />' + content[return_match.end():]

# Find </>\n  );\n}
end_match = re.search(r'</>\s*\);\s*}', content)
if end_match:
    content = content[:end_match.start()] + '</div>\n  );\n}' + content[end_match.end():]

# Extract Modals block
# find {/* Modals for Suspicious Persons */}
modals_start = content.find('{/* Modals for Suspicious Persons */}')
style_start = content.find('<style>{`', modals_start)

if modals_start != -1 and style_start != -1:
    # also include the div closing before style if needed? 
    # wait, the original code had </form> </div> </div> )} then <style>
    modals_block = content[modals_start:style_start]
    content = content[:modals_start] + content[style_start:]
    
    # insert before the final </div>
    final_div = content.rfind('</div>\n  );\n}')
    if final_div != -1:
        content = content[:final_div] + modals_block + content[final_div:]

with open("src/components/VigiaDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
