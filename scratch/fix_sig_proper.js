const fs = require('fs');
let c = fs.readFileSync('src/components/CaptainPatrolDashboard.tsx', 'utf8');
const oldSig = 'export default function CaptainPatrolDashboard({ onOpenMap, isSidebarOpen }: { onOpenMap?: (locId: string) => void, isSidebarOpen?: boolean }) {';
const newSig = 'export default function CaptainPatrolDashboard({ onOpenMap, isSidebarOpen, forcedWorkplaceId }: { onOpenMap?: (locId: string) => void, isSidebarOpen?: boolean, forcedWorkplaceId?: string | null }) {';

c = c.replace(oldSig, newSig);
fs.writeFileSync('src/components/CaptainPatrolDashboard.tsx', c);
console.log('Fixed signature properly');
