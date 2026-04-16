/* ═══════════════════════════════════════════════════════════
   DeltaV Rocketry · Login
   ───────────────────────────────────────────────────────────
   Cadastro removido: acesso concedido internamente pelo admin.
   FUTURO: substituir validação local por fetch() para API:
     POST /api/auth/login → { token, user }
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

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;

  clearErrors();

  if (!email) { showFieldError('login-email', 'Informe o e-mail.'); return; }
  if (!senha) { showFieldError('login-senha', 'Informe a senha.');  return; }

  // Loading state
  const btn = document.getElementById('btn-login');
  btn.textContent = 'Entrando...';
  btn.disabled = true;

  // Simula latência de rede (remover ao integrar com API real)
  setTimeout(() => {
    /* ── FUTURO: substituir bloco abaixo por:
       const res = await fetch('/api/auth/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, password: senha })
       });
       const { token, user } = await res.json();
       if (!res.ok) { showLoginError(user.message); resetBtn(); return; }
       DB.setSession(user);
       window.location.href = 'dashboard.html';
    ── */
    const user = DB.getMembers().find(m => m.email === email && m.password === senha);

    if (!user) {
      showLoginError('E-mail ou senha incorretos.');
      resetBtn(); return;
    }
    if (!user.active) {
      showLoginError('Sua conta está inativa. Fale com o administrador.');
      resetBtn(); return;
    }

    DB.setSession(user);
    window.location.href = 'dashboard.html';
  }, 400);
}

function resetBtn() {
  const btn = document.getElementById('btn-login');
  btn.textContent = 'Entrar';
  btn.disabled = false;
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
  // Animação de shake
  box.style.animation = 'none';
  requestAnimationFrame(() => { box.style.animation = 'shake .35s ease'; });
}

function clearErrors() {
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  document.querySelectorAll('.field-error, #login-error').forEach(el => el.remove());
}
