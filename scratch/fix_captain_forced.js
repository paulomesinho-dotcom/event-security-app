const fs = require('fs');

const fixCaptain = (filePath) => {
  let c = fs.readFileSync(filePath, 'utf8');

  // Add forcedWorkplaceId to logic
  c = c.replace(/let activeWorkplace = null;\n\s+if \(activeShift\) \{/g, `let activeWorkplace = null;\n  if (forcedWorkplaceId) {\n    activeWorkplace = workplaces.find(w => w.id === forcedWorkplaceId) || null;\n  } else if (activeShift) {`);

  fs.writeFileSync(filePath, c);
};

fixCaptain('src/components/CaptainPatrolDashboard.tsx');
console.log('Fixed CaptainPatrolDashboard forcedWorkplaceId');
