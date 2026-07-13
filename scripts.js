/* ==========================================================
   ESTADO E PERSISTÊNCIA
   ========================================================== */

const STORAGE_KEY = "juris_data_v1";
const USER_KEY = "juris_current_user";

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  let data = null;
  if (saved) {
    try { data = JSON.parse(saved); } catch (e) { /* fall through */ }
  }
  if (!data) {
    data = {
      empresa: SEED.empresa,
      advogados: SEED.advogados,
      processos: SEED.processos,
      tarefas: SEED.tarefas,
      prazos: SEED.prazos
    };
  }
  // Migração única: remove os processos de teste que vinham na demonstração,
  // sem mexer em prazos/tarefas que você já tenha editado.
  if (!data._processosTesteRemovidos) {
    data.processos = [];
    data._processosTesteRemovidos = true;
  }
  return data;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    empresa: state.empresa,
    advogados: state.advogados,
    processos: state.processos,
    tarefas: state.tarefas,
    prazos: state.prazos
  }));
}

const state = loadState();
state.currentUser = null;
state.filters = {
  processos: { q: "", advogado: "todos", status: "todos" },
  kanban: { advogado: "todos" },
  prazos: { advogado: "todos", tipo: "todos" }
};

/* ==========================================================
   HELPERS
   ========================================================== */

function getAdvogado(id) { return state.advogados.find(a => a.id === id); }
function getProcesso(numero) { return state.processos.find(p => p.numero === numero); }

function daysUntil(iso) {
  const now = new Date();
  const target = new Date(iso);
  const msPerDay = 1000 * 60 * 60 * 24;
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((b - a) / msPerDay);
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

function urgencyInfo(iso) {
  const d = daysUntil(iso);
  if (d < 0) return { cls: "vencido", label: `Vencido há ${Math.abs(d)}d` };
  if (d === 0) return { cls: "hoje", label: "Vence hoje" };
  if (d === 1) return { cls: "urgente", label: "Vence amanhã" };
  if (d <= 3) return { cls: "urgente", label: `${d} dias restantes` };
  if (d <= 7) return { cls: "atencao", label: `${d} dias restantes` };
  return { cls: "tranquilo", label: `${d} dias restantes` };
}

function money(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function uid(prefix) { return prefix + "_" + Math.random().toString(36).slice(2, 9); }

function firstName(nome) {
  const parts = nome.split(" ");
  return /^dra?\.?$/i.test(parts[0]) ? parts[1] : parts[0];
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function normalize(str) {
  return (str || "").toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/* ==========================================================
   LOGIN
   ========================================================== */

const loginScreen = document.getElementById("loginScreen");
const appEl = document.getElementById("app");

function renderDemoChips() {
  const box = document.getElementById("demoChips");
  box.innerHTML = state.advogados.map(a =>
    `<button type="button" class="chip" data-email="${a.email}" data-senha="${a.senhaDemo}">${a.iniciais} · ${firstName(a.nome)}</button>`
  ).join("");
  box.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.getElementById("loginEmail").value = btn.dataset.email;
      document.getElementById("loginSenha").value = btn.dataset.senha;
      const errorEl = document.getElementById("loginError");
      errorEl.textContent = "";
      const advogado = await authenticate(btn.dataset.email, btn.dataset.senha);
      if (advogado) doLogin(advogado.id);
    });
  });
}

/* ==========================================================
   AUTENTICAÇÃO

   Hoje (sem backend) isso só confere o e-mail e a senha contra
   os advogados carregados em SEED/localStorage — é o suficiente
   para navegar na demonstração.

   Quando o Supabase entrar (supabase.com), troque só a função
   `authenticate()` abaixo por algo como:

     async function authenticate(email, senha) {
       const { data, error } = await supabaseClient.auth.signInWithPassword({
         email, password: senha
       });
       if (error) return null;
       // buscar o advogado correspondente na tabela "advogados" pelo
       // data.user.id ou pelo e-mail e devolver esse registro aqui.
       return advogadoEncontrado;
     }

   O Supabase Auth já cuida de tudo o que dá trabalho de fazer na
   mão: hash e verificação de senha, sessão/token, "esqueci minha
   senha", confirmação de e-mail e (se quiser trocar para algo
   ainda mais simples) login por link mágico via signInWithOtp().
   Nada mais neste arquivo precisa mudar — o resto do app só chama
   authenticate() e doLogin().
   ========================================================== */

async function authenticate(email, senha) {
  // Se supabase-client.js estiver configurado (URL + anon key preenchidos),
  // usa o login real do Supabase Auth.
  if (window.supabaseClient) {
    const advogado = await window.supabaseAuthenticate(email, senha); // pode lançar erro com motivo
    if (advogado && !state.advogados.some(a => a.id === advogado.id)) {
      // garante que o perfil exista na lista local, para o cabeçalho e
      // os <select> de responsável conseguirem exibir/usar esse advogado.
      state.advogados.push(advogado);
      saveState();
    }
    return advogado;
  }

  // Modo demo (sem Supabase configurado): confere contra data.js
  const emailNorm = normalize(email).trim();
  const advogado = state.advogados.find(a => normalize(a.email) === emailNorm);
  if (!advogado) return null;
  if (advogado.senhaDemo !== senha) return null;
  return advogado;
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const senha = document.getElementById("loginSenha").value;
  const errorEl = document.getElementById("loginError");
  const submitBtn = e.target.querySelector("button[type=submit]");

  submitBtn.disabled = true;
  let advogado = null;
  try {
    advogado = await authenticate(email, senha);
  } catch (err) {
    submitBtn.disabled = false;
    errorEl.textContent = err.message;
    return;
  }
  submitBtn.disabled = false;

  if (!advogado) {
    errorEl.textContent = "E-mail ou senha inválidos. Confira os dados ou use um acesso de demonstração.";
    return;
  }
  errorEl.textContent = "";
  doLogin(advogado.id);
});

function doLogin(advogadoId) {
  state.currentUser = advogadoId;
  localStorage.setItem(USER_KEY, advogadoId);
  loginScreen.hidden = true;
  appEl.hidden = false;
  bootApp();
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  state.currentUser = null;
  localStorage.removeItem(USER_KEY);
  appEl.hidden = true;
  loginScreen.hidden = false;
});

