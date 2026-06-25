const fs = require('fs');

const fixEncoding = (filePath) => {
  let c = fs.readFileSync(filePath, 'utf8');

  // Hardcode the mangled characters
  c = c.replace(/Capitǜo/g, 'Capitão');
  c = c.replace(/CAPITǟO/g, 'CAPITÃO');
  c = c.replace(/Capitǟo/g, 'Capitão');
  
  c = c.replace(/Notificaǜo/g, 'Notificação');
  c = c.replace(/NOTIFICAǟO/g, 'NOTIFICAÇÃO');
  c = c.replace(/notificaes/g, 'notificações');

  c = c.replace(/OcorrǦncias/g, 'Ocorrências');
  c = c.replace(/OcorrǦncia/g, 'Ocorrência');

  c = c.replace(/atribuiǜo/g, 'atribuição');
  c = c.replace(/atribuidos/g, 'atribuídos');

  fs.writeFileSync(filePath, c);
};

fixEncoding('src/components/VigiaDashboard.tsx');
fixEncoding('src/components/CaptainPatrolDashboard.tsx');
console.log('Fixed encoding with hardcoded mangled chars');
