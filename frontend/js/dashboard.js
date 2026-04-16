/* ═══════════════════════════════════════════════════════════
   DeltaV Rocketry · Dashboard — Lógica dinâmica
   ───────────────────────────────────────────────────────────
   Hierarquia de permissões:
   • Admin   → CRUD total, painel de administração, metas
   • Líder   → CRUD de demandas do seu setor, avaliar
               relatórios do setor, calendário, metas (leitura)
   • User    → Leitura geral, mover próprias demandas,
               entregar próprios relatórios
   ═══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   AUTH GUARD
   ══════════════════════════════════════════════════════════ */
const session = DB.getSession();
if (!session) window.location.href = 'login.html';

/* ── Helpers de permissão ───────────────────────────────── */
const isAdmin  = () => !!DB.getSession()?.isAdmin;
const isLeader = () => !!DB.getSession()?.isLeader && !DB.getSession()?.isAdmin;
const canManageSector = () => isAdmin() || isLeader();
const currentUser = () => DB.getSession();

function sectorMembers() {
  const all = DB.getMembers();
  if (isAdmin()) return all;
  const u = currentUser();
  return all.filter(m => m.sector === u?.sector);
}

function demandInMySector(d) {
  if (isAdmin()) return true;
  const assignee = DB.getMemberById(d.assigneeId);
  return assignee?.sector === currentUser()?.sector;
}

/* ── Sidebar ────────────────────────────────────────────── */
function renderSidebarUser() {
  const u = DB.getSession();
  if (!u) return;
  document.querySelector('.sidebar-footer .name').textContent = u.name;
  document.querySelector('.sidebar-footer .role').textContent = (u.role || 'Membro') + ' · ' + (u.sector || '');
  const av = document.querySelector('.sidebar-footer .avatar');
  av.textContent = getInitials(u.name);
  av.style.background = u.color || avatarColor(u.id);
  document.querySelector('.sector-badge').textContent = u.sector || 'Geral';

  document.querySelector('.nav-item[data-page="admin"]').style.display = u.isAdmin ? 'flex' : 'none';
  document.querySelector('.nav-item[data-page="metas"]').style.display =
    (u.isAdmin || u.isLeader) ? 'flex' : 'none';

  const footer = document.querySelector('.sidebar-footer');
  footer.querySelectorAll('.admin-badge-sidebar, .leader-badge-sidebar').forEach(b => b.remove());
  if (u.isAdmin) {
    const b = document.createElement('span');
    b.className = 'admin-badge-sidebar'; b.textContent = 'Admin';
    footer.appendChild(b);
  } else if (u.isLeader) {
    const b = document.createElement('span');
    b.className = 'leader-badge-sidebar'; b.textContent = 'Líder';
    footer.appendChild(b);
  }
}

/* ══════════════════════════════════════════════════════════
   NAVEGAÇÃO
   ══════════════════════════════════════════════════════════ */
