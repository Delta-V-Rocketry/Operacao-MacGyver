/* ═══════════════════════════════════════════════════════════
   Delta Rockets · Dashboard — Lógica dinâmica
   ═══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   AUTH GUARD — redireciona se não logado
   FUTURO: validar token JWT com o backend
   ══════════════════════════════════════════════════════════ */
const session = DB.getSession();
if (!session) window.location.href = 'login.html';

/* ── Preencher dados do usuário logado na sidebar ───────── */
function renderSidebarUser() {
  const u = DB.getSession();
  if (!u) return;
  document.querySelector('.sidebar-footer .name').textContent = u.name;
  document.querySelector('.sidebar-footer .role').textContent = (u.role || 'Membro') + ' · ' + (u.sector || '');
  document.querySelector('.sidebar-footer .avatar').textContent = getInitials(u.name);
  document.querySelector('.sidebar-footer .avatar').style.background = u.color || avatarColor(u.id);
  document.querySelector('.sector-badge').textContent = u.sector || 'Geral';

  // Mostrar item "Administração" apenas para admins
  const adminNav = document.querySelector('.nav-item[data-page="admin"]');
  if (adminNav) adminNav.style.display = u.isAdmin ? 'flex' : 'none';
}

/* ══════════════════════════════════════════════════════════
   NAVEGAÇÃO
   ══════════════════════════════════════════════════════════ */
