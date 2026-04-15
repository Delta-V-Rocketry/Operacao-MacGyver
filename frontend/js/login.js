/* ═══════════════════════════════════════════════════════════
   Delta Rockets · Login / Primeiro Acesso
   ───────────────────────────────────────────────────────────
   FUTURO: substituir validações locais por fetch() para API:
     POST /api/auth/login   → { token, user }
     POST /api/auth/register → { message }
   ═══════════════════════════════════════════════════════════ */

// Redireciona se já está logado
if (DB.getSession()) window.location.href = 'dashboard.html';

/* ── Tabs ───────────────────────────────────────────────── */
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
  if (tab === 'login') {
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.getElementById('panel-login').classList.add('active');
  } else {
    document.querySelectorAll('.tab')[1].classList.add('active');
    document.getElementById('panel-primeiro').classList.add('active');
    goStep(1);
  }
}

/* ── Steps do primeiro acesso ───────────────────────────── */
function goStep(n) {
  [1, 2, 3].forEach(i => {
    document.getElementById('sub' + i).classList.remove('active');
    const s = document.getElementById('s' + i);
    s.classList.remove('active', 'done');
    if (i < n) s.classList.add('done');
  });
  document.getElementById('sub' + n).classList.add('active');
  document.getElementById('s' + n).classList.add('active');
}

function nextStep2() {
  const nome  = document.getElementById('reg-nome').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  if (!nome)  { showFieldError('reg-nome',  'Informe seu nome.');  return; }
  if (!email) { showFieldError('reg-email', 'Informe seu e-mail.'); return; }
  clearErrors();
  goStep(2);
}

function nextStep3() {
  const senha = document.getElementById('reg-senha').value;
  const conf  = document.getElementById('reg-senha-confirm').value;
  if (senha.length < 8) { showFieldError('reg-senha', 'Mínimo 8 caracteres.'); return; }
  if (senha !== conf)   { showFieldError('reg-senha-confirm', 'As senhas não coincidem.'); return; }
  clearErrors();
  goStep(3);
}

/* ── Login ──────────────────────────────────────────────── */
document.getElementById('btn-login').addEventListener('click', () => {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;

  if (!email) { showFieldError('login-email', 'Informe o e-mail.'); return; }
  if (!senha) { showFieldError('login-senha', 'Informe a senha.');  return; }
  clearErrors();

  /* ── FUTURO: substituir bloco abaixo por:
     const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'},
       body: JSON.stringify({ email, password: senha }) });
     const { token, user } = await res.json();
     if (!res.ok) { showError(user.message); return; }
     localStorage.setItem('dr_token', token);
     DB.setSession(user);
     window.location.href = 'dashboard.html';
  ── */
  const members = DB.getMembers();
  const user = members.find(m => m.email === email && m.password === senha);

  if (!user) {
    showLoginError('E-mail ou senha incorretos.');
    return;
  }
  if (!user.active) {
    showLoginError('Sua conta está inativa. Fale com o administrador.');
    return;
  }

  DB.setSession(user);
  window.location.href = 'dashboard.html';
});

// Enter no campo senha faz login
document.getElementById('login-senha').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});

/* ── Enviar solicitação de primeiro acesso ──────────────── */
document.getElementById('btn-enviar-solicitacao').addEventListener('click', () => {
  const nome  = document.getElementById('reg-nome').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const senha = document.getElementById('reg-senha').value;

  /* ── FUTURO: substituir bloco abaixo por:
     const res = await fetch('/api/auth/register', { method:'POST', ... body: JSON.stringify({name, email, password}) });
     const data = await res.json();
     if (!res.ok) { showError(data.message); return; }
  ── */
  const existing = DB.getMembers().find(m => m.email === email);
  if (existing) {
    showLoginError('Este e-mail já está cadastrado. Tente fazer login.');
    goStep(1); return;
  }

  DB.addRequest({ name: nome, email, password: senha });

  // Feedback visual
  document.getElementById('panel-primeiro').innerHTML = `
    <div style="text-align:center;padding:2rem 0;">
      <div style="font-size:48px;margin-bottom:1rem;">✅</div>
      <h3 style="font-size:18px;font-weight:600;margin-bottom:.5rem;">Solicitação enviada!</h3>
      <p style="font-size:13px;color:rgba(255,255,255,.5);max-width:300px;margin:0 auto 1.5rem;">
        Um administrador irá revisar seu cadastro. Você receberá acesso assim que aprovado.
      </p>
      <button class="btn-primary" onclick="switchTab('login')">Voltar ao login</button>
    </div>`;
});

/* ── Helpers de erro ────────────────────────────────────── */
function showFieldError(fieldId, msg) {
  clearErrors();
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.add('input-error');
  const err = document.createElement('span');
  err.className = 'field-error'; err.textContent = msg;
  field.parentNode.appendChild(err);
  field.focus();
}

function showLoginError(msg) {
  clearErrors();
  let box = document.getElementById('login-error');
  if (!box) {
    box = document.createElement('div');
    box.id = 'login-error'; box.className = 'error-box';
    document.getElementById('btn-login').before(box);
  }
  box.textContent = msg;
}

function clearErrors() {
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  document.querySelectorAll('.field-error, #login-error').forEach(el => el.remove());
}