renderDemoChips();
const savedUser = localStorage.getItem(USER_KEY);
if (savedUser && getAdvogado(savedUser)) {
  doLogin(savedUser);
}

/* ==========================================================
   MODAL
   ========================================================== */

const modalBackdrop = document.getElementById("modalBackdrop");
const modalEl = document.getElementById("modal");

function openModal(html) {
  modalEl.innerHTML = html;
  modalBackdrop.hidden = false;
  requestAnimationFrame(() => modalBackdrop.classList.add("show"));
}

function closeModal() {
  modalBackdrop.classList.remove("show");
  setTimeout(() => { modalBackdrop.hidden = true; modalEl.innerHTML = ""; }, 150);
}

modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

/* ==========================================================
   NAVEGAÇÃO / ROTEAMENTO
   ========================================================== */

const menus = document.querySelectorAll(".menu");
const pageContent = document.getElementById("pageContent");
const pageTitle = document.getElementById("pageTitle");
const pageEyebrow = document.getElementById("pageEyebrow");

const PAGE_META = {
  dashboard: ["Painel", "Visão geral do escritório"],
  busca: ["Busca de Processos", "Monitoramento automático nos tribunais — em desenvolvimento"],
  processos: ["Processos", "Consulte e acompanhe os processos da empresa"],
  kanban: ["Quadro de Tarefas", "Organize o que cada advogado precisa fazer"],
  prazos: ["Prazos", "Nunca mais perca uma data — substitui a planilha"],
  advogados: ["Equipe", "Advogados cadastrados na empresa"],
  documentos: ["Documentos", "Arquivos vinculados aos processos"],
  contratos: ["Contratos", "Contratos sob gestão do jurídico"],
  relatorios: ["Relatórios", "Indicadores do departamento jurídico"],
  config: ["Configurações", "Preferências do sistema"]
};

let currentPage = "dashboard";

function loadPage(page) {
  currentPage = page;
  const [eyebrow, title] = PAGE_META[page];
  pageEyebrow.textContent = eyebrow;
  pageTitle.textContent = title;
  const renderers = {
    dashboard: renderDashboard,
    busca: renderBusca,
    processos: renderProcessos,
    kanban: renderKanban,
    prazos: renderPrazos,
    advogados: renderAdvogados,
    documentos: renderDocumentos,
    contratos: renderContratos,
    relatorios: renderRelatorios,
    config: renderConfig
  };
  pageContent.innerHTML = renderers[page]();
  wirePage(page);
  updateSidebarStat();
}

menus.forEach(menu => {
  menu.addEventListener("click", () => {
    menus.forEach(item => item.classList.remove("active"));
    menu.classList.add("active");
    loadPage(menu.dataset.page);
  });
});

document.getElementById("globalSearch").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const q = e.target.value.trim();
    state.filters.processos.q = q;
    menus.forEach(item => item.classList.remove("active"));
    document.querySelector('.menu[data-page="processos"]').classList.add("active");
    loadPage("processos");
  }
});

function updateSidebarStat() {
  const count = state.prazos.filter(p => {
    const d = daysUntil(p.vencimento);
    return d >= 0 && d <= 7;
  }).length;
  document.getElementById("sbPrazosCount").textContent = count;
}

function bootApp() {
  const me = getAdvogado(state.currentUser);
  document.getElementById("userAvatar").textContent = me.iniciais;
  document.getElementById("userAvatar").style.background = me.cor;
  document.getElementById("userName").textContent = me.nome;
  document.getElementById("userOab").textContent = "OAB " + me.oab;
  loadPage("dashboard");
}

/* ==========================================================
   DASHBOARD
   ========================================================== */

function renderDashboard() {
  const me = getAdvogado(state.currentUser);
  const ativos = state.processos.filter(p => p.status === "Em andamento").length;
  const prazos7 = state.prazos.filter(p => { const d = daysUntil(p.vencimento); return d >= 0 && d <= 7; }).length;
  const tarefasPendentes = state.tarefas.filter(t => t.coluna !== "concluido").length;

  const meusPrazos = state.prazos
    .filter(p => p.advogadoId === state.currentUser)
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento))
    .slice(0, 4);

  const minhasTarefas = state.tarefas
    .filter(t => t.advogadoId === state.currentUser && t.coluna !== "concluido")
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
    .slice(0, 4);

  const carga = state.advogados.map(a => {
    const total = state.tarefas.filter(t => t.advogadoId === a.id && t.coluna !== "concluido").length;
    return { ...a, total };
  });
  const maxCarga = Math.max(1, ...carga.map(c => c.total));

  return `
  <div class="cards">
    <div class="card"><span>Processos ativos</span><strong>${ativos}</strong></div>
    <div class="card"><span>Prazos nos próx. 7 dias</span><strong class="${prazos7 > 0 ? 'danger' : ''}">${prazos7}</strong></div>
    <div class="card"><span>Tarefas pendentes</span><strong>${tarefasPendentes}</strong></div>
    <div class="card"><span>Advogados</span><strong>${state.advogados.length}</strong></div>
  </div>

  <div class="grid grid-2">
    <div class="box">
      <div class="box-head">
        <h2>Meus próximos prazos</h2>
        <button class="link-btn" data-goto="prazos">Ver todos →</button>
      </div>
      ${meusPrazos.length ? meusPrazos.map(prazoRow).join("") : emptyState("Nenhum prazo cadastrado para você.")}
    </div>

    <div class="box">
      <div class="box-head">
        <h2>Minhas tarefas</h2>
        <button class="link-btn" data-goto="kanban">Ver quadro →</button>
      </div>
      ${minhasTarefas.length ? minhasTarefas.map(taskRow).join("") : emptyState(`Nenhuma tarefa pendente. Bom trabalho, ${firstName(me.nome)}.`)}
    </div>
  </div>

  <div class="box">
    <div class="box-head"><h2>Carga de trabalho da equipe</h2></div>
    ${carga.map(c => `
      <div class="lawyer">
        <span class="avatar sm" style="background:${c.cor}">${c.iniciais}</span>
        <div class="lawyer-info">
          <strong>${c.nome}</strong>
          <div class="bar"><div style="width:${(c.total / maxCarga) * 100}%; background:${c.cor}"></div></div>
        </div>
        <span class="lawyer-count">${c.total} tarefa${c.total === 1 ? '' : 's'}</span>
      </div>
    `).join("")}
  </div>
  `;
}

