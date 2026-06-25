const fs = require('fs');
let content = fs.readFileSync('src/components/ShiftsPage.tsx', 'utf8');

const oldLine = `            const hasShiftsInCurrentTab = currentTab.dates.some(d => 
              currentTab.periods.some(p => loc.customShifts?.[d]?.[p])
            );`;

const newLine = `            const hasShiftsInCurrentTab = currentTab.dates.some(d => 
              currentTab.periods.some(p => {
                const shift = loc.customShifts?.[d]?.[p];
                return shift && shift.start && shift.end;
              })
            );`;

content = content.replace(/\r\n/g, '\n');
if (content.includes(oldLine)) {
    content = content.replace(oldLine, newLine);
    fs.writeFileSync('src/components/ShiftsPage.tsx', content);
    console.log("Updated filter successfully with CRLF!");
} else {
    console.log("Could not find oldLine");
}
