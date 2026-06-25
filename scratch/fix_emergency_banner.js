const fs = require('fs');

let content = fs.readFileSync('src/components/EmergencyBanner.tsx', 'utf-8');

// 1. Remove if (hasActiveShift) block wrapping
content = content.replace(/if \(hasActiveShift\) \{\n\s*if \(isEvacuation/g, 'if (isEvacuation');

// Also remove the closing brace for that block which is before `const isBlockingEmergency`
content = content.replace(/\s*\}\n\n  const isBlockingEmergency = hasActiveShift && needsToAcknowledge;/g, '\n\n  const isBlockingEmergency = needsToAcknowledge;');

// 2. Remove hasActiveShift && from all banner logic
content = content.replace(/const hasActiveBanners = hasActiveShift && !needsToAcknowledge/g, 'const hasActiveBanners = !needsToAcknowledge');

content = content.replace(/const hasNonBlockingNotifications = !hasActiveShift &&/g, 'const hasNonBlockingNotifications = !hasActiveBanners && !isBlockingEmergency &&');

// 3. Remove user?.role !== "vigia" from visibleSuspects non-blocking render
content = content.replace(/user\.role !== "vigia" && visibleSuspects\.length > 0 && !hasActiveShift &&/g, 'visibleSuspects.length > 0 && !hasActiveShift &&');

content = content.replace(/visibleSuspects\.length > 0 && user\?\.role !== "vigia" &&/g, 'visibleSuspects.length > 0 &&');

// 4. Update comment
content = content.replace(/\{\/\* Suspect Banner for Captains\/Admins \(non-blocking\) \*\/\}/g, '{/* Suspect Banner (non-blocking) */}');

fs.writeFileSync('src/components/EmergencyBanner.tsx', content);
console.log('Fixed EmergencyBanner.tsx');
