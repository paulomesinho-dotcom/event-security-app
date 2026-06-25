const fs = require('fs');
let c = fs.readFileSync('src/components/CaptainPatrolDashboard.tsx', 'utf8');
c = c.replace(/export default function CaptainPatrolDashboard\([^)]+\) \{/, 'export default function CaptainPatrolDashboard({ onOpenMap, isSidebarOpen, forcedWorkplaceId }: { onOpenMap?: (locId: string) => void, isSidebarOpen?: boolean, forcedWorkplaceId?: string | null }) {');
fs.writeFileSync('src/components/CaptainPatrolDashboard.tsx', c);
console.log('Fixed signature');
