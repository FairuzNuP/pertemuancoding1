/* Star Collector — simple top-down shooter/collector */

// ===== Canvas setup =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width, H = canvas.height;

// ===== Game state =====
const state = {
  running: true,
  lastTime: performance.now(),
  keys: {},
  mouse: { x: W/2, y: H/2, down: false },
  score: 0,
  lives: 3,
  level: 1,
  requiredToLevel: 10,
  bullets: [],
  stars: [],
  enemies: [],
  player: null,
  muted: false
};

// ===== Utility =====
const rand = (min,max)=> Math.random()*(max-min)+min;
const clamp = (v,a,b)=> Math.max(a,Math.min(b,v));

// ===== Entities =====
class Player {
  constructor(x,y){ this.x=x; this.y=y; this.r=14; this.speed=220; this.reload=0; }
  update(dt){
    let dx=0,dy=0;
    if(state.keys['w']||state.keys['arrowup']) dy-=1;
    if(state.keys['s']||state.keys['arrowdown']) dy+=1;
    if(state.keys['a']||state.keys['arrowleft']) dx-=1;
    if(state.keys['d']||state.keys['arrowright']) dx+=1;
    const mag=Math.hypot(dx,dy)||1;
    this.x+=dx/mag*this.speed*dt;
    this.y+=dy/mag*this.speed*dt;
    this.x=clamp(this.x,this.r,W-this.r);
    this.y=clamp(this.y,this.r,H-this.r);
    this.reload-=dt;
    if(state.mouse.down && this.reload<=0){ this.shoot(); this.reload=0.18; }
  }
  shoot(){
    const ang=Math.atan2(state.mouse.y-this.y,state.mouse.x-this.x);
    const spd=520;
    state.bullets.push(new Bullet(this.x+Math.cos(ang)*(this.r+8),this.y+Math.sin(ang)*(this.r+8),Math.cos(ang)*spd,Math.sin(ang)*spd));
    playSound('shoot');
  }
  draw(){
    ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fillStyle='#86C232'; ctx.fill();
    const ang=Math.atan2(state.mouse.y-this.y,state.mouse.x-this.x);
    ctx.beginPath(); ctx.arc(this.x+Math.cos(ang)*6,this.y+Math.sin(ang)*6,4,0,Math.PI*2); ctx.fillStyle='#063'; ctx.fill();
  }
}

class Bullet{ constructor(x,y,vx,vy){this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.r=4;this.life=2;}
  update(dt){this.x+=this.vx*dt;this.y+=this.vy*dt;this.life-=dt;}
  draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fillStyle='#ffd166';ctx.fill();}
}

class Star{ constructor(x,y){this.x=x;this.y=y;this.r=9;}
  draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fillStyle='#fff1b6';ctx.fill();}
}

class Enemy{ constructor(x,y,spd=60){this.x=x;this.y=y;this.r=16;this.spd=spd;this.color=`hsl(${rand(0,360)} 60% 55%)`;}
  update(dt){const px=state.player.x,py=state.player.y;let dx=px-this.x,dy=py-this.y;const d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;this.x+=dx*this.spd*dt;this.y+=dy*this.spd*dt;this.x=clamp(this.x,this.r,W-this.r);this.y=clamp(this.y,this.r,H-this.r);}
  draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fillStyle=this.color;ctx.fill();}
}

// ===== Sounds =====
function playSound(name){
  if(state.muted) return;
  if(!window.AudioContext) return;
  const ac=window._ac||(window._ac=new (window.AudioContext||window.webkitAudioContext)());
  const o=ac.createOscillator(), g=ac.createGain();
  if(name==='shoot') o.frequency.value=900;
  if(name==='hit') o.frequency.value=200;
  if(name==='collect') o.frequency.value=1200;
  g.gain.value=0.05; o.connect(g); g.connect(ac.destination);
  o.start(); o.stop(ac.currentTime+0.1);
}

