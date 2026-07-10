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
      cargo: "Advogada Trabalhista",
      cor: "#C9A24B",
      iniciais: "CR"
    },
    {
      id: "adv2",
      nome: "Dr. Felipe Andrade",
      oab: "PR 38.902",
      cargo: "Advogado Cível",
      cor: "#5B8DEF",
      iniciais: "FA"
    },
    {
      id: "adv3",
      nome: "Dra. Luiza Martins",
      oab: "SP 210.774",
      cargo: "Advogada Tributária",
      cor: "#4CB8A4",
      iniciais: "LM"
    }
  ],

  processos: [
    { numero: "0001234-56.2024.8.16.0001", parte: "Empresa Exemplo Ltda. x José da Silva", tipo: "Trabalhista", tribunal: "TRT-9", vara: "3ª Vara do Trabalho de Curitiba", advogadoId: "adv1", status: "Em andamento", fase: "Instrução", valorCausa: 48500, distribuicao: "2024-02-11", ultimaMov: "Audiência de instrução designada" },
    { numero: "0002211-88.2024.8.16.0004", parte: "Empresa Exemplo Ltda. x Transportadora Rota Sul", tipo: "Cível", tribunal: "TJPR", vara: "5ª Vara Cível de Curitiba", advogadoId: "adv2", status: "Em andamento", fase: "Contestação", valorCausa: 132000, distribuicao: "2024-04-02", ultimaMov: "Aguardando prazo para contestação" },
    { numero: "5003345-21.2023.4.04.7000", parte: "Empresa Exemplo Ltda. x União Federal", tipo: "Tributário", tribunal: "TRF-4", vara: "2ª Vara Federal de Curitiba", advogadoId: "adv3", status: "Em andamento", fase: "Recurso", valorCausa: 890000, distribuicao: "2023-09-19", ultimaMov: "Apelação interposta" },
    { numero: "0004456-77.2024.8.16.0001", parte: "Marcos Vinícius x Empresa Exemplo Ltda.", tipo: "Trabalhista", tribunal: "TRT-9", vara: "1ª Vara do Trabalho de Curitiba", advogadoId: "adv1", status: "Em andamento", fase: "Citação", valorCausa: 21300, distribuicao: "2024-06-05", ultimaMov: "Citação recebida — aguardando manifestação" },
    { numero: "0007788-10.2022.8.16.0001", parte: "Empresa Exemplo Ltda. x Fornecedora Nortec", tipo: "Cível", tribunal: "TJPR", vara: "2ª Vara Cível de Curitiba", advogadoId: "adv2", status: "Suspenso", fase: "Perícia", valorCausa: 76000, distribuicao: "2022-11-30", ultimaMov: "Aguardando laudo pericial" },
    { numero: "5001987-44.2024.4.04.7000", parte: "Empresa Exemplo Ltda. x Receita Federal", tipo: "Tributário", tribunal: "TRF-4", vara: "4ª Vara Federal de Curitiba", advogadoId: "adv3", status: "Em andamento", fase: "Embargos", valorCausa: 254000, distribuicao: "2024-01-22", ultimaMov: "Embargos de declaração protocolados" },
    { numero: "0009321-05.2024.8.16.0019", parte: "Ana Paula Ferreira x Empresa Exemplo Ltda.", tipo: "Trabalhista", tribunal: "TRT-9", vara: "6ª Vara do Trabalho de Curitiba", advogadoId: "adv1", status: "Em andamento", fase: "Recurso", valorCausa: 18700, distribuicao: "2023-12-14", ultimaMov: "Recurso ordinário aguardando julgamento" },
    { numero: "0000123-44.2024.8.16.0001", parte: "Empresa Exemplo Ltda. x Construtora Delta", tipo: "Cível", tribunal: "TJPR", vara: "1ª Vara Cível de Curitiba", advogadoId: "adv2", status: "Encerrado", fase: "Baixado", valorCausa: 340000, distribuicao: "2021-05-08", ultimaMov: "Processo baixado — acordo cumprido" },
    { numero: "5002234-90.2024.4.04.7000", parte: "Empresa Exemplo Ltda. x Estado do Paraná", tipo: "Tributário", tribunal: "TJPR", vara: "Vara da Fazenda Pública", advogadoId: "adv3", status: "Em andamento", fase: "Citação", valorCausa: 61500, distribuicao: "2024-06-27", ultimaMov: "Citação recebida" },
    { numero: "0005567-32.2024.8.16.0001", parte: "Roberto Nunes x Empresa Exemplo Ltda.", tipo: "Trabalhista", tribunal: "TRT-9", vara: "4ª Vara do Trabalho de Curitiba", advogadoId: "adv1", status: "Em andamento", fase: "Contestação", valorCausa: 9800, distribuicao: "2024-06-30", ultimaMov: "Prazo de contestação em curso" }
  ],

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
    { id: "p1", processoNumero: "0002211-88.2024.8.16.0004", descricao: "Contestação", tipo: "Prazo processual", advogadoId: "adv2", vencimento: addDays(1) },
    { id: "p2", processoNumero: "0001234-56.2024.8.16.0001", descricao: "Audiência de instrução", tipo: "Audiência", advogadoId: "adv1", vencimento: addDays(2) },
    { id: "p3", processoNumero: "5003345-21.2023.4.04.7000", descricao: "Protocolo da apelação", tipo: "Recurso", advogadoId: "adv3", vencimento: addDays(3) },
    { id: "p4", processoNumero: "0004456-77.2024.8.16.0001", descricao: "Manifestação sobre citação", tipo: "Prazo processual", advogadoId: "adv1", vencimento: addDays(4) },
    { id: "p5", processoNumero: "5002234-90.2024.4.04.7000", descricao: "Contestação à Fazenda", tipo: "Prazo processual", advogadoId: "adv3", vencimento: addDays(5) },
    { id: "p6", processoNumero: "0005567-32.2024.8.16.0001", descricao: "Contestação", tipo: "Prazo processual", advogadoId: "adv1", vencimento: addDays(6) },
    { id: "p7", processoNumero: "0007788-10.2022.8.16.0001", descricao: "Audiência de conciliação", tipo: "Audiência", advogadoId: "adv2", vencimento: addDays(9) },
    { id: "p8", processoNumero: "0009321-05.2024.8.16.0019", descricao: "Julgamento do recurso ordinário", tipo: "Audiência", advogadoId: "adv1", vencimento: addDays(15) },
    { id: "p9", processoNumero: "5001987-44.2024.4.04.7000", descricao: "Embargos de declaração", tipo: "Recurso", advogadoId: "adv3", vencimento: addDays(-2) }
  ]
};

function addDays(n) {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}
