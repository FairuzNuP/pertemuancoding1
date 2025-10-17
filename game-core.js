// game-core.js
(() => {
  const COLS = 10, ROWS = 20;
  const COLORS = [null, '#ff7a2d','#ff4fb8','#ffd166','#7cffb2','#ff6b6b','#ff8fb1','#ffffff'];

  // create arena and helper
  function createMatrix(w,h){ const m=[]; for(let i=0;i<h;i++) m.push(new Array(w).fill(0)); return m; }
  window.GAME = window.GAME || {};
  const state = {
    arena: createMatrix(COLS, ROWS),
    current: null,
    nextQueue: [],
    hold: null,
    canHold: true,
    score: 0, lines: 0, level:1, coins: parseInt(localStorage.getItem('t3_coins')||'0',10)||0,
    dropInterval: 1000, dropCounter: 0, lastTime: performance.now(), running: false, paused: true, ai:false
  };

  // tetromino shapes
  const SHAPES = {
    I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O:[[2,2],[2,2]],
    T:[[0,3,0],[3,3,3],[0,0,0]],
    S:[[0,4,4],[4,4,0],[0,0,0]],
    Z:[[5,5,0],[0,5,5],[0,0,0]],
    J:[[6,0,0],[6,6,6],[0,0,0]],
    L:[[0,0,7],[7,7,7],[0,0,0]]
  };
  const keys = Object.keys(SHAPES);

  // helper: spawn piece
  function randPiece(){ const k = keys[Math.floor(Math.random()*keys.length)]; return SHAPES[k].map(r=>r.slice()); }
  function refillQueue(){ while(state.nextQueue.length < 6) state.nextQueue.push(randPiece()); }

  // collision & merge
  function collide(arena, piece){
    const m = piece.matrix;
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x]){
          const ay = arena[piece.y + y];
          if(!ay || ay[piece.x + x] !== 0) return true;
        }
      }
    }
    return false;
  }
  function merge(arena, piece){
    piece.matrix.forEach((row,y)=>{
      row.forEach((val,x)=>{
        if(val) arena[piece.y + y][piece.x + x] = val;
      });
    });
  }

  // rotate
  function rotate(matrix, dir){
    for(let y=0;y<matrix.length;y++) for(let x=0;x<y;x++) [matrix[x][y],matrix[y][x]]=[matrix[y][x],matrix[x][y]];
    if(dir>0) matrix.forEach(r=>r.reverse()); else matrix.reverse();
  }

  // sweep lines
  function sweep(){
    let rowCount = 0;
    outer: for(let y=ROWS-1;y>=0;y--){
      for(let x=0;x<COLS;x++){
        if(state.arena[y][x] === 0) continue outer;
      }
      state.arena.splice(y,1);
      state.arena.unshift(new Array(COLS).fill(0));
      y++;
      rowCount++;
    }
    if(rowCount>0){
      const points = [0,40,100,300,1200];
      state.score += (points[rowCount] || rowCount*100) * state.level;
      state.lines += rowCount;
      state.level = Math.floor(state.lines/10) + 1;
      state.dropInterval = Math.max(80, 1000 - (state.level-1)*75);
      state.coins += rowCount * 5;
      localStorage.setItem('t3_coins', String(state.coins));
      window.AUDIO.play && window.AUDIO.play('clear');
    }
  }

  // mesh management: keep arena -> Three.js meshes in sync
  window.GAME.meshGrid = createMatrix(COLS, ROWS); // hold Three.js meshes
  function rebuildMeshes(){
    const bg = window.T3.boardGroup;
    // remove old meshes
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        const m = window.GAME.meshGrid[y][x];
        if(m){ bg.remove(m); if(m.geometry) m.geometry.dispose(); if(m.material) m.material.dispose(); window.GAME.meshGrid[y][x] = null; }
      }
    }
    // add
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        const val = state.arena[y][x];
        if(val){
          const geo = new THREE.BoxGeometry(1,1,1);
          const mat = new THREE.MeshStandardMaterial({ color: COLORS[val], roughness:0.4, metalness:0.1, emissive: COLORS[val], emissiveIntensity: 0.02 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(x + 0.5, (ROWS - 1 - y) + 0.5, 0);
          window.T3.boardGroup.add(mesh);
          window.GAME.meshGrid[y][x] = mesh;
        }
      }
    }
  }

  // create visual for active piece
  function createActiveVisual(piece){
    if(window.GAME.activeGroup){ window.T3.scene.remove(window.GAME.activeGroup); window.GAME.activeGroup = null; }
    const group = new THREE.Group();
    piece.matrix.forEach((row,y)=>{
      row.forEach((val,x)=>{
        if(val){
          const geo = new THREE.BoxGeometry(1,1,1);
          const mat = new THREE.MeshStandardMaterial({ color: COLORS[val], roughness:0.3, metalness:0.2, emissive: COLORS[val], emissiveIntensity:0.02 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(x + 0.5, -y + 0.5, 0);
          group.add(mesh);
        }
      });
    });
    window.GAME.activeGroup = group;
    placeActiveVisual(piece);
    window.T3.scene.add(group);
  }
  function placeActiveVisual(piece){
    if(!window.GAME.activeGroup) return;
    window.GAME.activeGroup.position.set(piece.x, (ROWS - 1 - piece.y), 0);
  }

  // spawn piece
  function spawn(){
    refillQueue();
    const mat = state.nextQueue.shift();
    state.current = { matrix: mat, x: Math.floor((COLS - mat[0].length)/2), y: 0 };
    state.canHold = true;
    createActiveVisual(state.current);
    drawMini(state.nextQueue[0]);
    if(collide(state.arena, state.current)){
      state.running = false;
      state.paused = true;
      showModal('Game Over', `Skor: ${state.score}`);
    }
  }

  // draw mini (for next) on canvas
  const nextCtx = document.getElementById('next').getContext('2d');
  const holdCtx = document.getElementById('hold').getContext('2d');
  function drawMini(matrix, ctx = nextCtx){
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.fillStyle = '#020610';
    ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    if(!matrix) return;
    const cell = Math.floor(Math.min(ctx.canvas.width/4, ctx.canvas.height/4) - 6);
    const w = matrix[0].length, h = matrix.length;
    const offsetX = Math.floor((4 - w)/2);
    const offsetY = Math.floor((4 - h)/2);
    for(let y=0;y<4;y++){
      for(let x=0;x<4;x++){
        const mx = x - offsetX, my = y - offsetY;
        let val = 0;
        if(my >=0 && my < h && mx >=0 && mx < w) val = matrix[my][mx];
        if(val){
          ctx.fillStyle = COLORS[val];
          ctx.fillRect(x*cell + 8, y*cell + 8, cell-6, cell-6);
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.strokeRect(x*cell + 8, y*cell + 8, cell-6, cell-6);
        }
      }
    }
  }

  // update HUD
  function updateHUD(){
    document.getElementById('score').innerText = state.score;
    document.getElementById('level').innerText = state.level;
    document.getElementById('lines').innerText = state.lines;
    document.getElementById('coins').innerText = state.coins;
  }

  // hold
  function doHold(){
    if(!state.canHold) return;
    if(!state.hold){
      state.hold = state.current.matrix.map(r => r.slice());
      window.T3.scene.remove(window.GAME.activeGroup);
      spawn();
    } else {
      const temp = state.current.matrix.map(r=>r.slice());
      state.current.matrix = state.hold.map(r=>r.slice());
      state.hold = temp;
      state.current.x = Math.floor((COLS - state.current.matrix[0].length)/2);
      state.current.y = 0;
      window.T3.scene.remove(window.GAME.activeGroup);
      createActiveVisual(state.current);
    }
    state.canHold = false;
    drawMini(state.hold, holdCtx);
  }

  // step (main loop step per frame)
  function step(time){
    if(!state.running){ window.T3.renderThree(); requestAnimationFrame(step); return; }
    const delta = time - state.lastTime;
    state.lastTime = time;
    if(!state.paused){
      state.dropCounter += delta;
      if(state.dropCounter > state.dropInterval){
        state.current.y++;
        if(collide(state.arena, state.current)){
          state.current.y--;
          merge(state.arena, state.current);
          rebuildMeshes();
          sweep();
          spawn();
        }
        placeActiveVisual(state.current);
        state.dropCounter = 0;
      }
    }
    window.T3.renderThree();
    requestAnimationFrame(step);
  }

  // start, pause, restart
  function startGame(){ if(!state.running) state.running = true; state.paused = false; state.lastTime = performance.now(); refillQueue(); spawn(); step(state.lastTime); updateHUD(); }
  function pauseGame(){ state.paused = true; }
  function restartGame(){ state.arena = createMatrix(COLS, ROWS); window.GAME.meshGrid = createMatrix(COLS, ROWS); state.score = 0; state.lines = 0; state.level = 1; state.coins = parseInt(localStorage.getItem('t3_coins')||'0',10)||0; updateHUD(); rebuildMeshes(); spawn(); }

  // expose functions
  window.GAME.state = state;
  window.GAME.start = startGame;
  window.GAME.pause = pauseGame;
  window.GAME.restart = restartGame;
  window.GAME.spawn = spawn;
  window.GAME.doHold = doHold;
  window.GAME.rebuildMeshes = rebuildMeshes;
  window.GAME.drawMini = drawMini;
  window.GAME.updateHUD = updateHUD;

  // minor helpers used elsewhere (UI)
  function showModal(title, body){ const modal = document.getElementById('playerName'); alert(`${title}\n\n${body}`); }
  window.showModal = showModal;

  // wire up keyboard small handlers (UI module will refine for controls)
  window.addEventListener('keydown', (e) => {
    if(!state.running) return;
    if(e.key === 'ArrowLeft'){ state.current.x--; if(collide(state.arena, state.current)) state.current.x++; window.GAME.rebuildMeshes && window.GAME.rebuildMeshes(); window.GAME.placeActive && window.GAME.placeActive(); }
    else if(e.key === 'ArrowRight'){ state.current.x++; if(collide(state.arena, state.current)) state.current.x--; }
    else if(e.key === 'ArrowDown'){ state.current.y++; if(collide(state.arena, state.current)){ state.current.y--; merge(state.arena, state.current); rebuildMeshes(); sweep(); spawn(); } state.dropCounter = 0; }
    else if(e.key === 'ArrowUp'){ rotate(state.current.matrix, 1); if(collide(state.arena, state.current)) rotate(state.current.matrix, -1); window.T3.scene.remove(window.GAME.activeGroup); createActiveVisual(state.current); }
    else if(e.code === 'Space'){ e.preventDefault(); while(!collide(state.arena, state.current)) state.current.y++; state.current.y--; merge(state.arena, state.current); rebuildMeshes(); sweep(); spawn(); state.dropCounter = 0; }
    else if(e.key.toLowerCase() === 'c'){ doHold(); }
    else if(e.key.toLowerCase() === 'p'){ state.paused = !state.paused; }
  });

  // initial minimal setup to allow UI calling start after first click
  window.addEventListener('click', () => {
    window.AUDIO.init && window.AUDIO.init();
  }, { once: true });
})();
