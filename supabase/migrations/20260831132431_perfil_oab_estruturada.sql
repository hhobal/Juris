-- ==========================================================
-- A OAB VIRA DADO, NÃO TEXTO LIVRE
--
-- Até aqui a OAB era um único campo de texto — "PR 45.211",
-- "45211/PR", "OAB/PR 45.211", cada um escrevia de um jeito. Isso
-- servia enquanto a OAB era só enfeite na barra lateral.
--
-- Deixou de servir. A busca de processos (ver docs/plano-busca-de-
-- processos.md) consulta a API Comunica/DJEN do CNJ, que exige os
-- dois pedaços separados e limpos:
--
--   GET comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=45211&ufOab=PR
--
-- Não dá para adivinhar isso de um texto livre de forma confiável.
-- Então a coluna `oab` se parte em `oab_numero` (só dígitos) e
-- `oab_uf` (duas letras), com o banco recusando qualquer outra
-- coisa. Sem isso, a Etapa 2 do plano não sai do lugar.
--
-- Entra junto `tribunais_monitorados`: filtro OPCIONAL de siglas
-- para a busca. Vazio (o padrão) significa "todos os tribunais" —
-- foi assim que a API respondeu no teste de 31/08/2026, sem filtro
-- de tribunal nenhum. Serve para quando a varredura for automática
-- e valer a pena estreitar o escopo.
-- ==========================================================


-- ----------------------------------------------------------
-- 1. Colunas novas
-- ----------------------------------------------------------
alter table public.advogados
  add column if not exists oab_numero text,
  add column if not exists oab_uf text,
  add column if not exists tribunais_monitorados text[] not null default '{}';


-- ----------------------------------------------------------
-- 2. Migra o que já estava cadastrado
--
-- Melhor esforço: pega a primeira sigla de UF válida que aparecer
-- no texto e todos os dígitos como número. Cobre "PR 45.211",
-- "45211/PR" e "OAB/PR 45.211". Se alguém tiver escrito algo que
-- não encaixa, os campos ficam nulos e a pessoa recadastra na tela
-- de perfil — não vale inventar dado de OAB.
-- ----------------------------------------------------------
update public.advogados
   set oab_uf = (regexp_match(
         upper(oab),
         '(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)'
       ))[1],
       oab_numero = nullif(regexp_replace(oab, '\D', '', 'g'), '')
 where oab is not null
   and btrim(oab) <> '';


-- ----------------------------------------------------------
-- 3. O banco passa a recusar formato errado
--
-- Nulo continua valendo: advogado recém-cadastrado ainda não
-- preencheu a OAB, e isso não pode impedir o login.
-- ----------------------------------------------------------
alter table public.advogados
  add constraint advogados_oab_numero_check
  check (oab_numero is null or oab_numero ~ '^[0-9]{1,10}$');

alter table public.advogados
  add constraint advogados_oab_uf_check
  check (oab_uf is null or oab_uf ~ '^[A-Z]{2}$');


-- ----------------------------------------------------------
-- 4. A coluna antiga sai
--
-- Duas fontes para o mesmo dado é como um dos dois fica errado.
-- ----------------------------------------------------------
alter table public.advogados drop column if exists oab;


-- ----------------------------------------------------------
-- 5. Índice para a varredura automática (Etapa 5 do plano)
--
-- Quando a Edge Function rodar de madrugada, ela vai varrer
-- "todo advogado ativo que tem OAB preenchida". Parcial, porque
-- quem não tem OAB nunca entra nessa consulta.
-- ----------------------------------------------------------
create index if not exists idx_advogados_oab
    on public.advogados (oab_uf, oab_numero)
 where oab_numero is not null and oab_uf is not null;


comment on column public.advogados.oab_numero is
  'Número de inscrição na OAB, só dígitos, sem pontos. Vai direto no '
  'parâmetro numeroOab da API Comunica/DJEN.';

comment on column public.advogados.oab_uf is
  'Seccional da OAB, duas letras maiúsculas. Vai direto no parâmetro '
  'ufOab da API Comunica/DJEN. Não confundir com o estado onde o '
  'processo corre — é a seccional em que o advogado é inscrito.';

comment on column public.advogados.tribunais_monitorados is
  'Filtro opcional de siglas de tribunal (TJPR, TRT9, TRF4...) para a '
  'busca automática. Vazio = monitora todos, que é o comportamento '
  'padrão da API do CNJ quando não se manda siglaTribunal.';
