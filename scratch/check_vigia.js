const fs = require('fs');
const content = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf8');
console.log('Total lines:', content.split('\n').length);
console.log('Has MapModal import:', content.includes('MapModal'));
console.log('Has MapModal JSX:', content.includes('<MapModal'));
console.log('Has maps.google:', content.includes('maps.google.com'));
console.log('Has planImageUrl in addDoc:', content.includes('planImageUrl,'));
const useClientMatches = content.match(/"use client"/g) || [];
console.log('use client count:', useClientMatches.length);
