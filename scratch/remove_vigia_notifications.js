const fs = require('fs');

function removeNotifications() {
  const filePath = 'src/components/VigiaDashboard.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the button
  content = content.replace(/<button[^>]*onClick=\{\(\) => setShowGlobalAlertModal\(true\)\}[^>]*>[\s\S]*?NOTIFICAR CAPITÃO\s*<\/button>/, '');

  // Remove the History section
  content = content.replace(/\{globalNotifications\.length > 0 && \([\s\S]*?Histórico de Notificações[\s\S]*?<\/div>\s*\)\}/, '');

  // Remove the divider
  content = content.replace(/<div style=\{\{\s*height: "1px",\s*background: "var\(--color-border\)",\s*margin: "0\.5rem 0"\s*\}\}\s*\/>/, '');

  // Remove the activePanel condition `&& !showGlobalAlertModal`
  content = content.replace(/\{activePanel === 'zello' && !showGlobalAlertModal && \(/, "{activePanel === 'zello' && (");

  // Remove the global alert modal itself
  const modalRegex = /\{showGlobalAlertModal && \([\s\S]*?Notificar Todos[\s\S]*?Alerta Geral para Equipas[\s\S]*?<\/div>\s*\}\)/;
  content = content.replace(modalRegex, '');

  fs.writeFileSync(filePath, content);
  console.log('Removed Vigia notifications UI in ' + filePath);
}

removeNotifications();
