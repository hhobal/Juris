/* ==========================================================
   CLIENTE SUPABASE
   Preencha SUPABASE_URL e SUPABASE_ANON_KEY com os valores do
   seu projeto (Project Settings -> API, em supabase.com).

   A "anon key" é pública por design — pode ficar exposta no
   front-end. Quem protege os dados é a Row Level Security
   (RLS), que já está no supabase/schema.sql. NUNCA coloque a
   "service_role key" aqui, essa é só para uso em servidor.
   ========================================================== */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "SUA-ANON-KEY-AQUI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================================
   SUBSTITUI a função authenticate() de scripts.js.
   Uso: importe { authenticate } deste arquivo no lugar da
   versão de demonstração, ou copie o corpo desta função para
   dentro de scripts.js.
   ========================================================== */
export async function authenticate(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });
  if (error) return null;

  // Busca o perfil do advogado correspondente ao usuário autenticado
  const { data: advogado, error: perfilError } = await supabase
    .from("advogados")
    .select("*")
    .eq("auth_user_id", data.user.id)
    .single();

  if (perfilError) return null;

  // Devolve no mesmo formato que o resto do app já espera
  return {
    id: advogado.id,
    nome: advogado.nome,
    oab: advogado.oab,
    cargo: advogado.cargo,
    cor: advogado.cor,
    iniciais: advogado.iniciais,
    email: advogado.email
  };
}

/* ==========================================================
   Helpers de CRUD para os Prazos — modelo para migrar as
   outras abas (Processos, Tarefas) do mesmo jeito.
   Os nomes de coluna no banco são snake_case; aqui já devolvo
   no formato camelCase que scripts.js usa (numeroProcesso,
   parteAutora, advogadoId, etc.) para trocar o menos possível
   de código na hora de ligar isso.
   ========================================================== */

function prazoFromRow(r) {
  return {
    id: r.id,
    numeroProcesso: r.numero_processo,
    parteAutora: r.parte_autora,
    estado: r.estado,
    descricao: r.descricao,
    tipo: r.tipo,
    advogadoId: r.advogado_id,
    vencimento: r.vencimento
  };
}

export async function listarPrazos() {
  const { data, error } = await supabase.from("prazos").select("*").order("vencimento");
  if (error) { console.error(error); return []; }
  return data.map(prazoFromRow);
}

export async function salvarPrazo(prazo) {
  const row = {
    numero_processo: prazo.numeroProcesso,
    parte_autora: prazo.parteAutora,
    estado: prazo.estado,
    descricao: prazo.descricao,
    tipo: prazo.tipo,
    advogado_id: prazo.advogadoId,
    vencimento: prazo.vencimento
  };

  if (prazo.id) {
    const { error } = await supabase.from("prazos").update(row).eq("id", prazo.id);
    if (error) console.error(error);
  } else {
    const { error } = await supabase.from("prazos").insert(row);
    if (error) console.error(error);
  }
}

export async function excluirPrazo(id) {
  const { error } = await supabase.from("prazos").delete().eq("id", id);
  if (error) console.error(error);
}
