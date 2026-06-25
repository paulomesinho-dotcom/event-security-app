export function formatZelloLink(link?: string): string {
  if (!link) return "";
  
  const trimmed = link.trim();
  
  // Se já for um link completo (seja http, https ou zello://), usamos exatamente o que foi introduzido
  if (trimmed.includes("://")) {
    return trimmed;
  }
  
  // Se for apenas o nome do canal, construímos o link básico
  return `zello://${trimmed}?add_channel`;
}
