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

  tarefas: [
    { id: "t1", processoNumero: "0001234-56.2024.8.16.0001", titulo: "Preparar quesitos para audiência de instrução", advogadoId: "adv1", coluna: "fazer", prioridade: "alta", prazo: addDays(2) },
    { id: "t2", processoNumero: "0004456-77.2024.8.16.0001", titulo: "Elaborar contestação da citação recebida", advogadoId: "adv1", coluna: "fazer", prioridade: "alta", prazo: addDays(4) },
    { id: "t3", processoNumero: "0002211-88.2024.8.16.0004", titulo: "Redigir contestação — Transportadora Rota Sul", advogadoId: "adv2", coluna: "andamento", prioridade: "alta", prazo: addDays(1) },
    { id: "t4", processoNumero: "0007788-10.2022.8.16.0001", titulo: "Cobrar laudo pericial junto ao perito", advogadoId: "adv2", coluna: "aguardando", prioridade: "media", prazo: addDays(10) },
    { id: "t5", processoNumero: "5003345-21.2023.4.04.7000", titulo: "Revisar apelação antes do protocolo final", advogadoId: "adv3", coluna: "andamento", prioridade: "alta", prazo: addDays(3) },
    { id: "t6", processoNumero: "5001987-44.2024.4.04.7000", titulo: "Protocolar embargos de declaração", advogadoId: "adv3", coluna: "concluido", prioridade: "media", prazo: addDays(-2) },
    { id: "t7", processoNumero: "0009321-05.2024.8.16.0019", titulo: "Acompanhar pauta de julgamento do recurso", advogadoId: "adv1", coluna: "aguardando", prioridade: "baixa", prazo: addDays(15) },
    { id: "t8", processoNumero: "0005567-32.2024.8.16.0001", titulo: "Levantar documentos para contestação", advogadoId: "adv1", coluna: "fazer", prioridade: "media", prazo: addDays(6) },
    { id: "t9", processoNumero: "5002234-90.2024.4.04.7000", titulo: "Analisar citação e definir estratégia", advogadoId: "adv3", coluna: "fazer", prioridade: "media", prazo: addDays(5) }
  ],

  prazos: [
    { id: "p1", numeroProcesso: "0002211-88.2024.8.16.0004", parteAutora: "Empresa Exemplo Ltda.", estado: "PR", descricao: "Contestação", tipo: "Prazo processual", advogadoId: "adv2", vencimento: addDays(1) },
    { id: "p2", numeroProcesso: "0001234-56.2024.8.16.0001", parteAutora: "Empresa Exemplo Ltda.", estado: "PR", descricao: "Audiência de instrução", tipo: "Audiência", advogadoId: "adv1", vencimento: addDays(2) },
    { id: "p3", numeroProcesso: "5003345-21.2023.4.04.7000", parteAutora: "Empresa Exemplo Ltda.", estado: "PR", descricao: "Protocolo da apelação", tipo: "Recurso", advogadoId: "adv3", vencimento: addDays(3) },
    { id: "p4", numeroProcesso: "0004456-77.2024.8.16.0001", parteAutora: "Marcos Vinícius", estado: "PR", descricao: "Manifestação sobre citação", tipo: "Prazo processual", advogadoId: "adv1", vencimento: addDays(4) },
    { id: "p5", numeroProcesso: "5002234-90.2024.4.04.7000", parteAutora: "Empresa Exemplo Ltda.", estado: "PR", descricao: "Contestação à Fazenda", tipo: "Prazo processual", advogadoId: "adv3", vencimento: addDays(5) },
    { id: "p6", numeroProcesso: "0005567-32.2024.8.16.0001", parteAutora: "Roberto Nunes", estado: "PR", descricao: "Contestação", tipo: "Prazo processual", advogadoId: "adv1", vencimento: addDays(6) },
    { id: "p7", numeroProcesso: "0007788-10.2022.8.16.0001", parteAutora: "Empresa Exemplo Ltda.", estado: "PR", descricao: "Audiência de conciliação", tipo: "Audiência", advogadoId: "adv2", vencimento: addDays(9) },
    { id: "p8", numeroProcesso: "0009321-05.2024.8.16.0019", parteAutora: "Ana Paula Ferreira", estado: "PR", descricao: "Julgamento do recurso ordinário", tipo: "Audiência", advogadoId: "adv1", vencimento: addDays(15) },
    { id: "p9", numeroProcesso: "5001987-44.2024.4.04.7000", parteAutora: "Empresa Exemplo Ltda.", estado: "PR", descricao: "Embargos de declaração", tipo: "Recurso", advogadoId: "adv3", vencimento: addDays(-2) }
  ]
};

function addDays(n) {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}
