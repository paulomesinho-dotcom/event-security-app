const fs = require('fs');
const path = require('path');

function finalFix(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add sendGlobalAlert if not present
  if (!content.includes('const sendGlobalAlert = async () => {')) {
    const fnHTML = `
  const sendGlobalAlert = async () => {
    if (!globalAlertText) return;
    setSendingGlobalAlert(true);
    try {
      await fetch("/api/send-notification-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: globalAlertText,
          senderName: user?.name || user?.email,
          title: "NOTIFICAÇÃO GLOBAL"
        })
      });
      alert("Notificação enviada para todos!");
      setGlobalAlertText("");
      setShowGlobalAlertModal(false);
      setActivePanel(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar notificação.");
    } finally {
      setSendingGlobalAlert(false);
    }
  };
`;
    // Insert before the last return (
    const returnIndex = content.lastIndexOf('return (');
    content = content.slice(0, returnIndex) + fnHTML + content.slice(returnIndex);
  }

  // Ensure Radio is imported
  if (!content.includes('Radio,') && !content.includes('Radio }')) {
    content = content.replace(/import \{([\s\S]*?)\} from "lucide-react";/, (match, p1) => {
      const imports = new Set(p1.split(',').map(s => s.trim()));
      imports.add('Radio');
      return `import { ${Array.from(imports).join(', ')} } from "lucide-react";`;
    });
  }

  fs.writeFileSync(filePath, content);
  console.log('Fixed ' + filePath);
}

finalFix(path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx'));
finalFix(path.join(__dirname, '../src/components/VigiaDashboard.tsx'));
