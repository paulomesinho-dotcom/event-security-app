const fs = require('fs');

const fixEncodingExact = (filePath) => {
  let c = fs.readFileSync(filePath, 'utf8');

  // Find all instances of Capit and replace them if they are misspelled
  c = c.replace(/Capit\u01DCo/g, 'Capitão'); // Capitǜo
  c = c.replace(/Capit\u01DFo/g, 'Capitão'); // Capitǟo
  c = c.replace(/CAPIT\u01DCO/g, 'CAPITÃO');
  c = c.replace(/CAPIT\u01DFO/g, 'CAPITÃO');
  c = c.replace(/CAPITO/g, 'CAPITÃO'); // if it was somehow stripped

  c = c.replace(/Notifica\u01DCo/g, 'Notificação'); // Notificaǜo
  c = c.replace(/Notifica\u01DFo/g, 'Notificação'); // Notificaǟo
  c = c.replace(/NOTIFICA\u01DCO/g, 'NOTIFICAÇÃO');
  c = c.replace(/NOTIFICA\u01DFO/g, 'NOTIFICAÇÃO');
  c = c.replace(/NOTIFICAO/g, 'NOTIFICAÇÃO');

  c = c.replace(/Ocorr\u01E6ncia/g, 'Ocorrência'); // OcorrǦncia
  c = c.replace(/Ocorr\u01E6ncias/g, 'Ocorrências');

  c = c.replace(/atribui\u01DCo/g, 'atribuição'); // atribuiǜo
  
  c = c.replace(/R\u01EDdio/g, 'Rádio'); // Rǭdio
  
  // also fix Y"" NOTIFICAǟO DO CAPITǟO
  // It is rendered as: 📢 NOTIFICAÇÃO DO CAPITÃO
  // Since we replaced NOTIFICAǟO to NOTIFICAÇÃO and CAPITǟO to CAPITÃO
  // we just need to fix the emoji if it's broken. Let's just hardcode the full line:
  c = c.replace(/Y"" NOTIFICAÇÃO DO CAPITÃO/g, '📢 NOTIFICAÇÃO DO CAPITÃO');

  fs.writeFileSync(filePath, c);
};

fixEncodingExact('src/components/VigiaDashboard.tsx');
fixEncodingExact('src/components/CaptainPatrolDashboard.tsx');
console.log('Fixed encoding using unicode hex points');
