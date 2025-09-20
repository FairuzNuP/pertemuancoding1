/* games.js — Arcade Hub
   - Katalog games
   - Router: membuka game, menutup game
   - 6 example games fully implemented:
      1) Pong
      2) Snake
      3) Breakout
      4) Flappy
      5) Memory (matching)
      6) Dodger
   - 14 template slots (game-template-1 ... game-template-14) : ready to implement
   - To add more games: copy a template, implement init/update/draw/controls, and register in GAMES array.
*/

/* ----------------------------- Helpers & DOM ----------------------------- */
const $ = id=>document.getElementById(id);
const catalogEl = document.getElementById('catalog');
const playArea = document.getElementById('playArea');
const backBtn = document.getElementById('backBtn');
const titleEl = document.getElementById('gameTitle');
const instrEl = document.getElementById('instructions');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const controlsEl = document.getElementById('controls');
const restartBtn = document.getElementById('restartBtn');

let activeGame = null;
let gameLoopId = null;

/* make responsive canvas sized by CSS */
function resizeCanvas(){
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(rect.width));
  canvas.height = Math.max(240, Math.floor(rect.height));
}
window.addEventListener('resize', ()=>{ if(activeGame && activeGame.onResize) activeGame.onResize(); resizeCanvas(); });

/* ----------------------------- Game API template -----------------------------
 Each game object must implement:
  - id: string
  - title: string
  - description: string
  - instructions: string (shown in UI)
  - init(canvas, ctx, env) -> setup
  - update(dt) -> update state
  - draw(ctx) -> draw frame
  - onKeyDown / onKeyUp / onPointerDown optional
  - cleanup() -> remove listeners, free resources
  - onResize() optional
 ---------------------------------------------------------------------------*/

/* ----------------------------- Registry -----------------------------*/
const GAMES = [];

/* ----------------------------- Utility: register helper -----------------------------*/
function registerGame(game){
  GAMES.push(game);
}

/* ----------------------------- UI: render catalog -----------------------------*/
function renderCatalog(){
  catalogEl.innerHTML = '';
  for(const g of GAMES){
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `
      <h3>${g.title}</h3>
      <p>${g.description}</p>
      <div class="actions">
        <button class="btn" data-game="${g.id}">Mainkan</button>
        <button class="link" data-info="${g.id}">Info</button>
      </div>
    `;
    catalogEl.appendChild(card);
  }
  // attach handlers
  catalogEl.querySelectorAll('.btn').forEach(b=>{
    b.addEventListener('click', ()=> openGame(b.dataset.game));
  });
  catalogEl.querySelectorAll('.link').forEach(b=>{
    b.addEventListener('click', ()=> alert(findGame(b.dataset.info).instructions));
  });
}

/* ----------------------------- Router: open / close -----------------------------*/
function findGame(id){ return GAMES.find(g=>g.id===id); }

function openGame(id){
  const g = findGame(id);
  if(!g) return;
  // cleanup previous
  closeGame();

  activeGame = g;
  titleEl.textContent = g.title;
  instrEl.textContent = g.instructions || '—';
  playArea.classList.remove('hidden');
  resizeCanvas();

  // reset UI
  scoreEl.textContent = '0';
  levelEl.textContent = '1';
  controlsEl.textContent = g.controls || 'Gunakan keyboard / mouse';

  // call init
  const env = { canvas, ctx, setScore:(s)=>scoreEl.textContent = s, setLevel:(l)=>levelEl.textContent = l };
  g.init(canvas, ctx, env);

  // start main loop
  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.05, (now - last)/1000);
    last = now;
    g.update(dt);
    g.draw(ctx);
    gameLoopId = requestAnimationFrame(loop);
  }
  gameLoopId = requestAnimationFrame(loop);
}

function closeGame(){
  if(activeGame){
    if(activeGame.cleanup) activeGame.cleanup();
    activeGame = null;
  }
  if(gameLoopId) cancelAnimationFrame(gameLoopId);
  playArea.classList.add('hidden');
}

