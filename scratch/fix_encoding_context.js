const fs = require('fs');

const fixEncodingContext = (filePath) => {
  let c = fs.readFileSync(filePath, 'utf8');

  // We know the exact string matches
  c = c.replace(/>Y"" NOTIFICA.*O DO CAPIT.*O<\/p>/g, '>\uD83D\uDCE2 NOTIFICAÇÃO DO CAPITÃO</p>'); // The emoji was 📢
  c = c.replace(/>MENSAGEM DO CAPIT.*O<\/p>/g, '>MENSAGEM DO CAPITÃO</p>');
  
  c = c.replace(/Nova mensagem do Capit.*o/g, 'Nova mensagem do Capitão');
  c = c.replace(/enviada ao Capit.*o com sucesso/g, 'enviada ao Capitão com sucesso');
  c = c.replace(/"NOTIFICA.*O PARA CAPIT.*O"/g, '"NOTIFICAÇÃO PARA CAPITÃO"');
  c = c.replace(/enviada para o Capit.*o!/g, 'enviada para o Capitão!');
  c = c.replace(/do seu Capit.*o mesmo com a app/g, 'do seu Capitão mesmo com a app');
  c = c.replace(/pelo seu Capit.*o\./g, 'pelo seu Capitão.');
  c = c.replace(/Alerta imediato para o Capit.*o/g, 'Alerta imediato para o Capitão');
  c = c.replace(/Capit.*o: /g, 'Capitão: ');

  fs.writeFileSync(filePath, c);
};

fixEncodingContext('src/components/VigiaDashboard.tsx');
fixEncodingContext('src/components/CaptainPatrolDashboard.tsx');
console.log('Fixed encoding with context');
