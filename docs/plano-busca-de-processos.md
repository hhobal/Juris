# Busca de processos — o caminho decidido

> **Status:** decidido, não implementado.
> **Endpoints verificados em 31/08/2026** com chamadas reais (ver "Provas" no fim).
>
> Este arquivo existe para encerrar a discussão. A cada nova conversa
> aparecia uma proposta diferente para a busca, sempre baseada em suposição.
> As duas APIs abaixo foram **testadas de verdade** e responderam 200. É
> este o caminho. Se alguém propuser outro, tem que derrubar as provas
> daqui primeiro.

---

## A pergunta certa

Não é "como buscar processos de graça". São **duas** perguntas diferentes,
com respostas diferentes:

| Pergunta | Resposta |
|---|---|
| **Descobrir** quais processos são meus | API Comunica / DJEN, filtrando por OAB |
| **Enriquecer** um processo que eu já conheço pelo número | API Pública do DataJud |

Nenhuma das duas resolve a outra. Juntas resolvem o problema inteiro.

---

## 1. Descoberta — API Comunica / DJEN (CNJ)

O Diário de Justiça Eletrônico Nacional centraliza as intimações e publicações
de todos os tribunais. É pública, gratuita, sem login, sem certificado, sem
cadastro — e **aceita filtro por número de OAB**, que é dado público.

```
GET https://comunicaapi.pje.jus.br/api/v1/comunicacao
      ?numeroOab=45211
      &ufOab=PR
      &dataDisponibilizacaoInicio=2026-01-01
      &dataDisponibilizacaoFim=2026-08-31
      &itensPorPagina=100
      &pagina=1
```

Sem header nenhum. Resposta: `{ status, message, count, items: [...] }`.

Cada item traz, já mastigado, quase tudo que as tabelas `processos` e `prazos`
precisam:

| Campo do DJEN | Vai para |
|---|---|
| `numero_processo` / `numeroprocessocommascara` | `processos.numero`, `prazos.numero_processo` |
| `destinatarios[].nome` | `processos.parte`, `prazos.parte_autora` |
| `siglaTribunal` | `processos.tribunal` |
| `nomeOrgao` | `processos.vara` |
| `nomeClasse` | `processos.tipo` |
| `texto` (HTML da intimação) | `prazos.descricao` (resumido) e `processos.ultima_mov` |
| `data_disponibilizacao` | base do cálculo de `prazos.vencimento` |
| `tipoComunicacao`, `tipoDocumento` | classificar em Prazo processual / Audiência / Recurso |
| `link` | link direto para o documento no sistema do tribunal |
| `destinatarioadvogados[].advogado.numero_oab` | confirmar que a intimação é mesmo do advogado |
| `hash`, `id` | chave de deduplicação — **guardar, para não cadastrar duas vezes** |

**Cobre:** todo processo em que o advogado foi intimado.
**Não cobre:** processo novo que ainda não teve nenhuma publicação, e processo
em que o advogado não está cadastrado como representante.

---

## 2. Enriquecimento — API Pública do DataJud (CNJ)

Dá a ficha completa do processo a partir do número: classe, assunto, órgão
julgador, data de ajuizamento, sistema, e **todo o histórico de movimentos**.

```
POST https://api-publica.datajud.cnj.jus.br/api_publica_tjpr/_search
Authorization: APIKey <chave pública do CNJ>
Content-Type: application/json

{ "query": { "match": { "numeroProcesso": "00310475620058160014" } } }
```

O alias muda por tribunal: `api_publica_tjpr`, `api_publica_trt9`,
`api_publica_tjsp` etc. É Elasticsearch por baixo, então a query é no formato
do Elastic. **O número vai sem máscara**, só dígitos.

A chave é pública (o CNJ publica na documentação), mas guarde num secret da
Edge Function mesmo assim — se o CNJ rotacionar, você troca num lugar só.

