const fs = require('fs');

let content = fs.readFileSync('src/components/ShiftsPage.tsx', 'utf8');

// Ensure addDoc and collection are imported if not already. They should be because ShiftsPage uses firestore extensively.
// Wait, we can just replace the fetch calls.

const fetchReplacements = [
  {
    regex: /await fetch\('\/api\/send-notification', { method: 'POST', body: JSON\.stringify\({ vigiaId: draft\.vigiaId, title: "Novo Turno", message: "Foi-lhe atribuído um novo turno\." }\) }\);/g,
    replace: `await fetch('/api/send-notification', { method: 'POST', body: JSON.stringify({ vigiaId: draft.vigiaId, title: "Novo Turno", message: "Foi-lhe atribuído um novo turno." }) });
              await addDoc(collection(db, "notifications"), { vigiaId: draft.vigiaId, message: "Foi-lhe atribuído um novo turno.", read: false, createdAt: new Date().toISOString(), title: "Novo Turno" });`
  },
  {
    regex: /await fetch\('\/api\/send-notification', { method: 'POST', body: JSON\.stringify\({ vigiaId: original\.vigiaId, title: "Turno Removido", message: "Um dos teus turnos foi removido\." }\) }\);/g,
    replace: `await fetch('/api/send-notification', { method: 'POST', body: JSON.stringify({ vigiaId: original.vigiaId, title: "Turno Removido", message: "Um dos teus turnos foi removido." }) });
              await addDoc(collection(db, "notifications"), { vigiaId: original.vigiaId, message: "Um dos teus turnos foi removido.", read: false, createdAt: new Date().toISOString(), title: "Turno Removido" });`
  }
];

let newContent = content;
for (const r of fetchReplacements) {
  newContent = newContent.replace(r.regex, r.replace);
}

if (newContent !== content) {
  fs.writeFileSync('src/components/ShiftsPage.tsx', newContent, 'utf8');
  console.log("Updated ShiftsPage.tsx notifications");
} else {
  console.log("No changes made. Regex might have failed.");
}
