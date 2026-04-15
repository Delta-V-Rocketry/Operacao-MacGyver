/* ═══════════════════════════════════════════════════════════
   Delta Rockets · Data Store
   ───────────────────────────────────────────────────────────
   Agora:   localStorage (frontend-only, sem backend)
   Futuro:  trocar cada método por fetch() para a API Flask/FastAPI
            Exemplo:
              AGORA:   return this.get('members')
              FUTURO:  return await fetch('/api/members').then(r=>r.json())
   ═══════════════════════════════════════════════════════════ */

const DB = {

  /* ── Helpers localStorage ────────────────────────────── */
  _get(key)      { try { return JSON.parse(localStorage.getItem('dr_' + key)) ?? null; } catch { return null; } },
  _set(key, val) { localStorage.setItem('dr_' + key, JSON.stringify(val)); },
  _nextId(arr)   { return arr.length ? Math.max(...arr.map(i => i.id)) + 1 : 1; },

  /* ══════════════════════════════════════════════════════
     SESSÃO / AUTH
     FUTURO: POST /api/auth/login  →  {token, user}
     ══════════════════════════════════════════════════════ */
  getSession()        { return this._get('session'); },
  setSession(user)    { this._set('session', user); },
  clearSession()      { localStorage.removeItem('dr_session'); },

  /* ══════════════════════════════════════════════════════
     MEMBROS
     FUTURO: GET/POST/PUT/DELETE /api/members
     ══════════════════════════════════════════════════════ */
  getMembers()        { return this._get('members') || []; },
  _saveMembers(list)  { this._set('members', list); },

  addMember(data) {
    const list = this.getMembers();
    const member = { ...data, id: this._nextId(list), createdAt: new Date().toISOString(), active: true };
    list.push(member);
    this._saveMembers(list);
    this.logActivity(`<strong>${member.name}</strong> foi adicionado como membro`, 'var(--green)');
    return member;
  },
  updateMember(id, data) {
    const list = this.getMembers().map(m => m.id === id ? { ...m, ...data } : m);
    this._saveMembers(list);
  },
  deleteMember(id) {
    const m = this.getMembers().find(m => m.id === id);
    this._saveMembers(this.getMembers().filter(m => m.id !== id));
    if (m) this.logActivity(`<strong>${m.name}</strong> foi removido`, 'var(--red)');
  },
  getMemberById(id)   { return this.getMembers().find(m => m.id === id); },

  /* ══════════════════════════════════════════════════════
     DEMANDAS (Kanban)
     FUTURO: GET/POST/PUT/DELETE /api/demands
     ══════════════════════════════════════════════════════ */
  getDemands()        { return this._get('demands') || []; },
  _saveDemands(list)  { this._set('demands', list); },

  addDemand(data) {
    const list = this.getDemands();
    const demand = { ...data, id: this._nextId(list), createdAt: new Date().toISOString(), status: data.status || 'todo' };
    list.push(demand);
    this._saveDemands(list);
    this.logActivity(`Nova demanda criada: <strong>${demand.title}</strong>`, 'var(--accent)');
    return demand;
  },
  updateDemand(id, data) {
    const list = this.getDemands().map(d => d.id === id ? { ...d, ...data } : d);
    this._saveDemands(list);
  },
  deleteDemand(id) {
    const d = this.getDemands().find(d => d.id === id);
    this._saveDemands(this.getDemands().filter(d => d.id !== id));
    if (d) this.logActivity(`Demanda removida: <strong>${d.title}</strong>`, 'var(--red)');
  },

  /* ══════════════════════════════════════════════════════
     EVENTOS (Calendário)
     FUTURO: GET/POST/PUT/DELETE /api/events
     ══════════════════════════════════════════════════════ */
  getEvents()         { return this._get('events') || []; },
  _saveEvents(list)   { this._set('events', list); },

  addEvent(data) {
    const list = this.getEvents();
    const event = { ...data, id: this._nextId(list), createdAt: new Date().toISOString() };
    list.push(event);
    this._saveEvents(list);
    this.logActivity(`Evento criado: <strong>${event.title}</strong>`, 'var(--purple)');
    return event;
  },
  updateEvent(id, data) {
    const list = this.getEvents().map(e => e.id === id ? { ...e, ...data } : e);
    this._saveEvents(list);
  },
  deleteEvent(id) {
    this._saveEvents(this.getEvents().filter(e => e.id !== id));
  },

  /* ══════════════════════════════════════════════════════
     RELATÓRIOS
     FUTURO: GET/POST/PUT /api/reports
     ══════════════════════════════════════════════════════ */
  getReports()        { return this._get('reports') || []; },
  _saveReports(list)  { this._set('reports', list); },

  addReport(data) {
    const list = this.getReports();
    const report = { ...data, id: this._nextId(list), createdAt: new Date().toISOString(), status: 'pendente', deliveredAt: null, grade: null };
    list.push(report);
    this._saveReports(list);
    return report;
  },
  updateReport(id, data) {
    const list = this.getReports().map(r => r.id === id ? { ...r, ...data } : r);
    this._saveReports(list);
  },

  /* ══════════════════════════════════════════════════════
     ATIVIDADES (log automático)
     FUTURO: GET /api/activities
     ══════════════════════════════════════════════════════ */
  getActivities()     { return this._get('activities') || []; },
  logActivity(text, color = 'var(--accent)') {
    const list = this.getActivities();
    list.unshift({ id: Date.now(), text, color, time: new Date().toISOString() });
    if (list.length > 100) list.pop();
    this._set('activities', list);
  },

  /* ══════════════════════════════════════════════════════
     SOLICITAÇÕES DE CADASTRO (primeiro acesso)
     FUTURO: GET/POST/PUT /api/requests
     ══════════════════════════════════════════════════════ */
  getRequests()       { return this._get('requests') || []; },
  _saveRequests(list) { this._set('requests', list); },
  addRequest(data) {
    const list = this.getRequests();
    const req = { ...data, id: this._nextId(list), createdAt: new Date().toISOString(), status: 'pendente' };
    list.push(req);
    this._saveRequests(list);
    return req;
  },
  approveRequest(id, extraData) {
    const req = this.getRequests().find(r => r.id === id);
    if (!req) return;
    this.addMember({ name: req.name, email: req.email, password: req.password, ...extraData });
    this._saveRequests(this.getRequests().map(r => r.id === id ? { ...r, status: 'aprovado' } : r));
  },
  rejectRequest(id) {
    this._saveRequests(this.getRequests().map(r => r.id === id ? { ...r, status: 'rejeitado' } : r));
  },
};

