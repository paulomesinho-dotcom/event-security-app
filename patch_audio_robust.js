const fs = require('fs');
const path = require('path');

// --- 1. Patch VigiaDashboard.tsx ---
const vigiaPath = path.join(__dirname, 'src', 'components', 'VigiaDashboard.tsx');
let vigiaContent = fs.readFileSync(vigiaPath, 'utf-8');

// We need to replace the unsubIncidents and unsubSuspects completely to use the initialLoad pattern.

// Replace incidents
const incidentsRegex = /const unsubIncidents = onSnapshot\(qIncidents, \(snap\) => \{[\s\S]*?setIncidents\(snap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \} as any\)\)\);\n\s*\}\);/m;

const newIncidents = `let initialLoadIncidents = true;
    const unsubIncidents = onSnapshot(qIncidents, (snap) => {
      if (!initialLoadIncidents) {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
             // In incidents, we only beep if they are explicitly marked as Emergência/Pessoa Desaparecida (which they aren't usually, but just in case)
             // Actually, the user asked for emergencies, missing persons, and suspects. VigiaDashboard handles suspects and incidents. We'll beep for any new incident just to be safe, or wait, "ocorrência" shouldn't always beep? The user said "quando é lançado uma situação de emergência ou pessoa desaparecida ou suspeito". Occurrences are not in that list! Suspects are.
             // I'll leave incidents without beep, unless the message contains "emerg". But the prompt said "emergência ou pessoa desaparecida ou suspeito".
          }
        });
      }
      initialLoadIncidents = false;
      setIncidents(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });`;
vigiaContent = vigiaContent.replace(incidentsRegex, newIncidents);

// Replace suspects
const suspectsRegex = /const unsubSuspects = onSnapshot\(qSuspects, \(snap\) => \{[\s\S]*?setSuspects\(snap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \} as any\)\)\);\n\s*\}\);/m;

const newSuspects = `let initialLoadSuspects = true;
    const unsubSuspects = onSnapshot(qSuspects, (snap) => {
      if (!initialLoadSuspects) {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            playAlertBeeps();
          }
        });
      }
      initialLoadSuspects = false;
      setSuspects(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });`;
vigiaContent = vigiaContent.replace(suspectsRegex, newSuspects);

fs.writeFileSync(vigiaPath, vigiaContent, 'utf-8');
console.log('VigiaDashboard.tsx patched successfully.');


// --- 2. Patch EmergencyBanner.tsx ---
const bannerPath = path.join(__dirname, 'src', 'components', 'EmergencyBanner.tsx');
let bannerContent = fs.readFileSync(bannerPath, 'utf-8');

if (!bannerContent.includes('playAlertBeeps')) {
  bannerContent = 'import { playAlertBeeps } from "@/lib/audioAlert";\n' + bannerContent;
}

// Missing persons
const missingPersonsRegex = /const unsub = onSnapshot\(q, \(snap\) => \{\s+const msgs: any\[\] = \[\];\s+snap\.forEach\(d => msgs\.push\(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\);\s+setActiveMissingPersons\(msgs\);\s+\}\);/m;

const newMissingPersons = `let initialLoadMP = true;
    const unsub = onSnapshot(q, (snap) => {
      if (!initialLoadMP) {
        snap.docChanges().forEach(change => {
          if (change.type === "added") playAlertBeeps();
        });
      }
      initialLoadMP = false;
      const msgs: any[] = [];
      snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
      setActiveMissingPersons(msgs);
    });`;
bannerContent = bannerContent.replace(missingPersonsRegex, newMissingPersons);


// Global emergency
const globalEmergencyRegex = /const unsub = onSnapshot\(doc\(db, "settings", "global"\), \(snap\) => \{[\s\S]*?\}\);/m;
const newGlobalEmergency = `let initialLoadGlobal = true;
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (!initialLoadGlobal && data.globalEmergency === true && !globalEmergency) {
           playAlertBeeps();
        }
        setGlobalEmergency(data.globalEmergency === true);
        setGlobalAlertType(data.globalAlertType || "evacuation");
        setGlobalAlertDetails(data.globalAlertDetails || null);
        setGlobalAlertAck(data.globalAlertAck || []);
        setGlobalEvacAck(data.globalEvacAck || []);
      } else {
        setGlobalEmergency(false);
      }
      initialLoadGlobal = false;
    });`;
bannerContent = bannerContent.replace(globalEmergencyRegex, newGlobalEmergency);

// Local emergencies
const localEmergRegex = /const unsub = onSnapshot\(q, \(snap\) => \{\s+const ems: any\[\] = \[\];\s+snap\.forEach\(d => ems\.push\(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\);\s+setLocalEmergencies\(ems\);\s+\}\);/m;

const newLocalEmerg = `let initialLoadLocal = true;
    const unsub = onSnapshot(q, (snap) => {
      if (!initialLoadLocal) {
        snap.docChanges().forEach(change => {
          if (change.type === "added" || (change.type === "modified" && change.doc.data().isEmergency === true)) {
             playAlertBeeps();
          }
        });
      }
      initialLoadLocal = false;
      const ems: any[] = [];
      snap.forEach(d => ems.push({ id: d.id, ...d.data() }));
      setLocalEmergencies(ems);
    });`;
bannerContent = bannerContent.replace(localEmergRegex, newLocalEmerg);

fs.writeFileSync(bannerPath, bannerContent, 'utf-8');
console.log('EmergencyBanner.tsx patched successfully.');
