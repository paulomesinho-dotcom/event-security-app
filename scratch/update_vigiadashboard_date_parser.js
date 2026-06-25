const fs = require('fs');
let content = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf8');

const oldLogic = `for (const d of shiftDays) {
      const parts = d.split("/");
      if (parts.length === 2) {
        const day = parseInt(parts[0], 10);
        const monthStr = parts[1].toLowerCase();
        const month = monthMap[monthStr];
        
        if (now.getDate() === day && now.getMonth() === month) {
          dateMatches = true;
          break;
        }
      }
    }`;

const newLogic = `for (const d of shiftDays) {
      if (d.includes("-")) {
        const parts = d.split("-");
        if (parts.length === 3) {
           const shiftYear = parseInt(parts[0], 10);
           const shiftMonth = parseInt(parts[1], 10) - 1;
           const shiftDay = parseInt(parts[2], 10);
           if (now.getFullYear() === shiftYear && now.getMonth() === shiftMonth && now.getDate() === shiftDay) {
             dateMatches = true;
             break;
           }
        }
      } else {
        const parts = d.split("/");
        if (parts.length === 2) {
          const day = parseInt(parts[0], 10);
          const monthStr = parts[1].toLowerCase();
          const month = monthMap[monthStr];
          
          if (now.getDate() === day && now.getMonth() === month) {
            dateMatches = true;
            break;
          }
        }
      }
    }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/VigiaDashboard.tsx', content);
console.log("Updated VigiaDashboard.tsx");
