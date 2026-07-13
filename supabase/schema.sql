-- ==========================================================
-- JURIS — SCHEMA SUPABASE
-- Rode isso no SQL Editor do seu projeto Supabase
-- (Project -> SQL Editor -> New query -> colar -> Run)
-- ==========================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------
-- EMPRESA (uma linha só, é o escritório/departamento jurídico)
-- ----------------------------------------------------------
create table empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  cnpj text not null,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- ADVOGADOS
-- auth_user_id liga esta linha ao usuário criado no Supabase Auth
-- (o login por e-mail/senha do app é o Supabase Auth; esta tabela
-- guarda só os dados "de perfil" de cada advogado)
-- ----------------------------------------------------------
create table advogados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  nome text not null,
  email text unique not null,
  oab text,
  cargo text,
  cor text default '#C9A24B',
  iniciais text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- PROCESSOS
-- ----------------------------------------------------------
create table processos (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  parte text not null,
  tipo text,
  tribunal text,
  vara text,
  advogado_id uuid references advogados(id),
  status text default 'Em andamento',
  fase text,
  valor_causa numeric,
  distribuicao date,
  ultima_mov text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- TAREFAS (quadro kanban)
-- ----------------------------------------------------------
create table tarefas (
  id uuid primary key default gen_random_uuid(),
  processo_numero text references processos(numero) on delete set null,
  titulo text not null,
  advogado_id uuid references advogados(id),
  coluna text default 'fazer',
  prioridade text default 'media',
  prazo timestamptz,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- PRAZOS
-- numero_processo/parte_autora/estado ficam como texto livre de
-- propósito (nem sempre o processo já está cadastrado na tabela
-- "processos" quando a citação chega).
-- ----------------------------------------------------------
create table prazos (
  id uuid primary key default gen_random_uuid(),
  numero_processo text not null,
  parte_autora text not null,
  estado text not null,
  descricao text not null,
  tipo text default 'Prazo processual',
  advogado_id uuid references advogados(id),
  vencimento timestamptz not null,
  created_at timestamptz default now()
);

-- ==========================================================
-- ROW LEVEL SECURITY
-- Regra simples de ferramenta interna: qualquer advogado
-- autenticado (logado) pode ler e escrever em tudo.
-- Se um dia precisar restringir por advogado ("cada um só
-- edita o que é seu"), é só trocar a condição da policy.
-- ==========================================================

alter table empresas   enable row level security;
alter table advogados  enable row level security;
alter table processos  enable row level security;
alter table tarefas    enable row level security;
alter table prazos     enable row level security;

create policy "authenticated read empresas"   on empresas   for select using (auth.role() = 'authenticated');
create policy "authenticated read advogados"  on advogados  for select using (auth.role() = 'authenticated');

create policy "authenticated all processos" on processos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated all tarefas" on tarefas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated all prazos" on prazos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ==========================================================
-- DADOS DE EXEMPLO (opcional — mesmos dados do data.js)
-- Rode só se quiser começar com o mesmo cenário de demonstração.
-- Os 3 advogados abaixo ainda precisam ser criados no Supabase
-- Auth (Authentication -> Users -> Add user) com o MESMO e-mail
-- para conseguirem logar — ver passo 4 do guia.
-- ==========================================================

insert into empresas (id, razao_social, cnpj) values
  ('11111111-1111-1111-1111-111111111111', 'Grupo Exemplo Indústria e Comércio Ltda.', '12.345.678/0001-90');

insert into advogados (id, empresa_id, nome, email, oab, cargo, cor, iniciais) values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Dra. Camila Rezende', 'camila.rezende@empresaexemplo.com.br', 'PR 45.211', 'Advogada Trabalhista', '#C9A24B', 'CR'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Dr. Felipe Andrade',  'felipe.andrade@empresaexemplo.com.br', 'PR 38.902', 'Advogado Cível',        '#8B93A6', 'FA'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Dra. Luiza Martins',  'luiza.martins@empresaexemplo.com.br', 'SP 210.774', 'Advogada Tributária', '#4CB8A4', 'LM');