function prazoRow(p) {
  const u = urgencyInfo(p.vencimento);
  return `
  <div class="task-row" data-goto-page="prazos">
    <span class="badge badge-${u.cls}">${u.label}</span>
    <div class="task-row-info">
      <strong>${p.descricao}</strong>
      <small>${p.parteAutora} · ${p.numeroProcesso} — ${p.estado}</small>
    </div>
    <span class="task-row-date">${formatDate(p.vencimento)}</span>
  </div>`;
}

function taskRow(t) {
  const u = urgencyInfo(t.prazo);
  return `
  <div class="task-row">
    <span class="badge badge-${u.cls}">${u.label}</span>
    <div class="task-row-info">
      <strong>${t.titulo}</strong>
      <small>${t.processoNumero || t.descricao || "Sem processo vinculado"}</small>
    </div>
    <span class="pill pill-${t.prioridade}">${prioridadeLabel(t.prioridade)}</span>
  </div>`;
}

function prioridadeLabel(p) { return { alta: "Alta", media: "Média", baixa: "Baixa" }[p]; }

function emptyState(msg) {
  return `<div class="empty-state">${msg}</div>`;
}

/* ==========================================================
   PROCESSOS (busca — carro-chefe)
   ========================================================== */

function renderBusca() {
  return `
  <div class="box">
    <div class="box-head">
      <h2>Busca automática nos tribunais</h2>
      <span class="status-tag status-wait">Em desenvolvimento</span>
    </div>
    <p class="muted" style="margin-bottom:22px;">
      Próxima etapa do projeto: um robô que consulta periodicamente os tribunais de todos os estados
      (via APIs como o DataJud/CNJ ou os sistemas de cada tribunal) usando o CNPJ da empresa, e cadastra
      automaticamente na aba <strong>Processos</strong> qualquer processo novo em que a empresa for citada —
      antes mesmo da carta chegar.
    </p>
    <div class="search-row" style="opacity:.55; pointer-events:none;">
      <input type="text" placeholder="CNPJ ou razão social a monitorar...">
      <select><option>Todos os estados</option></select>
      <button class="btn-primary">Buscar agora</button>
    </div>
  </div>

  <div class="box">
    <h2>Como isso vai se conectar ao resto do sistema</h2>
    <div class="detail-grid">
      <div><small>1. Monitoramento</small><strong>Robô consulta os tribunais periodicamente pelo CNPJ da empresa</strong></div>
      <div><small>2. Detecção</small><strong>Processo novo encontrado → dados extraídos automaticamente</strong></div>
      <div><small>3. Cadastro</small><strong>Entra direto na aba Processos, sem digitação manual</strong></div>
      <div><small>4. Alerta</small><strong>Advogado responsável é notificado e pode criar o prazo/tarefa</strong></div>
    </div>
  </div>
  `;
}

