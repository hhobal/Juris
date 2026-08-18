-- ==========================================================
-- REALTIME
--
-- Assinar mudanças no cliente não basta: o Postgres só publica
-- eventos das tabelas que estiverem na publicação
-- "supabase_realtime". Ela nasce vazia, e sem isto a inscrição
-- do app conecta, não dá erro nenhum, e simplesmente nunca
-- recebe nada — falha silenciosa, do tipo que passa batido.
--
-- Com as tabelas publicadas, dois advogados trabalhando ao mesmo
-- tempo veem o movimento um do outro sem apertar F5. Era o
-- buraco do app antigo no quadro de tarefas, justamente a tela
-- mais compartilhada do sistema.
--
-- A RLS continua valendo: cada assinante só recebe evento de
-- linha que ele já poderia ler.
-- ==========================================================

do $$
declare
  t text;
begin
  foreach t in array array['advogados', 'processos', 'tarefas', 'prazos'] loop
    -- "add table" dá erro se a tabela já estiver publicada, então confere antes
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Sem isto, o evento de UPDATE só carrega a chave primária da linha antiga.
-- Como o app usa o evento apenas para recarregar a lista, o padrão bastaria —
-- mas com "full" o cliente consegue, no futuro, reagir ao que mudou de fato
-- (por exemplo: destacar o card que outra pessoa acabou de mover).
alter table advogados replica identity full;
alter table processos replica identity full;
alter table tarefas   replica identity full;
alter table prazos    replica identity full;
