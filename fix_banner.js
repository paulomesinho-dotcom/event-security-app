const fs = require('fs');
let content = fs.readFileSync('src/components/EmergencyBanner.tsx', 'utf-8');
content = content.replace('import { playAlertBeeps } from "@/lib/audioAlert";\n"use client";', '"use client";\nimport { playAlertBeeps } from "@/lib/audioAlert";');
fs.writeFileSync('src/components/EmergencyBanner.tsx', content);
