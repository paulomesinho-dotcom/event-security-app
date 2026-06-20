const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'VigiaDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add ChevronUp, ChevronDown to imports
if (!content.includes('ChevronUp')) {
    content = content.replace('Crosshair, UserX, Info } from "lucide-react";', 'Crosshair, UserX, Info, ChevronUp, ChevronDown } from "lucide-react";');
}

// 2. Add activePanel state and Info fetch logic
const stateHookPos = content.indexOf('const [activeSuspects, setActiveSuspects]');
const infoState = `
  const [activePanel, setActivePanel] = useState<'suspects'|'incidents'|'info'|null>(null);
  
  // Info Data
  const [infoItems, setInfoItems] = useState<any[]>([]);
  const [expandedInfoTopics, setExpandedInfoTopics] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    const q = query(collection(db, "information"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInfoItems(data);
      const topics: Record<string, boolean> = {};
      data.forEach(item => { topics[item.topic] = true; });
      setExpandedInfoTopics(topics);
    });
    return () => unsubscribe();
  }, []);
  
  const groupedInfoItems = infoItems.reduce((acc, item) => {
    if (!acc[item.topic]) acc[item.topic] = [];
    acc[item.topic].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  // Instead of showSuspectsList, showIncidentsList, we will replace them where used.
`;
content = content.slice(0, stateHookPos) + infoState + content.slice(stateHookPos);

// 3. Replace boolean checks for panels
content = content.replace(/\{showSuspectsList &&/g, "{activePanel === 'suspects' &&");
content = content.replace(/\{showIncidentsList &&/g, "{activePanel === 'incidents' &&");

content = content.replace(/setShowSuspectsList\(false\)/g, "setActivePanel(null)");
content = content.replace(/setShowSuspectsList\(true\)/g, "setActivePanel('suspects')");

content = content.replace(/setShowIncidentsList\(false\)/g, "setActivePanel(null)");
content = content.replace(/setShowIncidentsList\(true\)/g, "setActivePanel('incidents')");

// 4. Update the bottom bar info button
content = content.replace(/onOpenInfo && onOpenInfo\(\)/g, "setActivePanel(activePanel === 'info' ? null : 'info')");

// 5. Append Info Panel rendering logic before the `<style>` block (around line 1135)
const styleBlockIdx = content.lastIndexOf('<style>');
const infoPanelMarkup = `
      {activePanel === 'info' && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(76px + env(safe-area-inset-bottom))", background: "var(--color-bg)", zIndex: 9000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #1e0a3c, #102a43)", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(56,189,248,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(56,189,248,0.25)", border: "1.5px solid rgba(56,189,248,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Info size={18} color="#bae6fd" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#e0f2fe", fontSize: "1rem", fontWeight: 700 }}>Informações Úteis</h3>
              </div>
            </div>
            <button onClick={() => setActivePanel(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18}/></button>
          </div>
          <div style={{ padding: "1rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "3rem" }}>
            {Object.keys(groupedInfoItems).length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--color-text-secondary)", marginTop: "2rem" }}>Nenhuma informação publicada.</p>
            ) : (
              Object.entries(groupedInfoItems).map(([topic, topicItems]) => (
                <div key={topic} style={{ background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                  <button 
                    onClick={() => setExpandedInfoTopics(prev => ({ ...prev, [topic]: !prev[topic] }))}
                    style={{ width: "100%", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", color: "var(--color-primary)", fontWeight: 600, fontSize: "1rem" }}
                  >
                    {topic}
                    {expandedInfoTopics[topic] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {expandedInfoTopics[topic] && (
                    <div style={{ padding: "0 1rem 1rem 1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {topicItems.map(item => (
                        <div key={item.id} style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)" }}>
                          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.05rem", color: "var(--color-text-primary)" }}>{item.title}</h4>
                          <div className="quill-content-preview" style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }} dangerouslySetInnerHTML={{ __html: item.content }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
`;
content = content.slice(0, styleBlockIdx) + infoPanelMarkup + '\n' + content.slice(styleBlockIdx);

// Also need to clean up `showSuspectsList` and `showIncidentsList` unused vars to avoid typescript errors
content = content.replace(/const \[showSuspectsList, setShowSuspectsList\] = useState\(false\);\n?/g, '');
content = content.replace(/const \[showIncidentsList, setShowIncidentsList\] = useState\(false\);\n?/g, '');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('VigiaDashboard.tsx updated with activePanel logic.');