function switchPage(page) {
  if (!isAdmin() && page === 'admin') {
    toast('Acesso restrito a administradores.', 'error'); return;
  }
  if (!canManageSector() && page === 'metas') {
    toast('Acesso restrito.', 'error'); return;
  }

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
  const target = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (target) target.classList.add('active');
  const section = document.getElementById('page-' + page);
  if (section) section.classList.add('active');

  const titles = {
    dashboard:'Dashboard', demandas:'Demandas', calendario:'Calendário',
    membros:'Membros', relatorios:'Relatórios Semanais',
    metas:'Metas da Equipe', admin:'Administração'
  };
  document.getElementById('page-title').textContent = titles[page] || page;
  document.getElementById('sidebar').classList.remove('open');

  const renders = {
    dashboard: renderDashboard, demandas: renderKanban,
    calendario: renderCalendar, membros: renderMembers,
    relatorios: renderReports, metas: renderGoals, admin: renderAdmin
  };
  if (renders[page]) renders[page]();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

/* ══════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════ */
function renderDashboard() {
  const demands    = DB.getDemands();
  const members    = DB.getMembers();
  const reports    = DB.getReports();
  const activities = DB.getActivities();
  const goals      = DB.getGoals();
  const u          = currentUser();

  const visibleDemands = isAdmin()
    ? demands
    : isLeader()
      ? demands.filter(d => demandInMySector(d))
      : demands.filter(d => d.assigneeId === u?.id);

  const active = visibleDemands.filter(d => d.status !== 'done').length;
  const done   = visibleDemands.filter(d => d.status === 'done').length;

  const visibleReports = isAdmin()
    ? reports
    : isLeader()
      ? reports.filter(r => r.sector === u?.sector)
      : reports.filter(r => r.memberId === u?.id);
  const pending = visibleReports.filter(r => r.status === 'pendente' || r.status === 'atrasado').length;

  document.getElementById('stat-active').textContent  = active;
  document.getElementById('stat-done').textContent    = done;
  document.getElementById('stat-reports').textContent = pending;
  document.getElementById('stat-members').textContent = isLeader()
    ? members.filter(m => m.sector === u?.sector && m.active).length
    : members.filter(m => m.active).length;

  const statActiveLabel = document.querySelector('#stat-active')?.closest('.stat-card')?.querySelector('.stat-change');
  if (statActiveLabel) statActiveLabel.textContent =
    isAdmin() ? 'do setor' : isLeader() ? `em ${u?.sector}` : 'atribuídas a mim';

  const activeGoals = goals.filter(g => g.status === 'ativa').slice(0, 2);
  const goalsHtml = activeGoals.length ? activeGoals.map(g => `
    <div class="goal-mini">
      <div class="goal-mini-header">
        <span class="goal-mini-title">${g.title}</span>
        <span class="goal-mini-pct">${g.progress}%</span>
      </div>
      <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${g.progress}%;background:${g.progress>=80?'var(--green)':g.progress>=40?'var(--yellow)':'var(--accent)'}"></div></div>
      <div class="goal-mini-meta">${g.category} · prazo ${g.dueDate ? new Date(g.dueDate).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : '—'}</div>
    </div>`).join('') : '<p style="color:var(--text-muted);font-size:13px;padding:.5rem 0">Sem metas ativas.</p>';
  document.getElementById('dashboard-goals').innerHTML = goalsHtml;

  const goalsLink = document.getElementById('dash-goals-link');
  if (goalsLink) goalsLink.style.display = canManageSector() ? 'block' : 'none';

  const recent = visibleDemands.filter(d => d.status !== 'done').slice(0, 4);
  const PRIORITY_COLOR = { urgente:'var(--red)', alta:'var(--red)', media:'var(--yellow)', normal:'var(--green)' };
  const STATUS_CLASS   = { inprogress:'status-progresso', review:'status-revisao', todo:'status-revisao' };
  const STATUS_LABEL   = { inprogress:'Em progresso', review:'Em revisão', todo:'A fazer' };

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

  document.getElementById('recent-activities').innerHTML = activities.slice(0, 6).map(a => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${a.color};"></div>
      <div>
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${timeAgo(a.time)}</div>
      </div>
    </div>`).join('') || '<p style="color:var(--text-muted);font-size:13px;">Nenhuma atividade registrada.</p>';

  const badge = document.querySelector('.nav-item[data-page="demandas"] .nav-badge');
  if (badge) badge.textContent = demands.filter(d => d.status !== 'done').length;
  const badgeR = document.querySelector('.nav-item[data-page="relatorios"] .nav-badge-pink');
  if (badgeR) { const p = reports.filter(r => r.status === 'pendente' || r.status === 'atrasado').length; badgeR.textContent = p || ''; }
}

/* ══════════════════════════════════════════════════════════
   KANBAN
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
  const u       = currentUser();
  const demands = DB.getDemands();

  const visible = isAdmin()
    ? demands
    : isLeader()
      ? demands.filter(d => demandInMySector(d))
      : demands;

  document.querySelector('#page-demandas .page-toolbar-info').textContent = isLeader()
    ? `${visible.filter(d => d.status !== 'done').length} tarefas ativas · Setor ${u?.sector || ''}`
    : `${demands.filter(d => d.status !== 'done').length} tarefas ativas · ${u?.sector || 'Geral'}`;

  const btnNew = document.getElementById('btn-new-demand');
  if (btnNew) btnNew.style.display = canManageSector() ? 'flex' : 'none';

  const filterBar = document.getElementById('demand-filter-bar');
  if (filterBar) filterBar.style.display = 'flex';

  const filterVal = document.getElementById('demand-filter')?.value || 'all';
  let filtered = visible;
  if (filterVal === 'mine') filtered = visible.filter(d => d.assigneeId === u?.id);

  const grid = document.getElementById('kanban-grid');
  grid.innerHTML = KANBAN_COLS.map(col => {
    const cards = filtered.filter(d => d.status === col.id);
    const cardsHtml = cards.map(d => {
      const assignee  = DB.getMemberById(d.assigneeId);
      const aName     = assignee ? assignee.name.split(' ')[0] + ' ' + (assignee.name.split(' ').slice(-1)[0][0]||'') + '.' : '—';
      const due       = d.dueDate ? new Date(d.dueDate).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : '—';
      const isOverdue = d.dueDate && new Date(d.dueDate) < new Date() && d.status !== 'done';
      const isMine    = d.assigneeId === u?.id;
      const canEdit   = isAdmin() || (isLeader() && demandInMySector(d));

      let actionsHtml = '';
      if (canEdit) {
        actionsHtml = `<span class="kanban-card-actions">
          <button onclick="editDemand(${d.id})" title="Editar">✏</button>
          <button onclick="deleteDemandConfirm(${d.id})" title="Excluir">🗑</button>
        </span>`;
      } else if (isMine && col.id !== 'done') {
        actionsHtml = `<span class="kanban-card-actions">
          <button onclick="moveDemand(${d.id})" title="Atualizar status" class="btn-move">↗ Mover</button>
        </span>`;
      }

      return `<div class="kanban-card ${col.id==='done'?'done':''} ${isOverdue?'overdue':''}" data-id="${d.id}">
        <div class="kanban-card-title">${d.title}</div>
        ${col.id !== 'done' ? `<div class="kanban-tags"><span class="kanban-tag ${PRIORITY_CLASS[d.priority]||'tag-normal'}">${d.priority||'normal'}</span></div>` : ''}
        <div class="kanban-card-meta">
          <span class="${isOverdue?'color-red':''}">${col.id==='done'?'✓':'📅 '+due}</span>
          <span>· ${aName}${isMine?' <span class="mine-dot" title="Sua tarefa">●</span>':''}</span>
          ${actionsHtml}
        </div>
      </div>`;
    }).join('');

    return `<div class="kanban-col">
      <div class="kanban-col-header">
        <span class="kanban-col-title"><span class="kanban-dot" style="background:${col.color};"></span>${col.label} <span class="kanban-count">${cards.length}</span></span>
      </div>
      ${cardsHtml || `<div class="kanban-empty">Nenhuma tarefa</div>`}
    </div>`;
  }).join('');
}

function moveDemand(id) {
  const d = DB.getDemands().find(d => d.id === id);
  if (!d) return;
  const canMove = isAdmin() || (isLeader() && demandInMySector(d)) || d.assigneeId === currentUser()?.id;
  if (!canMove) { toast('Você não tem permissão.', 'error'); return; }

  const nextStatus  = { todo:'inprogress', inprogress:'review', review:'done' };
  const statusLabel = { todo:'A fazer', inprogress:'Em progresso', review:'Em revisão', done:'Concluída' };
  const next = nextStatus[d.status];
  if (!next) return;

  openModal({
    title: 'Atualizar Status da Tarefa',
    body: `<p style="color:var(--text-secondary);font-size:14px;">Mover "<strong>${d.title}</strong>" de <strong>${statusLabel[d.status]}</strong> para <strong>${statusLabel[next]}</strong>?</p>`,
    onConfirm: () => {
      DB.updateDemand(id, { status: next });
      DB.logActivity(`<strong>${currentUser()?.name}</strong> moveu "${d.title}" para ${statusLabel[next]}`, 'var(--accent)');
      closeModal(); toast('Status atualizado!'); renderKanban(); renderDashboard();
    }, confirmText: 'Confirmar'
  });
}

function openNewDemand() {
  if (!canManageSector()) { toast('Sem permissão para criar demandas.', 'error'); return; }
  const members = sectorMembers();
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
  if (!isAdmin() && !(isLeader() && demandInMySector(d))) {
    toast('Sem permissão para editar esta demanda.', 'error'); return;
  }
  const members = sectorMembers();
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
  if (!isAdmin() && !(isLeader() && demandInMySector(d))) {
    toast('Sem permissão para excluir esta demanda.', 'error'); return;
  }
  confirmDialog(`Excluir "<strong>${d?.title}</strong>"?`, () => {
    DB.deleteDemand(id); closeModal(); toast('Demanda excluída.', 'info'); renderKanban(); renderDashboard();
  });
}

/* ══════════════════════════════════════════════════════════
   CALENDÁRIO — Admin e Líder podem criar/editar eventos
   ══════════════════════════════════════════════════════════ */
let calDate = new Date();
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function changeMonth(dir) { calDate.setMonth(calDate.getMonth() + dir); renderCalendar(); }

function renderCalendar() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  document.getElementById('cal-month').textContent = MONTHS[m] + ' ' + y;

  const btnNewEvent = document.getElementById('btn-new-event');
  if (btnNewEvent) btnNewEvent.style.display = canManageSector() ? 'flex' : 'none';

  const events = DB.getEvents();
  const eventMap = {};
  events.forEach(e => { if (!eventMap[e.date]) eventMap[e.date] = []; eventMap[e.date].push(e); });

  const firstDay    = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrev  = new Date(y, m, 0).getDate();
  const today       = new Date();

  let html = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => `<div class="cal-header-cell">${d}</div>`).join('');

  for (let i = firstDay - 1; i >= 0; i--)
    html += `<div class="cal-cell other-month"><div class="cal-day">${daysInPrev - i}</div></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = (d === today.getDate() && m === today.getMonth() && y === today.getFullYear());
    const evs     = eventMap[dateStr] || [];
    const evHtml  = evs.map(e =>
      `<div class="cal-event" style="background:${e.bg};color:${e.color};" title="${e.title}" data-id="${e.id}">${e.title}${canManageSector()?` <span class="cal-event-del" onclick="event.stopPropagation();deleteEventConfirm(${e.id})">×</span>`:''}</div>`
    ).join('');
    const addBtn = canManageSector()
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

  if (canManageSector()) {
    document.querySelectorAll('.cal-event[data-id]').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.classList.contains('cal-event-del')) return;
        e.stopPropagation(); editEvent(parseInt(el.dataset.id));
      });
    });
  }
}

