const fs = require('fs');

const wPath = 'src/components/WorkplaceManager.tsx';
let wCode = fs.readFileSync(wPath, 'utf8');
wCode = wCode.replace('placeholder="Ex: canal-vigias"', 'placeholder="Link (zello://...) ou nome do canal"');
wCode = wCode.replace('placeholder="Ex: canal-capitaes"', 'placeholder="Link (zello://...) ou nome do canal"');
fs.writeFileSync(wPath, wCode);

const cPath = 'src/components/CaptainPatrolDashboard.tsx';
let cCode = fs.readFileSync(cPath, 'utf8');

cCode = cCode.replace(
  'import { MapPin, Play, Square, Clock, Calendar, CheckCircle2, AlertTriangle, X, Bell, FileWarning, MessageCircle, Camera, Image as ImageIcon, Search, Crosshair, UserX, Info, ChevronUp, ChevronDown, Radio, CheckCheck, Check } from "lucide-react";',
  'import { MapPin, Play, Square, Clock, Calendar, CheckCircle2, AlertTriangle, X, Bell, FileWarning, MessageCircle, Camera, Image as ImageIcon, Search, Crosshair, UserX, Info, ChevronUp, ChevronDown, Radio, CheckCheck, Check } from "lucide-react";\nimport { formatZelloLink } from "@/lib/zello";'
);

cCode = cCode.replace(
  "href={activeWorkplace.zelloChannelLink.includes('://') ? activeWorkplace.zelloChannelLink : \\zello://?add_channel\\}",
  "href={formatZelloLink(activeWorkplace.zelloChannelLink)}"
);

cCode = cCode.replace(
  "href={(activeWorkplace as any).zelloGroupLink.includes('://') ? (activeWorkplace as any).zelloGroupLink : \\zello://?add_channel\\}",
  "href={formatZelloLink((activeWorkplace as any).zelloGroupLink)}"
);

fs.writeFileSync(cPath, cCode);
console.log("Fixed captain and workplace");