function renderProcessos() {
  const f = state.filters.processos;
  const results = filterProcessos();

  return `
  <div class="box search-box">
    <h2>Buscar processos</h2>
    <div class="search-row">
      <input type="text" id="procSearch" placeholder="Número do processo, parte envolvida ou assunto..." value="${escapeAttr(f.q)}">
      <select id="procAdvFilter">
        <option value="todos">Todos os advogados</option>
        ${state.advogados.map(a => `<option value="${a.id}" ${f.advogado === a.id ? "selected" : ""}>${a.nome}</option>`).join("")}
      </select>
      <select id="procStatusFilter">
        <option value="todos">Todos os status</option>
        <option value="Em andamento" ${f.status === "Em andamento" ? "selected" : ""}>Em andamento</option>
        <option value="Suspenso" ${f.status === "Suspenso" ? "selected" : ""}>Suspenso</option>
        <option value="Encerrado" ${f.status === "Encerrado" ? "selected" : ""}>Encerrado</option>
      </select>
    </div>
  </div>

  <div class="box">
    <div class="box-head">
      <h2>Resultados <span class="count-chip">${results.length}</span></h2>
      <button class="btn-primary" id="btnNovoProcesso">+ Novo processo</button>
    </div>
    ${results.length ? `
    <table>
      <thead><tr><th>Nº do processo</th><th>Partes</th><th>Tipo</th><th>Fase</th><th>Advogado</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${results.map(p => {
          const adv = getAdvogado(p.advogadoId);
          return `
          <tr class="row-click" data-proc="${p.numero}">
            <td class="mono">${p.numero}</td>
            <td>${p.parte}</td>
            <td>${p.tipo}</td>
            <td>${p.fase}</td>
            <td><span class="avatar xs" style="background:${adv.cor}">${adv.iniciais}</span> ${firstName(adv.nome)}</td>
            <td><span class="status-tag status-${statusClass(p.status)}">${p.status}</span></td>
            <td class="chevron">›</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>` : emptyState("Nenhum processo encontrado para essa busca.")}
  </div>
  `;
}

function statusClass(s) {
  return s === "Em andamento" ? "ok" : s === "Suspenso" ? "wait" : "closed";
}

function filterProcessos() {
  const f = state.filters.processos;
  const q = normalize(f.q);
  return state.processos.filter(p => {
    if (f.advogado !== "todos" && p.advogadoId !== f.advogado) return false;
    if (f.status !== "todos" && p.status !== f.status) return false;
    if (q && !(normalize(p.numero).includes(q) || normalize(p.parte).includes(q) || normalize(p.tipo).includes(q))) return false;
    return true;
  }).sort((a, b) => new Date(b.distribuicao) - new Date(a.distribuicao));
}

function processoDetailModal(numero) {
  const p = getProcesso(numero);
  const adv = getAdvogado(p.advogadoId);
  const prazosDoProc = state.prazos.filter(pr => pr.numeroProcesso === numero);
  const tarefasDoProc = state.tarefas.filter(t => t.processoNumero === numero);

  return `
  <div class="modal-head">
    <div>
      <div class="eyebrow">${p.tipo} · ${p.tribunal}</div>
      <h2 class="mono">${p.numero}</h2>
    </div>
    <button class="icon-btn" data-close-modal>✕</button>
  </div>

  <p class="modal-parties">${p.parte}</p>

  <div class="detail-grid">
    <div><small>Vara</small><strong>${p.vara}</strong></div>
    <div><small>Status</small><strong><span class="status-tag status-${statusClass(p.status)}">${p.status}</span></strong></div>
    <div><small>Fase atual</small><strong>${p.fase}</strong></div>
    <div><small>Valor da causa</small><strong>${money(p.valorCausa)}</strong></div>
    <div><small>Distribuição</small><strong>${formatDate(p.distribuicao)}</strong></div>
    <div><small>Advogado responsável</small><strong>${adv.nome}</strong></div>
  </div>

  <div class="detail-block">
    <small>Última movimentação</small>
    <p>${p.ultimaMov}</p>
  </div>

  ${prazosDoProc.length ? `
  <div class="detail-block">
    <small>Prazos vinculados</small>
    ${prazosDoProc.map(prazoRow).join("")}
  </div>` : ""}

  ${tarefasDoProc.length ? `
  <div class="detail-block">
    <small>Tarefas vinculadas</small>
    ${tarefasDoProc.map(taskRow).join("")}
  </div>` : ""}

  <div class="modal-actions">
    <button class="btn-secondary" data-action="edit-processo" data-proc="${p.numero}">Editar</button>
    <button class="btn-secondary" data-action="del-processo" data-proc="${p.numero}">Excluir</button>
    <button class="btn-secondary" data-action="add-tarefa-from-proc" data-proc="${p.numero}">+ Criar tarefa</button>
    <button class="btn-secondary" data-action="add-prazo-from-proc" data-proc="${p.numero}">+ Criar prazo</button>
  </div>
  `;
}

// processo = registro existente para edição, ou null para cadastrar um novo.
function processoFormModal(processo) {
  const v = processo || {};
  const isEdit = !!processo;
  return `
  <div class="modal-head">
    <h2>${isEdit ? "Editar processo" : "Novo processo"}</h2>
    <button class="icon-btn" data-close-modal>✕</button>
  </div>
  <form id="processoForm" data-numero-original="${isEdit ? v.numero : ""}">
    <label>Número do processo (CNJ)
      <input type="text" id="pxNumero" class="mono" placeholder="0000000-00.0000.0.00.0000" value="${v.numero || ""}" required>
    </label>
    <label>Partes envolvidas
      <input type="text" id="pxParte" placeholder="Ex: Empresa Exemplo Ltda. x João da Silva" value="${escapeAttr(v.parte || "")}" required>
    </label>
    <div class="form-row">
      <label>Tipo
        <select id="pxTipo">
          <option value="Trabalhista" ${v.tipo === "Trabalhista" ? "selected" : ""}>Trabalhista</option>
          <option value="Cível" ${v.tipo === "Cível" ? "selected" : ""}>Cível</option>
          <option value="Tributário" ${v.tipo === "Tributário" ? "selected" : ""}>Tributário</option>
          <option value="Criminal" ${v.tipo === "Criminal" ? "selected" : ""}>Criminal</option>
          <option value="Administrativo" ${v.tipo === "Administrativo" ? "selected" : ""}>Administrativo</option>
        </select>
      </label>
      <label>Tribunal
        <input type="text" id="pxTribunal" placeholder="Ex: TJPR, TRT-9, TRF-4..." value="${escapeAttr(v.tribunal || "")}">
      </label>
    </div>
    <label>Vara
      <input type="text" id="pxVara" placeholder="Ex: 3ª Vara Cível de Curitiba" value="${escapeAttr(v.vara || "")}">
    </label>
    <div class="form-row">
      <label>Advogado responsável
        <select id="pxAdvogado" required>
          ${state.advogados.map(a => `<option value="${a.id}" ${v.advogadoId === a.id ? "selected" : ""}>${a.nome}</option>`).join("")}
        </select>
      </label>
      <label>Status
        <select id="pxStatus">
          <option value="Em andamento" ${v.status === "Em andamento" ? "selected" : ""}>Em andamento</option>
          <option value="Suspenso" ${v.status === "Suspenso" ? "selected" : ""}>Suspenso</option>
          <option value="Encerrado" ${v.status === "Encerrado" ? "selected" : ""}>Encerrado</option>
        </select>
      </label>
    </div>
    <div class="form-row">
      <label>Fase atual
        <input type="text" id="pxFase" placeholder="Ex: Citação, Contestação, Recurso..." value="${escapeAttr(v.fase || "")}">
      </label>
      <label>Valor da causa (R$)
        <input type="number" id="pxValor" step="0.01" min="0" placeholder="0,00" value="${v.valorCausa != null ? v.valorCausa : ""}">
      </label>
    </div>
    <label>Data de distribuição
      <input type="date" id="pxDistribuicao" value="${v.distribuicao ? v.distribuicao.slice(0, 10) : ""}">
    </label>
    <label>Última movimentação
      <input type="text" id="pxUltimaMov" placeholder="Ex: Citação recebida — aguardando manifestação" value="${escapeAttr(v.ultimaMov || "")}">
    </label>
    <div class="modal-actions">
      ${isEdit ? `<button type="button" class="btn-secondary" data-action="del-processo" data-proc="${v.numero}">Excluir</button>` : ""}
      <button type="submit" class="btn-primary btn-block">Salvar processo</button>
    </div>
  </form>
  `;
}

/* ==========================================================
   KANBAN
   ========================================================== */

const KANBAN_COLS = [
  { id: "fazer", label: "A Fazer" },
  { id: "andamento", label: "Em Andamento" },
  { id: "aguardando", label: "Aguardando" },
  { id: "concluido", label: "Concluído" }
];

function renderKanban() {
  const f = state.filters.kanban;
  return `
  <div class="kanban-toolbar">
    <div class="tabs" id="kanbanTabs">
      <button class="tab ${f.advogado === 'todos' ? 'active' : ''}" data-adv="todos">Todos</button>
      ${state.advogados.map(a => `<button class="tab ${f.advogado === a.id ? 'active' : ''}" data-adv="${a.id}"><span class="dot" style="background:${a.cor}"></span>${firstName(a.nome)}</button>`).join("")}
    </div>
    <button class="btn-primary" id="btnNovaTarefa">+ Nova tarefa</button>
  </div>

  <div class="kanban-board">
    ${KANBAN_COLS.map(col => {
      const items = state.tarefas.filter(t => t.coluna === col.id && (f.advogado === "todos" || t.advogadoId === f.advogado));
      return `
      <div class="kanban-col" data-col="${col.id}">
        <div class="kanban-col-head">
          <h3>${col.label}</h3>
          <span class="count-chip">${items.length}</span>
        </div>
        <div class="kanban-dropzone" data-col="${col.id}">
          ${items.map(kanbanCard).join("")}
        </div>
      </div>`;
    }).join("")}
  </div>
  `;
}

function kanbanCard(t) {
  const adv = getAdvogado(t.advogadoId);
  const u = urgencyInfo(t.prazo);
  const proc = getProcesso(t.processoNumero);
  return `
  <div class="kcard" draggable="true" data-id="${t.id}">
    <div class="kcard-top">
      <span class="pill pill-${t.prioridade}">${prioridadeLabel(t.prioridade)}</span>
      <div class="kcard-actions">
        <button class="icon-btn tiny" data-action="edit-tarefa" data-id="${t.id}" title="Editar">✎</button>
        <button class="icon-btn tiny" data-action="del-tarefa" data-id="${t.id}" title="Remover">✕</button>
      </div>
    </div>
    <strong class="kcard-title">${t.titulo}</strong>
    ${t.descricao ? `<p class="kcard-desc">${t.descricao}</p>` : ""}
    ${t.processoNumero ? `<small class="kcard-proc mono">${t.processoNumero}${proc ? " · " + proc.tipo : ""}</small>` : ""}
    <div class="kcard-foot">
      <span class="avatar xs" style="background:${adv.cor}" title="${adv.nome}">${adv.iniciais}</span>
      <span class="badge badge-${u.cls} sm">${u.label}</span>
      <span class="kcard-date">${formatDate(t.prazo)}</span>
    </div>
  </div>`;
}

function wireKanbanDnD() {
  const cards = pageContent.querySelectorAll(".kcard");
  const zones = pageContent.querySelectorAll(".kanban-dropzone");

  cards.forEach(card => {
    card.addEventListener("dragstart", () => {
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });
  });

  zones.forEach(zone => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const dragging = pageContent.querySelector(".kcard.dragging");
      if (!dragging) return;
      const id = dragging.dataset.id;
      const tarefa = state.tarefas.find(t => t.id === id);
      const novaCol = zone.dataset.col;
      const anterior = tarefa.coluna;
      tarefa.coluna = novaCol;
      saveState();
      loadPage("kanban");
      if (anterior !== novaCol) toast(`Tarefa movida para "${KANBAN_COLS.find(c => c.id === novaCol).label}"`);
    });
  });
}

// tarefa = registro existente para edição, ou null para criar.
// prefill = valores iniciais opcionais (ex.: vindo do "+ Criar tarefa" de um processo).
function tarefaFormModal(tarefa, prefill) {
  const v = tarefa || prefill || {};
  const isEdit = !!tarefa;
  return `
  <div class="modal-head">
    <h2>${isEdit ? "Editar tarefa" : "Nova tarefa"}</h2>
    <button class="icon-btn" data-close-modal>✕</button>
  </div>
  <form id="tarefaForm" data-id="${isEdit ? tarefa.id : ""}">
    <label>Título da tarefa
      <input type="text" id="tTitulo" placeholder="Ex: Elaborar contestação" value="${escapeAttr(v.titulo || "")}" required>
    </label>
    <label>Descrição / observações
      <textarea id="tDescricao" rows="2" placeholder="Detalhes úteis para quem for executar a tarefa...">${v.descricao || ""}</textarea>
    </label>
    <label>Número do processo (opcional)
      <input type="text" id="tProcesso" class="mono" placeholder="0000000-00.0000.0.00.0000" value="${v.processoNumero || ""}">
    </label>
    <div class="form-row">
      <label>Responsável
        <select id="tAdvogado" required>
          ${state.advogados.map(a => `<option value="${a.id}" ${v.advogadoId === a.id ? "selected" : ""}>${a.nome}</option>`).join("")}
        </select>
      </label>
      <label>Prioridade
        <select id="tPrioridade">
          <option value="alta" ${v.prioridade === "alta" ? "selected" : ""}>Alta</option>
          <option value="media" ${!v.prioridade || v.prioridade === "media" ? "selected" : ""}>Média</option>
          <option value="baixa" ${v.prioridade === "baixa" ? "selected" : ""}>Baixa</option>
        </select>
      </label>
    </div>
    <div class="form-row">
      <label>Status
        <select id="tColuna">
          ${KANBAN_COLS.map(c => `<option value="${c.id}" ${(v.coluna || "fazer") === c.id ? "selected" : ""}>${c.label}</option>`).join("")}
        </select>
      </label>
      <label>Prazo para concluir
        <input type="date" id="tPrazo" value="${v.prazo ? v.prazo.slice(0, 10) : ""}" required>
      </label>
    </div>
    <div class="modal-actions">
      ${isEdit ? `<button type="button" class="btn-secondary" data-action="del-tarefa" data-id="${tarefa.id}">Excluir</button>` : ""}
      <button type="submit" class="btn-primary btn-block">${isEdit ? "Salvar alterações" : "Adicionar ao quadro"}</button>
    </div>
  </form>
  `;
}

/* ==========================================================
   PRAZOS
   ========================================================== */

function renderPrazos() {
  const f = state.filters.prazos;
  const list = state.prazos
    .filter(p => (f.advogado === "todos" || p.advogadoId === f.advogado) && (f.tipo === "todos" || p.tipo === f.tipo))
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

  return `
  <div class="prazos-toolbar">
    <div class="tabs">
      <button class="tab ${f.advogado === 'todos' ? 'active' : ''}" data-padv="todos">Todos</button>
      ${state.advogados.map(a => `<button class="tab ${f.advogado === a.id ? 'active' : ''}" data-padv="${a.id}"><span class="dot" style="background:${a.cor}"></span>${firstName(a.nome)}</button>`).join("")}
    </div>
    <div class="toolbar-right">
      <select id="tipoPrazoFilter">
        <option value="todos">Todos os tipos</option>
        <option value="Prazo processual" ${f.tipo === "Prazo processual" ? "selected" : ""}>Prazo processual</option>
        <option value="Audiência" ${f.tipo === "Audiência" ? "selected" : ""}>Audiência</option>
        <option value="Recurso" ${f.tipo === "Recurso" ? "selected" : ""}>Recurso</option>
      </select>
      <button class="btn-primary" id="btnNovoPrazo">+ Novo prazo</button>
    </div>
  </div>

  <div class="prazos-list">
    ${list.length ? list.map(prazoCard).join("") : emptyState("Nenhum prazo encontrado com esse filtro.")}
  </div>
  `;
}

function prazoCard(p) {
  const adv = getAdvogado(p.advogadoId);
  const u = urgencyInfo(p.vencimento);
  const d = daysUntil(p.vencimento);
  return `
  <div class="prazo-card ${u.cls}" data-goto-edit="${p.id}">
    <div class="prazo-seal ${u.cls}">
      <strong>${d < 0 ? "—" : d}</strong>
      <small>${d < 0 ? "vencido" : d === 1 ? "dia" : "dias"}</small>
    </div>
    <div class="prazo-info">
      <div class="prazo-info-top">
        <span class="tag-type">${p.tipo}</span>
        <span class="uf-tag">${p.estado}</span>
        <span class="badge badge-${u.cls} sm">${u.label}</span>
      </div>
      <strong>${p.descricao}</strong>
      <small class="mono">${p.numeroProcesso}</small>
      <small>${p.parteAutora}</small>
    </div>
    <div class="prazo-right">
      <span class="avatar xs" style="background:${adv.cor}" title="${adv.nome}">${adv.iniciais}</span>
      <span class="prazo-date">${formatDate(p.vencimento)}</span>
      <button class="icon-btn tiny" data-action="edit-prazo" data-id="${p.id}" title="Editar">✎</button>
      <button class="icon-btn tiny" data-action="del-prazo" data-id="${p.id}" title="Remover">✕</button>
    </div>
  </div>`;
}

// prazo = registro existente para edição, ou null para cadastrar um novo.
// prefill = valores iniciais opcionais (ex.: vindo do botão "+ Criar prazo" de um processo).
function prazoFormModal(prazo, prefill) {
  const v = prazo || prefill || {};
  const isEdit = !!prazo;
  return `
  <div class="modal-head">
    <h2>${isEdit ? "Editar prazo" : "Novo prazo"}</h2>
    <button class="icon-btn" data-close-modal>✕</button>
  </div>
  <form id="prazoForm" data-id="${isEdit ? prazo.id : ""}">
    <div class="form-row">
      <label>Número do processo
        <input type="text" id="pNumeroProcesso" class="mono" placeholder="0000000-00.0000.0.00.0000" value="${v.numeroProcesso || ""}" required>
      </label>
      <label>Estado
        <select id="pEstado" required>
          <option value="">Selecione...</option>
          ${SEED.estados.map(uf => `<option value="${uf}" ${v.estado === uf ? "selected" : ""}>${uf}</option>`).join("")}
        </select>
      </label>
    </div>
    <label>Nome da parte autora
      <input type="text" id="pParteAutora" placeholder="Ex: João da Silva" value="${v.parteAutora || ""}" required>
    </label>
    <label>Descrição
      <input type="text" id="pDescricao" placeholder="Ex: Contestação, Réplica, Audiência..." value="${v.descricao || ""}" required>
    </label>
    <div class="form-row">
      <label>Responsável
        <select id="pAdvogado" required>
          ${state.advogados.map(a => `<option value="${a.id}" ${v.advogadoId === a.id ? "selected" : ""}>${a.nome}</option>`).join("")}
        </select>
      </label>
      <label>Tipo
        <select id="pTipo">
          <option value="Prazo processual" ${v.tipo === "Prazo processual" ? "selected" : ""}>Prazo processual</option>
          <option value="Audiência" ${v.tipo === "Audiência" ? "selected" : ""}>Audiência</option>
          <option value="Recurso" ${v.tipo === "Recurso" ? "selected" : ""}>Recurso</option>
        </select>
      </label>
    </div>
    <label>Data de vencimento
      <input type="date" id="pData" value="${v.vencimento ? v.vencimento.slice(0, 10) : ""}" required>
    </label>
    <div class="modal-actions">
      ${isEdit ? `<button type="button" class="btn-secondary" data-action="del-prazo" data-id="${prazo.id}">Excluir</button>` : ""}
      <button type="submit" class="btn-primary btn-block">Salvar prazo</button>
    </div>
  </form>
  `;
}

/* ==========================================================
   ADVOGADOS
   ========================================================== */

function renderAdvogados() {
  return `
  <div class="cards cards-3">
    ${state.advogados.map(a => {
      const processosAtivos = state.processos.filter(p => p.advogadoId === a.id && p.status === "Em andamento").length;
      const tarefasPend = state.tarefas.filter(t => t.advogadoId === a.id && t.coluna !== "concluido").length;
      const prox = state.prazos.filter(p => p.advogadoId === a.id).sort((x, y) => new Date(x.vencimento) - new Date(y.vencimento))[0];
      return `
      <div class="box lawyer-card">
        <span class="avatar lg" style="background:${a.cor}">${a.iniciais}</span>
        <h2>${a.nome}</h2>
        <small>${a.cargo} · OAB ${a.oab}</small>
        <div class="lawyer-stats">
          <div><strong>${processosAtivos}</strong><span>processos ativos</span></div>
          <div><strong>${tarefasPend}</strong><span>tarefas pendentes</span></div>
        </div>
        ${prox ? `<div class="lawyer-next">Próximo prazo: <strong>${formatDate(prox.vencimento)}</strong> — ${prox.descricao}</div>` : ""}
      </div>`;
    }).join("")}
  </div>
  `;
}

/* ==========================================================
   PÁGINAS SIMPLES (mantidas próximas ao Datajuri por ora)
   ========================================================== */

function renderDocumentos() {
  return `
  <div class="box">
    <h2>Arquivos dos processos</h2>
    <p class="muted">Em breve: upload e vinculação de petições, procurações e comprovantes diretamente ao processo. Por enquanto, os documentos continuam sendo controlados no repositório atual da equipe.</p>
  </div>`;
}

function renderContratos() {
  return `
  <div class="box">
    <h2>Contratos sob gestão</h2>
    <p class="muted">Módulo de contratos será conectado numa próxima etapa, reaproveitando o cadastro de partes já usado nos processos.</p>
  </div>`;
}

function renderRelatorios() {
  const porTipo = {};
  state.processos.forEach(p => { porTipo[p.tipo] = (porTipo[p.tipo] || 0) + 1; });
  const maxTipo = Math.max(1, ...Object.values(porTipo));
  return `
  <div class="box">
    <div class="box-head"><h2>Processos por área do direito</h2></div>
    ${Object.entries(porTipo).map(([tipo, qtd]) => `
      <div class="lawyer">
        <div class="lawyer-info">
          <strong>${tipo}</strong>
          <div class="bar"><div style="width:${(qtd / maxTipo) * 100}%"></div></div>
        </div>
        <span class="lawyer-count">${qtd}</span>
      </div>
    `).join("")}
  </div>`;
}

function renderConfig() {
  const me = getAdvogado(state.currentUser);
  return `
  <div class="box">
    <h2>Empresa</h2>
    <div class="detail-grid">
      <div><small>Razão social</small><strong>${state.empresa.razaoSocial}</strong></div>
      <div><small>CNPJ</small><strong>${state.empresa.cnpj}</strong></div>
      <div><small>Usuário logado</small><strong>${me.nome} (OAB ${me.oab})</strong></div>
    </div>
  </div>`;
}

/* ==========================================================
   ESCAPE UTIL
   ========================================================== */

function escapeAttr(s) {
  return (s || "").replace(/"/g, "&quot;");
}

/* ==========================================================
   WIRING DE EVENTOS POR PÁGINA
   ========================================================== */

function wirePage(page) {
  // links "ver todos" no dashboard
  pageContent.querySelectorAll("[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.goto;
      menus.forEach(m => m.classList.toggle("active", m.dataset.page === target));
      loadPage(target);
    });
  });

  if (page === "processos") {
    const search = document.getElementById("procSearch");
    search.addEventListener("input", () => {
      state.filters.processos.q = search.value;
      const results = filterProcessos();
      pageContent.querySelector(".box:last-child").outerHTML = `
      <div class="box">
        <div class="box-head">
          <h2>Resultados <span class="count-chip">${results.length}</span></h2>
          <button class="btn-primary" id="btnNovoProcesso">+ Novo processo</button>
        </div>
        ${results.length ? `
        <table>
          <thead><tr><th>Nº do processo</th><th>Partes</th><th>Tipo</th><th>Fase</th><th>Advogado</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${results.map(p => {
              const adv = getAdvogado(p.advogadoId);
              return `
              <tr class="row-click" data-proc="${p.numero}">
                <td class="mono">${p.numero}</td>
                <td>${p.parte}</td>
                <td>${p.tipo}</td>
                <td>${p.fase}</td>
                <td><span class="avatar xs" style="background:${adv.cor}">${adv.iniciais}</span> ${firstName(adv.nome)}</td>
                <td><span class="status-tag status-${statusClass(p.status)}">${p.status}</span></td>
                <td class="chevron">›</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>` : emptyState("Nenhum processo encontrado para essa busca.")}
      </div>`;
      wireProcessRows();
      wireNovoProcessoBtn();
    });

    document.getElementById("procAdvFilter").addEventListener("change", (e) => {
      state.filters.processos.advogado = e.target.value;
      loadPage("processos");
    });
    document.getElementById("procStatusFilter").addEventListener("change", (e) => {
      state.filters.processos.status = e.target.value;
      loadPage("processos");
    });
    wireProcessRows();
    wireNovoProcessoBtn();
  }

  if (page === "kanban") {
    wireKanbanDnD();
    document.getElementById("kanbanTabs").addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      state.filters.kanban.advogado = btn.dataset.adv;
      loadPage("kanban");
    });
    document.getElementById("btnNovaTarefa").addEventListener("click", () => {
      openModal(tarefaFormModal(null));
      wireTarefaForm();
    });
    pageContent.querySelectorAll('[data-action="edit-tarefa"]').forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openTarefaEdit(btn.dataset.id);
      });
    });
    pageContent.querySelectorAll('[data-action="del-tarefa"]').forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteTarefa(btn.dataset.id);
      });
    });
  }

  if (page === "prazos") {
    pageContent.querySelectorAll(".tab[data-padv]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.filters.prazos.advogado = btn.dataset.padv;
        loadPage("prazos");
      });
    });
    document.getElementById("tipoPrazoFilter").addEventListener("change", (e) => {
      state.filters.prazos.tipo = e.target.value;
      loadPage("prazos");
    });
    document.getElementById("btnNovoPrazo").addEventListener("click", () => {
      openModal(prazoFormModal(null));
      wirePrazoForm();
    });
    pageContent.querySelectorAll('[data-action="edit-prazo"]').forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openPrazoEdit(btn.dataset.id);
      });
    });
    pageContent.querySelectorAll('[data-action="del-prazo"]').forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        deletePrazo(btn.dataset.id);
      });
    });
    pageContent.querySelectorAll('.prazo-card[data-goto-edit]').forEach(card => {
      card.addEventListener("click", () => openPrazoEdit(card.dataset.gotoEdit));
    });
  }
}

