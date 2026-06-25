const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\r\n/g, '\n');

// 1. Import NotificationModal
if (!content.includes('import NotificationModal from')) {
  content = content.replace('import { useAuth } from', 'import NotificationModal from "@/components/NotificationModal";\nimport { useAuth } from');
}

// 2. Fix MapViewer flex wrapper inside showCommsPlansModal
const oldPlanMapWrapper1 = '<div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>';
const newPlanMapWrapper1 = '<div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>';

if (content.includes(oldPlanMapWrapper1)) {
  content = content.replace(oldPlanMapWrapper1, newPlanMapWrapper1);
}

const oldPlanMapWrapper2 = '<div style={{ flex: 1, position: "relative" }}>\n                  <MapViewer';
const newPlanMapWrapper2 = '<div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>\n                  <MapViewer';

if (content.includes(oldPlanMapWrapper2)) {
  content = content.replace(oldPlanMapWrapper2, newPlanMapWrapper2);
}

// 3. Fix MapViewer flex wrapper inside mapModalData (just in case)
const oldShiftMapWrapper = '<div style={{ flex: 1, position: "relative" }}>\n              <MapViewer';
const newShiftMapWrapper = '<div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>\n              <MapViewer';

if (content.includes(oldShiftMapWrapper)) {
  content = content.replace(oldShiftMapWrapper, newShiftMapWrapper);
}

// 4. Replace custom showDirectMsgModal popup with NotificationModal component
const oldDirectMsgModalStart = '{/* MODAL MENSAGEM DIRETA INDIVIDUAL */}';
const startIndex = content.indexOf(oldDirectMsgModalStart);

if (startIndex !== -1) {
  const mapModalTarget = '{mapModalData && (';
  const endIndex = content.indexOf(mapModalTarget, startIndex);
  if (endIndex !== -1) {
    const newDirectMsgCode = `{/* MODAL MENSAGEM DIRETA INDIVIDUAL (Usando NotificationModal oficial) */}
      <NotificationModal 
        isOpen={!!showDirectMsgModal}
        onClose={() => setShowDirectMsgModal(null)}
        selectedPersonId={showDirectMsgModal?.vigiaId || ""}
        usersMap={Object.fromEntries(Object.values(teamVigias).map((u: any) => [u?.id || "", u?.name || u?.email || "Segurança"]))}
        allVigiaIds={workplaceGuardsList.map((g: any) => g.id)}
      />\n\n      `;

    content = content.substring(0, startIndex) + newDirectMsgCode + content.substring(endIndex);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated CaptainPatrolDashboard.tsx with vertical pan fixes and official NotificationModal');
