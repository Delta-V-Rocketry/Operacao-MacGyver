/* ═══════════════════════════════════════
   Delta Rockets · Dashboard & Módulos
   ═══════════════════════════════════════ */

// ─── Navegação entre páginas ───
function switchPage(page) {
  // Atualizar sidebar
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (target) target.classList.add('active');

  // Atualizar conteúdo
  document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
  const section = document.getElementById('page-' + page);
  if (section) section.classList.add('active');

  // Atualizar título
  const titles = {
    dashboard:  'Dashboard',
    demandas:   'Demandas',
    calendario: 'Calendário',
    membros:    'Membros',
    relatorios: 'Relatórios Semanais'
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  // Fechar sidebar no mobile
  document.getElementById('sidebar').classList.remove('open');
}

// ─── Toggle sidebar (mobile) ───
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}


// ══════════════════════════════════════
// CALENDÁRIO
// ══════════════════════════════════════

// Eventos de exemplo
const calEvents = {
  '2026-04-14': [
    { text: 'Prazo: Simulação pressão', color: 'var(--red)',  bg: 'var(--red-bg)' }
  ],
  '2026-04-16': [
    { text: 'Reunião de setor',         color: 'var(--purple)', bg: 'var(--purple-bg)' }
  ],
  '2026-04-18': [
    { text: 'Prazo: Relatórios',        color: 'var(--pink)',   bg: 'var(--pink-bg)' },
    { text: 'Prazo: Injetor v2',        color: 'var(--accent)', bg: 'var(--accent-glow)' }
  ],
  '2026-04-22': [
    { text: 'Teste estático #5',        color: 'var(--green)',  bg: 'var(--green-bg)' }
  ],
  '2026-04-25': [
    { text: 'Prazo: Relatórios',        color: 'var(--pink)',   bg: 'var(--pink-bg)' }
  ],
};

let currentDate = new Date(2026, 3, 1); // Abril 2026

function changeMonth(dir) {
  currentDate.setMonth(currentDate.getMonth() + dir);
  renderCalendar();
}

function renderCalendar() {
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const months = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];

  document.getElementById('cal-month').textContent = months[month] + ' ' + year;

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  let html = '';

  // Cabeçalho dos dias da semana
  ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(d => {
    html += `<div class="cal-header-cell">${d}</div>`;
  });

  // Dias do mês anterior
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-cell other-month"><div class="cal-day">${daysInPrev - i}</div></div>`;
  }

  // Dias do mês atual
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = (d === 14 && month === 3 && year === 2026); // hoje = 14/04/2026
    const events  = calEvents[dateStr] || [];

    const eventsHtml = events.map(e =>
      `<div class="cal-event" style="background:${e.bg};color:${e.color};">${e.text}</div>`
    ).join('');

    html += `<div class="cal-cell${isToday ? ' today' : ''}">
      <div class="cal-day">${d}</div>${eventsHtml}
    </div>`;
  }

  // Dias do próximo mês (completar grid)
  const totalCells = firstDay + daysInMonth;
  const remaining  = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="cal-cell other-month"><div class="cal-day">${i}</div></div>`;
  }

  document.getElementById('calendar').innerHTML = html;
}


// ══════════════════════════════════════
// RELATÓRIOS — Tabs
// ══════════════════════════════════════
function initReportTabs() {
  document.querySelectorAll('.report-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // TODO: filtrar tabela conforme aba selecionada
    });
  });
}


// ══════════════════════════════════════
// INICIALIZAÇÃO
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  renderCalendar();
  initReportTabs();
});