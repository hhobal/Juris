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

const SUPABASE_URL = "https://edviyoswugyoqdlgkijn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdml5b3N3dWd5b3FkbGdraWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTE1NzgsImV4cCI6MjA5OTM2NzU3OH0.T0Ihn5qEIsRn_Q8w_lnOq2M7NfT53gu4Evqfx4stGco";

const configurado = !SUPABASE_URL.includes("SEU-PROJETO") && !SUPABASE_ANON_KEY.includes("SUA-ANON-KEY");

export const supabase = configurado ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Exposto em window para scripts.js (script clássico) conseguir usar
// sem precisar virar módulo também.
window.supabaseClient = supabase;

// Com o Supabase configurado, os acessos rápidos de demonstração (que só
// existem em data.js, não no seu banco) deixam de fazer sentido.
if (configurado) {
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelector(".login-demo")?.setAttribute("hidden", "");
  });
  if (document.readyState !== "loading") {
    document.querySelector(".login-demo")?.setAttribute("hidden", "");
  }
}

/* ==========================================================
   Login real via Supabase Auth. scripts.js chama
   window.supabaseAuthenticate() automaticamente sempre que
   window.supabaseClient existir (ou seja, sempre que as duas
   variáveis acima estiverem preenchidas). Retorna:
   - o perfil do advogado, se deu tudo certo
   - null, se e-mail/senha errados
   - lança um erro com uma mensagem amigável nos outros casos
     (e-mail não confirmado, perfil não encontrado na tabela
     advogados, etc.) para o formulário conseguir mostrar o motivo.
   ========================================================== */
window.supabaseAuthenticate = async function (email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      throw new Error("Este e-mail ainda não foi confirmado no Supabase. Veja o passo 3 do guia (confirmar e-mail do usuário).");
    }
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      return null; // e-mail ou senha errados -> mensagem genérica no formulário
    }
    throw new Error(error.message);
  }

  const { data: advogado, error: perfilError } = await supabase
    .from("advogados")
    .select("*")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (perfilError) throw new Error(perfilError.message);

  if (!advogado) {
    throw new Error("Login OK, mas não existe advogado com auth_user_id ligado a este usuário. Veja o passo 3 do guia (UPDATE advogados SET auth_user_id = ...).");
  }

  return {
    id: advogado.id,
    nome: advogado.nome,
    oab: advogado.oab,
    cargo: advogado.cargo,
    cor: advogado.cor,
    iniciais: advogado.iniciais,
    email: advogado.email
  };
};

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