/* UI hooks */
backBtn.addEventListener('click', ()=> closeGame());
restartBtn.addEventListener('click', ()=> { if(activeGame && activeGame.restart) activeGame.restart(); });

/* ----------------------------- GAME 1: PONG -----------------------------*/
registerGame({
  id:'pong',
  title:'Pong Classic',
  description:'Versi sederhana Pong. Gerak paddle: W/S (kiri) dan panah atas/bawah (kanan).',
  instructions:'Kontrol: W/S (paddle kiri) • Panah atas/bawah (paddle kanan) • Space untuk mulai / pause.',
  controls: 'W/S • ↑/↓ • Space',
  init(canvas, ctx, env){
    this.w = canvas.width; this.h = canvas.height;
    this.p1 = {x:20,y:this.h/2-40,w:12,h:80,vy:0};
    this.p2 = {x:this.w-32,y:this.h/2-40,w:12,h:80,vy:0};
    this.ball = {x:this.w/2,y:this.h/2,r:8,vx:200*(Math.random()>0.5?1:-1),vy:120*(Math.random()>0.5?1:-1)};
    this.score = [0,0]; this.paused = true;
    this.keydown = (e)=>{ if(e.key==='w') this.p1.vy=-300; if(e.key==='s') this.p1.vy=300; if(e.key==='ArrowUp') this.p2.vy=-300; if(e.key==='ArrowDown') this.p2.vy=300; if(e.key===' ') this.paused=!this.paused; };
    this.keyup = (e)=>{ if(e.key==='w' || e.key==='s') this.p1.vy=0; if(e.key==='ArrowUp' || e.key==='ArrowDown') this.p2.vy=0; };
    window.addEventListener('keydown', this.keydown); window.addEventListener('keyup', this.keyup);
    this.env = env;
  },
  update(dt){
    if(this.paused) return;
    // paddles
    this.p1.y += this.p1.vy * dt; this.p2.y += this.p2.vy * dt;
    this.p1.y = Math.max(0, Math.min(this.h - this.p1.h, this.p1.y));
    this.p2.y = Math.max(0, Math.min(this.h - this.p2.h, this.p2.y));
    // ball
    this.ball.x += this.ball.vx * dt; this.ball.y += this.ball.vy * dt;
    // collisions
    if(this.ball.y - this.ball.r < 0 || this.ball.y + this.ball.r > this.h) this.ball.vy *= -1;
    // paddle collide
    if(this.ball.x - this.ball.r < this.p1.x + this.p1.w && this.ball.y > this.p1.y && this.ball.y < this.p1.y + this.p1.h){
      this.ball.vx = Math.abs(this.ball.vx); this.ball.vx *= 1.03;
    }
    if(this.ball.x + this.ball.r > this.p2.x && this.ball.y > this.p2.y && this.ball.y < this.p2.y + this.p2.h){
      this.ball.vx = -Math.abs(this.ball.vx); this.ball.vx *= 1.03;
    }
    // score
    if(this.ball.x < -20){ this.score[1]++; this.resetBall(); }
    if(this.ball.x > this.w + 20){ this.score[0]++; this.resetBall(); }
    this.env.setScore(`${this.score[0]} : ${this.score[1]}`);
  },
  draw(ctx){
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.fillStyle = '#fff';
    // paddles
    ctx.fillRect(this.p1.x, this.p1.y, this.p1.w, this.p1.h);
    ctx.fillRect(this.p2.x, this.p2.y, this.p2.w, this.p2.h);
    // ball
    ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r,0,Math.PI*2); ctx.fill();
  },
  resetBall(){
    this.ball.x = this.w/2; this.ball.y = this.h/2;
    this.ball.vx = 200*(Math.random()>0.5?1:-1); this.ball.vy = 120*(Math.random()>0.5?1:-1);
    this.paused = true;
  },
  cleanup(){ window.removeEventListener('keydown', this.keydown); window.removeEventListener('keyup', this.keyup); }
});

