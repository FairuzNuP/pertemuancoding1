/* game.js — Voxel Sandbox prototype (HTML + CSS + JS)
   Self-contained, runs entirely from index.html (no external libs).
   Rendering uses Canvas2D "2.5D" stylized cubes for portability.
*/

/* ========== Setup ========== */
const canvas = document.getElementById('glCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas(){
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* ========== World & Blocks ========== */
const worldSize = 50;
const maxHeight = 10;
const cellSize = 24; // base size for drawing scale
const BLOCKS = [
  { id:1, name:'Grass', colorTop:'#5db64d', colorSide:'#4aa03d' },
  { id:2, name:'Dirt',  colorTop:'#9b6b43', colorSide:'#8d5b38' },
  { id:3, name:'Stone', colorTop:'#9aa0a6', colorSide:'#7f858a' },
  { id:4, name:'Wood',  colorTop:'#a66e3c', colorSide:'#8f532a' },
  { id:5, name:'Leaves',colorTop:'#4fb24f', colorSide:'#3f9a3f' }
];

/* initialize grid: each cell has .blocks array (bottom->top) */
const grid = Array.from({length:worldSize}, (_,x) =>
  Array.from({length:worldSize}, (_,y) => ({ blocks: [] }))
);

/* simple terrain generation */
for(let x=0;x<worldSize;x++){
  for(let y=0;y<worldSize;y++){
    const base = 1 + Math.floor(Math.max(0, (Math.sin(x*0.22) + Math.cos(y*0.17)) * 2));
    for(let h=0; h<base-1; h++) grid[x][y].blocks.push(2); // dirt
    grid[x][y].blocks.push(1); // grass top
  }
}
/* add features */
for(let i=0;i<70;i++){
  const rx = Math.floor(Math.random()*worldSize);
  const ry = Math.floor(Math.random()*worldSize);
  grid[rx][ry].blocks.push(3);
}
for(let i=0;i<30;i++){
  const rx = Math.floor(Math.random()*worldSize);
  const ry = Math.floor(Math.random()*worldSize);
  grid[rx][ry].blocks.push(4);
  for(let dx=-1; dx<=1; dx++){
    for(let dy=-1; dy<=1; dy++){
      const x2 = rx+dx, y2 = ry+dy;
      if(x2>=0&&x2<worldSize&&y2>=0&&y2<worldSize) grid[x2][y2].blocks.push(5);
    }
  }
}

/* ========== Player & Camera ========== */
const player = {
  x: worldSize/2 + 0.5,
  y: worldSize/2 + 0.5,
  z: 2.0,
  speed: 5.0
};
let yaw = 0, pitch = 0;
let pointerLocked = false;
const keys = {};

/* ========== Input ========== */
const mouse = { downLeft:false, downRight:false };

window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if(e.key >= '1' && e.key <= '5') {
    currentBlockIndex = Number(e.key)-1;
    updateHUD();
  }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousemove', e=>{
  if(pointerLocked){
    yaw += (e.movementX || 0) * 0.002;
    pitch += (e.movementY || 0) * 0.002;
    pitch = clamp(pitch, -Math.PI*0.45, Math.PI*0.45);
  }
});
canvas.addEventListener('mousedown', e=>{
  if(e.button === 0) mouse.downLeft = true;
  if(e.button === 2) mouse.downRight = true;
});
window.addEventListener('mouseup', ()=>{ mouse.downLeft = false; mouse.downRight = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('click', ()=> canvas.requestPointerLock?.());
document.addEventListener('pointerlockchange', ()=> pointerLocked = document.pointerLockElement === canvas);

/* ========== HUD ========== */
const blockNameEl = document.getElementById('blockName');
const blockIndexEl = document.getElementById('blockIndex');
const invEl = document.getElementById('inventory');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const resetBtn = document.getElementById('resetBtn');

let currentBlockIndex = 0;
function updateHUD(){
  blockNameEl.textContent = BLOCKS[currentBlockIndex].name;
  blockIndexEl.textContent = (currentBlockIndex+1);
  invEl.innerHTML = '';
  for(let i=0;i<BLOCKS.length;i++){
    const d = document.createElement('div');
    d.className = 'slot' + (i===currentBlockIndex ? ' selected' : '');
    d.textContent = i+1;
    d.title = BLOCKS[i].name;
    d.onclick = (ev)=>{ currentBlockIndex = i; updateHUD(); ev.stopPropagation();};
    invEl.appendChild(d);
  }
}
updateHUD();

/* save/load */
saveBtn.addEventListener('click', ()=> {
  try {
    localStorage.setItem('voxel_world_v1', JSON.stringify({world:grid}));
    alert('Dunia tersimpan di localStorage.');
  } catch(e){ alert('Gagal menyimpan.'); }
});
loadBtn.addEventListener('click', ()=> {
  const raw = localStorage.getItem('voxel_world_v1');
  if(!raw){ alert('Tidak ada data tersimpan.'); return; }
  try{
    const parsed = JSON.parse(raw);
    for(let x=0;x<worldSize;x++){
      for(let y=0;y<worldSize;y++){
        if(parsed.world && parsed.world[x] && parsed.world[x][y]) grid[x][y] = parsed.world[x][y];
      }
    }
    alert('Dunia dimuat.');
  } catch(e){ alert('Gagal memuat.'); }
});
resetBtn.addEventListener('click', ()=> { if(confirm('Reset dunia?')) location.reload(); });

/* ========== Utility ========== */
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function getCell(x,y){ if(x<0||y<0||x>=worldSize||y>=worldSize) return null; return grid[x][y]; }
function getCameraDir(){
  const dx = Math.cos(pitch) * Math.sin(yaw);
  const dz = Math.cos(pitch) * Math.cos(yaw);
  const dy = Math.sin(pitch);
  return {dx, dy, dz};
}

/* Basic world->screen projection */
function worldToScreen(wx, wy, hz){
  const cx = wx - player.x;
  const cy = wy - player.y;
  const rx = cx * Math.cos(-yaw) - cy * Math.sin(-yaw);
  const rz = cx * Math.sin(-yaw) + cy * Math.cos(-yaw);
  const ey = hz - player.z;
  const focal = 300;
  const zView = rz + 8;
  const scale = focal / (zView || 0.001);
  const sx = (canvas.width / (devicePixelRatio) / 2) + rx * scale;
  const sy = (canvas.height / (devicePixelRatio) / 2) - ey * scale - 40 * scale;
  return {sx, sy, s:scale, zView};
}

/* Raycast simple */
function raycastBlock(maxDist=8){
  const dir = getCameraDir();
  const step = 0.2;
  for(let t=0.5; t<maxDist; t+=step){
    const wx = player.x + dir.dx * t;
    const wy = player.y + dir.dz * t;
    const wz = player.z + dir.dy * t;
    const cx = Math.floor(wx);
    const cy = Math.floor(wy);
    const cell = getCell(cx, cy);
    if(!cell) continue;
    const topH = cell.blocks.length;
    if(wz <= topH + 0.5) return {cellX:cx, cellY:cy, hitHeight:topH, wx, wy, wz, t};
  }
  return null;
}

function placeBlockAt(cx, cy){
  const cell = getCell(cx, cy);
  if(!cell) return;
  if(cell.blocks.length >= maxHeight) return;
  cell.blocks.push(BLOCKS[currentBlockIndex].id);
}
function removeBlockAt(cx, cy){
  const cell = getCell(cx, cy);
  if(!cell) return;
  if(cell.blocks.length <= 0) return;
  cell.blocks.pop();
}

/* ========== Game loop ========== */
let last = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now - last)/1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt){
  // movement
  let mx = 0, my = 0;
  if(keys['w']) my -= 1;
  if(keys['s']) my += 1;
  if(keys['a']) mx -= 1;
  if(keys['d']) mx += 1;
  const mag = Math.hypot(mx,my) || 1;
  const move = player.speed * dt;
  // convert to world relative movement
  const dx = (mx / mag) * move;
  const dy = (my / mag) * move;
  const worldDX = dx * Math.cos(yaw) - dy * Math.sin(yaw);
  const worldDY = dx * Math.sin(yaw) + dy * Math.cos(yaw);
  player.x += worldDX;
  player.y += worldDY;
  player.x = clamp(player.x, 1, worldSize-2);
  player.y = clamp(player.y, 1, worldSize-2);

  // interactions (single action per click)
  if(mouse.downLeft){
    const hit = raycastBlock(8);
    if(hit) removeBlockAt(hit.cellX, hit.cellY);
    mouse.downLeft = false;
  }
  if(mouse.downRight){
    const hit = raycastBlock(8);
    if(hit) placeBlockAt(hit.cellX, hit.cellY);
    mouse.downRight = false;
  }
}

