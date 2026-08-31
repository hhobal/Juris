-- ==========================================================
-- O SISTEMA PASSA A LEMBRAR O QUE JÁ VIU
--
-- Até a Etapa 2 a busca era volátil: consultava o CNJ, mostrava
-- na tela, e esquecia tudo no F5. Isso impede as três coisas que
-- o Juris precisa fazer com as publicações:
--
--   1. "O que é NOVO desde a última vez que olhei?" — sem guardar
--      o que já apareceu, toda consulta parece nova.
--   2. Não cadastrar o mesmo processo duas vezes.
--   3. A varredura diária automática (Etapa 5), que precisa saber
--      o que já notificou para não notificar de novo.
--
-- Daí esta tabela. Ela guarda a publicação como o CNJ entregou —
-- é o registro bruto, a matéria-prima de onde saem processos
-- (Etapa 3) e prazos (Etapa 4). Não é para o advogado editar:
-- é para o sistema consultar.
--
-- A deduplicação é por (advogado_id, cnj_id): o `id` da comunicação
-- no DJEN é estável, então reimportar o mesmo período não duplica
-- nada. O `hash` vai junto porque a API o expõe e pode servir para
-- detectar republicação com conteúdo alterado.
--
-- Ver docs/plano-busca-de-processos.md.
-- ==========================================================


-- ----------------------------------------------------------
-- 1. A tabela
-- ----------------------------------------------------------
create table if not exists public.publicacoes (
  id                    uuid primary key default gen_random_uuid(),
  advogado_id           uuid not null references public.advogados(id),

  -- identidade no CNJ
  cnj_id                bigint not null,
  cnj_hash              text,

  -- o processo a que a publicação se refere
  numero_processo       text not null,   -- com máscara, para mostrar
  numero_processo_limpo text not null,   -- só dígitos, para consultar o DataJud

  tribunal              text,
  orgao                 text,
  classe                text,
  tipo                  text,            -- "Intimação", "Citação", "Sentença"…

  -- ATENÇÃO: é a data em que a publicação foi disponibilizada no
  -- diário. NÃO é o vencimento do prazo. O vencimento precisa ser
  -- calculado (dias úteis, feriados, recesso) e é a Etapa 4.
  disponibilizacao      date not null,

  partes                text[] not null default '{}',
  advogados_intimados   text[] not null default '{}',
  link                  text,
  teor                  text,

  -- o advogado confere e decide. Nenhuma API sabe se ele já
  -- cumpriu o que a intimação pedia — só ele sabe.
  situacao              text not null default 'nova',

  -- preenchido quando a publicação vira processo cadastrado
  processo_id           uuid references public.processos(id) on delete set null,

  created_at            timestamptz not null default now(),

  constraint publicacoes_situacao_check
    check (situacao in ('nova', 'conferida', 'ignorada'))
);

comment on table public.publicacoes is
  'Publicações do DJEN/CNJ encontradas pela OAB do advogado. Registro bruto: '
  'o que o CNJ devolveu, sem interpretação. Processos e prazos são derivados '
  'daqui, nunca o contrário.';

comment on column public.publicacoes.disponibilizacao is
  'Data de disponibilização no diário. NÃO é o vencimento do prazo — o '
  'vencimento se calcula a partir dela em dias úteis.';


-- ----------------------------------------------------------
-- 2. Deduplicação e leitura
--
-- O índice único é o que sustenta o upsert do app: reimportar o
-- mesmo período insere só o que faltava, e o que já existia é
-- ignorado sem erro.
-- ----------------------------------------------------------
create unique index if not exists publicacoes_advogado_cnj_key
    on public.publicacoes (advogado_id, cnj_id);

create index if not exists idx_publicacoes_data
    on public.publicacoes (advogado_id, disponibilizacao desc);

create index if not exists idx_publicacoes_situacao
    on public.publicacoes (advogado_id, situacao);


-- ----------------------------------------------------------
-- 3. RLS — mesma regra de sempre: só o dono
-- ----------------------------------------------------------
alter table public.publicacoes enable row level security;

create policy "cria publicacao propria" on public.publicacoes
  for insert with check (advogado_id = public.advogado_atual());
create policy "le publicacao propria" on public.publicacoes
  for select using (advogado_id = public.advogado_atual());
create policy "edita publicacao propria" on public.publicacoes
  for update using (advogado_id = public.advogado_atual())
  with check (advogado_id = public.advogado_atual());
create policy "apaga publicacao propria" on public.publicacoes
  for delete using (advogado_id = public.advogado_atual());


-- ----------------------------------------------------------
-- 4. De onde veio o processo
--
-- Um processo cadastrado à mão e um trazido do CNJ merecem
-- tratamento diferente na tela: o segundo pode ser reescrito por
-- uma sincronização futura, o primeiro nunca.
-- ----------------------------------------------------------
alter table public.processos
  add column if not exists origem text not null default 'manual';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'processos_origem_check'
  ) then
    alter table public.processos
      add constraint processos_origem_check check (origem in ('manual', 'djen'));
  end if;
end $$;

comment on column public.processos.origem is
  'manual = cadastrado pelo advogado; djen = importado de uma publicação do CNJ.';


-- ----------------------------------------------------------
-- 5. Realtime
--
-- A varredura da Etapa 5 vai inserir publicações sem ninguém
-- olhando. Com a tabela publicada, a tela se atualiza sozinha
-- quando isso acontecer.
-- ----------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'publicacoes'
  ) then
    alter publication supabase_realtime add table public.publicacoes;
  end if;
end $$;

alter table public.publicacoes replica identity full;