**O que o DataJud NÃO tem:** nome das partes e advogados. Por isso ele não
serve para descoberta — só para enriquecer o que o DJEN já achou.

---

## Por que não os outros caminhos

| Caminho | Por que não |
|---|---|
| Buscar por CNPJ/CPF da parte | Testado em 31/08/2026: o DJEN **não tem** esse filtro. Ver a seção abaixo — e a armadilha que ela descreve. |
| Buscar por **nome** da parte | Funciona (`nomeParte`), com ressalvas importantes. Seção abaixo. |
| Raspar PJe / Projudi / eproc | Exige login ou certificado digital do advogado. Além de instável e de legalidade duvidosa. |
| DataJud como busca principal | Não expõe partes nem advogados. Serve para enriquecer, não para descobrir. |
| Robô pago | Resolve, mas custa. Fica como upgrade futuro, não como base. |

---

## Cobertura: quais tribunais alimentam o DJEN

Medido em 31/08/2026, consultando cada sigla no período de 24 a 28/08/2026.
Controle: siglas inexistentes (`TJXX`, `ZZZZ`) não retornam 200 — a API valida
o parâmetro, então um resultado positivo aqui significa cobertura real.

| Ramo | Cobertura medida |
|---|---|
| Justiça Estadual | **27 de 27** — os 26 estados e o DF |
| Justiça do Trabalho | **24 de 24** regiões (TRT1 a TRT24) |
| Justiça Federal | **6 de 6** (TRF1 a TRF6) |
| Justiça Militar estadual | 3 de 3 (MG, RS, SP) |
| Tribunais superiores | STJ, TST e STM sim; TSE sem publicação no período; **STF não é sigla aceita** |

Ou seja: para primeiro e segundo grau, a cobertura é o país inteiro. O STF
mantém diário próprio e fica de fora — o que na prática quase não importa,
porque o volume de um advogado ali é raríssimo.

Como a consulta por OAB não manda `siglaTribunal`, ela varre tudo de uma vez.
O campo "Tribunais monitorados" do perfil só serve para estreitar de propósito.

---

## Buscar pela empresa: por CNPJ não dá, por nome dá

Testado em 31/08/2026, com controle. **Leia antes de tentar de novo.**

**Por CNPJ: não existe.** Testei `numeroDocumentoParte` e `cpfCnpjParte`. Os
dois "funcionaram" — HTTP 200, resposta cheia de resultados.

E é justamente aí que está a armadilha: **a API ignora parâmetro que não
conhece, em silêncio**. O controle prova. Numa consulta que devolve 10000 sem
filtro nenhum:

| Consulta | count |
|---|---|
| sem filtro (controle) | 10000 |
| `parametroQueNaoExiste=xyz123` | 10000 |
| `numeroDocumentoParte=<CNPJ>` | 10000 |
| `cpfCnpjParte=<CNPJ>` | 10000 |
| `nomeParte=BANCO BRADESCO S/A` | 10000 |
| `nomeParte=ZZQXWKJ INEXISTENTE 123456` | **0** |

Um filtro que existe faz o resultado cair a zero quando não casa. Os de CNPJ
não fizeram — logo, não existem, e a API estava devolvendo *o diário inteiro do
Brasil* como se fosse resposta à consulta. Se isso tivesse ido para produção, a
tela mostraria milhares de publicações de desconhecidos com cara de "processos
da empresa".

**Por nome: funciona, com três ressalvas.**

1. **Homônimo.** Nome não é identificador. "Silva Comércio Ltda" existe em
   vários estados, e o DJEN não sabe qual é a sua.
2. **Grafia.** A publicação traz o nome como o cartório digitou. "S/A", "S.A.",
   "SA", com e sem acento — cada variação é uma busca diferente.
3. **Só quem foi intimado.** O DJEN só publica quem é destinatário da
   comunicação. Processo em que a empresa é parte mas não foi intimada naquele
   ato não aparece.

