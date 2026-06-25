const fs = require('fs');
let content = fs.readFileSync('src/components/ShiftsPage.tsx', 'utf8');
content = content.replace(/\r\n/g, '\n'); 

const oldLine = `          {locators.map(locator => {
            const loc = locations[locator.locationId];
            if (!loc) return null;
            const localName = loc.local || "Desconhecido";`;

const newLine = `          {locators.map(locator => {
            const loc = locations[locator.locationId];
            if (!loc) return null;
            
            const hasShiftsInCurrentTab = currentTab.dates.some(d => 
              currentTab.periods.some(p => loc.customShifts?.[d]?.[p])
            );
            if (!hasShiftsInCurrentTab) return null;

            const localName = loc.local || "Desconhecido";`;

if (content.includes(oldLine)) {
    content = content.replace(oldLine, newLine);
    fs.writeFileSync('src/components/ShiftsPage.tsx', content);
    console.log("Updated ShiftsPage.tsx with filter successfully!");
} else {
    console.log("Could not find the target string.");
}