/* ══════════════════════════════════════════════════════════
   SEED INICIAL — só popula se banco estiver vazio
   Remove ou adapte ao migrar para backend real
   ══════════════════════════════════════════════════════════ */
(function seed() {
  if (DB.getMembers().length > 0) return;

  const COLORS = [
    'linear-gradient(135deg,#E8601A,#F4813B)',
    'linear-gradient(135deg,#5DCAA5,#3CB389)',
    'linear-gradient(135deg,#AFA9EC,#8B83D9)',
    'linear-gradient(135deg,#ED93B1,#D46B8E)',
    'linear-gradient(135deg,#EF9F27,#D48A15)',
    'linear-gradient(135deg,#85B7EB,#5A96D4)',
  ];

  const members = [
    { name:'Vinicius Chaves',   email:'vini@delta.com',   password:'admin123', role:'Líder do setor', sector:'Aviônica', isAdmin:true,  color:COLORS[0] },
    { name:'Luiz Eduardo',      email:'luiz@delta.com',      password:'senha123', role:'Membro',         sector:'Aviônica', isAdmin:false, color:COLORS[1] },
    { name:'Pedro Ribeiro',  email:'pedro@delta.com',    password:'senha123', role:'Membro',         sector:'Propulsão', isAdmin:false, color:COLORS[2] },
    { name:'Isabela Mendes', email:'isabela@delta.com',  password:'senha123', role:'Membro',         sector:'Propulsão', isAdmin:false, color:COLORS[3] },
    { name:'Thiago Souza',   email:'thiago@delta.com',   password:'senha123', role:'Membro',         sector:'Propulsão', isAdmin:false, color:COLORS[4] },
    { name:'Lucas Ferreira', email:'lucas@delta.com',    password:'senha123', role:'Membro',         sector:'Propulsão', isAdmin:false, color:COLORS[5] },
  ];
  members.forEach(m => {
    const list = DB.getMembers();
    m.id = DB._nextId(list); m.createdAt = new Date().toISOString(); m.active = true;
    list.push(m); DB._saveMembers(list);
  });

  const demands = [
    { title:'Simulação de pressão na câmara', priority:'urgente', status:'inprogress', dueDate:'2026-04-14', assigneeId:1 },
    { title:'Revisão do sistema de alimentação', priority:'media', status:'inprogress', dueDate:'2026-04-15', assigneeId:2 },
    { title:'Projeto do injetor v2',           priority:'alta',   status:'todo',       dueDate:'2026-04-18', assigneeId:4 },
    { title:'Levantamento de materiais',       priority:'media',  status:'todo',       dueDate:'2026-04-21', assigneeId:5 },
    { title:'Cálculo de Isp do motor K450',    priority:'normal', status:'review',     dueDate:'2026-04-17', assigneeId:6 },
    { title:'Documentação do teste estático #4', priority:'normal', status:'done',     dueDate:'2026-04-13', assigneeId:3 },
    { title:'Revisão de bocal convergente',    priority:'normal', status:'done',       dueDate:'2026-04-13', assigneeId:2 },
    { title:'Análise de empuxo teórico',       priority:'normal', status:'done',       dueDate:'2026-04-12', assigneeId:1 },
  ];
  demands.forEach(d => {
    const list = DB.getDemands();
    d.id = DB._nextId(list); d.createdAt = new Date().toISOString();
    list.push(d); DB._saveDemands(list);
  });

  const events = [
    { title:'Prazo: Simulação pressão', date:'2026-04-14', color:'var(--red)',    bg:'var(--red-bg)' },
    { title:'Reunião de setor',         date:'2026-04-16', color:'var(--purple)', bg:'var(--purple-bg)' },
    { title:'Prazo: Relatórios',        date:'2026-04-18', color:'var(--pink)',   bg:'var(--pink-bg)' },
    { title:'Prazo: Injetor v2',        date:'2026-04-18', color:'var(--accent)', bg:'var(--accent-glow)' },
    { title:'Teste estático #5',        date:'2026-04-22', color:'var(--green)',  bg:'var(--green-bg)' },
  ];
  events.forEach(e => {
    const list = DB.getEvents();
    e.id = DB._nextId(list); e.createdAt = new Date().toISOString();
    list.push(e); DB._saveEvents(list);
  });

  // Seed relatório da semana atual
  const weekReport = { week: 'Semana 16', weekLabel: '14/04 – 18/04', deadline: '2026-04-18T18:00' };
  const reportList = [];
  DB.getMembers().forEach(m => {
    reportList.push({ id: DB._nextId(reportList), memberId: m.id, memberName: m.name, sector: m.sector, ...weekReport,
      status: m.id === 2 ? 'avaliado' : m.id === 3 ? 'entregue' : m.id === 6 ? 'atrasado' : m.id === 1 ? 'entregue' : 'pendente',
      deliveredAt: [2,3,1].includes(m.id) ? new Date().toISOString() : null, grade: m.id === 2 ? 'aprovado' : null });
  });
  DB._saveReports(reportList);

  DB.logActivity('<strong>Ana L.</strong> concluiu "Revisão de bocal"', 'var(--green)');
  DB.logActivity('<strong>Pedro R.</strong> entregou relatório semanal', 'var(--pink)');
  DB.logActivity('<strong>Marcos C.</strong> criou demanda "Simulação de pressão"', 'var(--accent)');
  DB.logActivity('<strong>Sistema</strong> abriu novo ciclo de relatórios', 'var(--yellow)');
})();