function openPrazoEdit(id) {
  const prazo = state.prazos.find(p => p.id === id);
  if (!prazo) return;
  openModal(prazoFormModal(prazo));
  wirePrazoForm();
}

function deletePrazo(id) {
  state.prazos = state.prazos.filter(p => p.id !== id);
  saveState();
  closeModal();
  if (currentPage === "prazos") loadPage("prazos"); else loadPage(currentPage);
  updateSidebarStat();
  toast("Prazo removido.");
}

function wireProcessRows() {
  pageContent.querySelectorAll(".row-click").forEach(row => {
    row.addEventListener("click", () => {
      openModal(processoDetailModal(row.dataset.proc));
      wireModalCommon();
    });
  });
}

function wireNovoProcessoBtn() {
  const btn = document.getElementById("btnNovoProcesso");
  if (btn) btn.addEventListener("click", () => {
    openModal(processoFormModal(null));
    wireProcessoForm();
  });
}

function deleteProcesso(numero) {
  state.processos = state.processos.filter(p => p.numero !== numero);
  saveState();
  closeModal();
  if (currentPage === "processos") loadPage("processos"); else loadPage(currentPage);
  updateSidebarStat();
  toast("Processo removido.");
}

function wireProcessoForm() {
  wireModalCommon();
  const form = document.getElementById("processoForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const numeroOriginal = form.dataset.numeroOriginal;
    const dados = {
      numero: document.getElementById("pxNumero").value.trim(),
      parte: document.getElementById("pxParte").value.trim(),
      tipo: document.getElementById("pxTipo").value,
      tribunal: document.getElementById("pxTribunal").value.trim(),
      vara: document.getElementById("pxVara").value.trim(),
      advogadoId: document.getElementById("pxAdvogado").value,
      status: document.getElementById("pxStatus").value,
      fase: document.getElementById("pxFase").value.trim(),
      valorCausa: parseFloat(document.getElementById("pxValor").value) || 0,
      distribuicao: document.getElementById("pxDistribuicao").value || null,
      ultimaMov: document.getElementById("pxUltimaMov").value.trim()
    };

    if (numeroOriginal) {
      const idx = state.processos.findIndex(p => p.numero === numeroOriginal);
      if (idx > -1) state.processos[idx] = dados;
    } else {
      if (state.processos.some(p => p.numero === dados.numero)) {
        alert("Já existe um processo cadastrado com esse número.");
        return;
      }
      state.processos.push(dados);
    }

    saveState();
    closeModal();
    if (currentPage === "processos") loadPage("processos"); else loadPage(currentPage);
    updateSidebarStat();
    toast(numeroOriginal ? "Processo atualizado com sucesso." : "Processo cadastrado com sucesso.");
  });
}

