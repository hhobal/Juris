-- ==========================================================
-- DADOS FICTÍCIOS PARA TESTE
--
-- Não é seed do banco local: é um script para rodar à mão no SQL
-- Editor do Supabase e encher a sua própria conta de dados críveis,
-- para ver as telas funcionando com volume real.
--
-- Tudo aqui é inventado. Nenhum número de processo abaixo existe.
--
-- COMO USAR
--   1. Confira o e-mail em v_email logo abaixo: tem que ser o da
--      SUA conta no Juris. É o único lugar onde ele aparece.
--   2. Cole tudo no SQL Editor do Supabase e execute.
--   3. Leia as mensagens no fim — elas dizem quantas linhas entraram.
--
-- Pode rodar quantas vezes quiser: o script limpa o demo anterior
-- antes de inserir, então nada duplica. Ele só mexe nas linhas que
-- ele mesmo criou; o que você cadastrar à mão fica intacto.
--
-- As datas são relativas a current_date, de propósito: assim os
-- prazos caem em todas as faixas de urgência da tela (vencido,
-- hoje, urgente, atenção, tranquilo) em qualquer dia que você rodar.
-- ==========================================================

do $$
declare
  -- >>> O ÚNICO LUGAR PARA TROCAR O E-MAIL <<<
  v_email  text := 'fabiohobal@hotmail.com';

  v_id     uuid;
  v_proc   int;
  v_prazo  int;
  v_tarefa int;

  -- os processos do demo, usados também para limpar a rodada anterior
  v_numeros text[] := array[
    '0004512-88.2024.8.16.0014',
    '0011238-45.2023.8.16.0185',
    '0000987-12.2025.5.09.0664',
    '0007764-30.2024.8.16.0030',
    '0002210-77.2025.8.16.0021',
    '0015903-64.2022.8.16.0001',
    '0003377-19.2025.8.16.0079',
    '0009142-53.2021.8.16.0014'
  ];
