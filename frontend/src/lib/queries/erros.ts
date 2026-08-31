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
  if (m.includes("duplicate key") && m.includes("prazos_publicacao_key")) {
    return "Esta publicação já gerou um prazo. Veja na tela de Prazos.";
  }
  if (m.includes("duplicate key") && m.includes("compartilhamentos_unico")) {
    return "Este processo já está compartilhado com esse e-mail.";
  }
  if (m.includes("compartilhamentos_email_check")) {
    return "Digite um e-mail válido.";
  }
  if (m.includes("duplicate key") && m.includes("numero")) {
    // O número é único no banco inteiro, então o dono pode ser outro advogado —
    // e nesse caso a RLS esconde a linha, e a tela fica sem explicação nenhuma.
    return (
      "Já existe um processo cadastrado com esse número. Se ele é de um colega, " +
      "peça para ele compartilhar o processo com você."
    );
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
