const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/CaptainPatrolDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// Fix type
content = content.replace(
  /const \[activePanel, setActivePanel\] = useState<'suspects'\|'incidents'\|'info'\|null>\(null\);/g,
  `const [activePanel, setActivePanel] = useState<'zello'|'suspects'|'incidents'|'info'|null>(null);`
);

// Fix "home" -> null
content = content.replace(/setActivePanel\("home"\)/g, 'setActivePanel(null)');
content = content.replace(/activePanel === "zello" \? "home" : "zello"/g, 'activePanel === "zello" ? null : "zello"');
content = content.replace(/activePanel === "suspects" \? "home" : "suspects"/g, 'activePanel === "suspects" ? null : "suspects"');
content = content.replace(/activePanel === "incidents" \? "home" : "incidents"/g, 'activePanel === "incidents" ? null : "incidents"');
content = content.replace(/activePanel === "info" \? "home" : "info"/g, 'activePanel === "info" ? null : "info"');

// Fix import for Radio
content = content.replace(/MapPin, Play, Square, Clock, Calendar, CheckCircle2, AlertTriangle, X, Bell, FileWarning, MessageCircle, Camera, Image as ImageIcon, Search, Crosshair, UserX, Info, ChevronUp, ChevronDown/g, 'MapPin, Play, Square, Clock, Calendar, CheckCircle2, AlertTriangle, X, Bell, FileWarning, MessageCircle, Camera, Image as ImageIcon, Search, Crosshair, UserX, Info, ChevronUp, ChevronDown, Radio');

fs.writeFileSync(file, content);
console.log('TS errors fixed');
