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
npx supabase gen types typescript --linked > ../web/src/types/database.ts
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
npx supabase db reset   # recria o banco local: migration + seed.sql
npx supabase stop       # derruba tudo
```

| serviço | endereço |
|---|---|
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| E-mails de teste | http://127.0.0.1:54324 |

O `seed.sql` (os três advogados de exemplo) roda **só** no `db reset` local.
Dado de exemplo nunca sobe para produção.

## Quem pode o quê

| | admin | advogado | consulta |
|---|---|---|---|
| Ver processos, prazos, tarefas e equipe | sim | sim | sim |
| Criar processo, prazo, tarefa | sim | sim | não |
| Atribuir trabalho a um colega | sim | sim | não |
| Editar e apagar o que é **seu** | sim | sim | não |
| Editar e apagar o que é **de outro** | sim | não | não |
| Cadastrar, promover e desativar pessoas | sim | não | não |

O papel fica em `advogados.papel`. Quem estiver com `ativo = false` não passa de
nenhuma policy, mesmo com o login ainda válido no Auth.

Isso vale no banco, não na interface. Esconder um botão no front é conveniência;
a RLS é o que de fato barra — inclusive alguém chamando a API por fora do app.

## Dar acesso a alguém

São dois passos, e **os dois são necessários** — é isso que impede um estranho
de entrar sozinho:

1. **Cadastrar o perfil.** Uma linha em `advogados` com o e-mail da pessoa e o
   papel. Pela tela de equipe do app (se você for admin) ou pelo Table Editor.
   Esse cadastro é o convite.
2. **Criar o login**, em `Authentication → Users → Add user → Create new user`,
   com o **mesmo e-mail** e a opção **Auto Confirm User** marcada.

O trigger `handle_new_user` liga um ao outro sozinho, em qualquer ordem.

Login sem perfil correspondente **não dá acesso a nada**: a pessoa autentica,
mas não enxerga uma linha sequer, e o app recusa a entrada. O cadastro público
(`/auth/v1/signup`) está desligado no `config.toml` justamente porque a anon key
é visível no front.

Quem sai da empresa é **desativado**, não apagado: processos, prazos e tarefas
continuam apontando para um registro válido e o histórico de autoria fica de pé.
Não existe política de `delete` em `advogados` de propósito.

### O primeiro admin

Ovo e galinha: só um admin cadastra gente, e no começo não existe nenhum. No
ambiente local o `seed.sql` já resolve. No projeto de verdade, promova alguém
uma vez pelo SQL Editor:

```sql
update advogados set papel = 'admin'
 where email = 'seu.email@empresa.com.br';
```

Isso funciona porque as travas de papel são inertes quando não há usuário
autenticado na jogada (`auth.uid()` nulo) — ou seja, pelo SQL Editor, pelo
service_role e pelas migrations. Elas existem para conter quem chega pelo app.

## Regenerar os tipos

Depois de qualquer migration:

```bash
npx supabase gen types typescript --linked > web/src/types/database.ts
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

Disponíveis para novas policies, todas `security definer` (o que evita recursão
quando usadas em policies da própria tabela `advogados`):

| função | devolve |
|---|---|
| `advogado_atual()` | id do perfil logado, ou `null` se não houver acesso |
| `papel_atual()` | `admin`, `advogado`, `consulta` ou `null` |
| `e_admin()` | booleano |
| `pode_escrever()` | booleano — admin ou advogado, ativo |

Exemplo, para uma tabela nova seguir a mesma regra das outras:

```sql
create policy "todos leem documentos" on documentos for select
  using (public.advogado_atual() is not null);
create policy "edita documento proprio" on documentos for update
  using (public.e_admin() or advogado_id = public.advogado_atual());
```
