import re

with open("src/components/VigiaDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the Map Link inside Suspect Details (Initial Location)
a1 = """<a href={`https://maps.google.com/?q=${selectedSuspect.lat && selectedSuspect.lng ? `${selectedSuspect.lat},${selectedSuspect.lng}` : encodeURIComponent('Porto ' + selectedSuspect.initialLocation)}`} target="_blank" rel="noreferrer" style={{ color: "#a855f7", textDecoration: "underline", marginLeft: "4px" }}>(Mapa)</a>"""
b1 = """{selectedSuspect.planImageUrl && selectedSuspect.pinX && selectedSuspect.pinY ? (<button onClick={() => setMapModalData({ planImageUrl: selectedSuspect.planImageUrl, pinX: selectedSuspect.pinX, pinY: selectedSuspect.pinY, title: selectedSuspect.initialLocation })} style={{ background: "transparent", border: "none", color: "#a855f7", textDecoration: "underline", cursor: "pointer", padding: 0, marginLeft: "4px" }}>(Ver Planta)</button>) : (<a href={`https://maps.google.com/?q=${selectedSuspect.lat && selectedSuspect.lng ? `${selectedSuspect.lat},${selectedSuspect.lng}` : encodeURIComponent('Porto ' + selectedSuspect.initialLocation)}`} target="_blank" rel="noreferrer" style={{ color: "#a855f7", textDecoration: "underline", marginLeft: "4px" }}>(Mapa)</a>)}"""
content = content.replace(a1, b1)

# Replace the Map Link inside Suspect Updates
a2 = """<a href={`https://maps.google.com/?q=${upd.lat && upd.lng ? `${upd.lat},${upd.lng}` : encodeURIComponent('Porto ' + selectedSuspect.initialLocation)}`} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "#a855f7", textDecoration: "underline" }}>(Ver Local no Mapa)</a>"""
b2 = """{upd.planImageUrl && upd.pinX && upd.pinY ? (<button onClick={() => setMapModalData({ planImageUrl: upd.planImageUrl, pinX: upd.pinX, pinY: upd.pinY, title: upd.local })} style={{ background: "transparent", border: "none", color: "#a855f7", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: "0.8rem" }}>(Ver Local na Planta)</button>) : (<a href={`https://maps.google.com/?q=${upd.lat && upd.lng ? `${upd.lat},${upd.lng}` : encodeURIComponent('Porto ' + selectedSuspect.initialLocation)}`} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "#a855f7", textDecoration: "underline" }}>(Ver Local no Mapa)</a>)}"""
content = content.replace(a2, b2)

with open("src/components/VigiaDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Replaced links")