begin

  -- ----------------------------------------------------------
  -- Acha a conta. Se não achar, PARA — em vez de inserir zero
  -- linhas em silêncio, que foi o que aconteceu na primeira versão
  -- deste arquivo.
  -- ----------------------------------------------------------
  select id into v_id
    from public.advogados
   where lower(email) = lower(v_email);

  if v_id is null then
    raise exception
      'Não existe advogado com o e-mail %. Cadastre-se no app com esse e-mail, ou corrija v_email no topo deste script.',
      v_email
      using hint = 'Para ver as contas existentes: select id, nome, email from public.advogados;';
  end if;

  raise notice 'Conta encontrada: % (%)', v_email, v_id;


  -- ----------------------------------------------------------
  -- Limpa a rodada anterior do demo (e só ela)
  -- ----------------------------------------------------------
  delete from public.tarefas
   where advogado_id = v_id
     and (processo_numero = any(v_numeros)
          or titulo in ('Organizar pasta de contratos 2026',
                        'Minutar distrato - Unidade 07',
                        'Renovar certificado digital'));

  delete from public.prazos
   where advogado_id = v_id
     and numero_processo = any(v_numeros);

  delete from public.processos
   where advogado_id = v_id
     and numero = any(v_numeros);


  -- ----------------------------------------------------------
  -- PROCESSOS
  -- ----------------------------------------------------------
  insert into public.processos
    (numero, parte, tipo, tribunal, vara, advogado_id, status, fase, valor_causa, distribuicao, ultima_mov)
  select v.numero, v.parte, v.tipo, v.tribunal, v.vara, v_id, v.status, v.fase,
         v.valor_causa, v.distribuicao, v.ultima_mov
  from (values
    ('0004512-88.2024.8.16.0014', 'Marina Duarte Fontes',             'Cível',       'TJPR', '3ª Vara Cível de Londrina',        'Em andamento', 'Conhecimento',  48500.00,  current_date - 240,  'Contestação juntada aos autos'),
    ('0011238-45.2023.8.16.0185', 'Panificadora Bom Trigo Ltda',      'Empresarial', 'TJPR', '2ª Vara de Fazenda de Curitiba',   'Em andamento', 'Execução',      127300.00, current_date - 512,  'Penhora online deferida'),
    ('0000987-12.2025.5.09.0664', 'Cleber Antunes Ramos',             'Trabalhista', 'TRT9', '4ª Vara do Trabalho de Maringá',   'Em andamento', 'Instrução',     92000.00,  current_date - 118,  'Audiência de instrução designada'),
    ('0007764-30.2024.8.16.0030', 'Franquia Doce Ponto - Unidade 12', 'Contratual',  'TJPR', '1ª Vara Cível de Foz do Iguaçu',   'Em andamento', 'Conhecimento',  65900.00,  current_date - 195,  'Réplica apresentada'),
    ('0002210-77.2025.8.16.0021', 'Helena Vasques Moreira',           'Família',     'TJPR', 'Vara de Família de Cascavel',      'Em andamento', 'Conhecimento',  0.00,      current_date - 84,   'Estudo social determinado'),
    ('0015903-64.2022.8.16.0001', 'Transportes Vale Norte S/A',       'Cível',       'TJPR', '9ª Vara Cível de Curitiba',        'Suspenso',     'Recursal',      310000.00, current_date - 890,  'Suspenso aguardando tema repetitivo'),
    ('0003377-19.2025.8.16.0079', 'Rogério Pacheco Lima',             'Consumidor',  'TJPR', 'Juizado Especial Cível de Toledo', 'Em andamento', 'Conhecimento',  14200.00,  current_date - 46,   'Citação cumprida'),
    ('0009142-53.2021.8.16.0014', 'Construtora Aldeia Verde Ltda',    'Empresarial', 'TJPR', '5ª Vara Cível de Londrina',        'Encerrado',    'Cumprido',      88400.00,  current_date - 1420, 'Arquivamento definitivo')
  ) as v(numero, parte, tipo, tribunal, vara, status, fase, valor_causa, distribuicao, ultima_mov)
  on conflict (numero) do nothing;

  get diagnostics v_proc = row_count;


  -- ----------------------------------------------------------
  -- PRAZOS
  --
  -- tipo aceita só: 'Prazo processual', 'Audiência', 'Recurso'
  -- ----------------------------------------------------------
  insert into public.prazos
    (numero_processo, parte_autora, estado, descricao, tipo, advogado_id, vencimento)
  select v.numero_processo, v.parte_autora, v.estado, v.descricao, v.tipo, v_id, v.vencimento
  from (values
    -- vencidos: cartão vermelho, selo mostra travessão
    ('0015903-64.2022.8.16.0001', 'Transportes Vale Norte S/A',       'PR', 'Manifestar sobre a petição da parte contrária', 'Prazo processual', current_date - 4),
    ('0009142-53.2021.8.16.0014', 'Construtora Aldeia Verde Ltda',    'PR', 'Juntar procuração atualizada',                  'Prazo processual', current_date - 1),
    -- vence hoje
    ('0004512-88.2024.8.16.0014', 'Marina Duarte Fontes',             'PR', 'Impugnação à contestação',                      'Prazo processual', current_date),
    -- urgente: 1 a 3 dias
    ('0003377-19.2025.8.16.0079', 'Rogério Pacheco Lima',             'PR', 'Apresentar rol de testemunhas',                 'Prazo processual', current_date + 1),
    ('0011238-45.2023.8.16.0185', 'Panificadora Bom Trigo Ltda',      'PR', 'Embargos à execução',                           'Recurso',          current_date + 3),
    -- atenção: 4 a 7 dias
    ('0000987-12.2025.5.09.0664', 'Cleber Antunes Ramos',             'PR', 'Audiência de instrução e julgamento - 14h30',   'Audiência',        current_date + 5),
    ('0007764-30.2024.8.16.0030', 'Franquia Doce Ponto - Unidade 12', 'PR', 'Especificar provas',                            'Prazo processual', current_date + 7),
    -- tranquilo: mais de 7 dias
    ('0002210-77.2025.8.16.0021', 'Helena Vasques Moreira',           'PR', 'Manifestar sobre o estudo social',              'Prazo processual', current_date + 12),
    ('0004512-88.2024.8.16.0014', 'Marina Duarte Fontes',             'PR', 'Audiência de conciliação - 09h00',              'Audiência',        current_date + 18),
    ('0015903-64.2022.8.16.0001', 'Transportes Vale Norte S/A',       'PR', 'Apelação contra a sentença de improcedência',   'Recurso',          current_date + 25)
  ) as v(numero_processo, parte_autora, estado, descricao, tipo, vencimento);

  get diagnostics v_prazo = row_count;


  -- ----------------------------------------------------------
  -- TAREFAS
  --
  -- coluna aceita: 'fazer', 'andamento', 'aguardando', 'concluido'
  -- prioridade aceita: 'alta', 'media', 'baixa'
  -- ----------------------------------------------------------
  insert into public.tarefas
    (titulo, descricao, processo_numero, advogado_id, coluna, prioridade, prazo)
  select v.titulo, v.descricao, v.processo_numero, v_id, v.coluna, v.prioridade, v.prazo
  from (values
    ('Revisar contrato de franquia - Unidade 12', 'Conferir cláusula de exclusividade territorial antes da assinatura.', '0007764-30.2024.8.16.0030', 'fazer',      'alta',  current_date + 2),
    ('Minutar distrato - Unidade 07',             'Franqueado pediu encerramento amigável. Levantar multa rescisória.',  null,                        'fazer',      'alta',  current_date + 4),
    ('Organizar pasta de contratos 2026',         'Digitalizar e indexar os contratos assinados no primeiro semestre.',  null,                        'fazer',      'baixa', null),
    ('Levantar documentos do Cleber',             'Holerites dos últimos 12 meses e cartão-ponto para a audiência.',     '0000987-12.2025.5.09.0664', 'andamento',  'alta',  current_date + 3),
    ('Calcular liquidação - Bom Trigo',           'Atualizar o débito com juros e correção até a data da penhora.',      '0011238-45.2023.8.16.0185', 'andamento',  'media', current_date + 6),
    ('Aguardando resposta do cliente',            'Marina precisa confirmar se aceita a proposta de acordo.',            '0004512-88.2024.8.16.0014', 'aguardando', 'media', current_date + 8),
    ('Aguardando certidão do cartório',           'Certidão de casamento pedida para instruir o processo de família.',   '0002210-77.2025.8.16.0021', 'aguardando', 'baixa', current_date + 15),
    ('Protocolar contestação - Rogério',          'Protocolada em prazo, com pedido de justiça gratuita.',               '0003377-19.2025.8.16.0079', 'concluido',  'alta',  current_date - 5),
    ('Renovar certificado digital',               'Certificado A3 vence no fim do mês.',                                 null,                        'concluido',  'media', current_date - 9)
  ) as v(titulo, descricao, processo_numero, coluna, prioridade, prazo);

  get diagnostics v_tarefa = row_count;


  raise notice '--------------------------------------';
  raise notice 'processos inseridos: %', v_proc;
  raise notice 'prazos inseridos:    %', v_prazo;
  raise notice 'tarefas inseridas:   %', v_tarefa;
  raise notice '--------------------------------------';