/* ========== Rendering ========== */
function draw(){
  resizeCanvas();
  // sky gradient
  const t = (Date.now()/10000) % 1;
  const day = 0.6 + 0.4 * Math.sin(t * Math.PI*2);
  const skyTop = `rgba(${Math.floor(20+120*day)},${Math.floor(40+120*day)},${Math.floor(100+120*day)},1)`;
  const skyBottom = `rgba(${Math.floor(150*day)},${Math.floor(190*day)},${Math.floor(250*day)},1)`;
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0, skyTop);
  g.addColorStop(1, skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width/devicePixelRatio, canvas.height/devicePixelRatio);

  // build draw list
  const drawList = [];
  for(let x=0;x<worldSize;x++){
    for(let y=0;y<worldSize;y++){
      const cell = grid[x][y];
      for(let h=0; h<cell.blocks.length; h++){
        const screen = worldToScreen(x+0.5,y+0.5,h+0.5);
        if(screen.zView <= 0.5) continue;
        drawList.push({x,y,h,screen,id:cell.blocks[h]});
      }
    }
  }
  drawList.sort((a,b)=> b.screen.zView - a.screen.zView);

  // draw cubes
  for(const d of drawList){
    const {sx, sy, s} = d.screen;
    const size = Math.max(6, cellSize * s * 0.7);
    const block = BLOCKS.find(b=>b.id===d.id) || BLOCKS[0];
    const top = shadeColor(block.colorTop, -5*(1-s));
    const side = shadeColor(block.colorSide, -12*(1-s));
    ctx.save();
    // top diamond
    ctx.beginPath();
    ctx.moveTo(sx, sy - size*0.6);
    ctx.lineTo(sx + size*0.6, sy);
    ctx.lineTo(sx, sy + size*0.6);
    ctx.lineTo(sx - size*0.6, sy);
    ctx.closePath();
    ctx.fillStyle = top; ctx.fill();
    // left side
    ctx.beginPath();
    ctx.moveTo(sx - size*0.6, sy);
    ctx.lineTo(sx, sy + size*0.6);
    ctx.lineTo(sx - size*0.6, sy + size*1.2);
    ctx.lineTo(sx - size*1.2, sy + size*0.6);
    ctx.closePath();
    ctx.fillStyle = shadeColor(side, -6); ctx.fill();
    // right side
    ctx.beginPath();
    ctx.moveTo(sx + size*0.6, sy);
    ctx.lineTo(sx, sy + size*0.6);
    ctx.lineTo(sx + size*1.2, sy + size*0.6);
    ctx.lineTo(sx + size*0.6, sy + size*1.2);
    ctx.closePath();
    ctx.fillStyle = shadeColor(side, -10); ctx.fill();
    ctx.restore();
  }

  // ground overlay near bottom
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(0, canvas.height/devicePixelRatio - 80, canvas.width/devicePixelRatio, 80);

  // crosshair
  const cx = canvas.width/devicePixelRatio/2;
  const cy = canvas.height/devicePixelRatio/2;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(cx-8, cy); ctx.lineTo(cx+8, cy);
  ctx.moveTo(cx, cy-8); ctx.lineTo(cx, cy+8);
  ctx.stroke();
  ctx.restore();

  // target highlight
  const hit = raycastBlock(8);
  if(hit){
    const screen = worldToScreen(hit.cellX+0.5, hit.cellY+0.5, hit.hitHeight-0.5);
    if(screen.zView>0.5){
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      const s = screen.s;
      ctx.strokeRect(screen.sx - 10*s, screen.sy - 20*s, 20*s, 20*s);
      ctx.restore();
    }
  }
}

