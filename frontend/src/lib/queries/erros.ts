/**
 * Mensagens do Postgres não servem para um advogado ler.
 *
 * O caso mais comum aqui não é erro de sintaxe: é a RLS recusando a escrita
 * porque a pessoa tentou mexer no trabalho de um colega.
 */
export function traduzirErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("row-level security") || m.includes("violates row-level")) {
    return "Seu perfil não tem permissão para esta ação.";
  }
  if (m.includes("duplicate key") && m.includes("numero")) {
    return "Já existe um processo cadastrado com esse número.";
  }
  return mensagem;
}

/**
 * O PostgREST devolve sucesso com zero linhas quando a RLS filtrou tudo —
 * não um erro. Sem tratar isso, uma edição negada parece ter funcionado.
 */
export function naoEhSeu(oQue: string): string {
  return `Este ${oQue} é de outro advogado. Só quem responde por ele, ou um administrador, pode alterá-lo.`;
}