function wireModalCommon() {
  modalEl.querySelectorAll("[data-close-modal]").forEach(b => b.addEventListener("click", closeModal));
  const editPx = modalEl.querySelector('[data-action="edit-processo"]');
  if (editPx) editPx.addEventListener("click", () => {
    openModal(processoFormModal(getProcesso(editPx.dataset.proc)));
    wireProcessoForm();
  });
  modalEl.querySelectorAll('[data-action="del-processo"]').forEach(btn => {
    btn.addEventListener("click", () => deleteProcesso(btn.dataset.proc));
  });
  const addT = modalEl.querySelector('[data-action="add-tarefa-from-proc"]');
  if (addT) addT.addEventListener("click", () => { openModal(tarefaFormModal(null, { processoNumero: addT.dataset.proc })); wireTarefaForm(); });
  const addP = modalEl.querySelector('[data-action="add-prazo-from-proc"]');
  if (addP) addP.addEventListener("click", () => {
    const proc = getProcesso(addP.dataset.proc);
    const prefill = proc ? { numeroProcesso: proc.numero, parteAutora: proc.parte.split(" x ")[0].trim() } : null;
    openModal(prazoFormModal(null, prefill));
    wirePrazoForm();
  });
  const delP = modalEl.querySelector('#prazoForm [data-action="del-prazo"]');
  if (delP) delP.addEventListener("click", () => deletePrazo(delP.dataset.id));
  const delT = modalEl.querySelector('#tarefaForm [data-action="del-tarefa"]');
  if (delT) delT.addEventListener("click", () => deleteTarefa(delT.dataset.id));
}

