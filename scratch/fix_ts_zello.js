const fs = require('fs');
const path = require('path');

function addGlobalAlertState(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to match the activePanel declaration
  const activePanelRegex = /const \[activePanel, setActivePanel\] = useState<[^>]+>\(null\);/;
  
  if (!content.includes('const [showGlobalAlertModal')) {
    content = content.replace(activePanelRegex, (match) => {
      return `${match}\n  const [showGlobalAlertModal, setShowGlobalAlertModal] = useState(false);\n  const [globalAlertText, setGlobalAlertText] = useState("");\n  const [sendingGlobalAlert, setSendingGlobalAlert] = useState(false);`;
    });
  }
  
  // Make sure activePanel type includes 'zello' in VigiaDashboard if not already
  if (filePath.includes('VigiaDashboard.tsx')) {
     content = content.replace(/useState<'suspects'\|'incidents'\|'info'\|null>/g, `useState<'zello'|'suspects'|'incidents'|'info'|null>`);
  }

  if (!content.includes('const sendGlobalAlert = async ()')) {
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
    // Insert before the return statement of the component
    const returnIndex = content.lastIndexOf('return (');
    content = content.slice(0, returnIndex) + fnHTML + content.slice(returnIndex);
  }

  fs.writeFileSync(filePath, content);
  console.log(`Fixed state in ${filePath}`);
}

addGlobalAlertState(path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx'));
addGlobalAlertState(path.join(__dirname, '../src/components/VigiaDashboard.tsx'));
