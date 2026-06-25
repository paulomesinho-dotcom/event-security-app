const fs = require('fs');

const fixEncoding = (filePath) => {
  let c = fs.readFileSync(filePath, 'utf8');

  // Replace all variations of Capit*o with Capitão
  c = c.replace(/Capit.o/g, 'Capitão');
  c = c.replace(/CAPIT.O/g, 'CAPITÃO');
  
  c = c.replace(/Notifica..o/g, 'Notificação'); // e.g. Notificao
  c = c.replace(/NOTIFICA..O/g, 'NOTIFICAÇÃO');
  c = c.replace(/notifica.es/g, 'notificações');

  c = c.replace(/Ocorr.ncias/g, 'Ocorrências');
  c = c.replace(/Ocorr.ncia/g, 'Ocorrência');
  c = c.replace(/OCORR.NCIA/g, 'OCORRÊNCIA');

  c = c.replace(/R.dio/g, 'Rádio');
  c = c.replace(/Informa..o/g, 'Informação');
  c = c.replace(/atribui..o/g, 'atribuição');
  c = c.replace(/POSI..O/g, 'POSIÇÃO');
  c = c.replace(/Posi..o/g, 'Posição');
  c = c.replace(/ATUALIZA..O/g, 'ATUALIZAÇÃO');

  fs.writeFileSync(filePath, c);
};

fixEncoding('src/components/VigiaDashboard.tsx');
fixEncoding('src/components/CaptainPatrolDashboard.tsx');
console.log('Fixed encoding robustly');
