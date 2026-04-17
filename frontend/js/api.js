/* ═══════════════════════════════════════════════════════════
   DeltaV Rocketry · Camada de API
   ───────────────────────────────────────────────────────────
   Centraliza todas as chamadas ao back-end Flask no Azure.
   O dashboard.js e login.js usam este arquivo em vez de
   chamar o DB (localStorage) diretamente.
   ═══════════════════════════════════════════════════════════ */

const API_URL = 'https://webdeltav-g5djahbjgjfmhpd0.eastus2-01.azurewebsites.net';

/* ── Helper base ────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const res = await fetch(API_URL + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    // Lança o erro com a mensagem do back para exibir no front
    throw new Error(data.message || `Erro ${res.status}`);
  }
  return data;
}

/* ══════════════════════════════════════════════════════════
   AUTH
   ══════════════════════════════════════════════════════════ */
const API = {

  async login(email, senha) {
    // POST /login → { message, user: { id, nome, email, setor, isAdmin, isLeader } }
    const data = await apiFetch('/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
    return data.user; // retorna o objeto de usuário direto
  },

  /* ══════════════════════════════════════════════════════
     MEMBROS
     ══════════════════════════════════════════════════════ */
  async getMembers() {
    // GET /membros → [ { id, nome, email, setor, is_admin, is_leader, status } ]
    const list = await apiFetch('/membros');
    // Normaliza nomes de campos para o padrão do front (camelCase)
    return list.map(normalizeMember);
  },

  async addMember(data) {
    // POST /membros → { message, id }
    return apiFetch('/membros', {
      method: 'POST',
      body: JSON.stringify({
        nome:  data.name,
        email: data.email,
        senha: data.password,
        setor: data.sector,
        role:  data.isAdmin ? 'admin' : data.isLeader ? 'leader' : 'user',
      }),
    });
  },

  async updateMember(id, data) {
    // PUT /membros/:id
    return apiFetch(`/membros/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nome:      data.name,
        email:     data.email,
        senha:     data.password || undefined,
        setor:     data.sector,
        is_admin:  data.isAdmin  ? 1 : 0,
        is_leader: data.isLeader ? 1 : 0,
        status:    data.active === false ? 'inativo' : 'ativo',
      }),
    });
  },

  async deleteMember(id) {
    return apiFetch(`/membros/${id}`, { method: 'DELETE' });
  },

  /* ══════════════════════════════════════════════════════
     DEMANDAS
     ══════════════════════════════════════════════════════ */
  async getDemands() {
    const list = await apiFetch('/demandas');
    return list.map(normalizeDemand);
  },

  async addDemand(data) {
    const res = await apiFetch('/demandas', {
      method: 'POST',
      body: JSON.stringify(denormalizeDemand(data)),
    });
    return res.id;
  },

  async updateDemand(id, data) {
    return apiFetch(`/demandas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(denormalizeDemand(data)),
    });
  },

  async deleteDemand(id) {
    return apiFetch(`/demandas/${id}`, { method: 'DELETE' });
  },

  /* ══════════════════════════════════════════════════════
     EVENTOS
     ══════════════════════════════════════════════════════ */
  async getEvents() {
    const list = await apiFetch('/eventos');
    return list.map(normalizeEvent);
  },

  async addEvent(data) {
    const res = await apiFetch('/eventos', {
      method: 'POST',
      body: JSON.stringify(denormalizeEvent(data)),
    });
    return res.id;
  },

  async deleteEvent(id) {
    return apiFetch(`/eventos/${id}`, { method: 'DELETE' });
  },
};

/* ══════════════════════════════════════════════════════════
   NORMALIZADORES
   Convertem snake_case do back → camelCase do front
   ══════════════════════════════════════════════════════════ */

function normalizeMember(m) {
  return {
    id:       m.id,
    name:     m.nome,
    email:    m.email,
    sector:   m.setor,
    role:     m.role || 'Membro',
    isAdmin:  !!m.is_admin,
    isLeader: !!m.is_leader,
    active:   m.status !== 'inativo',
    color:    avatarColor(m.id),      // gera cor pelo id (função de utils.js)
    createdAt: m.criado_em || new Date().toISOString(),
  };
}

function normalizeDemand(d) {
  // Mapeia status do back → colunas do Kanban do front
  const statusMap = {
    aberta:       'todo',
    em_andamento: 'inprogress',
    em_revisao:   'review',
    concluida:    'done',
  };
  return {
    id:         d.id,
    title:      d.titulo,
    priority:   d.prioridade || 'normal',
    status:     statusMap[d.status] || 'todo',
    assigneeId: d.responsavel_id,
    sector:     d.setor,
    dueDate:    d.prazo || '',
    createdAt:  d.criado_em || new Date().toISOString(),
  };
}

function denormalizeDemand(d) {
  const statusMap = {
    todo:       'aberta',
    inprogress: 'em_andamento',
    review:     'em_revisao',
    done:       'concluida',
  };
  return {
    titulo:         d.title,
    prioridade:     d.priority || 'media',
    status:         statusMap[d.status] || 'aberta',
    responsavel_id: d.assigneeId || null,
    setor:          d.sector || '',
    prazo:          d.dueDate || null,
  };
}

function normalizeEvent(e) {
  // O back salva data_inicio; o front usa date (só a data)
  const date = e.data_inicio ? e.data_inicio.split(' ')[0] : '';
  return {
    id:    e.id,
    title: e.titulo,
    date,
    color: e.cor   || 'var(--accent)',
    bg:    e.bg    || 'var(--accent-glow)',
    createdAt: e.criado_em || new Date().toISOString(),
  };
}

function denormalizeEvent(e) {
  return {
    titulo:      e.title,
    data_inicio: e.date + ' 00:00:00',
    data_fim:    e.date + ' 23:59:59',
    setor:       e.sector || null,
    cor:         e.color  || null,
    bg:          e.bg     || null,
  };
}