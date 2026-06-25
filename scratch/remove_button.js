const fs = require('fs');
let c = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf8');

const targetStr1 = `<button 
                    onClick={async () => {
                      if (!activeWorkplace?.captainId) return;
                      const msg = prompt("Que mensagem deseja enviar ao capitão?");
                      if (!msg) return;

                      setIsSendingNotify(true);
                      try {
                          await addDoc(collection(db, "notifications"), {
                              vigiaId: activeWorkplace.captainId,
                              message: msg,
                              read: false,
                              createdAt: new Date().toISOString()
                          });
                           fetch("/api/send-notification", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ userId: activeWorkplace.captainId, title: "Mensagem de um Vigia", body: msg })
                           }).catch(() => {
                           alert("Mensagem registada, mas o capitão não tem notificações ativas no dispositivo.");
                           });
                          alert("Notificação enviada para o Capitão!");
                      } catch (err) {
                          console.error(err);
                          alert("Erro ao enviar notificação.");
                      } finally {
                          setIsSendingNotify(false);
                      }
                    }}
                    disabled={isSendingNotify}
                    style={{
                         background: "var(--color-surface)", border: "1px solid var(--color-border)",
                         padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", fontSize: "0.8rem",
                         color: "var(--color-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem",
                         cursor: isSendingNotify ? "not-allowed" : "pointer",
                         opacity: isSendingNotify ? 0.6 : 1
                      }}
                 >
                    <Bell size={14} />
                    {isSendingNotify ? "A enviar..." : "Notificar Capitão"}
                 </button>`;

// A slightly more robust regex approach just in case the exact string doesn't match:
const buttonRegex = /<button[^>]*onClick=\{async \(\) => \{[^}]*if \(\!activeWorkplace\?\.captainId\) return;[^}]*const msg = prompt\("Que mensagem deseja enviar ao capit[^"]+"\);[\s\S]*?Notificar Capit[^<]+<\/button>/m;

c = c.replace(buttonRegex, '');

fs.writeFileSync('src/components/VigiaDashboard.tsx', c);
console.log('Removed notify button');
