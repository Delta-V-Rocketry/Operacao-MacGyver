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

function goStep(n) {
  [1,2,3].forEach(i => {
    document.getElementById('sub'+i).classList.remove('active');
    const s = document.getElementById('s'+i);
    s.classList.remove('active','done');
    if (i < n) s.classList.add('done');
  });
  document.getElementById('sub'+n).classList.add('active');
  document.getElementById('s'+n).classList.add('active');
}