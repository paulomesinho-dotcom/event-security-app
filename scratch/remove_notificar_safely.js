const fs = require('fs');
let c = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf8');

const regex = /<button[\s\n]*onClick=\{async \(\) => \{[\s\S]*?\n\s*\}\}[\s\n]*disabled=\{isSendingNotify \|\| !activeWorkplace\.captainId\}[\s\S]*?<\/button>/;

if (c.match(regex)) {
  c = c.replace(regex, '');
  fs.writeFileSync('src/components/VigiaDashboard.tsx', c);
  console.log("Successfully removed button");
} else {
  console.log("Not found with precise regex");
}
