const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'VigiaDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update imports
if (content.includes('import { playAlertBeeps }')) {
  content = content.replace('import { playAlertBeeps }', 'import { initAudio, playAlertBeeps }');
}

// 2. Add useEffect for initAudio
const stateHooksPos = content.indexOf('const [activePanel, setActivePanel]');
if (stateHooksPos !== -1 && !content.includes('initAudio()')) {
  const initAudioHook = `
  useEffect(() => {
    const unlockAudio = () => {
      initAudio();
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
    };
    document.addEventListener("touchstart", unlockAudio, { once: true });
    document.addEventListener("click", unlockAudio, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
    };
  }, []);
`;
  content = content.slice(0, stateHooksPos) + initAudioHook + '\n  ' + content.slice(stateHooksPos);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('VigiaDashboard.tsx patched with initAudio');
