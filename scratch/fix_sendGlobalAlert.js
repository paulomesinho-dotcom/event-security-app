const fs = require('fs');
const path = require('path');

function cleanAndInject(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove all instances of the bad sendGlobalAlert (from the const sendGlobalAlert to the end of the function block)
  const fnRegex = /const sendGlobalAlert = async \(\) => \{[\s\S]*?setSendingGlobalAlert\(false\);\s*\}\s*\};\s*/g;
  content = content.replace(fnRegex, '');

  const correctFnHTML = `
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

  // Inject before `if (loading) return (`
  content = content.replace('if (loading) return (', correctFnHTML + 'if (loading) return (');

  fs.writeFileSync(filePath, content);
  console.log('Fixed sendGlobalAlert in ' + filePath);
}

cleanAndInject(path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx'));
cleanAndInject(path.join(__dirname, '../src/components/VigiaDashboard.tsx'));
