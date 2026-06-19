const fs = require('fs');
const ts = require('typescript');

const content = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf-8');

try {
    const result = ts.transpileModule(content, { compilerOptions: { jsx: ts.JsxEmit.React } });
    console.log("Syntax OK");
} catch (e) {
    console.log("Error:", e.message);
}
