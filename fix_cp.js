const fs = require('fs');
let content = fs.readFileSync('src/components/CaptainPatrolDashboard.tsx', 'utf8');

// 1. Add forcedWorkplaceId to props
content = content.replace(
  'export default function CaptainPatrolDashboard({ onOpenMap, isSidebarOpen }: { onOpenMap?: (locId: string) => void, isSidebarOpen?: boolean }) {',
  'export default function CaptainPatrolDashboard({ onOpenMap, isSidebarOpen, forcedWorkplaceId }: { onOpenMap?: (locId: string) => void, isSidebarOpen?: boolean, forcedWorkplaceId?: string | null }) {'
);

// 2. Filter teamShifts by forcedWorkplaceId
content = content.replace(
  'if (user.role === "superadmin" || s.workplaceId === user.workplaceId) {',
  'if (forcedWorkplaceId ? s.workplaceId === forcedWorkplaceId : (user.role === "superadmin" || s.workplaceId === user.workplaceId)) {'
);

// 3. Update activeWorkplace logic
content = content.replace(
    let activeWorkplace = null;
  if (activeShift) {,
    let activeWorkplace = null;
  if (forcedWorkplaceId) {
    activeWorkplace = workplaces.find(w => w.id === forcedWorkplaceId) || null;
  }
  if (!activeWorkplace && activeShift) {
);

fs.writeFileSync('src/components/CaptainPatrolDashboard.tsx', content);
console.log('CaptainPatrolDashboard.tsx updated');