/* ----------------------------- GAME 2: SNAKE -----------------------------*/
registerGame({
  id:'snake',
  title:'Snake',
  description:'Snake klasik: makan point, tumbuh panjang, jangan tabrakan.',
  instructions:'WASD / Panah untuk bergerak. Makan kotak hijau untuk tumbuh.',
  controls:'WASD / Arrows',
  init(canvas, ctx, env){
    this.grid = 20;
    this.cell = Math.floor(Math.min(canvas.width, canvas.height) / this.grid);
    this.reset();
    this.kdown = (e)=>{
      const k = e.key.toLowerCase();
      if(k==='arrowup' || k==='w') this.setDir(0,-1);
      if(k==='arrowdown' || k==='s') this.setDir(0,1);
      if(k==='arrowleft'|| k==='a') this.setDir(-1,0);
      if(k==='arrowright'|| k==='d') this.setDir(1,0);
    };
    window.addEventListener('keydown', this.kdown);
    this.env = env;
  },
  reset(){
    this.snake = [{x:5,y:5}]; this.dir = {x:1,y:0}; this.spawnFood(); this.timer=0; this.speed=6; this.score=0; this.env && this.env.setScore(this.score);
  },
  setDir(x,y){ if(this.dir.x === -x && this.dir.y === -y) return; this.dir={x,y}; },
  spawnFood(){ this.food = { x: Math.floor(Math.random()*this.grid), y: Math.floor(Math.random()*this.grid) }; },
  update(dt){
    this.timer += dt;
    if(this.timer > 1/this.speed){
      this.timer = 0;
      const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
      // wrap
      head.x = (head.x + this.grid) % this.grid;
      head.y = (head.y + this.grid) % this.grid;
      // collision with self
      if(this.snake.some(s=>s.x===head.x && s.y===head.y)){ this.reset(); return; }
      this.snake.unshift(head);
      if(head.x === this.food.x && head.y === this.food.y){
        this.score += 1; this.env && this.env.setScore(this.score); this.spawnFood();
      } else this.snake.pop();
    }
  },
  draw(ctx){
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    const cell = Math.floor(Math.min(cw,ch)/this.grid);
    // draw food
    ctx.fillStyle = '#7ED321'; ctx.fillRect(this.food.x*cell+2, this.food.y*cell+2, cell-4, cell-4);
    // draw snake
    ctx.fillStyle = '#86C232';
    for(const s of this.snake) ctx.fillRect(s.x*cell, s.y*cell, cell-1, cell-1);
  },
  cleanup(){ window.removeEventListener('keydown', this.kdown); }
});

