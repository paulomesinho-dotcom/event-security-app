const fs = require('fs');

function addImport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('import { EVENT_TABS }')) {
    content = content.replace(
      /import \{ useAuth \} from "@\/contexts\/AuthContext";/,
      `import { useAuth } from "@/contexts/AuthContext";\nimport { EVENT_TABS } from "@/constants/events";`
    );
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

addImport('src/components/LocationManager.tsx');
addImport('src/components/ShiftsPage.tsx');