function openNewEvent(dateStr = '') {
  if (!canManageSector()) { toast('Sem permissão para criar eventos.', 'error'); return; }
  openModal({
    title: 'Novo Evento',
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
        accent:{ color:'var(--accent)', bg:'var(--accent-glow)' }, purple:{ color:'var(--purple)', bg:'var(--purple-bg)' },
        pink:  { color:'var(--pink)',   bg:'var(--pink-bg)' },     green: { color:'var(--green)',  bg:'var(--green-bg)' },
        red:   { color:'var(--red)',    bg:'var(--red-bg)' },
      };
      DB.addEvent({ title, date, ...colorMap[colorKey] });
      closeModal(); toast('Evento adicionado!'); renderCalendar();
    }, confirmText: 'Adicionar'
  });
}

function editEvent(id) {
  if (!canManageSector()) return;
  const e = DB.getEvents().find(e => e.id === id);
  if (!e) return;
  const colorReverseMap = { 'var(--accent)':'accent','var(--purple)':'purple','var(--pink)':'pink','var(--green)':'green','var(--red)':'red' };
  openModal({
    title: 'Editar Evento',
    body: `
      <div class="field"><label>Título *</label><input id="f-etitle" type="text" value="${e.title}"></div>
      <div class="field"><label>Data *</label><input id="f-edate" type="date" value="${e.date}"></div>
      <div class="field"><label>Cor</label>
        <select id="f-ecolor">
          ${['accent','purple','pink','green','red'].map(k =>
            `<option value="${k}" ${colorReverseMap[e.color]===k?'selected':''}>${{accent:'🟠 Laranja',purple:'🟣 Roxo',pink:'🩷 Rosa',green:'🟢 Verde',red:'🔴 Vermelho'}[k]}</option>`
          ).join('')}
        </select>
      </div>`,
    onConfirm: () => {
      const title = document.getElementById('f-etitle').value.trim();
      const date  = document.getElementById('f-edate').value;
      if (!title || !date) { toast('Preencha título e data.', 'error'); return; }
      const colorKey = document.getElementById('f-ecolor').value;
      const colorMap = {
        accent:{ color:'var(--accent)', bg:'var(--accent-glow)' }, purple:{ color:'var(--purple)', bg:'var(--purple-bg)' },
        pink:  { color:'var(--pink)',   bg:'var(--pink-bg)' },     green: { color:'var(--green)',  bg:'var(--green-bg)' },
        red:   { color:'var(--red)',    bg:'var(--red-bg)' },
      };
      DB.updateEvent(id, { title, date, ...colorMap[colorKey] });
      closeModal(); toast('Evento atualizado!'); renderCalendar();
    }, confirmText: 'Salvar'
  });
}