/* ----------------------------- GAME 3: BREAKOUT -----------------------------*/
registerGame({
  id:'breakout',
  title:'Breakout',
  description:'Pecahkan semua bata dengan memantulkan bola.',
  instructions:'Gerak paddle: kiri/kanan. Space untuk mulai.',
  controls:'Arrow keys / A D',
  init(canvas, ctx, env){
    this.w = canvas.width; this.h = canvas.height;
    this.paddle = {w:100,h:12,x:this.w/2-50,y:this.h-40,vx:0};
    this.ball = {x:this.w/2,y:this.h/2,r:8,vx:200*(Math.random()>0.5?1:-1),vy:-200};
    this.bricks = [];
    this.rows=5; this.cols=9;
    const bw = (this.w-60)/this.cols, bh=18;
    for(let r=0;r<this.rows;r++){
      for(let c=0;c<this.cols;c++){
        this.bricks.push({x:30+c*bw,y:40+r*(bh+8),w:bw-8,h:bh,alive:true});
      }
    }
    this.paused = true; this.score=0;
    this.kd=(e)=>{ if(e.key==='ArrowLeft' || e.key.toLowerCase()==='a') this.paddle.vx=-420; if(e.key==='ArrowRight' || e.key.toLowerCase()==='d') this.paddle.vx=420; if(e.key===' ') this.paused=!this.paused; };
    this.ku=(e)=>{ if(e.key==='ArrowLeft' || e.key.toLowerCase()==='a') this.paddle.vx=0; if(e.key==='ArrowRight' || e.key.toLowerCase()==='d') this.paddle.vx=0; };
    window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku);
    this.env = env;
  },
  update(dt){
    if(this.paused) return;
    this.paddle.x += this.paddle.vx*dt;
    this.paddle.x = Math.max(0, Math.min(this.w-this.paddle.w, this.paddle.x));
    this.ball.x += this.ball.vx*dt; this.ball.y += this.ball.vy*dt;
    if(this.ball.x - this.ball.r < 0 || this.ball.x + this.ball.r > this.w) this.ball.vx *= -1;
    if(this.ball.y - this.ball.r < 0) this.ball.vy *= -1;
    // paddle collision
    if(this.ball.y + this.ball.r > this.paddle.y && this.ball.x > this.paddle.x && this.ball.x < this.paddle.x + this.paddle.w){
      this.ball.vy = -Math.abs(this.ball.vy);
      // change vx based on hit position
      const hitPos = (this.ball.x - (this.paddle.x + this.paddle.w/2)) / (this.paddle.w/2);
      this.ball.vx += hitPos * 150;
    }
    // bricks
    for(const b of this.bricks){
      if(!b.alive) continue;
      if(this.ball.x > b.x && this.ball.x < b.x+b.w && this.ball.y - this.ball.r < b.y+b.h && this.ball.y + this.ball.r > b.y){
        b.alive=false; this.ball.vy *= -1; this.score += 10; this.env && this.env.setScore(this.score); break;
      }
    }
    if(this.ball.y - this.ball.r > this.h){ // lose: reset
      this.reset();
    }
  },
  draw(ctx){
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);
    ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#FF6B6B';
    for(const b of this.bricks) if(b.alive) ctx.fillRect(b.x,b.y,b.w,b.h);
  },
  reset(){
    this.ball.x = this.w/2; this.ball.y = this.h/2; this.ball.vx = 200*(Math.random()>0.5?1:-1); this.ball.vy = -200; this.paused = true; this.score = 0; this.env && this.env.setScore(0);
  },
  cleanup(){ window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku); }
});

