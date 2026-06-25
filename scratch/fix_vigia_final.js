const fs = require('fs');

const fixVigia = () => {
  let c = fs.readFileSync('src/components/VigiaDashboard.tsx', 'utf8');

  // Fix CAPITíO and NOTIFICAÇíO which are encoded weirdly in the source.
  // Wait, let's use a regex to match CAPIT followed by íO
  c = c.replace(/CAPIT\xEDO/g, 'CAPIT\xC3O'); // CAPITÃO
  c = c.replace(/NOTIFICA\xC7\xEDO/g, 'NOTIFICA\xC7\xC3O'); // NOTIFICAÇÃO
  
  // Actually, sometimes the unicode is different. Let's just do text replace for "CAPITíO" and "NOTIFICAÇíO".
  // Note: the file might contain literally 'CAPITíO' or 'CAPIT\xEDO'. Let's do both just in case.
  c = c.replace(/CAPITíO/g, 'CAPITÃO');
  c = c.replace(/NOTIFICAÇíO/g, 'NOTIFICAÇÃO');
  c = c.replace(/CAPIT\xEDO/g, 'CAPIT\xC3O'); 
  c = c.replace(/NOTIFICA\xC7\xEDO/g, 'NOTIFICA\xC7\xC3O'); 
  
  // Also remove the "Notificar Capitão" button
  const buttonRegex = /<button[^>]*onClick=\{async \(\) => \{[^}]*if \(\!activeWorkplace\?\.captainId\) return;[^}]*const msg = prompt\("Que mensagem deseja enviar ao capit[^"]+"\);[\s\S]*?Notificar Capit[^<]+<\/button>/m;
  c = c.replace(buttonRegex, '');

  fs.writeFileSync('src/components/VigiaDashboard.tsx', c);
  console.log('Fixed VigiaDashboard spelling and removed button');
};

fixVigia();
