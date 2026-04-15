/* ═══════════════════════════════════════════════════════════
   Delta Rockets · UI Utilities
   Modal, Toast, Confirm, helpers de cor/iniciais
   ═══════════════════════════════════════════════════════════ */

/* ── Iniciais a partir do nome ──────────────────────────── */
function getInitials(name) {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ── Cor de avatar automática por índice ────────────────── */
const AVATAR_COLORS = [
  'linear-gradient(135deg,#E8601A,#F4813B)',
  'linear-gradient(135deg,#5DCAA5,#3CB389)',
  'linear-gradient(135deg,#AFA9EC,#8B83D9)',
  'linear-gradient(135deg,#ED93B1,#D46B8E)',
  'linear-gradient(135deg,#EF9F27,#D48A15)',
  'linear-gradient(135deg,#85B7EB,#5A96D4)',
  'linear-gradient(135deg,#F09595,#D46B6B)',
  'linear-gradient(135deg,#7ED4B5,#4BAE8A)',
];
function avatarColor(id) { return AVATAR_COLORS[(id - 1) % AVATAR_COLORS.length]; }

/* ── Formatar data relativa ─────────────────────────────── */
function timeAgo(isoStr) {
  const diff = (Date.now() - new Date(isoStr)) / 1000;
  if (diff < 60)   return 'agora mesmo';
  if (diff < 3600) return `há ${Math.floor(diff/60)} min`;
  if (diff < 86400)return `há ${Math.floor(diff/3600)}h`;
  return `há ${Math.floor(diff/86400)} dias`;
}

/* ── Formatar data curta ─────────────────────────────────── */
function fmtDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
}

/* ══════════════════════════════════════════════════════════
   TOAST (notificação rápida)
   ══════════════════════════════════════════════════════════ */
let _toastContainer = null;
function toast(msg, type = 'success') {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    document.body.appendChild(_toastContainer);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> ${msg}`;
  _toastContainer.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

/* ══════════════════════════════════════════════════════════
   MODAL genérico
   Uso: openModal({ title, body, onConfirm, confirmText, danger })
   ══════════════════════════════════════════════════════════ */
function openModal({ title, body, onConfirm, confirmText = 'Salvar', danger = false, wide = false }) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${wide ? 'modal-wide' : ''}">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        ${onConfirm ? `<button class="btn ${danger ? 'btn-danger' : 'btn-primary-action'}" id="modal-confirm">${confirmText}</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);
  if (onConfirm) {
    document.getElementById('modal-confirm').addEventListener('click', () => {
      onConfirm();
    });
  }
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
}

function closeModal() {
  const o = document.getElementById('modal-overlay');
  if (o) { o.classList.remove('show'); setTimeout(() => o.remove(), 250); }
}

/* ── Confirm rápido ─────────────────────────────────────── */
function confirmDialog(msg, onConfirm) {
  openModal({
    title: 'Confirmar ação',
    body: `<p style="color:var(--text-secondary);font-size:14px;">${msg}</p>`,
    onConfirm, confirmText: 'Confirmar', danger: true
  });
}
