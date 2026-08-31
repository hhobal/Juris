-- ==========================================================
-- COMPARTILHAR UM PROCESSO COM UM COLEGA
--
-- O Juris é individual: cada advogado só vê o que é dele. Isso
-- continua valendo. O que muda é que agora existe uma exceção
-- explícita, criada por quem é dono: "este processo aqui, quero
-- que fulano veja".
--
-- POR QUE ISSO PRECISOU EXISTIR
--
-- São três advogados na mesma empresa e cada um cuida dos seus
-- processos. Quando dois atuam no mesmo caso, os dois precisam
-- enxergar o processo inteiro — prazos e tarefas junto, não só o
-- que cada um lançou.
--
-- E havia um problema concreto esperando para acontecer:
-- processos.numero é UNIQUE global. Sem compartilhamento, se a
-- advogada A cadastrasse um processo, o advogado B não conseguiria
-- cadastrá-lo (número duplicado) nem enxergá-lo (RLS). Para o B, o
-- processo não existiria e ainda assim seria impossível criar.
--
-- POR QUE POR E-MAIL, E NÃO POR ID DE ADVOGADO
--
-- Porque o colega pode ainda não ter conta. Compartilhar por
-- e-mail não exige criar ninguém no banco antes: grava-se o
-- e-mail, e se um dia essa pessoa se cadastrar pelo próprio app,
-- os processos aparecem para ela sozinhos. Se nunca se cadastrar,
-- a linha fica lá sem efeito nenhum.
--
-- SOMENTE LEITURA, DE PROPÓSITO
--
-- O convidado vê; quem edita, apaga e cria prazo é o dono. É o
-- menor passo que resolve o problema descrito. Escrita compartilhada
-- levanta perguntas que ninguém fez ainda (quem ganha se os dois
-- editarem? o convidado pode apagar?) e dá para acrescentar depois
-- sem desfazer nada disto.
--
-- ORDEM DAS COISAS: a tabela vem antes das funções. O Postgres
-- valida o corpo de uma função SQL na hora de criar, então uma
-- função que consulta `compartilhamentos` não pode nascer antes da
-- tabela existir. (A primeira versão deste arquivo errava nisso.)
-- ==========================================================


-- ----------------------------------------------------------
-- 1. A tabela
-- ----------------------------------------------------------
create table if not exists public.compartilhamentos (
  id              uuid primary key default gen_random_uuid(),
  processo_id     uuid not null references public.processos(id) on delete cascade,
  dono_id         uuid not null references public.advogados(id),
  email_convidado text not null,
  created_at      timestamptz not null default now(),

  -- guardado sempre em minúsculas, porque é assim que meu_email() compara
  constraint compartilhamentos_email_check
    check (email_convidado = lower(email_convidado) and position('@' in email_convidado) > 1)
);

comment on table public.compartilhamentos is
  'Exceção explícita à regra "cada advogado só vê o que é dele": o dono de '
  'um processo libera a leitura dele para o e-mail de um colega.';

create unique index if not exists compartilhamentos_unico
    on public.compartilhamentos (processo_id, email_convidado);

create index if not exists idx_compartilhamentos_convidado
    on public.compartilhamentos (email_convidado);


-- ----------------------------------------------------------
-- 2. Helpers
--
-- Todos SECURITY DEFINER. Isso não é detalhe: uma policy de
-- `processos` que consultasse `compartilhamentos` diretamente
-- dispararia a RLS de compartilhamentos, que por sua vez olha
-- processos — recursão. Com SECURITY DEFINER a função roda por
-- fora da RLS e a cadeia se fecha.
-- ----------------------------------------------------------

create or replace function public.meu_email() returns text
    language sql stable security definer
    set search_path to 'public'
    as $$
  select lower(email) from public.advogados
   where auth_user_id = auth.uid() and ativo;
$$;

comment on function public.meu_email() is
  'E-mail de quem está logado, em minúsculas. É a chave do compartilhamento: '
  'compartilha-se com um e-mail, não com uma conta que talvez nem exista.';


create or replace function public.sou_dono_do_processo(p_processo uuid) returns boolean
    language sql stable security definer
    set search_path to 'public'
    as $$
  select exists (
    select 1 from public.processos p
     where p.id = p_processo
       and p.advogado_id = public.advogado_atual()
  );
$$;

comment on function public.sou_dono_do_processo(uuid) is
  'Impede que quem apenas recebeu um processo compartilhado repasse ele '
  'adiante. Só o dono compartilha.';


create or replace function public.processo_compartilhado(p_processo uuid) returns boolean
    language sql stable security definer
    set search_path to 'public'
    as $$
  select exists (
    select 1 from public.compartilhamentos c
     where c.processo_id = p_processo
       and c.email_convidado = public.meu_email()
  );
$$;


create or replace function public.numero_compartilhado(p_numero text) returns boolean
    language sql stable security definer
    set search_path to 'public'
    as $$
  select exists (
    select 1
      from public.compartilhamentos c
      join public.processos p on p.id = c.processo_id
     where c.email_convidado = public.meu_email()
       and p.numero = p_numero
  );
$$;

comment on function public.numero_compartilhado(text) is
  'Prazos e tarefas se ligam ao processo pelo NÚMERO, em texto, não por '
  'chave estrangeira. Por isso a checagem deles passa por aqui, e não por '
  'processo_compartilhado(uuid).';


-- ----------------------------------------------------------
-- 3. RLS da própria tabela
--
-- Nenhuma destas policies consulta `processos` diretamente — vão
-- pelos helpers acima, para não recursionar.
--
-- Os "drop if exists" existem para o arquivo poder ser rodado de
-- novo se uma execução anterior parar no meio: "create policy" não
-- tem forma idempotente.
-- ----------------------------------------------------------
alter table public.compartilhamentos enable row level security;

drop policy if exists "dono compartilha" on public.compartilhamentos;
create policy "dono compartilha" on public.compartilhamentos
  for insert with check (
    dono_id = public.advogado_atual()
    and public.sou_dono_do_processo(processo_id)
  );

drop policy if exists "dono ve o que compartilhou" on public.compartilhamentos;
create policy "dono ve o que compartilhou" on public.compartilhamentos
  for select using (dono_id = public.advogado_atual());

drop policy if exists "convidado ve o que recebeu" on public.compartilhamentos;
create policy "convidado ve o que recebeu" on public.compartilhamentos
  for select using (email_convidado = public.meu_email());

drop policy if exists "dono descompartilha" on public.compartilhamentos;
create policy "dono descompartilha" on public.compartilhamentos
  for delete using (dono_id = public.advogado_atual());


-- ----------------------------------------------------------
-- 4. O efeito: ler o que foi compartilhado
--
-- Policies permissivas se somam com OR às que já existem. As
-- regras de escrita não são tocadas: continuam "só o dono".
-- ----------------------------------------------------------
drop policy if exists "le processo compartilhado comigo" on public.processos;
create policy "le processo compartilhado comigo" on public.processos
  for select using (public.processo_compartilhado(id));

drop policy if exists "le prazo de processo compartilhado" on public.prazos;
create policy "le prazo de processo compartilhado" on public.prazos
  for select using (public.numero_compartilhado(numero_processo));

drop policy if exists "le tarefa de processo compartilhado" on public.tarefas;
create policy "le tarefa de processo compartilhado" on public.tarefas
  for select using (
    processo_numero is not null and public.numero_compartilhado(processo_numero)
  );