function openTarefaEdit(id) {
  const tarefa = state.tarefas.find(t => t.id === id);
  if (!tarefa) return;
  openModal(tarefaFormModal(tarefa));
  wireTarefaForm();
}

function deleteTarefa(id) {
  state.tarefas = state.tarefas.filter(t => t.id !== id);
  saveState();
  closeModal();
  if (currentPage === "kanban") loadPage("kanban"); else loadPage(currentPage);
  updateSidebarStat();
  toast("Tarefa removida.");
}

function wireTarefaForm() {
  wireModalCommon();
  const form = document.getElementById("tarefaForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const editId = form.dataset.id;
    const dados = {
      titulo: document.getElementById("tTitulo").value.trim(),
      descricao: document.getElementById("tDescricao").value.trim(),
      processoNumero: document.getElementById("tProcesso").value.trim(),
      advogadoId: document.getElementById("tAdvogado").value,
      prioridade: document.getElementById("tPrioridade").value,
      coluna: document.getElementById("tColuna").value,
      prazo: new Date(document.getElementById("tPrazo").value + "T09:00:00").toISOString()
    };

    if (editId) {
      const idx = state.tarefas.findIndex(t => t.id === editId);
      if (idx > -1) state.tarefas[idx] = { ...state.tarefas[idx], ...dados };
    } else {
      state.tarefas.push({ id: uid("t"), ...dados });
    }

    saveState();
    closeModal();
    if (currentPage === "kanban") loadPage("kanban"); else loadPage(currentPage);
    updateSidebarStat();
    toast(editId ? "Tarefa atualizada com sucesso." : "Tarefa adicionada ao quadro.");
  });
}

function wirePrazoForm() {
  wireModalCommon();
  const form = document.getElementById("prazoForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const editId = form.dataset.id;
    const dados = {
      numeroProcesso: document.getElementById("pNumeroProcesso").value.trim(),
      parteAutora: document.getElementById("pParteAutora").value.trim(),
      estado: document.getElementById("pEstado").value,
      descricao: document.getElementById("pDescricao").value.trim(),
      advogadoId: document.getElementById("pAdvogado").value,
      tipo: document.getElementById("pTipo").value,
      vencimento: new Date(document.getElementById("pData").value + "T09:00:00").toISOString()
    };

    if (editId) {
      const idx = state.prazos.findIndex(p => p.id === editId);
      if (idx > -1) state.prazos[idx] = { ...state.prazos[idx], ...dados };
    } else {
      state.prazos.push({ id: uid("p"), ...dados });
    }

    saveState();
    closeModal();
    if (currentPage === "prazos") loadPage("prazos"); else loadPage(currentPage);
    updateSidebarStat();
    toast(editId ? "Prazo atualizado com sucesso." : "Prazo salvo com sucesso.");
  });
}
