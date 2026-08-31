-- ==========================================================
-- PRAZO CALCULADO NASCE "A CONFERIR"
--
-- A Etapa 4 faz o sistema sugerir a data de vencimento a partir
-- da publicação no diário. A conta segue o CPC (art. 219, 220 e
-- 224): disponibilização -> publicação no primeiro dia útil
-- seguinte -> contagem a partir do dia útil seguinte a essa ->
-- N dias úteis, sem o recesso de 20/12 a 20/01.
--
-- Só que a conta NÃO sabe de feriado municipal, de portaria que
-- suspende expediente, nem de qual é o prazo aplicável ao ato —
-- 15 dias para contestar, 5 para embargar, 30 em certos recursos.
-- Isso está no texto da intimação, e quem lê é o advogado.
--
-- Um prazo errado que aparece na tela com cara de certo é pior do
-- que prazo nenhum: o advogado confia, não confere, e perde. Daí
-- `confirmado`. Prazo digitado à mão nasce confirmado (o advogado
-- acabou de decidir a data). Prazo calculado nasce FALSO, e a tela
-- destaca até ele bater o olho e confirmar.
--
-- Ver docs/plano-busca-de-processos.md e lib/prazoLegal.ts.
-- ==========================================================

alter table public.prazos
  add column if not exists origem text not null default 'manual',
  add column if not exists confirmado boolean not null default true,
  add column if not exists dias_uteis integer,
  add column if not exists publicacao_id uuid references public.publicacoes(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'prazos_origem_check') then
    alter table public.prazos
      add constraint prazos_origem_check check (origem in ('manual', 'djen'));
  end if;
end $$;

-- A tela de prazos abre destacando o que espera conferência.
create index if not exists idx_prazos_a_conferir
    on public.prazos (advogado_id, vencimento)
 where not confirmado;

-- Uma publicação não deve gerar dois prazos por descuido de clique duplo.
create unique index if not exists prazos_publicacao_key
    on public.prazos (publicacao_id)
 where publicacao_id is not null;

comment on column public.prazos.origem is
  'manual = o advogado digitou a data; djen = calculada a partir de uma '
  'publicação do diário.';

comment on column public.prazos.confirmado is
  'false enquanto o advogado não bateu o olho num prazo calculado. A conta '
  'do sistema não conhece feriado municipal nem portaria de suspensão, então '
  'ela sugere e ele confirma. Prazo digitado à mão já nasce true.';

comment on column public.prazos.dias_uteis is
  'Tamanho do prazo assumido no cálculo. Guardado para dar para refazer a '
  'conta e entender de onde saiu a data.';