/* shade utility */
function shadeColor(hex, percent){
  const f = hex.slice(1);
  const r = parseInt(f.substring(0,2),16);
  const g = parseInt(f.substring(2,4),16);
  const b = parseInt(f.substring(4,6),16);
  const t = percent<0?0:255;
  const p = Math.abs(percent)/100;
  const R = Math.round((t - r)*p) + r;
  const G = Math.round((t - g)*p) + g;
  const B = Math.round((t - b)*p) + b;
  return `rgb(${R},${G},${B})`;
}

/* ========== Mouse action handling (clicks consume once) ========== */
canvas.addEventListener('mousedown', e=>{
  if(e.button === 0) { // left: destroy
    const hit = raycastBlock(8);
    if(hit) removeBlockAt(hit.cellX, hit.cellY);
  }
  if(e.button === 2) { // right: place
    const hit = raycastBlock(8);
    if(hit) placeBlockAt(hit.cellX, hit.cellY);
  }
});

/* ========== Start ========== */
requestAnimationFrame(loop);

/* ========== Accessibility hint: focus canvas to get keyboard hints ========== */
canvas.addEventListener('focus', ()=>{
  if('speechSynthesis' in window){
    const hint = 'Tekan W A S D untuk bergerak. Klik untuk mengunci kursor. Klik kiri untuk menghancurkan, klik kanan untuk menempatkan blok.';
    const u = new SpeechSynthesisUtterance(hint);
    u.lang = 'id-ID';
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
});
