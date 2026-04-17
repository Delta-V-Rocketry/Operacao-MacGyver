/* ═══════════════════════════════════════════════════════════
   DeltaV Rocketry · Login
   Chama o back-end Flask via api.js
   ═══════════════════════════════════════════════════════════ */

// Redireciona se já está logado
if (DB.getSession()) window.location.href = 'dashboard.html';

/* ── Mostrar/esconder senha ─────────────────────────────── */
function togglePassword() {
  const input    = document.getElementById('login-senha');
  const icon     = document.getElementById('eye-icon');
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  icon.innerHTML = isHidden
    ? `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
       <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
       <line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
}

/* ── Login ──────────────────────────────────────────────── */
document.getElementById('btn-login').addEventListener('click', doLogin);
document.getElementById('login-senha').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;

  clearErrors();

  if (!email) { showFieldError('login-email', 'Informe o e-mail.'); return; }
  if (!senha) { showFieldError('login-senha', 'Informe a senha.');  return; }

  const btn = document.getElementById('btn-login');
  btn.textContent = 'Entrando...';
  btn.disabled = true;

  try {
    // Chama POST /login no back-end Flask
    const user = await API.login(email, senha);

    // Salva sessão no localStorage no formato que o dashboard espera
    const session = {
      id:       user.id,
      name:     user.nome   || user.name,
      email:    user.email,
      sector:   user.setor  || user.sector,
      role:     user.role   || 'Membro',
      isAdmin:  !!user.isAdmin,
      isLeader: !!user.isLeader,
      active:   true,
      color:    avatarColor(user.id),
    };

    DB.setSession(session);
    window.location.href = 'dashboard.html';

  } catch (err) {
    showLoginError(err.message || 'Erro ao conectar com o servidor.');
    btn.textContent = 'Entrar';
    btn.disabled = false;
  }
}

/* ── Helpers de erro ────────────────────────────────────── */
function showFieldError(fieldId, msg) {
  clearErrors();
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.add('input-error');
  const err = document.createElement('span');
  err.className = 'field-error';
  err.textContent = msg;
  field.parentNode.appendChild(err);
  field.focus();
}

function showLoginError(msg) {
  clearErrors();
  let box = document.getElementById('login-error');
  if (!box) {
    box = document.createElement('div');
    box.id = 'login-error';
    box.className = 'error-box';
    document.getElementById('btn-login').before(box);
  }
  box.textContent = msg;
  box.style.animation = 'none';
  requestAnimationFrame(() => { box.style.animation = 'shake .35s ease'; });
}

function clearErrors() {
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  document.querySelectorAll('.field-error, #login-error').forEach(el => el.remove());
}