/* ----------------------------- GAME 4: FLAPPY -----------------------------*/
registerGame({
  id:'flappy',
  title:'Flappy Mini',
  description:'Flappy-style: tekan Space / klik untuk melompat, lewati celah pipa.',
  instructions:'Klik canvas atau tekan Space untuk flap.',
  controls:'Space / Click',
  init(canvas, ctx, env){
    this.w=canvas.width; this.h=canvas.height;
    this.bird={x:100,y:this.h/2,r:12,vy:0};
    this.pipes=[]; this.timer=0; this.score=0; this.speed=120;
    this.kd=(e)=>{ if(e.key===' ') this.flap(); };
    this.md=(e)=>{ this.flap(); };
    window.addEventListener('keydown', this.kd); canvas.addEventListener('mousedown', this.md);
    this.env = env;
  },
  flap(){ this.bird.vy = -240; },
  update(dt){
    this.bird.vy += 600*dt; this.bird.y += this.bird.vy*dt;
    this.timer += dt;
    if(this.timer > 1.4){ this.timer=0; // spawn pipe
      const gap = 120; const cy = 80 + Math.random()*(this.h-240);
      this.pipes.push({x:this.w+40,y:0,w:60,h:cy});
      this.pipes.push({x:this.w+40,y:cy+gap,w:60,h:this.h-(cy+gap)});
    }
    for(const p of this.pipes) p.x -= this.speed*dt;
    // remove offscreen
    this.pipes = this.pipes.filter(p=>p.x + p.w > -50);
    // collision
    for(const p of this.pipes){
      if(this.bird.x > p.x && this.bird.x < p.x + p.w && this.bird.y - this.bird.r < p.y + p.h && this.bird.y + this.bird.r > p.y){
        this.reset(); return;
      }
    }
    // ground/sky
    if(this.bird.y - this.bird.r < 0 || this.bird.y + this.bird.r > this.h){ this.reset(); return; }
    // score via passing center of first pipe pair
    for(let i=0;i<this.pipes.length;i+=2){
      const mid = this.pipes[i].x + this.pipes[i].w/2;
      if(!this.pipes[i].passed && mid < this.bird.x){ this.pipes[i].passed = true; this.score++; this.env && this.env.setScore(this.score); }
    }
  },
  draw(ctx){
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.fillStyle='#FFD166'; ctx.beginPath(); ctx.arc(this.bird.x,this.bird.y,this.bird.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2D6A4F';
    for(const p of this.pipes) ctx.fillRect(p.x,p.y,p.w,p.h);
  },
  reset(){ this.bird.y=this.h/2; this.bird.vy=0; this.pipes=[]; this.timer=0; this.score=0; this.env && this.env.setScore(0); },
  cleanup(){ window.removeEventListener('keydown', this.kd); canvas.removeEventListener('mousedown', this.md); }
});

/* ----------------------------- GAME 5: MEMORY (Matching) -----------------------------*/
registerGame({
  id:'memory',
  title:'Memory Match',
  description:'Balik kartu untuk cari pasangan. Cocokkan semua kartu.',
  instructions:'Klik kartu untuk membalik. Ingat posisi kartu!',
  controls:'Mouse / Touch',
  init(canvas, ctx, env){
    this.cols=6; this.rows=4; this.total=this.cols*this.rows;
    // build pairs
    const pairs = [];
    for(let i=0;i<this.total/2;i++) pairs.push(i), pairs.push(i);
    // shuffle
    for(let i=pairs.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pairs[i],pairs[j]]=[pairs[j],pairs[i]]; }
    this.cards = []; let idx=0;
    for(let r=0;r<this.rows;r++){ for(let c=0;c<this.cols;c++){ this.cards.push({x:c,y:r,val:pairs[idx++], flipped:false, matched:false}); } }
    this.w = canvas.width; this.h = canvas.height;
    this.cardW = Math.floor(Math.min(this.w/this.cols, this.h/this.rows)) - 8;
    this.lock=false; this.env=env; this.score=0;
    this.md = (e)=>{ const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left, my = e.clientY - rect.top; this.onClick(mx,my); };
    canvas.addEventListener('mousedown', this.md);
  },
  onClick(mx,my){
    if(this.lock) return;
    for(const c of this.cards){
      const cx = 10 + c.x*(this.cardW+8), cy = 10 + c.y*(this.cardW+8);
      if(mx>cx && mx<cx+this.cardW && my>cy && my<cy+this.cardW && !c.flipped && !c.matched){
        c.flipped=true;
        const flipped = this.cards.filter(x=>x.flipped && !x.matched);
        if(flipped.length===2){
          if(flipped[0].val===flipped[1].val){ flipped[0].matched=flipped[1].matched=true; this.score++; this.env && this.env.setScore(this.score); if(this.cards.every(x=>x.matched)) alert('Kamu menang!'); }
          else{ this.lock=true; setTimeout(()=>{ flipped[0].flipped=false; flipped[1].flipped=false; this.lock=false; }, 800); }
        }
        break;
      }
    }
  },
  update(dt){},
  draw(ctx){
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.font = '16px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    for(const c of this.cards){
      const cx = 10 + c.x*(this.cardW+8), cy = 10 + c.y*(this.cardW+8);
      ctx.fillStyle = c.flipped || c.matched ? '#86C232' : '#123';
      ctx.fillRect(cx,cy,this.cardW,this.cardW);
      if(c.flipped || c.matched){ ctx.fillStyle='#021'; ctx.fillText(c.val, cx+this.cardW/2, cy+this.cardW/2); }
    }
  },
  cleanup(){ canvas.removeEventListener('mousedown', this.md); }
});

