/* ==========================================================
   DADOS INICIAIS (SEED)
   Em produção, isso viria de uma API (ex.: integração futura
   com o Datajuri ou com os tribunais via DataJud/PJe).
   Aqui ficam em localStorage para a demonstração funcionar
   de ponta a ponta sem backend.
   ========================================================== */

const SEED = {

  empresa: {
    razaoSocial: "Grupo Exemplo Indústria e Comércio Ltda.",
    cnpj: "12.345.678/0001-90"
  },

  advogados: [
    {
      id: "adv1",
      nome: "Dra. Camila Rezende",
      oab: "PR 45.211",
      email: "camila.rezende@empresaexemplo.com.br",
      // ATENÇÃO: senha só existe aqui para a demonstração funcionar sem backend.
      // Quando o Supabase Auth entrar, este campo é removido — a senha real
      // nunca fica no front-end nem no localStorage. Ver comentário em scripts.js -> AUTENTICAÇÃO.
      senhaDemo: "demo123",
      cargo: "Advogada Trabalhista",
      cor: "#C9A24B",
      iniciais: "CR"
    },
    {
      id: "adv2",
      nome: "Dr. Felipe Andrade",
      oab: "PR 38.902",
      email: "felipe.andrade@empresaexemplo.com.br",
      senhaDemo: "demo123",
      cargo: "Advogado Cível",
      cor: "#8B93A6",
      iniciais: "FA"
    },
    {
      id: "adv3",
      nome: "Dra. Luiza Martins",
      oab: "SP 210.774",
      email: "luiza.martins@empresaexemplo.com.br",
      senhaDemo: "demo123",
      cargo: "Advogada Tributária",
      cor: "#4CB8A4",
      iniciais: "LM"
    }
  ],

  // Usado no <select> de estado da aba Prazos — cobre os 26 estados + DF,
  // já que a ideia é acompanhar processos citados em tribunais de todo o Brasil.
  estados: [
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
    "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
  ],

  // Vazio de propósito: os processos-teste da demonstração foram removidos.
  // Cadastre pela aba Processos ("+ Novo processo"), ou aguarde a Busca de
  // Processos (próxima etapa) preencher isso automaticamente.
  processos: [],

  // Vazio de propósito — tarefas e prazos agora vêm só do Supabase
  // (ou você cadastra pela própria aba, uma vez que estiver logado).
  tarefas: [],

  prazos: []
};

function addDays(n) {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}
