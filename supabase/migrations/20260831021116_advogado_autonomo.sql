-- ==========================================================
-- CADA ADVOGADO É O DONO DO PRÓPRIO JURIS
--
-- O Juris deixou de ser um sistema de escritório com equipe
-- compartilhada e virou uma ferramenta pessoal: quem usa é o
-- próprio advogado, sozinho, sem colegas para ver ou dividir
-- trabalho. Isso derruba três coisas que só faziam sentido no
-- desenho antigo:
--
--   1. papel (admin/advogado/consulta) — não existe mais "quem
--      manda", porque não existe mais "equipe" para mandar.
--   2. empresas — não existe mais "o escritório" como entidade
--      compartilhada. O que sobra é só o advogado e os dados dele.
--   3. o convite em dois passos (admin cadastra, depois cria o
--      login) — sem admin, ninguém convida ninguém. A entrada
--      agora é cadastro público: a pessoa cria a própria conta
--      pelo app, e o trigger cria o perfil dela na hora.
--
-- Todo "ver o trabalho do colega" e "admin edita qualquer coisa"
-- desaparece das policies: sobra só "advogado_id = você mesmo",
-- em leitura e em escrita. Não tem mais "editar e apagar o que é
-- seu" versus "editar e apagar o que é de outro" — tudo que existe
-- na sua tela é seu, ponto.
-- ==========================================================


-- ----------------------------------------------------------
-- 1. Derruba as policies que dependem de papel/admin/empresa
-- ----------------------------------------------------------

drop policy if exists "admin cadastra advogado" on public.advogados;
drop policy if exists "admin ou dono edita advogado" on public.advogados;
drop policy if exists "equipe visivel" on public.advogados;

drop policy if exists "todos leem processos" on public.processos;
drop policy if exists "cria processo" on public.processos;
drop policy if exists "edita processo proprio" on public.processos;
drop policy if exists "apaga processo proprio" on public.processos;

drop policy if exists "todos leem prazos" on public.prazos;
drop policy if exists "cria prazo" on public.prazos;
drop policy if exists "edita prazo proprio" on public.prazos;
drop policy if exists "apaga prazo proprio" on public.prazos;

drop policy if exists "todos leem tarefas" on public.tarefas;
drop policy if exists "cria tarefa" on public.tarefas;
drop policy if exists "edita tarefa propria" on public.tarefas;
drop policy if exists "apaga tarefa propria" on public.tarefas;

-- Estas duas precisam sair aqui, antes de derrubar e_admin() no passo 2 —
-- a tabela em si só é derrubada no passo 3, mas a policy já depende da
-- função desde já.
drop policy if exists "admin edita empresa" on public.empresas;
drop policy if exists "empresa visivel" on public.empresas;


-- ----------------------------------------------------------
-- 2. Derruba o que só existia para sustentar papel/admin
-- ----------------------------------------------------------

drop trigger if exists advogados_protege_papel on public.advogados;
drop function if exists public.protege_papel();
drop function if exists public.e_admin();
drop function if exists public.pode_escrever();
drop function if exists public.papel_atual();


-- ----------------------------------------------------------
-- 3. Empresa deixa de existir
-- ----------------------------------------------------------

alter table public.advogados drop column if exists empresa_id;
drop table if exists public.empresas;


-- ----------------------------------------------------------
-- 4. Papel deixa de existir
-- ----------------------------------------------------------

drop index if exists idx_advogados_papel;
alter table public.advogados drop column if exists papel;


-- ----------------------------------------------------------
-- 5. Cadastro público: o trigger passa a CRIAR o perfil, não
--    mais ligar um login a um perfil que um admin já tinha feito
-- ----------------------------------------------------------

create or replace function public.handle_new_user() returns trigger
    language plpgsql security definer
    set search_path to 'public'
    as $$
begin
  insert into public.advogados (auth_user_id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    lower(new.email)
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Roda depois de um signup no Auth: cria o perfil em advogados na hora, '
  'com o nome que a pessoa informou no cadastro (raw_user_meta_data.nome) '
  'ou, na falta dele, a parte antes do @ do e-mail. Sem admin para pré-'
  'cadastrar ninguém, é este trigger que garante que todo login tem perfil.';


-- ----------------------------------------------------------
-- 6. Policies novas: só o dono, sempre
-- ----------------------------------------------------------

-- advogados: sem policy de insert (o trigger cria, via security
-- definer, que não passa pela RLS) nem de delete (mesma regra de
-- sempre — sai desativado, nunca apagado).
create policy "dono edita o proprio cadastro" on public.advogados
  for update using (id = public.advogado_atual())
  with check (id = public.advogado_atual());

create policy "cria processo proprio" on public.processos
  for insert with check (advogado_id = public.advogado_atual());
create policy "le processo proprio" on public.processos
  for select using (advogado_id = public.advogado_atual());
create policy "edita processo proprio" on public.processos
  for update using (advogado_id = public.advogado_atual())
  with check (advogado_id = public.advogado_atual());
create policy "apaga processo proprio" on public.processos
  for delete using (advogado_id = public.advogado_atual());

create policy "cria prazo proprio" on public.prazos
  for insert with check (advogado_id = public.advogado_atual());
create policy "le prazo proprio" on public.prazos
  for select using (advogado_id = public.advogado_atual());
create policy "edita prazo proprio" on public.prazos
  for update using (advogado_id = public.advogado_atual())
  with check (advogado_id = public.advogado_atual());
create policy "apaga prazo proprio" on public.prazos
  for delete using (advogado_id = public.advogado_atual());

create policy "cria tarefa propria" on public.tarefas
  for insert with check (advogado_id = public.advogado_atual());
create policy "le tarefa propria" on public.tarefas
  for select using (advogado_id = public.advogado_atual());
create policy "edita tarefa propria" on public.tarefas
  for update using (advogado_id = public.advogado_atual())
  with check (advogado_id = public.advogado_atual());
create policy "apaga tarefa propria" on public.tarefas
  for delete using (advogado_id = public.advogado_atual());
