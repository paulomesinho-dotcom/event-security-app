const fs = require('fs');
const path = require('path');

function updateDashboard(filePath, isCaptain) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add globalNotifications state
  if (!content.includes('const [globalNotifications, setGlobalNotifications]')) {
    content = content.replace(/const \[activePanel, setActivePanel\] = useState/, `const [globalNotifications, setGlobalNotifications] = useState<any[]>([]);\n  const [activePanel, setActivePanel] = useState`);
  }

  // Subscribe to globalNotifications
  if (!content.includes('collection(db, "global_notifications")')) {
    const unsubNotifications = `
    const unsubGlobalNotifs = onSnapshot(query(collection(db, "global_notifications"), orderBy("timestamp", "desc")), (snap) => {
      const notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGlobalNotifications(notifs);
    });
`;
    // Find the main useEffect with unsubShifts
    content = content.replace(/const unsubShifts = onSnapshot/, unsubNotifications + '    const unsubShifts = onSnapshot');
    content = content.replace(/unsubShifts\(\);\s*unsubNotifs\(\);/, 'unsubGlobalNotifs();\n        unsubShifts();\n        unsubNotifs();');
  }

  // Ensure CheckCheck is imported from lucide-react
  if (!content.includes('CheckCheck')) {
    content = content.replace(/import \{([\s\S]*?)\} from "lucide-react";/, (match, p1) => {
      const imports = new Set(p1.split(',').map(s => s.trim()));
      imports.add('CheckCheck');
      imports.add('Check');
      return `import { ${Array.from(imports).join(', ')} } from "lucide-react";`;
    });
  }

  // Modify sendGlobalAlert function to pass target and senderId
  const targetStr = isCaptain ? "all" : "captain";
  const titleStr = isCaptain ? "NOTIFICAÇÃO GLOBAL" : "NOTIFICAÇÃO PARA CAPITÃO";
  const alertStr = isCaptain ? "Notificação enviada para todos!" : "Notificação enviada para o Capitão!";

  content = content.replace(/body: JSON\.stringify\(\{\s*message: globalAlertText,\s*senderName: user\?\.name \|\| user\?\.email,\s*title: "NOTIFICAÇÃO GLOBAL"\s*\}\)/, 
`body: JSON.stringify({
          message: globalAlertText,
          senderName: user?.name || user?.email,
          senderId: user?.uid,
          title: "${titleStr}",
          target: "${targetStr}"
        })`);
  
  content = content.replace(/alert\("Notificação enviada para todos!"\);/, `alert("${alertStr}");`);

  // Update Notification Button UI
  const buttonRegex = /<button[^>]*onClick=\{\(\) => setShowGlobalAlertModal\(true\)\}[^>]*>[\s\S]*?<\/button>/;
  const newButtonText = isCaptain ? "NOTIFICAR TODOS" : "NOTIFICAR CAPITÃO";
  
  content = content.replace(buttonRegex, 
`<button 
              onClick={() => setShowGlobalAlertModal(true)}
              style={{ width: "100%", padding: "1.2rem", background: "linear-gradient(135deg, #f97316, #ea580c)", color: "white", border: "none", borderRadius: "var(--radius-lg)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontSize: "1rem", boxShadow: "0 4px 16px rgba(249,115,22,0.4)" }}
            >
              <Bell size={24} /> ${newButtonText}
            </button>`);

  // Remove Zello Capitães from Vigia app
  if (!isCaptain) {
    const zelloCapitaesRegex = /\{\(activeWorkplace as any\)\?\.zelloGroupLink \? \([\s\S]*?Capitães não configurado\s*<\/div>\s*\)\}/;
    content = content.replace(zelloCapitaesRegex, '');
  }

  // Fix activeWorkplace in Captain app
  if (isCaptain && !content.includes('workplaces.find(w => w.captainId === user?.uid)')) {
    content = content.replace(/if \(!activeWorkplace && user\?\.workplaceId\) \{/, 
`if (!activeWorkplace && user?.uid) {
      activeWorkplace = workplaces.find(w => w.captainId === user.uid) || null;
    }
    if (!activeWorkplace && user?.workplaceId) {`);
  }

  // Add Notification History UI
  const markAsReadFn = `
  const markGlobalNotificationAsRead = async (notif: any) => {
    if (!user?.uid || notif.readBy?.includes(user.uid)) return;
    try {
      await updateDoc(doc(db, "global_notifications", notif.id), {
        readBy: arrayUnion(user.uid)
      });
    } catch (e) {
      console.error(e);
    }
  };
`;
  if (!content.includes('const markGlobalNotificationAsRead')) {
    content = content.replace('const sendGlobalAlert = async', markAsReadFn + '\n  const sendGlobalAlert = async');
  }
  
  // Also add arrayUnion to firebase imports if not there
  if (!content.includes('arrayUnion')) {
    content = content.replace(/from "firebase\/firestore";/, ', arrayUnion } from "firebase/firestore";');
  }

  const historyUI = `
            {globalNotifications.length > 0 && (
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <h4 style={{ margin: "0", color: "var(--color-text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Histórico de Notificações</h4>
                <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", paddingRight: "0.5rem" }}>
                  {globalNotifications.map((notif: any) => {
                    const isRead = notif.readBy?.includes(user?.uid);
                    return (
                      <div 
                        key={notif.id}
                        onClick={() => markGlobalNotificationAsRead(notif)}
                        style={{ 
                          padding: "1rem", 
                          background: isRead ? "var(--color-surface)" : "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(234,88,12,0.05))",
                          border: isRead ? "1px solid var(--color-border)" : "1px solid rgba(249,115,22,0.3)",
                          borderRadius: "var(--radius-md)",
                          cursor: "pointer"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: isRead ? "var(--color-text-primary)" : "#f97316" }}>{notif.senderName}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isRead ? <CheckCheck size={14} color="#3b82f6" /> : <Check size={14} />}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>{notif.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
`;

  // Inject History UI right below the NOTIFICAR TODOS/CAPITÃO button
  if (!content.includes('Histórico de Notificações')) {
    const dividerRegex = /<div style=\{\{ height: "1px", background: "var\(--color-border\)", margin: "0\.5rem 0" \}\} \/>/;
    content = content.replace(dividerRegex, historyUI + '\n            <div style={{ height: "1px", background: "var(--color-border)", margin: "0.5rem 0" }} />');
  }
  
  // Update Global Alert Modal header to Orange
  content = content.replace(/background: "linear-gradient\(135deg, #1e0a3c, #5b1030\)"/g, `background: "linear-gradient(135deg, #f97316, #ea580c)"`);
  // specifically for the modal
  content = content.replace(/background: "rgba\(239,68,68,0\.3\)"/g, `background: "rgba(255,255,255,0.2)"`);
  content = content.replace(/border: "1\.5px solid rgba\(239,68,68,0\.6\)"/g, `border: "1px solid rgba(255,255,255,0.4)"`);
  content = content.replace(/color="#fca5a5"/g, `color="#ffffff"`);
  content = content.replace(/color: "#fee2e2"/g, `color: "#ffffff"`);

  fs.writeFileSync(filePath, content);
  console.log('Updated UI in ' + filePath);
}

updateDashboard(path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx'), true);
updateDashboard(path.join(__dirname, '../src/components/VigiaDashboard.tsx'), false);
