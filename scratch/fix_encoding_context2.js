const fs = require('fs');

const fixEncodingContext = (filePath) => {
  let c = fs.readFileSync(filePath, 'utf8');

  c = c.replace(/>MENSAGEM DO CAPIT[\s\S]*?O<\/p>/g, '>MENSAGEM DO CAPITÃO</p>');
  c = c.replace(/NOTIFICA[\s\S]*?O DO CAPIT[\s\S]*?O<\/p>/g, 'NOTIFICAÇÃO DO CAPITÃO</p>');
  c = c.replace(/NOTIFICA[\s\S]*?O PARA CAPIT[\s\S]*?O/g, 'NOTIFICAÇÃO PARA CAPITÃO');
  
  c = c.replace(/Nova mensagem do Capit[\s\S]*?o/g, 'Nova mensagem do Capitão');
  c = c.replace(/enviada ao Capit[\s\S]*?o com sucesso/g, 'enviada ao Capitão com sucesso');
  c = c.replace(/enviada para o Capit[\s\S]*?o!/g, 'enviada para o Capitão!');
  c = c.replace(/do seu Capit[\s\S]*?o mesmo com a app/g, 'do seu Capitão mesmo com a app');
  c = c.replace(/pelo seu Capit[\s\S]*?o\./g, 'pelo seu Capitão.');
  c = c.replace(/Alerta imediato para o Capit[\s\S]*?o/g, 'Alerta imediato para o Capitão');
  c = c.replace(/Capit[\s\S]*?o: /g, 'Capitão: ');

  fs.writeFileSync(filePath, c);
};

fixEncodingContext('src/components/VigiaDashboard.tsx');
fixEncodingContext('src/components/CaptainPatrolDashboard.tsx');
console.log('Fixed encoding with multiline regex');
