-- ==========================================================
-- DADOS DE TESTE
--
-- Rodam automaticamente no "supabase db reset" (ambiente local).
-- NÃO fazem parte das migrations de propósito: schema é uma
-- coisa, dado de exemplo é outra. Nada aqui vai para produção.
--
-- Os três advogados abaixo ficam sem auth_user_id. Assim que
-- você criar o usuário correspondente em Authentication -> Users
-- com o mesmo e-mail, o trigger handle_new_user() liga os dois
-- sozinho.
-- ==========================================================

-- A migration de schema é um dump do pg_dump, que termina com search_path
-- vazio (ele qualifica tudo com "public."). O seed roda logo em seguida, na
-- mesma conexão, e herdaria isso — daí "relation empresas does not exist".
-- Declarar o próprio search_path deixa este arquivo independente disso.
set search_path = public;

insert into empresas (id, razao_social, cnpj) values
  ('11111111-1111-1111-1111-111111111111', 'Grupo Exemplo Indústria e Comércio Ltda.', '12.345.678/0001-90')
on conflict (id) do nothing;

-- A Camila entra como admin para o ambiente local já ter alguém capaz de
-- cadastrar os demais. No projeto de verdade, veja "primeiro admin" no README.
insert into advogados (id, empresa_id, nome, email, oab, cargo, cor, iniciais, papel) values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Dra. Camila Rezende', 'camila.rezende@empresaexemplo.com.br', 'PR 45.211',  'Advogada Trabalhista', '#C9A24B', 'CR', 'admin'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Dr. Felipe Andrade',  'felipe.andrade@empresaexemplo.com.br', 'PR 38.902',  'Advogado Cível',       '#8B93A6', 'FA', 'advogado'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Dra. Luiza Martins',  'luiza.martins@empresaexemplo.com.br',  'SP 210.774', 'Advogada Tributária',  '#4CB8A4', 'LM', 'consulta')
on conflict (id) do nothing;