end $$;


-- ==========================================================
-- CONFERÊNCIA
-- Rode isto depois para ver o que ficou no banco.
-- ==========================================================
select 'processos' as tabela, count(*) from public.processos
 where advogado_id = (select id from public.advogados where lower(email) = lower('fabiohobal@hotmail.com'))
union all
select 'prazos', count(*) from public.prazos
 where advogado_id = (select id from public.advogados where lower(email) = lower('fabiohobal@hotmail.com'))
union all
select 'tarefas', count(*) from public.tarefas
 where advogado_id = (select id from public.advogados where lower(email) = lower('fabiohobal@hotmail.com'));



 LIMPEZA TOTAL

 Descomente e rode para zerar. Cuidado: apaga TODOS os seus
 prazos, tarefas e processos, inclusive os cadastrados à mão.
 Para tirar só o demo, basta rodar o bloco do em cima de novo —
 ele já limpa a rodada anterior sozinho.


 do $$
 declare v_email text := 'fabiohobal@hotmail.com'; v_id uuid;
 begin
   select id into v_id from public.advogados where lower(email) = lower(v_email);
   delete from public.tarefas   where advogado_id = v_id;
   delete from public.prazos    where advogado_id = v_id;
   delete from public.processos where advogado_id = v_id;
 end $$;
