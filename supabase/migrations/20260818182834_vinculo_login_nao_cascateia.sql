-- ==========================================================
-- APAGAR UM LOGIN NÃO PODE APAGAR O ADVOGADO
--
-- A coluna auth_user_id vinha com ON DELETE CASCADE. Isso é ação
-- de banco: passa por cima da RLS e da nossa regra de que
-- advogado sai desativado, nunca apagado (por isso a tabela nem
-- tem policy de delete).
--
-- Os dois comportamentos que isso produzia, ambos errados:
--
--   advogado SEM registros  -> apagar o login no painel apagava
--                              o cadastro junto, em silêncio
--   advogado COM processos  -> apagar o login falhava com um erro
--                              sobre "processos_advogado_id_fkey",
--                              tabela que o admin nem tocou
--
-- Com SET NULL, apagar o login apenas desfaz o vínculo. O cadastro
-- continua, a tela de Equipe passa a mostrá-lo como "Sem login", e
-- criar um login novo com o mesmo e-mail religa tudo pelo trigger.
-- É também o caminho para quem perdeu o acesso: apaga o login,
-- cria outro, o histórico de autoria fica intacto.
-- ==========================================================

alter table advogados
  drop constraint if exists advogados_auth_user_id_fkey;

alter table advogados
  add constraint advogados_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users(id) on delete set null;

comment on column advogados.auth_user_id is
  'Login no Supabase Auth. Nulo = cadastrado mas ainda sem acesso. Apagar o login apenas desfaz o vínculo; o cadastro permanece.';