function deleteEventConfirm(id) {
  if (!canManageSector()) return;
  const e = DB.getEvents().find(e => e.id === id);
  confirmDialog(`Remover evento "<strong>${e?.title}</strong>"?`, () => {
    DB.deleteEvent(id); closeModal(); toast('Evento removido.', 'info'); renderCalendar();
  });
}

/* ══════════════════════════════════════════════════════════
   MEMBROS — Admin: CRUD | Líder/User: só próprio perfil
   ══════════════════════════════════════════════════════════ */
function renderMembers() {
  const members = DB.getMembers();
  const u       = currentUser();

  document.querySelector('#page-membros .page-toolbar-info').textContent = isLeader()
    ? `${members.filter(m => m.sector === u?.sector && m.active).length} membros em ${u?.sector}`
    : `${members.filter(m => m.active).length} membros ativos`;

  const btnNew = document.getElementById('btn-new-member');
  if (btnNew) btnNew.style.display = isAdmin() ? 'flex' : 'none';

  document.getElementById('members-grid').innerHTML = members.map(m => {
    const isMe = m.id === u?.id;
    const roleTag = m.isAdmin
      ? '<div class="member-admin-tag">Admin</div>'
      : m.isLeader
        ? '<div class="member-leader-tag">Líder</div>'
        : '';
    let actionsHtml = '<div class="member-actions"></div>';
    if (isAdmin()) {
      actionsHtml = `<div class="member-actions">
        <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;" onclick="editMember(${m.id})">Editar</button>
        ${!isMe ? `<button class="btn btn-danger" style="font-size:12px;padding:4px 10px;" onclick="deleteMemberConfirm(${m.id})">Remover</button>` : ''}
      </div>`;
    } else if (isMe) {
      actionsHtml = `<div class="member-actions">
        <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;" onclick="editMyProfile()">Meu Perfil</button>
      </div>`;
    }
    return `
    <div class="member-card ${isMe?'member-card-me':''}">
      <div class="member-avatar" style="background:${m.color || avatarColor(m.id)}">${getInitials(m.name)}</div>
      ${roleTag}
      <div class="member-name">${m.name}${isMe?' <span style="font-size:11px;color:var(--accent)">(você)</span>':''}</div>
      <div class="member-role">${m.role || 'Membro'}</div>
      <span class="member-sector">${m.sector || '—'}</span>
      ${actionsHtml}
    </div>`;
  }).join('');
}

function editMyProfile() {
  const u = currentUser();
  if (!u) return;
  openModal({
    title: 'Meu Perfil',
    body: `
      <div class="field"><label>Nome</label><input id="f-mname" type="text" value="${u.name}"></div>
      <div class="field"><label>Nova senha</label><input id="f-mpass" type="password" placeholder="Deixe em branco para manter"></div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:.5rem;">Setor e cargo são definidos pelo administrador.</p>`,
    onConfirm: () => {
      const name = document.getElementById('f-mname').value.trim();
      const pass = document.getElementById('f-mpass').value.trim();
      if (!name) { toast('Informe seu nome.', 'error'); return; }
      const update = { name };
      if (pass.length >= 6) update.password = pass;
      else if (pass.length > 0) { toast('Senha deve ter mínimo 6 caracteres.', 'error'); return; }
      DB.updateMember(u.id, update);
      closeModal(); toast('Perfil atualizado!'); renderSidebarUser(); renderMembers();
    }, confirmText: 'Salvar'
  });
}

function openNewMember() {
  if (!isAdmin()) { toast('Apenas administradores podem adicionar membros.', 'error'); return; }
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
            <option>Propulsão</option><option>Aviônica</option><option>P&D</option>
            <option>Aerodinâmica</option><option>Recuperação</option><option>SegOps</option>
            <option>Marketing</option><option>Gestão</option><option>Financeiro</option>
            <option>Relações</option>
          </select>
        </div>
        <div class="field"><label>Perfil de acesso</label>
          <select id="f-mlevel">
            <option value="user">Membro</option>
            <option value="leader">Líder de Setor</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>`,
    onConfirm: () => {
      const name  = document.getElementById('f-mname').value.trim();
      const email = document.getElementById('f-memail').value.trim();
      const pass  = document.getElementById('f-mpass').value.trim();
      if (!name || !email || !pass) { toast('Preencha nome, e-mail e senha.', 'error'); return; }
      if (pass.length < 6) { toast('Senha deve ter mínimo 6 caracteres.', 'error'); return; }
      const level = document.getElementById('f-mlevel').value;
      DB.addMember({
        name, email, password: pass,
        role:     document.getElementById('f-mrole').value.trim() || 'Membro',
        sector:   document.getElementById('f-msector').value,
        isAdmin:  level === 'admin',
        isLeader: level === 'leader',
        color:    avatarColor(DB.getMembers().length + 1),
      });
      closeModal(); toast('Membro adicionado!'); renderMembers(); renderDashboard();
    }, confirmText: 'Adicionar'
  });
}

function editMember(id) {
  if (!isAdmin()) { toast('Apenas administradores podem editar membros.', 'error'); return; }
  const m = DB.getMemberById(id);
  if (!m) return;
  const currentLevel = m.isAdmin ? 'admin' : m.isLeader ? 'leader' : 'user';
  openModal({
    title: 'Editar Membro', wide: true,
    body: `
      <div class="form-grid">
        <div class="field"><label>Nome *</label><input id="f-mname" type="text" value="${m.name}"></div>
        <div class="field"><label>E-mail</label><input id="f-memail" type="email" value="${m.email||''}"></div>
        <div class="field"><label>Nova senha</label><input id="f-mpass" type="password" placeholder="Deixe em branco para manter"></div>
        <div class="field"><label>Cargo</label><input id="f-mrole" type="text" value="${m.role||''}"></div>
        <div class="field"><label>Setor</label>
          <select id="f-msector">
            ${['Propulsão','Estrutura e Aerodinâmica','Aviônica','P&D', 'SegOp','Marketing','Financeiro','Recuperação','Gestão','Relações'].map(s=>`<option ${m.sector===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Perfil de acesso</label>
          <select id="f-mlevel">
            <option value="user"   ${currentLevel==='user'  ?'selected':''}>Membro</option>
            <option value="leader" ${currentLevel==='leader'?'selected':''}>Líder de Setor</option>
            <option value="admin"  ${currentLevel==='admin' ?'selected':''}>Administrador</option>
          </select>
        </div>
      </div>`,
    onConfirm: () => {
      const name = document.getElementById('f-mname').value.trim();
      const pass = document.getElementById('f-mpass').value.trim();
      if (!name) { toast('Informe o nome.', 'error'); return; }
      if (pass && pass.length < 6) { toast('Senha deve ter mínimo 6 caracteres.', 'error'); return; }
      const level = document.getElementById('f-mlevel').value;
      const update = {
        name, email: document.getElementById('f-memail').value.trim(),
        role:     document.getElementById('f-mrole').value.trim(),
        sector:   document.getElementById('f-msector').value,
        isAdmin:  level === 'admin',
        isLeader: level === 'leader',
      };
      if (pass) update.password = pass;
      DB.updateMember(id, update);
      closeModal(); toast('Membro atualizado!'); renderMembers();
    }, confirmText: 'Salvar'
  });
}

