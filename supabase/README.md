# Backend do Juris

Projeto: **hhobal's Project** (`adxdacqisxsynxvcoerr`), na organização **Juris**
— não na HHOBAL, que é onde mora o SistemaDeGestao. Se o projeto não aparecer no
painel, é porque a organização selecionada está errada.

O schema vive em `migrations/`, versionado no git. Não edite tabela pela
interface do painel: a mudança não fica registrada aqui, e quem ler o
repositório vai ver um banco que não é o que existe.

## O ciclo de trabalho

Este projeto trabalha **direto em produção**: um desenvolvedor, um ambiente.

```bash
npx supabase migration new adiciona_documentos   # cria o arquivo
# edite o .sql em supabase/migrations/
npx supabase db push                             # aplica em produção
npx supabase gen types typescript --linked > ../frontend/src/types/database.ts
```

Só isso. Nada de clicar no painel.

### Antes de qualquer migration que mexa em dado existente

O plano free **não tem backup automático** — o painel mostra "No backups". Um
`db push` não tem desfazer. Enquanto o banco estiver vazio isso não importa; a
partir do primeiro prazo de verdade cadastrado, tire uma cópia antes:

```bash
npx supabase db dump --linked -f backup-$(date +%F).sql --data-only
```

`alter table ... drop column`, `alter column ... type` e `delete` são os
comandos que justificam o cuidado. Criar tabela ou policy nova, não.

### Nunca rode isto

```bash
npx supabase db reset --linked    # APAGA o banco de produção
```

O `db reset` sem `--linked` é inofensivo: ele só recria o banco local.

## Ambiente local (opcional)

Não é necessário para o dia a dia, mas serve para testar uma migration
arriscada antes de mandar para produção. Precisa de Docker aberto.

```bash
npx supabase start      # sobe Postgres, Auth, Storage e Studio
npx supabase db reset   # recria o banco local: migrations + seed.sql
npx supabase stop       # derruba tudo
```

| serviço | endereço |
|---|---|
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| E-mails de teste | http://127.0.0.1:54324 |

`enable_signup` fica ligado tanto local quanto em produção — ver "Como alguém
ganha acesso" abaixo. O `seed.sql` não semeia mais nenhum advogado: para ter
uma conta de teste local, cadastre-se pela própria tela de login do app
(`npm run dev` com `VITE_SUPABASE_URL` apontando pra `http://127.0.0.1:54321`).

Só um detalhe chato de `supabase gen types`: quando roda contra o banco local
ele imprime `Connecting to db 5432` — só que em alguns terminais isso sai pelo
stdout, não pelo stderr, e se você redirecionar com `2>&1` essa linha vaza pro
arquivo de tipos e quebra a compilação (`error TS1434` na linha 1). Redirecione
só o stdout (`> arquivo.ts`, sem o `2>&1`) e confira a primeira linha do
arquivo gerado antes de seguir.

## Isolamento: cada advogado é o dono do próprio Juris

Não existe mais escritório, equipe nem papel (admin/advogado/consulta). O
Juris é uma ferramenta por pessoa: cada advogado só enxerga — e só pode
mexer em — os próprios processos, prazos e tarefas. A RLS de todas as
tabelas de trabalho é a mesma regra, sempre:

```sql
using (advogado_id = advogado_atual())
```

Sem bypass de admin, sem "ver o que é do colega". O que aparece na tela de
alguém é, por definição, só o que é dessa pessoa — não tem "isso é de outro
advogado, você só pode consultar" como tinha antes. Isso vale no banco, não
na interface: a RLS é o que de fato barra, inclusive alguém chamando a API
por fora do app.

Quem desativa a própria conta (`advogados.ativo = false`) perde acesso na
hora, mesmo com o login ainda válido no Auth — `advogado_atual()` já exige
`ativo`. Não existe política de `delete` em `advogados` de propósito: sair
não apaga o histórico de autoria de processos/prazos/tarefas.

## Como alguém ganha acesso

Cadastro público, sem convite: a pessoa cria a própria conta pela tela de
login do app (e-mail, senha, nome). O trigger `handle_new_user` cria a linha
correspondente em `advogados` **na hora**, com o nome que ela informou —
não tem mais "cadastrar o perfil primeiro, depois criar o login": os dois
nascem juntos, na mesma ação.

```sql
insert into public.advogados (auth_user_id, nome, email)
values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ...), lower(new.email));
```

Login sem perfil correspondente hoje só acontece se algo falhar no meio do
caminho (trigger com erro, perfil apagado por fora do app) — não é mais o
fluxo normal, é um caso de borda que a tela de login trata com uma mensagem
de erro.

Se um dia quiser voltar a exigir confirmação de e-mail antes do primeiro
acesso (hoje `enable_confirmations = false`, ou seja, a conta já nasce
utilizável), isso se liga em `[auth.email]` no `config.toml` local — em
produção, no painel do Supabase em Authentication → Providers → Email.

## Regenerar os tipos

Depois de qualquer migration:

```bash
npx supabase gen types typescript --linked > frontend/src/types/database.ts
```

Use `--local` no lugar de `--linked` se estiver trabalhando no ambiente local.

## Realtime

Tabela nova que precise aparecer ao vivo na tela tem que entrar na publicação
`supabase_realtime`. **Ela nasce vazia.** Sem isso o cliente se inscreve, não dá
erro nenhum e nunca recebe evento — falha silenciosa, difícil de perceber:

```sql
alter publication supabase_realtime add table public.documentos;
alter table documentos replica identity full;
```

A RLS continua valendo: cada assinante só recebe evento de linha que ele já
poderia ler.

Detalhe de comportamento: o servidor leva um instante depois do `SUBSCRIBED`
para começar a ler o WAL daquela inscrição, então a primeira alteração feita
logo após abrir a tela pode não gerar evento. Não é problema na prática — a
lista já é carregada ao abrir e recarregada quando a janela volta ao foco.

## Funções de apoio

```sql
create or replace function public.advogado_atual() returns uuid
    language sql stable security definer set search_path to 'public' as $$
  select id from public.advogados where auth_user_id = auth.uid() and ativo;
$$;
```

`security definer` evita recursão quando usada em policies da própria tabela
`advogados`. É a única função de apoio que sobrou — `papel_atual()`,
`e_admin()` e `pode_escrever()` foram embora junto com o papel (migration
"advogado_autonomo").

Exemplo, para uma tabela nova seguir a mesma regra das outras — leitura e
escrita sempre só do dono, sem exceção:

```sql
create policy "le documento proprio" on documentos for select
  using (advogado_id = public.advogado_atual());
create policy "cria documento proprio" on documentos for insert
  with check (advogado_id = public.advogado_atual());
create policy "edita documento proprio" on documentos for update
  using (advogado_id = public.advogado_atual())
  with check (advogado_id = public.advogado_atual());
create policy "apaga documento proprio" on documentos for delete
  using (advogado_id = public.advogado_atual());
```
