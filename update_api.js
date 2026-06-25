const fs = require('fs');
const p = 'src/app/api/send-notification-all/route.ts';
let code = fs.readFileSync(p, 'utf8');

const oldLogic =     const usersSnapshot = await adminDb.collection("users").get();
    
    const tokens: string[] = [];
    const targetUids: string[] = [];
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      // If target is "captain", only target roles captain/superadmin
      if (target === "captain") {
        if (data.role === "captain" || data.role === "superadmin") {
          targetUids.push(doc.id);
          if (data.fcmToken) tokens.push(data.fcmToken);
        }
      } else {
        // target === "all"
        targetUids.push(doc.id);
        if (data.fcmToken) tokens.push(data.fcmToken);
      }
    });;

const newLogic =     const usersSnapshot = await adminDb.collection("users").get();
    const shiftsSnapshot = await adminDb.collection("shifts").where("status", "in", ["active", "pending"]).get();
    const vigiasWithShifts = new Set();
    shiftsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.personId) vigiasWithShifts.add(data.personId);
    });
    
    const tokens: string[] = [];
    const targetUids: string[] = [];
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      // If target is "captain", only target roles captain/superadmin
      if (target === "captain") {
        if (data.role === "captain" || data.role === "superadmin") {
          targetUids.push(doc.id);
          if (data.fcmToken) tokens.push(data.fcmToken);
        }
      } else {
        // target === "all"
        if (data.role === "vigia") {
          if (data.workplaceId || vigiasWithShifts.has(doc.id)) {
            targetUids.push(doc.id);
            if (data.fcmToken) tokens.push(data.fcmToken);
          }
        } else {
          targetUids.push(doc.id);
          if (data.fcmToken) tokens.push(data.fcmToken);
        }
      }
    });;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync(p, code);
console.log("Updated send-notification-all");