function deleteMemberConfirm(id) {
  if (!isAdmin()) { toast('Apenas administradores podem remover membros.', 'error'); return; }
  const m = DB.getMemberById(id);
  if (m?.id === currentUser()?.id) { toast('Você não pode remover a si mesmo.', 'error'); return; }
  confirmDialog(`Remover "<strong>${m?.name}</strong>" da equipe?`, () => {
    DB.deleteMember(id); closeModal(); toast('Membro removido.', 'info'); renderMembers(); renderDashboard();
  });
}

/* ══════════════════════════════════════════════════════════
   RELATÓRIOS
   Admin:  CRUD + avaliação de todos
   Líder:  avaliação do próprio setor + entrega do próprio
   User:   só entrega do próprio relatório
   ══════════════════════════════════════════════════════════ */
let reportTab = 'atual';

function renderReports() {
  const reports = DB.getReports();
  const u       = currentUser();

  const btnNew = document.getElementById('btn-new-report');
  if (btnNew) btnNew.style.display = isAdmin() ? 'flex' : 'none';

  let filtered = reports;
  if (reportTab === 'meus') {
    filtered = reports.filter(r => r.memberId === u?.id);
  } else if (isLeader()) {
    filtered = reports.filter(r => r.sector === u?.sector);
  }

  const STATUS_MAP = {
    pendente: { cls:'status-pendente', label:'Pendente' },
    entregue: { cls:'status-entregue', label:'Entregue' },
    avaliado: { cls:'status-avaliado', label:'Avaliado' },
    atrasado: { cls:'status-atrasado', label:'Atrasado' },
  };

  document.getElementById('reports-table-body').innerHTML = filtered.map(r => {
    const s      = STATUS_MAP[r.status] || STATUS_MAP.pendente;
    const isMine = r.memberId === u?.id;
    const canWrite = isMine && (r.status === 'pendente' || r.status === 'atrasado');
    const canEval  = r.status === 'entregue' &&
      (isAdmin() || (isLeader() && r.sector === u?.sector));
    const canView  = (r.status === 'entregue' || r.status === 'avaliado') &&
      (isAdmin() || (isLeader() && r.sector === u?.sector));
    const canDel   = isAdmin();

    return `<tr>
      <td class="td-name">${r.memberName}${isMine?' <span style="font-size:10px;color:var(--accent)">(você)</span>':''}</td>
      <td>${r.sector||'—'}</td>
      <td><span class="status-badge ${s.cls}">${s.label}</span></td>
      <td>${r.deliveredAt
        ? fmtDate(r.deliveredAt) + ', ' + new Date(r.deliveredAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
        : '<span class="color-muted">—</span>'}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          ${r.grade ? `<span class="color-green">✓ ${r.grade}</span>` : '<span class="color-muted">Aguardando</span>'}
          ${canWrite ? `<button class="btn btn-primary-action report-btn" onclick="openDeliverReport(${r.id})">📝 Entregar</button>` : ''}
          ${canEval  ? `<button class="btn btn-primary-action report-btn" onclick="evalReport(${r.id})">⭐ Avaliar</button>` : ''}
          ${canView  ? `<button class="btn btn-ghost report-btn" onclick="viewReport(${r.id})">👁 Ver</button>` : ''}
          ${canDel   ? `<button class="btn btn-ghost report-btn" style="color:var(--red);" onclick="deleteReportConfirm(${r.id})">🗑</button>` : ''}
        </div>
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

function openDeliverReport(id) {
  const r = DB.getReports().find(r => r.id === id);
  if (!r) return;
  if (r.memberId !== currentUser()?.id && !isAdmin()) {
    toast('Você só pode entregar seus próprios relatórios.', 'error'); return;
  }
  openModal({
    title: `Entregar Relatório — ${r.week}`, wide: true,
    body: `
      <div class="field">
        <label>Resumo das atividades *</label>
        <textarea id="f-rcontent" rows="6" placeholder="Descreva o que foi feito nesta semana, dificuldades encontradas e próximos passos..."
          style="width:100%;resize:vertical;font-size:13px;">${r.content||''}</textarea>
      </div>
      <p style="font-size:12px;color:var(--text-muted);">Prazo: <strong>${r.deadline ? new Date(r.deadline).toLocaleString('pt-BR') : '—'}</strong></p>`,
    onConfirm: () => {
      const content = document.getElementById('f-rcontent').value.trim();
      if (!content) { toast('Preencha o resumo das atividades.', 'error'); return; }
      const isLate = r.deadline && new Date() > new Date(r.deadline);
      DB.updateReport(id, { status: isLate ? 'atrasado' : 'entregue', deliveredAt: new Date().toISOString(), content });
      DB.logActivity(`<strong>${currentUser()?.name}</strong> entregou relatório da ${r.week}`, 'var(--pink)');
      closeModal(); toast(isLate ? 'Relatório entregue (com atraso).' : 'Relatório entregue!'); renderReports(); renderDashboard();
    }, confirmText: 'Entregar relatório'
  });
}

function viewReport(id) {
  const r = DB.getReports().find(r => r.id === id);
  if (!r) return;
  openModal({
    title: `Relatório — ${r.memberName}`,
    body: `
      <div style="margin-bottom:.75rem;">
        <span class="status-badge status-${r.status}">${r.status}</span>
        <span style="font-size:12px;color:var(--text-muted);margin-left:8px;">${r.week} · ${r.weekLabel||''}</span>
      </div>
      <div style="background:var(--bg-secondary);border-radius:8px;padding:1rem;font-size:13px;color:var(--text-secondary);white-space:pre-wrap;min-height:80px;">${r.content || '<em>Sem conteúdo registrado.</em>'}</div>
      ${r.grade ? `<div style="margin-top:.75rem;font-size:13px;"><strong>Avaliação:</strong> <span class="color-green">${r.grade}</span></div>` : ''}`,
    confirmText: null
  });
}

function openNewReport() {
  if (!isAdmin()) { toast('Apenas administradores podem criar ciclos.', 'error'); return; }
  const members = DB.getMembers();
  openModal({
    title: 'Criar Ciclo de Relatórios', wide: true,
    body: `
      <div class="field"><label>Semana / Ciclo *</label><input id="f-rweek" type="text" placeholder="ex: Semana 17"></div>
      <div class="field"><label>Período</label><input id="f-rperiod" type="text" placeholder="ex: 21/04 – 25/04"></div>
      <div class="field"><label>Prazo de entrega *</label><input id="f-rdeadline" type="datetime-local"></div>
      <p style="font-size:13px;color:var(--text-muted);margin-top:.5rem;">Um relatório pendente será criado para cada membro ativo (${members.filter(m=>m.active).length} membros).</p>`,
    onConfirm: () => {
      const week    = document.getElementById('f-rweek').value.trim();
      const period  = document.getElementById('f-rperiod').value.trim();
      const deadline= document.getElementById('f-rdeadline').value;
      if (!week || !deadline) { toast('Preencha semana e prazo.', 'error'); return; }
      members.filter(m => m.active).forEach(m => {
        DB.addReport({ memberId: m.id, memberName: m.name, sector: m.sector, week, weekLabel: period, deadline });
      });
      DB.logActivity(`<strong>Sistema</strong> abriu ciclo de relatórios: ${week}`, 'var(--yellow)');
      closeModal(); toast(`Ciclo "${week}" criado para ${members.filter(m=>m.active).length} membros!`); renderReports();
    }, confirmText: 'Criar ciclo'
  });
}

function evalReport(id) {
  const u = currentUser();
  const r = DB.getReports().find(r => r.id === id);
  if (!isAdmin() && !(isLeader() && r?.sector === u?.sector)) {
    toast('Sem permissão para avaliar este relatório.', 'error'); return;
  }
  const evaluatorLabel = isAdmin() ? 'Admin' : `Líder de ${u?.sector}`;
  openModal({
    title: `Avaliar: ${r?.memberName}`, wide: true,
    body: `
      ${r?.content ? `<div style="background:var(--bg-secondary);border-radius:8px;padding:.75rem;font-size:13px;color:var(--text-secondary);white-space:pre-wrap;margin-bottom:1rem;max-height:150px;overflow-y:auto;">${r.content}</div>` : ''}
      <div class="field"><label>Avaliação</label>
        <select id="f-grade">
          <option value="aprovado">✓ Aprovado</option>
          <option value="aprovado com ressalvas">⚠ Aprovado com ressalvas</option>
          <option value="reprovado">✕ Reprovado</option>
        </select>
      </div>`,
    onConfirm: () => {
      const grade = document.getElementById('f-grade').value;
      DB.updateReport(id, { status: 'avaliado', grade });
      DB.logActivity(`<strong>${evaluatorLabel}</strong> avaliou relatório de ${r?.memberName}: ${grade}`, 'var(--yellow)');
      closeModal(); toast('Avaliação registrada!'); renderReports();
    }, confirmText: 'Confirmar avaliação'
  });
}

function deleteReportConfirm(id) {
  if (!isAdmin()) return;
  confirmDialog('Excluir este relatório?', () => {
    DB.deleteReport(id); closeModal(); toast('Relatório excluído.', 'info'); renderReports();
  });
}

/* ══════════════════════════════════════════════════════════
   METAS — Admin: CRUD | Líder: somente leitura
   ══════════════════════════════════════════════════════════ */
function renderGoals() {
  if (!canManageSector()) {
    toast('Acesso restrito.', 'error'); switchPage('dashboard'); return;
  }

  const goals  = DB.getGoals();
  const active = goals.filter(g => g.status === 'ativa');
  const done   = goals.filter(g => g.status === 'concluida');
  const PCAT   = { 'Técnica':'var(--accent)', 'Testes':'var(--green)', 'Gestão':'var(--purple)', 'Outro':'var(--text-muted)' };
  const PRIO_C = { urgente:'var(--red)', alta:'var(--accent)', media:'var(--yellow)', normal:'var(--green)' };

  // Botão nova meta: só admin
  const btnNew = document.querySelector('#page-metas .btn-primary-action');
  if (btnNew) btnNew.style.display = isAdmin() ? 'flex' : 'none';

  const renderCard = g => `
    <div class="goal-card ${g.status==='concluida'?'goal-done':''}">
      <div class="goal-card-header">
        <div>
          <div class="goal-card-title">${g.title}</div>
          <div class="goal-card-meta">
            <span class="goal-tag" style="background:${PCAT[g.category]||'var(--text-muted)'}22;color:${PCAT[g.category]||'var(--text-muted)'};">${g.category||'Outro'}</span>
            <span class="goal-tag" style="background:${PRIO_C[g.priority]||'var(--text-muted)'}22;color:${PRIO_C[g.priority]||'var(--text-muted)'};">${g.priority||'normal'}</span>
            ${g.dueDate?`<span style="font-size:11px;color:var(--text-muted);">📅 ${new Date(g.dueDate).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span>`:''}
          </div>
        </div>
        ${isAdmin() ? `<div class="goal-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="editGoal(${g.id})">✏</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="deleteGoalConfirm(${g.id})">🗑</button>
        </div>` : ''}
      </div>
      ${g.description?`<p class="goal-description">${g.description}</p>`:''}
      <div class="goal-progress-section">
        <div class="goal-progress-label">
          <span>Progresso</span>
          <span class="goal-pct-label">${g.progress}%</span>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="width:${g.progress}%;background:${g.progress>=80?'var(--green)':g.progress>=40?'var(--yellow)':'var(--accent)'}"></div>
        </div>
        ${isAdmin() ? `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
          ${[0,25,50,75,100].map(p=>`<button class="btn btn-ghost btn-sm ${g.progress===p?'btn-active':''}" onclick="setGoalProgress(${g.id},${p})">${p}%</button>`).join('')}
          <button class="btn btn-ghost btn-sm" onclick="setGoalProgressCustom(${g.id})">Outro</button>
          ${g.status!=='concluida'?`<button class="btn btn-primary-action btn-sm" onclick="concludeGoal(${g.id})" style="margin-left:auto;">✓ Concluir</button>`:''}
        </div>` : ''}
      </div>
    </div>`;

  document.getElementById('goals-active').innerHTML = active.map(renderCard).join('')
    || '<p style="color:var(--text-muted);font-size:13px;padding:1rem 0">Nenhuma meta ativa.</p>';

  const doneContainer = document.getElementById('goals-done');
  if (doneContainer) doneContainer.innerHTML = done.map(renderCard).join('')
    || '<p style="color:var(--text-muted);font-size:13px;padding:1rem 0">Nenhuma meta concluída ainda.</p>';

  const totalPct = active.length ? Math.round(active.reduce((s,g)=>s+g.progress,0)/active.length) : 0;
  const elStat = document.getElementById('goals-stat-pct');
  if (elStat) elStat.textContent = totalPct + '%';
  const elCount = document.getElementById('goals-stat-count');
  if (elCount) elCount.textContent = active.length;
}

function openNewGoal() {
  if (!isAdmin()) { toast('Apenas administradores podem criar metas.', 'error'); return; }
  openModal({
    title: 'Nova Meta da Equipe', wide: true,
    body: `
      <div class="form-grid">
        <div class="field field-full"><label>Título *</label><input id="f-gtitle" type="text" placeholder="Ex: Concluir injetor v2"></div>
        <div class="field field-full"><label>Descrição</label><textarea id="f-gdesc" rows="2" placeholder="Detalhes da meta..." style="width:100%;resize:vertical;font-size:13px;"></textarea></div>
        <div class="field"><label>Categoria</label>
          <select id="f-gcat"><option>Técnica</option><option>Testes</option><option>Gestão</option><option>Outro</option></select>
        </div>
        <div class="field"><label>Prioridade</label>
          <select id="f-gprio">
            <option value="urgente">🔴 Urgente</option><option value="alta">🟠 Alta</option>
            <option value="media" selected>🟡 Média</option><option value="normal">🟢 Normal</option>
          </select>
        </div>
        <div class="field"><label>Prazo</label><input id="f-gdue" type="date"></div>
        <div class="field"><label>Progresso inicial (%)</label><input id="f-gpct" type="number" min="0" max="100" value="0"></div>
      </div>`,
    onConfirm: () => {
      const title = document.getElementById('f-gtitle').value.trim();
      if (!title) { toast('Informe o título da meta.', 'error'); return; }
      DB.addGoal({
        title, description: document.getElementById('f-gdesc').value.trim(),
        category: document.getElementById('f-gcat').value,
        priority: document.getElementById('f-gprio').value,
        dueDate:  document.getElementById('f-gdue').value,
        progress: parseInt(document.getElementById('f-gpct').value) || 0,
      });
      closeModal(); toast('Meta criada!'); renderGoals();
    }, confirmText: 'Criar meta'
  });
}

function editGoal(id) {
  if (!isAdmin()) { toast('Apenas administradores podem editar metas.', 'error'); return; }
  const g = DB.getGoals().find(g => g.id === id);
  if (!g) return;
  openModal({
    title: 'Editar Meta', wide: true,
    body: `
      <div class="form-grid">
        <div class="field field-full"><label>Título *</label><input id="f-gtitle" type="text" value="${g.title}"></div>
        <div class="field field-full"><label>Descrição</label><textarea id="f-gdesc" rows="2" style="width:100%;resize:vertical;font-size:13px;">${g.description||''}</textarea></div>
        <div class="field"><label>Categoria</label>
          <select id="f-gcat">${['Técnica','Testes','Gestão','Outro'].map(c=>`<option ${g.category===c?'selected':''}>${c}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Prioridade</label>
          <select id="f-gprio">${['urgente','alta','media','normal'].map(p=>`<option value="${p}" ${g.priority===p?'selected':''}>${p}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Prazo</label><input id="f-gdue" type="date" value="${g.dueDate||''}"></div>
        <div class="field"><label>Progresso (%)</label><input id="f-gpct" type="number" min="0" max="100" value="${g.progress}"></div>
      </div>`,
    onConfirm: () => {
      const title = document.getElementById('f-gtitle').value.trim();
      if (!title) { toast('Informe o título.', 'error'); return; }
      DB.updateGoal(id, {
        title, description: document.getElementById('f-gdesc').value.trim(),
        category: document.getElementById('f-gcat').value,
        priority: document.getElementById('f-gprio').value,
        dueDate:  document.getElementById('f-gdue').value,
        progress: parseInt(document.getElementById('f-gpct').value) || 0,
      });
      closeModal(); toast('Meta atualizada!'); renderGoals();
    }, confirmText: 'Salvar'
  });
}

function setGoalProgress(id, pct) {
  if (!isAdmin()) return;
  DB.updateGoal(id, { progress: pct });
  if (pct === 100) DB.updateGoal(id, { status: 'concluida' });
  renderGoals(); renderDashboard();
}

function setGoalProgressCustom(id) {
  if (!isAdmin()) return;
  const g = DB.getGoals().find(g => g.id === id);
  openModal({
    title: 'Atualizar Progresso',
    body: `<div class="field"><label>Progresso (%)</label><input id="f-gpct" type="number" min="0" max="100" value="${g?.progress||0}"></div>`,
    onConfirm: () => {
      const pct = Math.min(100, Math.max(0, parseInt(document.getElementById('f-gpct').value) || 0));
      DB.updateGoal(id, { progress: pct });
      if (pct === 100) DB.updateGoal(id, { status: 'concluida' });
      closeModal(); toast('Progresso atualizado!'); renderGoals(); renderDashboard();
    }, confirmText: 'Salvar'
  });
}

function concludeGoal(id) {
  if (!isAdmin()) return;
  const g = DB.getGoals().find(g => g.id === id);
  confirmDialog(`Marcar "<strong>${g?.title}</strong>" como concluída?`, () => {
    DB.updateGoal(id, { status: 'concluida', progress: 100 });
    DB.logActivity(`Meta concluída: <strong>${g?.title}</strong>`, 'var(--green)');
    closeModal(); toast('Meta concluída! 🎉'); renderGoals(); renderDashboard();
  });
}

function deleteGoalConfirm(id) {
  if (!isAdmin()) return;
  const g = DB.getGoals().find(g => g.id === id);
  confirmDialog(`Excluir meta "<strong>${g?.title}</strong>"?`, () => {
    DB.deleteGoal(id); closeModal(); toast('Meta excluída.', 'info'); renderGoals();
  });
}

/* ══════════════════════════════════════════════════════════
   PAINEL DE ADMINISTRAÇÃO — Admin only
   ══════════════════════════════════════════════════════════ */
function renderAdmin() {
  if (!isAdmin()) {
    toast('Acesso restrito a administradores.', 'error'); switchPage('dashboard'); return;
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

  const members = DB.getMembers();
  const demands = DB.getDemands();
  const reports = DB.getReports();
  const goals   = DB.getGoals();
  document.getElementById('admin-stat-members').textContent = members.filter(m=>m.active).length;
  document.getElementById('admin-stat-demands').textContent = demands.filter(d=>d.status!=='done').length;
  document.getElementById('admin-stat-reports').textContent = reports.filter(r=>r.status==='pendente'||r.status==='atrasado').length;
  document.getElementById('admin-stat-goals').textContent   = goals.filter(g=>g.status==='ativa').length;
}

function approveRequest(id) {
  if (!isAdmin()) return;
  const r = DB.getRequests().find(r => r.id === id);
  openModal({
    title: `Aprovar: ${r?.name}`, wide: true,
    body: `
      <div class="form-grid">
        <div class="field"><label>Cargo</label><input id="f-mrole" type="text" value="Membro"></div>
        <div class="field"><label>Setor</label>
          <select id="f-msector">
            ${['Propulsão','Estrutura e Aerodinâmica','Aviônica','P&D', 'SegOp','Marketing','Financeiro','Recuperação','Gestão','Relações'].map(s=>`<option>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Perfil de acesso</label>
          <select id="f-mlevel">
            <option value="user">Membro</option>
            <option value="leader">Líder de Setor</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>`,
    onConfirm: () => {
      const level = document.getElementById('f-mlevel').value;
      DB.approveRequest(id, {
        role:     document.getElementById('f-mrole').value.trim(),
        sector:   document.getElementById('f-msector').value,
        isLeader: level === 'leader',
        isAdmin:  level === 'admin',
        color:    avatarColor(DB.getMembers().length + 1),
      });
      closeModal(); toast(`${r?.name} aprovado e adicionado à equipe!`);
      renderAdmin(); renderMembers(); renderDashboard();
    }, confirmText: 'Aprovar e adicionar'
  });
}

function rejectRequest(id) {
  if (!isAdmin()) return;
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
  renderCalendar();

  // Botões de ação iniciais
  const el = id => document.getElementById(id);
  if (el('btn-new-demand')) el('btn-new-demand').style.display = canManageSector() ? 'flex' : 'none';
  if (el('btn-new-event'))  el('btn-new-event').style.display  = canManageSector() ? 'flex' : 'none';
  if (el('btn-new-member')) el('btn-new-member').style.display = isAdmin() ? 'flex' : 'none';
  if (el('btn-new-report')) el('btn-new-report').style.display = isAdmin() ? 'flex' : 'none';
});
