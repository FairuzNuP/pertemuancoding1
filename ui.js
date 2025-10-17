// ui.js
(() => {
  // references
  const btnPlay = document.getElementById('btn-play');
  const btnPause = document.getElementById('btn-pause');
  const btnAI = document.getElementById('btn-ai');
  const btnShop = document.getElementById('btn-shop');
  const btnSave = document.getElementById('btn-save');
  const btnClearLB = document.getElementById('btn-clear-lb');
  const vol = document.getElementById('vol');

  // wire
  btnPlay.addEventListener('click', () => {
    window.GAME.start();
    btnPlay.disabled = true;
  });
  btnPause.addEventListener('click', () => {
    window.GAME.state.paused = !window.GAME.state.paused;
    btnPause.innerText = window.GAME.state.paused ? 'Resume' : 'Pause';
  });
  btnAI.addEventListener('click', () => {
    window.GAME.state.ai = !window.GAME.state.ai;
    btnAI.innerText = `AI: ${window.GAME.state.ai ? 'On' : 'Off'}`;
  });
  btnShop.addEventListener('click', () => {
    alert('Shop modal — belum implement popup penuh. (Gunakan buy via panel nanti).');
  });

  vol.addEventListener('input', (e) => {
    window.AUDIO.setVolume(parseFloat(e.target.value));
  });

  btnSave.addEventListener('click', () => {
    const name = (document.getElementById('playerName').value || 'Guest').slice(0,12);
    const lb = JSON.parse(localStorage.getItem('tetris3d_lb') || '[]');
    lb.push({ name, score: window.GAME.state.score, ts: Date.now() });
    lb.sort((a,b)=>b.score - a.score);
    localStorage.setItem('tetris3d_lb', JSON.stringify(lb.slice(0,10)));
    renderLeaderboard();
    alert('Skor tersimpan!');
  });

  btnClearLB.addEventListener('click', () => {
    if(confirm('Hapus semua leaderboard?')){ localStorage.removeItem('tetris3d_lb'); renderLeaderboard(); }
  });

  function renderLeaderboard(){
    const cont = document.getElementById('leaderboard');
    cont.innerHTML = '';
    const lb = JSON.parse(localStorage.getItem('tetris3d_lb') || '[]');
    if(lb.length === 0) cont.innerHTML = '<div class="small">Belum ada skor</div>';
    lb.forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'lb-item';
      div.innerHTML = `<div>${idx+1}. <strong>${it.name}</strong></div><div>${it.score}</div>`;
      cont.appendChild(div);
    });
  }
  renderLeaderboard();

  // ensure Three render loop runs even before game starts
  function animateThree(){
    window.T3 && window.T3.renderThree && window.T3.renderThree();
    requestAnimationFrame(animateThree);
  }
  animateThree();

  // expose UI helpers
  window.UI = { renderLeaderboard };
})();