function switchPage(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
  const target = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (target) target.classList.add('active');
  const section = document.getElementById('page-' + page);
  if (section) section.classList.add('active');
  const titles = { dashboard:'Dashboard', demandas:'Demandas', calendario:'Calendário',
    membros:'Membros', relatorios:'Relatórios Semanais', admin:'Administração' };
  document.getElementById('page-title').textContent = titles[page] || page;
  document.getElementById('sidebar').classList.remove('open');

  // Renderizar seção ao entrar
  const renders = { dashboard: renderDashboard, demandas: renderKanban,
    calendario: renderCalendar, membros: renderMembers,
    relatorios: renderReports, admin: renderAdmin };
  if (renders[page]) renders[page]();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

/* ══════════════════════════════════════════════════════════
   DASHBOARD — stats + recentes
   ══════════════════════════════════════════════════════════ */
function renderDashboard() {
  const demands    = DB.getDemands();
  const members    = DB.getMembers();
  const reports    = DB.getReports();
  const activities = DB.getActivities();

  const active   = demands.filter(d => d.status !== 'done').length;
  const done     = demands.filter(d => d.status === 'done').length;
  const pending  = reports.filter(r => r.status === 'pendente' || r.status === 'atrasado').length;

  // Stats
  document.getElementById('stat-active').textContent  = active;
  document.getElementById('stat-done').textContent    = done;
  document.getElementById('stat-reports').textContent = pending;
  document.getElementById('stat-members').textContent = members.filter(m => m.active).length;

  // Demandas recentes (últimas 4 não concluídas)
  const recent = demands.filter(d => d.status !== 'done').slice(0, 4);
  const PRIORITY_COLOR = { urgente:'var(--red)', alta:'var(--red)', media:'var(--yellow)', normal:'var(--green)' };
  const STATUS_CLASS    = { inprogress:'status-progresso', review:'status-revisao', todo:'status-revisao' };
  const STATUS_LABEL    = { inprogress:'Em progresso', review:'Em revisão', todo:'A fazer' };
  document.getElementById('recent-demands').innerHTML = recent.map(d => {
    const assignee = DB.getMemberById(d.assigneeId);
    const aName    = assignee ? assignee.name.split(' ')[0] + ' ' + (assignee.name.split(' ').pop()[0] || '') + '.' : '—';
    const due      = d.dueDate ? new Date(d.dueDate).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'}) : '—';
    return `<div class="task-item">
      <div class="task-priority" style="background:${PRIORITY_COLOR[d.priority]||'var(--accent)'};"></div>
      <div class="task-info">
        <div class="task-name">${d.title}</div>
        <div class="task-meta">${due} · ${aName}</div>
      </div>
      <span class="task-status ${STATUS_CLASS[d.status]||'status-revisao'}">${STATUS_LABEL[d.status]||d.status}</span>
    </div>`;
  }).join('') || '<p style="color:var(--text-muted);font-size:13px;padding:1rem 0">Sem demandas ativas.</p>';

  // Atividades recentes
  document.getElementById('recent-activities').innerHTML = activities.slice(0, 6).map(a => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${a.color};"></div>
      <div>
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${timeAgo(a.time)}</div>
      </div>
    </div>`).join('') || '<p style="color:var(--text-muted);font-size:13px;">Nenhuma atividade registrada.</p>';

  // Badge demandas na sidebar
  const badge = document.querySelector('.nav-item[data-page="demandas"] .nav-badge');
  if (badge) badge.textContent = active;
  const badgeR = document.querySelector('.nav-item[data-page="relatorios"] .nav-badge-pink');
  if (badgeR) badgeR.textContent = pending || '';
}

/* ══════════════════════════════════════════════════════════
   KANBAN — Demandas
   ══════════════════════════════════════════════════════════ */
const KANBAN_COLS = [
  { id:'todo',       label:'A fazer',      color:'var(--text-muted)' },
  { id:'inprogress', label:'Em progresso', color:'var(--accent)' },
  { id:'review',     label:'Em revisão',   color:'var(--purple)' },
  { id:'done',       label:'Concluídas',   color:'var(--green)' },
];
const PRIORITY_COLOR = { urgente:'var(--red)', alta:'var(--red)', media:'var(--yellow)', normal:'var(--green)', baixa:'var(--green)' };
const PRIORITY_CLASS  = { urgente:'tag-urgente', alta:'tag-alta', media:'tag-media', normal:'tag-normal', baixa:'tag-normal' };

function renderKanban() {
  const demands = DB.getDemands();
  document.querySelector('#page-demandas .page-toolbar-info').textContent =
    `${demands.filter(d=>d.status!=='done').length} tarefas ativas · ${DB.getSession()?.sector || 'Geral'}`;

  const grid = document.getElementById('kanban-grid');
  grid.innerHTML = KANBAN_COLS.map(col => {
    const cards = demands.filter(d => d.status === col.id);
    const cardsHtml = cards.map(d => {
      const assignee = DB.getMemberById(d.assigneeId);
      const aName    = assignee ? assignee.name.split(' ')[0] + ' ' + (assignee.name.split(' ').slice(-1)[0][0]||'') + '.' : '—';
      const due      = d.dueDate ? new Date(d.dueDate).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : '—';
      return `<div class="kanban-card ${col.id==='done'?'done':''}" data-id="${d.id}">
        <div class="kanban-card-title">${d.title}</div>
        ${col.id !== 'done' ? `<div class="kanban-tags"><span class="kanban-tag ${PRIORITY_CLASS[d.priority]||'tag-normal'}">${d.priority||'normal'}</span></div>` : ''}
        <div class="kanban-card-meta">
          <span>${col.id==='done'?'✓':'📅 '+due}</span><span>· ${aName}</span>
          ${DB.getSession()?.isAdmin ? `<span class="kanban-card-actions">
            <button onclick="editDemand(${d.id})" title="Editar">✏</button>
            <button onclick="deleteDemandConfirm(${d.id})" title="Excluir">🗑</button>
          </span>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="kanban-col">
      <div class="kanban-col-header">
        <span class="kanban-col-title"><span class="kanban-dot" style="background:${col.color};"></span>${col.label} <span class="kanban-count">${cards.length}</span></span>
      </div>
      ${cardsHtml}
    </div>`;
  }).join('');
}

function openNewDemand() {
  const members = DB.getMembers();
  openModal({
    title: 'Nova Demanda', wide: true,
    body: `
      <div class="form-grid">
        <div class="field"><label>Título *</label><input id="f-title" type="text" placeholder="Descreva a demanda"></div>
        <div class="field"><label>Prioridade</label>
          <select id="f-priority">
            <option value="urgente">🔴 Urgente</option>
            <option value="alta">🟠 Alta</option>
            <option value="media" selected>🟡 Média</option>
            <option value="normal">🟢 Normal</option>
          </select>
        </div>
        <div class="field"><label>Responsável</label>
          <select id="f-assignee">
            <option value="">— Nenhum —</option>
            ${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Data de entrega</label><input id="f-due" type="date"></div>
        <div class="field field-full"><label>Coluna inicial</label>
          <select id="f-status">
            <option value="todo">A fazer</option>
            <option value="inprogress">Em progresso</option>
            <option value="review">Em revisão</option>
          </select>
        </div>
      </div>`,
    onConfirm: () => {
      const title = document.getElementById('f-title').value.trim();
      if (!title) { toast('Informe o título da demanda.', 'error'); return; }
      DB.addDemand({
        title,
        priority:   document.getElementById('f-priority').value,
        assigneeId: parseInt(document.getElementById('f-assignee').value) || null,
        dueDate:    document.getElementById('f-due').value,
        status:     document.getElementById('f-status').value,
      });
      closeModal(); toast('Demanda criada!'); renderKanban(); renderDashboard();
    }, confirmText: 'Criar demanda'
  });
}

function editDemand(id) {
  const d = DB.getDemands().find(d => d.id === id);
  if (!d) return;
  const members = DB.getMembers();
  openModal({
    title: 'Editar Demanda', wide: true,
    body: `
      <div class="form-grid">
        <div class="field"><label>Título *</label><input id="f-title" type="text" value="${d.title}"></div>
        <div class="field"><label>Prioridade</label>
          <select id="f-priority">
            ${['urgente','alta','media','normal'].map(p=>`<option value="${p}" ${d.priority===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Responsável</label>
          <select id="f-assignee">
            <option value="">— Nenhum —</option>
            ${members.map(m=>`<option value="${m.id}" ${d.assigneeId===m.id?'selected':''}>${m.name}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Data de entrega</label><input id="f-due" type="date" value="${d.dueDate||''}"></div>
        <div class="field field-full"><label>Status</label>
          <select id="f-status">
            ${KANBAN_COLS.map(c=>`<option value="${c.id}" ${d.status===c.id?'selected':''}>${c.label}</option>`).join('')}
          </select>
        </div>
      </div>`,
    onConfirm: () => {
      const title = document.getElementById('f-title').value.trim();
      if (!title) { toast('Informe o título.', 'error'); return; }
      DB.updateDemand(id, {
        title, priority: document.getElementById('f-priority').value,
        assigneeId: parseInt(document.getElementById('f-assignee').value) || null,
        dueDate: document.getElementById('f-due').value,
        status:  document.getElementById('f-status').value,
      });
      closeModal(); toast('Demanda atualizada!'); renderKanban(); renderDashboard();
    }, confirmText: 'Salvar'
  });
}

function deleteDemandConfirm(id) {
  const d = DB.getDemands().find(d => d.id === id);
  confirmDialog(`Excluir "<strong>${d?.title}</strong>"?`, () => {
    DB.deleteDemand(id); closeModal(); toast('Demanda excluída.', 'info'); renderKanban(); renderDashboard();
  });
}

/* ══════════════════════════════════════════════════════════
   CALENDÁRIO
   ══════════════════════════════════════════════════════════ */
let calDate = new Date(2026, 3, 1);
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function changeMonth(dir) { calDate.setMonth(calDate.getMonth() + dir); renderCalendar(); }

function renderCalendar() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  document.getElementById('cal-month').textContent = MONTHS[m] + ' ' + y;

  const events = DB.getEvents();
  const eventMap = {};
  events.forEach(e => { if (!eventMap[e.date]) eventMap[e.date] = []; eventMap[e.date].push(e); });

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrev  = new Date(y, m, 0).getDate();
  const today = new Date();

  let html = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => `<div class="cal-header-cell">${d}</div>`).join('');

  for (let i = firstDay - 1; i >= 0; i--)
    html += `<div class="cal-cell other-month"><div class="cal-day">${daysInPrev - i}</div></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = (d === today.getDate() && m === today.getMonth() && y === today.getFullYear());
    const evs = eventMap[dateStr] || [];
    const evHtml = evs.map(e =>
      `<div class="cal-event" style="background:${e.bg};color:${e.color};" title="${e.title}" data-id="${e.id}">${e.title}</div>`
    ).join('');
    const addBtn = DB.getSession()?.isAdmin
      ? `<button class="cal-add-btn" onclick="openNewEvent('${dateStr}')" title="Adicionar evento">+</button>` : '';
    html += `<div class="cal-cell${isToday?' today':''}" data-date="${dateStr}">
      <div class="cal-day-row"><div class="cal-day">${d}</div>${addBtn}</div>
      ${evHtml}
    </div>`;
  }

  const remaining = (7 - ((firstDay + daysInMonth) % 7)) % 7;
  for (let i = 1; i <= remaining; i++)
    html += `<div class="cal-cell other-month"><div class="cal-day">${i}</div></div>`;

  document.getElementById('calendar').innerHTML = html;

  // Click nos eventos para editar (admin)
  if (DB.getSession()?.isAdmin) {
    document.querySelectorAll('.cal-event[data-id]').forEach(el => {
      el.addEventListener('click', e => { e.stopPropagation(); editEvent(parseInt(el.dataset.id)); });
    });
  }
}

function openNewEvent(dateStr = '') {
  openModal({
    title: 'Novo Evento', wide: false,
    body: `
      <div class="field"><label>Título *</label><input id="f-etitle" type="text" placeholder="Nome do evento"></div>
      <div class="field"><label>Data *</label><input id="f-edate" type="date" value="${dateStr}"></div>
      <div class="field"><label>Cor</label>
        <select id="f-ecolor">
          <option value="accent">🟠 Laranja (prazo)</option>
          <option value="purple">🟣 Roxo (reunião)</option>
          <option value="pink">🩷 Rosa (relatório)</option>
          <option value="green">🟢 Verde (teste)</option>
          <option value="red">🔴 Vermelho (urgente)</option>
        </select>
      </div>`,
    onConfirm: () => {
      const title = document.getElementById('f-etitle').value.trim();
      const date  = document.getElementById('f-edate').value;
      if (!title || !date) { toast('Preencha título e data.', 'error'); return; }
      const colorKey = document.getElementById('f-ecolor').value;
      const colorMap = {
        accent:  { color:'var(--accent)',  bg:'var(--accent-glow)' },
        purple:  { color:'var(--purple)',  bg:'var(--purple-bg)' },
        pink:    { color:'var(--pink)',    bg:'var(--pink-bg)' },
        green:   { color:'var(--green)',   bg:'var(--green-bg)' },
        red:     { color:'var(--red)',     bg:'var(--red-bg)' },
      };
      DB.addEvent({ title, date, ...colorMap[colorKey] });
      closeModal(); toast('Evento adicionado!'); renderCalendar();
    }, confirmText: 'Adicionar'
  });
}

function editEvent(id) {
  const e = DB.getEvents().find(e => e.id === id);
  if (!e) return;
  openModal({
    title: 'Editar Evento',
    body: `
      <div class="field"><label>Título *</label><input id="f-etitle" type="text" value="${e.title}"></div>
      <div class="field"><label>Data *</label><input id="f-edate" type="date" value="${e.date}"></div>`,
    onConfirm: () => {
      const title = document.getElementById('f-etitle').value.trim();
      const date  = document.getElementById('f-edate').value;
      if (!title || !date) { toast('Preencha título e data.', 'error'); return; }
      DB.updateEvent(id, { title, date });
      closeModal(); toast('Evento atualizado!'); renderCalendar();
    },
    confirmText: 'Salvar',
    danger: false
  });
}

/* ══════════════════════════════════════════════════════════
   MEMBROS
   ══════════════════════════════════════════════════════════ */
function renderMembers() {
  const members = DB.getMembers();
  const isAdmin = DB.getSession()?.isAdmin;
  document.querySelector('#page-membros .page-toolbar-info').textContent =
    `${members.filter(m => m.active).length} membros ativos`;

  document.getElementById('members-grid').innerHTML = members.map(m => `
    <div class="member-card">
      <div class="member-avatar" style="background:${m.color || avatarColor(m.id)}">${getInitials(m.name)}</div>
      <div class="member-name">${m.name}</div>
      <div class="member-role">${m.role || 'Membro'}</div>
      <span class="member-sector">${m.sector || '—'}</span>
      ${isAdmin ? `<div class="member-actions">
        <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;" onclick="editMember(${m.id})">Editar</button>
        <button class="btn btn-danger" style="font-size:12px;padding:4px 10px;" onclick="deleteMemberConfirm(${m.id})">Remover</button>
      </div>` : ''}
    </div>`).join('');
}

function openNewMember() {
  openModal({
    title: 'Adicionar Membro', wide: true,
    body: `
      <div class="form-grid">
        <div class="field"><label>Nome completo *</label><input id="f-mname" type="text" placeholder="João Silva"></div>
        <div class="field"><label>E-mail *</label><input id="f-memail" type="email" placeholder="joao@delta.com"></div>
        <div class="field"><label>Senha inicial *</label><input id="f-mpass" type="password" placeholder="mínimo 6 caracteres"></div>
        <div class="field"><label>Cargo / Função</label><input id="f-mrole" type="text" placeholder="Membro, Líder..."></div>
        <div class="field"><label>Setor</label>
          <select id="f-msector">
            <option>Propulsão</option><option>Estrutura</option><option>Eletrônica</option>
            <option>Aerodinâmica</option><option>Software</option><option>Gestão</option>
          </select>
        </div>
        <div class="field"><label>Administrador?</label>
          <select id="f-madmin"><option value="false">Não</option><option value="true">Sim</option></select>
        </div>
      </div>`,
    onConfirm: () => {
      const name  = document.getElementById('f-mname').value.trim();
      const email = document.getElementById('f-memail').value.trim();
      const pass  = document.getElementById('f-mpass').value.trim();
      if (!name || !email || !pass) { toast('Preencha nome, e-mail e senha.', 'error'); return; }
      DB.addMember({
        name, email, password: pass,
        role:    document.getElementById('f-mrole').value.trim() || 'Membro',
        sector:  document.getElementById('f-msector').value,
        isAdmin: document.getElementById('f-madmin').value === 'true',
        color:   avatarColor(DB.getMembers().length + 1),
      });
      closeModal(); toast('Membro adicionado!'); renderMembers(); renderDashboard();
    }, confirmText: 'Adicionar'
  });
}

function editMember(id) {
  const m = DB.getMemberById(id);
  if (!m) return;
  openModal({
    title: 'Editar Membro', wide: true,
    body: `
      <div class="form-grid">
        <div class="field"><label>Nome *</label><input id="f-mname" type="text" value="${m.name}"></div>
        <div class="field"><label>E-mail</label><input id="f-memail" type="email" value="${m.email||''}"></div>
        <div class="field"><label>Cargo</label><input id="f-mrole" type="text" value="${m.role||''}"></div>
        <div class="field"><label>Setor</label>
          <select id="f-msector">
            ${['Propulsão','Estrutura','Eletrônica','Aerodinâmica','Software','Gestão'].map(s=>`<option ${m.sector===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Admin?</label>
          <select id="f-madmin">
            <option value="false" ${!m.isAdmin?'selected':''}>Não</option>
            <option value="true"  ${m.isAdmin?'selected':''}>Sim</option>
          </select>
        </div>
      </div>`,
    onConfirm: () => {
      DB.updateMember(id, {
        name:    document.getElementById('f-mname').value.trim(),
        email:   document.getElementById('f-memail').value.trim(),
        role:    document.getElementById('f-mrole').value.trim(),
        sector:  document.getElementById('f-msector').value,
        isAdmin: document.getElementById('f-madmin').value === 'true',
      });
      closeModal(); toast('Membro atualizado!'); renderMembers();
    }, confirmText: 'Salvar'
  });
}

function deleteMemberConfirm(id) {
  const m = DB.getMemberById(id);
  if (m?.id === DB.getSession()?.id) { toast('Você não pode remover a si mesmo.', 'error'); return; }
  confirmDialog(`Remover "<strong>${m?.name}</strong>" da equipe?`, () => {
    DB.deleteMember(id); closeModal(); toast('Membro removido.', 'info'); renderMembers(); renderDashboard();
  });
}

/* ══════════════════════════════════════════════════════════
   RELATÓRIOS
   ══════════════════════════════════════════════════════════ */
let reportTab = 'atual';

function renderReports() {
  const reports    = DB.getReports();
  const isAdmin    = DB.getSession()?.isAdmin;
  const currentUser = DB.getSession();

  let filtered = reports;
  if (reportTab === 'meus') filtered = reports.filter(r => r.memberId === currentUser?.id);

  const STATUS_MAP = {
    pendente:  { cls:'status-pendente', label:'Pendente' },
    entregue:  { cls:'status-entregue', label:'Entregue' },
    avaliado:  { cls:'status-avaliado', label:'Avaliado' },
    atrasado:  { cls:'status-atrasado', label:'Atrasado' },
  };

  document.getElementById('reports-table-body').innerHTML = filtered.map(r => {
    const s = STATUS_MAP[r.status] || STATUS_MAP.pendente;
    const canDeliver = !isAdmin && r.memberId === currentUser?.id && r.status === 'pendente';
    const canEval    = isAdmin && r.status === 'entregue';
    return `<tr>
      <td class="td-name">${r.memberName}</td>
      <td>${r.sector||'—'}</td>
      <td><span class="status-badge ${s.cls}">${s.label}</span></td>
      <td>${r.deliveredAt ? fmtDate(r.deliveredAt) + ', ' + new Date(r.deliveredAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '<span class="color-muted">—</span>'}</td>
      <td>${r.grade ? `<span class="color-green">✓ ${r.grade}</span>` : '<span class="color-muted">Aguardando</span>'}
        ${canDeliver ? `<button class="btn btn-ghost" style="font-size:11px;padding:3px 8px;margin-left:8px;" onclick="deliverReport(${r.id})">Entregar</button>` : ''}
        ${canEval    ? `<button class="btn btn-primary-action" style="font-size:11px;padding:3px 8px;margin-left:8px;" onclick="evalReport(${r.id})">Avaliar</button>` : ''}
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Sem relatórios.</td></tr>';
}

function switchReportTab(tab) {
  reportTab = tab;
  document.querySelectorAll('.report-tab').forEach((t, i) => {
    t.classList.toggle('active', ['atual','anteriores','meus'][i] === tab);
  });
  renderReports();
}

function openNewReport() {
  const members = DB.getMembers();
  openModal({
    title: 'Criar Ciclo de Relatórios', wide: true,
    body: `
      <div class="field"><label>Semana / Ciclo *</label><input id="f-rweek" type="text" placeholder="ex: Semana 17"></div>
      <div class="field"><label>Período</label><input id="f-rperiod" type="text" placeholder="ex: 21/04 – 25/04"></div>
      <div class="field"><label>Prazo de entrega *</label><input id="f-rdeadline" type="datetime-local"></div>
      <p style="font-size:13px;color:var(--text-muted);margin-top:.5rem;">Um relatório pendente será criado para cada membro ativo.</p>`,
    onConfirm: () => {
      const week    = document.getElementById('f-rweek').value.trim();
      const period  = document.getElementById('f-rperiod').value.trim();
      const deadline= document.getElementById('f-rdeadline').value;
      if (!week || !deadline) { toast('Preencha semana e prazo.', 'error'); return; }
      members.forEach(m => {
        DB.addReport({ memberId: m.id, memberName: m.name, sector: m.sector, week, weekLabel: period, deadline });
      });
      DB.logActivity(`<strong>Sistema</strong> abriu ciclo de relatórios: ${week}`, 'var(--yellow)');
      closeModal(); toast(`Ciclo "${week}" criado para ${members.length} membros!`); renderReports();
    }, confirmText: 'Criar ciclo'
  });
}

function deliverReport(id) {
  DB.updateReport(id, { status: 'entregue', deliveredAt: new Date().toISOString() });
  DB.logActivity(`<strong>${DB.getSession()?.name}</strong> entregou relatório`, 'var(--pink)');
  toast('Relatório entregue!'); renderReports(); renderDashboard();
}

function evalReport(id) {
  openModal({
    title: 'Avaliar Relatório',
    body: `<div class="field"><label>Avaliação</label>
      <select id="f-grade">
        <option value="aprovado">✓ Aprovado</option>
        <option value="aprovado com ressalvas">⚠ Aprovado com ressalvas</option>
        <option value="reprovado">✕ Reprovado</option>
      </select></div>`,
    onConfirm: () => {
      const grade = document.getElementById('f-grade').value;
      DB.updateReport(id, { status: 'avaliado', grade });
      closeModal(); toast('Avaliação registrada!'); renderReports();
    }, confirmText: 'Confirmar avaliação'
  });
}

/* ══════════════════════════════════════════════════════════
   PAINEL DE ADMINISTRAÇÃO
   ══════════════════════════════════════════════════════════ */
function renderAdmin() {
  if (!DB.getSession()?.isAdmin) {
    document.getElementById('page-admin').innerHTML = '<p style="color:var(--text-muted);padding:2rem;">Acesso restrito a administradores.</p>';
    return;
  }
  const requests = DB.getRequests().filter(r => r.status === 'pendente');
  document.getElementById('admin-requests-count').textContent = requests.length;

  document.getElementById('admin-requests-list').innerHTML = requests.length
    ? requests.map(r => `
      <div class="admin-request-card">
        <div>
          <div style="font-weight:600;">${r.name}</div>
          <div style="font-size:12px;color:var(--text-muted);">${r.email}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${timeAgo(r.createdAt)}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary-action" style="font-size:12px;" onclick="approveRequest(${r.id})">Aprovar</button>
          <button class="btn btn-danger" style="font-size:12px;" onclick="rejectRequest(${r.id})">Rejeitar</button>
        </div>
      </div>`).join('')
    : '<p style="color:var(--text-muted);font-size:13px;">Nenhuma solicitação pendente.</p>';
}

function approveRequest(id) {
  const r = DB.getRequests().find(r => r.id === id);
  openModal({
    title: `Aprovar: ${r?.name}`, wide: true,
    body: `
      <div class="form-grid">
        <div class="field"><label>Cargo</label><input id="f-mrole" type="text" value="Membro"></div>
        <div class="field"><label>Setor</label>
          <select id="f-msector">
            ${['Propulsão','Estrutura','Eletrônica','Aerodinâmica','Software','Gestão'].map(s=>`<option>${s}</option>`).join('')}
          </select>
        </div>
      </div>`,
    onConfirm: () => {
      DB.approveRequest(id, {
        role:   document.getElementById('f-mrole').value.trim(),
        sector: document.getElementById('f-msector').value,
        color:  avatarColor(DB.getMembers().length + 1),
      });
      closeModal(); toast(`${r?.name} aprovado e adicionado à equipe!`); renderAdmin(); renderMembers(); renderDashboard();
    }, confirmText: 'Aprovar e adicionar'
  });
}

function rejectRequest(id) {
  const r = DB.getRequests().find(r => r.id === id);
  confirmDialog(`Rejeitar solicitação de <strong>${r?.name}</strong>?`, () => {
    DB.rejectRequest(id); closeModal(); toast('Solicitação rejeitada.', 'info'); renderAdmin();
  });
}

/* ══════════════════════════════════════════════════════════
   LOGOUT
   ══════════════════════════════════════════════════════════ */
function logout() {
  DB.clearSession();
  window.location.href = 'login.html';
}

/* ══════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderSidebarUser();
  renderDashboard();
  renderCalendar(); // pré-renderiza mas só aparece quando clicado
});