// ===== Game init =====
function startNewGame(){
  state.score=0;state.lives=3;state.level=1;
  state.bullets=[];state.stars=[];state.enemies=[];
  state.player=new Player(W/2,H/2);state.running=true;
  spawnStars(6);spawnEnemies(2);updateHUD();
}
function spawnStars(n=1){for(let i=0;i<n;i++)state.stars.push(new Star(rand(40,W-40),rand(40,H-40)));}
function spawnEnemies(n=1){for(let i=0;i<n;i++){const side=Math.floor(rand(0,4));let x,y;
  if(side===0){x=rand(10,W-10);y=-30;}if(side===1){x=rand(10,W-10);y=H+30;}
  if(side===2){x=-30;y=rand(10,H-10);}if(side===3){x=W+30;y=rand(10,H-10);}
  state.enemies.push(new Enemy(x,y,60+(state.level-1)*18));}}
function circleCollide(a,b){return Math.hypot(a.x-b.x,a.y-b.y)<a.r+b.r;}
function handleCollisions(){
  for(let i=state.bullets.length-1;i>=0;i--){const b=state.bullets[i];
    for(let j=state.enemies.length-1;j>=0;j--){const e=state.enemies[j];
      if(circleCollide(b,e)){state.enemies.splice(j,1);state.bullets.splice(i,1);state.score+=3;playSound('hit');updateHUD();break;}}}
  for(let i=state.stars.length-1;i>=0;i--){if(circleCollide(state.stars[i],state.player)){state.stars.splice(i,1);state.score++;playSound('collect');updateHUD();spawnStars(1);if(state.score>=state.level*state.requiredToLevel)levelUp();}}
  for(let i=state.enemies.length-1;i>=0;i--){if(circleCollide(state.enemies[i],state.player)){state.enemies.splice(i,1);state.lives--;playSound('hit');updateHUD();if(state.lives<=0)gameOver();}}}
function levelUp(){state.level++;spawnEnemies(1+Math.floor(state.level/2));spawnStars(2);updateHUD();}
function updateHUD(){document.getElementById('score').textContent=state.score;document.getElementById('lives').textContent=state.lives;document.getElementById('level').textContent=state.level;}

// ===== Loop & draw =====
function draw(){ctx.fillStyle='#04182a';ctx.fillRect(0,0,W,H);
  state.stars.forEach(s=>s.draw());state.enemies.forEach(e=>e.draw());state.bullets.forEach(b=>b.draw());state.player.draw();}
function step(now){const dt=Math.min(0.05,(now-state.lastTime)/1000);state.lastTime=now;
  if(state.running){state.player.update(dt);state.bullets.forEach(b=>b.update(dt));state.bullets=state.bullets.filter(b=>b.life>0);state.enemies.forEach(e=>e.update(dt));handleCollisions();if(Math.random()<0.01+state.level*0.002)spawnEnemies(1);}
  draw();requestAnimationFrame(step);}
function gameOver(){state.running=false;setTimeout(()=>{if(confirm(`Game Over!\nSkor: ${state.score}\nMain lagi?`))startNewGame();},200);}

// ===== Controls =====
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();state.mouse.x=e.clientX-r.left;state.mouse.y=e.clientY-r.top;});
canvas.addEventListener('mousedown',()=>state.mouse.down=true);
window.addEventListener('mouseup',()=>state.mouse.down=false);
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();state.keys[k]=true;if(k==='p')state.running=!state.running;if(k==='r')startNewGame();if(k==='m')toggleMute();});
window.addEventListener('keyup',e=>state.keys[e.key.toLowerCase()]=false);
document.getElementById('restartBtn').addEventListener('click',()=>startNewGame());
document.getElementById('muteBtn').addEventListener('click',toggleMute);
function toggleMute(){state.muted=!state.muted;document.getElementById('muteBtn').textContent=state.muted?'Unmute':'Mute';}

// ===== Start =====
startNewGame();requestAnimationFrame(step);
