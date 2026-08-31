-- ==========================================================
-- CONFERÊNCIA DO BANCO
--
-- Só lê. Não altera nada, não apaga nada, pode rodar quantas
-- vezes quiser.
--
-- Diz, numa tabela só, se cada migration chegou de fato ao banco:
-- colunas, funções, policies e índices que cada uma deveria ter
-- criado. Qualquer linha com "*** FALTA ***" é migration que não
-- rodou ou rodou pela metade.
-- ==========================================================

with

-- ----------------------------------------------------------
-- Colunas que cada migration deveria ter criado
-- ----------------------------------------------------------
colunas as (
  select
    '1. coluna' as grupo,
    e.tabela || '.' || e.coluna as item,
    e.veio_de as origem,
    case when exists (
      select 1 from information_schema.columns c
       where c.table_schema = 'public'
         and c.table_name = e.tabela
         and c.column_name = e.coluna
    ) then 'OK' else '*** FALTA ***' end as situacao
  from (values
    ('advogados',        'oab_numero',            'perfil_oab_estruturada'),
    ('advogados',        'oab_uf',                'perfil_oab_estruturada'),
    ('advogados',        'tribunais_monitorados', 'perfil_oab_estruturada'),
    ('publicacoes',      'cnj_id',                'publicacoes'),
    ('publicacoes',      'situacao',              'publicacoes'),
    ('publicacoes',      'processo_id',           'publicacoes'),
    ('publicacoes',      'disponibilizacao',      'publicacoes'),
    ('processos',        'origem',                'publicacoes'),
    ('prazos',           'origem',                'prazo_calculado'),
    ('prazos',           'confirmado',            'prazo_calculado'),
    ('prazos',           'dias_uteis',            'prazo_calculado'),
    ('prazos',           'publicacao_id',         'prazo_calculado'),
    ('compartilhamentos','dono_id',               'compartilhar_processo'),
    ('compartilhamentos','email_convidado',       'compartilhar_processo'),
    ('compartilhamentos','processo_id',           'compartilhar_processo')
  ) as e(tabela, coluna, veio_de)
),

-- ----------------------------------------------------------
-- A coluna antiga tinha que ter sumido
-- ----------------------------------------------------------
removidas as (
  select
    '2. removido' as grupo,
    'advogados.oab (texto livre antigo)' as item,
    'perfil_oab_estruturada' as origem,
    case when exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'advogados' and column_name = 'oab'
    ) then '*** AINDA EXISTE ***' else 'OK (removida)' end as situacao
),

-- ----------------------------------------------------------
-- Funções, e se são SECURITY DEFINER
--
-- Importa: sem SECURITY DEFINER as policies de compartilhamento
-- entram em recursão de RLS.
-- ----------------------------------------------------------
funcoes as (
  select
    '3. funcao' as grupo,
    e.nome || '()' as item,
    e.veio_de as origem,
    coalesce(
      (select case
                when p.prosecdef then 'OK (security definer)'
                else '*** É INVOKER, deveria ser DEFINER ***'
              end
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = e.nome
        limit 1),
      '*** FALTA ***'
    ) as situacao
  from (values
    ('advogado_atual',          'schema_inicial'),
    ('meu_email',               'compartilhar_processo'),
    ('sou_dono_do_processo',    'compartilhar_processo'),
    ('processo_compartilhado',  'compartilhar_processo'),
    ('numero_compartilhado',    'compartilhar_processo')
  ) as e(nome, veio_de)
),

-- ----------------------------------------------------------
-- As policies que fazem o compartilhamento funcionar
-- ----------------------------------------------------------
policies_esperadas as (
  select
    '4. policy' as grupo,
    e.tabela || ': ' || e.nome as item,
    'compartilhar_processo' as origem,
    case when exists (
      select 1 from pg_policies
       where schemaname = 'public' and tablename = e.tabela and policyname = e.nome
    ) then 'OK' else '*** FALTA ***' end as situacao
  from (values
    ('compartilhamentos', 'dono compartilha'),
    ('compartilhamentos', 'dono ve o que compartilhou'),
    ('compartilhamentos', 'convidado ve o que recebeu'),
    ('compartilhamentos', 'dono descompartilha'),
    ('processos',         'le processo compartilhado comigo'),
    ('prazos',            'le prazo de processo compartilhado'),
    ('tarefas',           'le tarefa de processo compartilhado')
  ) as e(tabela, nome)
),

-- ----------------------------------------------------------
-- RLS ligada em toda tabela de dados
--
-- Tabela com RLS desligada é dado de todo mundo exposto a todo
-- mundo. Nunca pode aparecer "*** DESLIGADA ***" aqui.
-- ----------------------------------------------------------
rls as (
  select
    '5. RLS' as grupo,
    c.relname as item,
    '-' as origem,
    case when c.relrowsecurity then 'OK (ligada)' else '*** DESLIGADA ***' end as situacao
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('advogados','processos','prazos','tarefas','publicacoes','compartilhamentos')
),

-- ----------------------------------------------------------
-- Índices que sustentam a deduplicação
--
-- Sem eles o upsert da busca duplicaria publicação a cada
-- sincronização, e a mesma publicação poderia virar dois prazos.
-- ----------------------------------------------------------
indices as (
  select
    '6. indice' as grupo,
    e.nome as item,
    e.veio_de as origem,
    case when exists (
      select 1 from pg_indexes where schemaname = 'public' and indexname = e.nome
    ) then 'OK' else '*** FALTA ***' end as situacao
  from (values
    ('publicacoes_advogado_cnj_key', 'publicacoes'),
    ('prazos_publicacao_key',        'prazo_calculado'),
    ('compartilhamentos_unico',      'compartilhar_processo'),
    ('processos_numero_key',         'schema_inicial')
  ) as e(nome, veio_de)
)

select * from colunas
union all select * from removidas
union all select * from funcoes
union all select * from policies_esperadas
union all select * from rls
union all select * from indices
order by grupo, item;