**Conclusão prática:** buscar pela OAB continua sendo o caminho principal, e é
confiável — a OAB identifica uma pessoa só. A busca por nome da parte serve
como complemento, para achar processo em que a empresa aparece sem o advogado
cadastrado. Se for implementada, o resultado tem que chegar na tela como
**candidato a conferir**, nunca como processo da empresa: o risco de homônimo é
real, e o dado é público mas é de terceiro.

---

## Como isso vira prazo automático

Esta é a parte delicada, e é onde o sistema **não pode mentir para o advogado**.

O DJEN entrega a **data de disponibilização** da publicação. Isso não é o
vencimento do prazo. Entre uma coisa e outra existe:

1. A data da publicação é o primeiro dia útil seguinte à disponibilização.
2. A contagem começa no primeiro dia útil seguinte à publicação.
3. Prazo processual conta em **dias úteis** (CPC art. 219), não corridos.
4. Feriados nacionais, estaduais e municipais suspendem.
5. Recesso de 20/12 a 20/01 suspende (CPC art. 220).
6. O tamanho do prazo (15 dias? 5? 30?) depende do ato, e o texto da intimação
   nem sempre diz explicitamente.

**A regra de ouro:** o sistema calcula uma data **sugerida** e cadastra o prazo
com um estado de "a conferir". O advogado confirma antes de o prazo virar
definitivo. Nunca cadastre um prazo calculado como se fosse certo — errar aqui
é perder o prazo do cliente, e a responsabilidade é do advogado, não do software.

Isso pede uma coluna nova em `prazos`, algo como
`origem text default 'manual'` (`'manual'` ou `'djen'`) e
`confirmado boolean default true`, com a tela destacando os não confirmados.

---

## Ordem de implementação sugerida

Cada etapa entrega valor sozinha. Dá para parar em qualquer uma.

**Etapa 1 — Perfil completo. ✅ FEITO (31/08/2026)**
Migration `20260831132431_perfil_oab_estruturada.sql`: `oab` de texto livre
virou `oab_numero` + `oab_uf`, com check constraint, mais
`tribunais_monitorados`. Formulário de perfil atualizado.
A busca depende de dados que hoje não são coletados. Antes de qualquer API,
`advogados` precisa de: `oab_numero` e `oab_uf` **separados** (hoje é um campo
`oab` de texto livre, que não dá para mandar para a API), e `tribunais_monitorados`
(array das siglas que interessam). Sem isso nada roda.

**Etapa 2 — Consulta manual. ✅ FEITO (31/08/2026)**
`lib/djen.ts` (cliente da API) e `features/busca/BuscaPage.tsx` (tela).
Consulta por período, mostra os resultados, não grava nada.
Um botão na tela de Busca: "Procurar publicações agora". Chama o DJEN com a OAB
do perfil, mostra os resultados numa lista, **sem salvar nada**. Serve para você
ver se os dados chegam certos antes de deixar o sistema escrever no banco.

**Etapa 3 — Salvar processos. ✅ FEITO (31/08/2026)**
Migration `20260831153522_publicacoes.sql` (tabela `publicacoes` + `processos.origem`),
`lib/datajud.ts`, `lib/queries/publicacoes.ts` e a tela reescrita. A publicação
agora é guardada, deduplicada por `(advogado_id, cnj_id)`, e vira processo com
um clique.
Botão "Importar" em cada resultado, que cria o processo se ele ainda não existir
(deduplicando por `numero`). Aqui entra o DataJud para preencher o resto da ficha.

**Etapa 4 — Prazo sugerido. ✅ FEITO (31/08/2026)**
`lib/prazoLegal.ts` (contagem em dias úteis, feriados nacionais e forenses com
Páscoa calculada, recesso do art. 220), `lib/cnj.ts` (UF deduzida do número) e
migration `20260831161430_prazo_calculado.sql` (`origem`, `confirmado`,
`dias_uteis`, `publicacao_id`). Todo prazo calculado nasce `confirmado = false`
e a tela de Prazos o marca "A conferir" até o advogado bater o martelo.
Ao importar uma publicação, criar também o prazo com data calculada e marcado
como "a conferir".