/* ----------------------------- GAME 6: DODGER -----------------------------*/
registerGame({
  id:'dodger',
  title:'Dodger',
  description:'Hindari batu yang jatuh sebanyak mungkin.',
  instructions:'Gerak: A/D atau Panah kiri/kanan. Bertahan lama untuk skor tinggi.',
  controls:'A D / Arrows',
  init(canvas, ctx, env){
    this.w=canvas.width; this.h=canvas.height;
    this.player={x:this.w/2,y:this.h-50,w:40,h:20,speed:320};
    this.rocks=[]; this.timer=0; this.spawnRate=0.8; this.score=0; this.env=env;
    this.kd=(e)=>{ if(e.key==='a' || e.key==='ArrowLeft') this.player.vx=-1; if(e.key==='d'||e.key==='ArrowRight') this.player.vx=1; };
    this.ku=(e)=>{ if(e.key==='a' || e.key==='ArrowLeft') this.player.vx=0; if(e.key==='d'||e.key==='ArrowRight') this.player.vx=0; };
    window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku);
  },
  update(dt){
    // spawn
    this.timer += dt;
    if(this.timer > this.spawnRate){ this.timer=0; this.rocks.push({x:Math.random()*this.w,y:-20,r:12,vy:100+Math.random()*120}); if(this.spawnRate>0.25) this.spawnRate *= 0.99; }
    // player move
    this.player.x += (this.player.vx||0) * this.player.speed * dt;
    this.player.x = Math.max(0, Math.min(this.w-this.player.w, this.player.x));
    // rocks
    for(const r of this.rocks){ r.y += r.vy*dt; }
    // collision & remove
    for(let i=this.rocks.length-1;i>=0;i--){
      const r = this.rocks[i];
      if(r.y > this.h+50) { this.rocks.splice(i,1); this.score++; this.env && this.env.setScore(this.score); continue; }
      if(r.x+ r.r > this.player.x && r.x - r.r < this.player.x + this.player.w && r.y + r.r > this.player.y && r.y - r.r < this.player.y + this.player.h){
        alert('Kena! Skor: '+this.score); this.reset(); return;
      }
    }
  },
  draw(ctx){
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.fillStyle='#86C232'; ctx.fillRect(this.player.x,this.player.y,this.player.w,this.player.h);
    ctx.fillStyle='#A42'; for(const r of this.rocks) ctx.beginPath(), ctx.arc(r.x,r.y,r.r,0,Math.PI*2), ctx.fill();
  },
  reset(){ this.rocks=[]; this.score=0; this.spawnRate=0.8; this.env && this.env.setScore(0); },
  cleanup(){ window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku); }
});

/* ----------------------------- TEMPLATES (14 slots) -----------------------------
   These templates are minimal game shells. Copy & implement logic inside init/update/draw.
   Each template included with id template-1 ... template-14.
 ---------------------------------------------------------------------------*/
for(let i=1;i<=14;i++){
  registerGame({
    id:`template-${i}`,
    title:`Template Game ${i}`,
    description:'Template game — klik Mainkan lalu isi logika di scripts.',
    instructions:'Template: buka games.js, cari template-'+i+' dan implementasikan init/update/draw.',
    controls:'TBD',
    init(canvas, ctx, env){
      // minimal example: show rotating square and click to increase score
      this.t = 0; this.score = 0; this.env = env;
      this.w = canvas.width; this.h = canvas.height;
      this.md = (e)=>{ this.score++; this.env && this.env.setScore(this.score); };
      canvas.addEventListener('mousedown', this.md);
    },
    update(dt){ this.t += dt; },
    draw(ctx){
      ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
      ctx.save();
      ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
      ctx.rotate(this.t);
      ctx.fillStyle = '#86C232';
      const s = 40 + Math.sin(this.t*2)*10;
      ctx.fillRect(-s/2,-s/2,s,s);
      ctx.restore();
    },
    cleanup(){ canvas.removeEventListener('mousedown', this.md); }
  });
}

/* ----------------------------- init -----------------------------*/
renderCatalog();

/* show quick instruction if user has no games */
if(GAMES.length===0) catalogEl.innerHTML='<p>Tidak ada game. Tambahkan game di games.js</p>';

/* Optional: keyboard focus on canvas when a game opens */
document.addEventListener('click', (e)=>{ if(activeGame) canvas.focus(); });

/* Done. You can extend games by copying any of the functional games or templates.
   To add more than 20 games: add new registerGame(...) entries above. */

/* ----------------------------- End of file ----------------------------- */
