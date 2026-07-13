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
   CAMADA DE DADOS
   Tudo aqui é exposto em window.supabaseSync para o scripts.js
   (script clássico) chamar. Nomes de coluna no banco são
   snake_case; aqui sempre devolvo/recebo no formato camelCase
   que o resto do app já usa (numeroProcesso, advogadoId, etc.).

   Padrão para criar/editar (salvarX):
   - tem "id" (tarefas/prazos, que usam uuid gerado pelo banco)
     -> UPDATE, e devolve o mesmo id
   - não tem "id" -> INSERT, e o Supabase gera o uuid; a função
     devolve esse id para o scripts.js guardar no registro local
   - processos usam "numero" como identificador natural (é
     único na tabela), então lá é sempre um UPSERT por numero
   ========================================================== */

function rowToAdvogado(r) {
  return { id: r.id, nome: r.nome, oab: r.oab, cargo: r.cargo, cor: r.cor, iniciais: r.iniciais, email: r.email };
}

function rowToProcesso(r) {
  return {
    numero: r.numero, parte: r.parte, tipo: r.tipo, tribunal: r.tribunal, vara: r.vara,
    advogadoId: r.advogado_id, status: r.status, fase: r.fase, valorCausa: r.valor_causa,
    distribuicao: r.distribuicao, ultimaMov: r.ultima_mov
  };
}
function processoToRow(p) {
  return {
    numero: p.numero, parte: p.parte, tipo: p.tipo, tribunal: p.tribunal, vara: p.vara,
    advogado_id: p.advogadoId, status: p.status, fase: p.fase, valor_causa: p.valorCausa,
    distribuicao: p.distribuicao || null, ultima_mov: p.ultimaMov
  };
}

function rowToTarefa(r) {
  return {
    id: r.id, processoNumero: r.processo_numero, titulo: r.titulo, descricao: r.descricao,
    advogadoId: r.advogado_id, coluna: r.coluna, prioridade: r.prioridade, prazo: r.prazo
  };
}
function tarefaToRow(t) {
  return {
    processo_numero: t.processoNumero || null, titulo: t.titulo, descricao: t.descricao || null,
    advogado_id: t.advogadoId, coluna: t.coluna, prioridade: t.prioridade, prazo: t.prazo
  };
}

function rowToPrazo(r) {
  return {
    id: r.id, numeroProcesso: r.numero_processo, parteAutora: r.parte_autora, estado: r.estado,
    descricao: r.descricao, tipo: r.tipo, advogadoId: r.advogado_id, vencimento: r.vencimento
  };
}
function prazoToRow(p) {
  return {
    numero_processo: p.numeroProcesso, parte_autora: p.parteAutora, estado: p.estado,
    descricao: p.descricao, tipo: p.tipo, advogado_id: p.advogadoId, vencimento: p.vencimento
  };
}

window.supabaseSync = {

  // Carrega tudo de uma vez, chamado logo depois do login.
  async carregarTudo() {
    const [adv, proc, tar, prz] = await Promise.all([
      supabase.from("advogados").select("*"),
      supabase.from("processos").select("*"),
      supabase.from("tarefas").select("*"),
      supabase.from("prazos").select("*")
    ]);
    if (adv.error) throw new Error("advogados: " + adv.error.message);
    if (proc.error) throw new Error("processos: " + proc.error.message);
    if (tar.error) throw new Error("tarefas: " + tar.error.message);
    if (prz.error) throw new Error("prazos: " + prz.error.message);
    return {
      advogados: adv.data.map(rowToAdvogado),
      processos: proc.data.map(rowToProcesso),
      tarefas: tar.data.map(rowToTarefa),
      prazos: prz.data.map(rowToPrazo)
    };
  },

  async salvarProcesso(p, numeroOriginal) {
    const row = processoToRow(p);
    if (numeroOriginal) {
      const { error } = await supabase.from("processos").update(row).eq("numero", numeroOriginal);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("processos").insert(row);
      if (error) throw new Error(error.message);
    }
  },
  async excluirProcesso(numero) {
    const { error } = await supabase.from("processos").delete().eq("numero", numero);
    if (error) throw new Error(error.message);
  },

  async salvarTarefa(t) {
    const row = tarefaToRow(t);
    if (t.id) {
      const { error } = await supabase.from("tarefas").update(row).eq("id", t.id);
      if (error) throw new Error(error.message);
      return t.id;
    }
    const { data, error } = await supabase.from("tarefas").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return data.id;
  },
  async excluirTarefa(id) {
    const { error } = await supabase.from("tarefas").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async salvarPrazo(p) {
    const row = prazoToRow(p);
    if (p.id) {
      const { error } = await supabase.from("prazos").update(row).eq("id", p.id);
      if (error) throw new Error(error.message);
      return p.id;
    }
    const { data, error } = await supabase.from("prazos").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return data.id;
  },
  async excluirPrazo(id) {
    const { error } = await supabase.from("prazos").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
};