**Etapa 5 — Varredura automática.**
Edge Function do Supabase agendada por `pg_cron`, rodando de manhã, varrendo o
DJEN do dia anterior para cada advogado ativo e importando sozinha. Só depois de
as etapas 2 a 4 estarem confiáveis.

**Onde roda:** direto do navegador, nas etapas 2 a 4.

> **Correção (31/08/2026).** A primeira versão deste plano dizia que seria
> preciso uma Edge Function porque o DJEN não mandaria header CORS. Isso era
> suposição, e estava errado: a API responde com
> `Access-Control-Allow-Origin: *`, então o `fetch` do front-end funciona sem
> intermediário nenhum. A Edge Function volta a ser necessária só na Etapa 5,
> quando a varredura passa a rodar sozinha sem navegador aberto.

---

**Etapa 6 — Notificações.**
Decidida em 31/08/2026, junto com a Etapa 5. Uma vez por dia, depois da
varredura, avisar: publicações novas encontradas, e prazos vencendo em poucos
dias. O mesmo canal serve para os dois. A tabela `publicacoes` já sustenta o
"o que é novo" — quem nunca foi notificado é quem está com `situacao = 'nova'`
e chegou depois do último aviso.

---

## Decisões de produto (31/08/2026)

Combinadas com o usuário e com a advogada que autorizou o uso da OAB dela nos
testes. Estão aqui porque mudam o desenho, não só a implementação.

**Importar o processo inteiro, sim.** A dúvida inicial era se o Juris devia
apenas listar o que existe. Decidido que não: os dados vêm para dentro porque é
deles que saem prazos e tarefas. Sem importar, o sistema vira um leitor de
diário — e leitor de diário ela já tem.

**Prazo cumprido é decisão humana, sempre.** Nenhuma API sabe se a advogada já
peticionou. O DataJud tem os movimentos e daria para inferir, mas inferir e
mostrar como certeza é o tipo de coisa que faz alguém confiar e perder prazo.
Daí `publicacoes.situacao` ('nova' / 'conferida' / 'ignorada'): quem decide é
ela, com um clique.

**O valor está no "novo", não na lista.** Uma lista corrida de publicações vira
ruído para quem tem volume. O que importa é o que mudou desde a última olhada —
por isso a tabela guarda tudo que já apareceu, e a tela abre na aba "Novas".

---

## Cuidados

- **Deduplicação é obrigatória.** Guarde o `hash` e o `id` da comunicação numa
  tabela própria (`publicacoes`). Sem isso, cada rodada recadastra tudo.
- **Não tem rate limit documentado**, o que não significa que não exista. Faça
  uma requisição por advogado por dia, com paginação, e não paralelize.
- **A API já mudou de formato antes.** Trate `items` como opcional e não
  quebre a tela se um campo sumir.
- **`texto` vem em HTML** com entidades (`&aacute;`). Precisa limpar antes de
  gravar em `descricao`.

---

## Provas

Executado em 31/08/2026, deste projeto:

```
# DJEN — HTTP 200, retornou publicação com partes, advogados e OAB
curl "https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=45211&ufOab=PR\
&dataDisponibilizacaoInicio=2026-01-01&dataDisponibilizacaoFim=2026-08-31\
&itensPorPagina=2&pagina=1"

# DataJud — HTTP 200, retornou processo com classe, órgão e movimentos
curl -X POST "https://api-publica.datajud.cnj.jus.br/api_publica_tjpr/_search" \
  -H "Authorization: APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==" \
  -H "Content-Type: application/json" \
  -d '{"size":1,"query":{"match_all":{}}}'
```
