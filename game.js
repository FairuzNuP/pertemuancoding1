// game.js
// 3D Collector — simple cross-platform game using three.js
// Features:
// - third-person sphere player on plane
// - collect rotating coins (3D objects)
// - simple AI enemies that wander toward player
// - desktop: WASD + mouse; mobile: joystick + fire button
// - camera follows player; responsive canvas

// ----- Basic scene & renderer -----
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb).multiplyScalar(0.25);

// camera (third-person)
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 8, 12);

// light
const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 0.9);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 7);
scene.add(dir);

// ground
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x245b2b });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

// grid rings / subtle
const grid = new THREE.GridHelper(200, 40, 0x000000, 0x0b2a15);
grid.material.opacity = 0.12;
grid.material.transparent = true;
scene.add(grid);

// ----- player -----
const player = {
  mesh: null,
  speed: 6.0, // units / second
  dir: new THREE.Vector3(0,0,1),
  lives: 3,
  score: 0
};
const playerGeo = new THREE.SphereGeometry(0.6, 24, 24);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x86C232, metalness: 0.2, roughness: 0.6 });
player.mesh = new THREE.Mesh(playerGeo, playerMat);
player.mesh.position.set(0, 0.6, 0);
scene.add(player.mesh);

// ----- coins (collectibles) -----
const coins = [];
const coinGeo = new THREE.TorusGeometry(0.35, 0.12, 12, 24);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.8, roughness: 0.2 });

function spawnCoin(x,z){
  const m = new THREE.Mesh(coinGeo, coinMat);
  m.position.set(x, 0.6, z);
  m.rotation.x = Math.PI/2;
  scene.add(m);
  coins.push(m);
}

// spawn random coins
for(let i=0;i<18;i++){
  spawnCoin((Math.random()-0.5)*60, (Math.random()-0.5)*60);
}

// ----- enemies -----
const enemies = [];
const enemyGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
function spawnEnemy(x,z){
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.6, 0.5) });
  const m = new THREE.Mesh(enemyGeo, mat);
  m.position.set(x, 0.45, z);
  scene.add(m);
  enemies.push({ mesh: m, speed: 1.8 + Math.random()*1.2 });
}
for(let i=0;i<6;i++){
  spawnEnemy((Math.random()-0.5)*60, (Math.random()-0.5)*60);
}

// ----- bullets -----
const bullets = [];
const bulletGeo = new THREE.SphereGeometry(0.12, 8, 8);
const bulletMat = new THREE.MeshStandardMaterial({ color: 0xff9e6d, emissive: 0xff7a3d });

function shoot(dirVec){
  const b = new THREE.Mesh(bulletGeo, bulletMat);
  b.position.copy(player.mesh.position);
  scene.add(b);
  bullets.push({ mesh: b, vel: dirVec.clone().multiplyScalar(18), life: 2.2 });
}

// ----- camera follow params -----
const camOffset = new THREE.Vector3(0, 6, 10);
const camLerp = 0.08;

// ----- input handling -----
const keys = {};
window.addEventListener('keydown', (e)=> keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e)=> keys[e.key.toLowerCase()] = false);

// mouse rotation control
let yaw = 0, pitch = 0;
let isPointerDown = false;
let lastMouse = {x:0,y:0};
canvas.addEventListener('mousedown', (e)=>{ isPointerDown = true; lastMouse.x = e.clientX; lastMouse.y = e.clientY; canvas.focus(); });
window.addEventListener('mouseup', ()=> isPointerDown = false);
window.addEventListener('mousemove', (e)=>{
  if(isPointerDown && window.innerWidth > 900){
    const dx = (e.clientX - lastMouse.x) * 0.005;
    yaw -= dx;
    lastMouse.x = e.clientX;
  }
});

// click to fire (desktop)
canvas.addEventListener('click', (e)=>{
  if(window.innerWidth > 900){
    // compute direction on XZ plane from player toward mouse world position
    const mouse = getMouseWorld(e.clientX, e.clientY);
    if(mouse){
      const dir = new THREE.Vector3(mouse.x - player.mesh.position.x, 0, mouse.z - player.mesh.position.z).normalize();
      shoot(dir);
    }
  }
});

// helper: unproject mouse to ground plane
function getMouseWorld(clientX, clientY){
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ( (clientX - rect.left) / rect.width ) * 2 - 1;
  const y = - ( (clientY - rect.top) / rect.height ) * 2 + 1;
  const vec = new THREE.Vector3(x, y, 0.5).unproject(camera);
  const dir = vec.sub(camera.position).normalize();
  const distance = -camera.position.y / dir.y;
  const pos = camera.position.clone().add(dir.multiplyScalar(distance));
  return pos; // position on y=0 plane
}

// ----- mobile joystick (simple) -----
const joyBase = document.getElementById('joystick-base');
const joyThumb = document.getElementById('joystick-thumb');
let touchId = null;
let joyVec = new THREE.Vector2(0,0);
joyBase.addEventListener('touchstart', (ev)=>{
  ev.preventDefault();
  const t = ev.changedTouches[0];
  touchId = t.identifier;
});
joyBase.addEventListener('touchmove', (ev)=>{
  ev.preventDefault();
  const t = [...ev.changedTouches].find(tt => tt.identifier === touchId) || ev.changedTouches[0];
  if(!t) return;
  const rect = joyBase.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const dx = (t.clientX - cx);
  const dy = (t.clientY - cy);
  const max = rect.width * 0.4;
  const ndx = Math.max(-max, Math.min(max, dx));
  const ndy = Math.max(-max, Math.min(max, dy));
  joyThumb.style.transform = `translate(${ndx}px, ${ndy}px)`;
  joyVec.set(ndx / max, ndy / max);
});
joyBase.addEventListener('touchend', (ev)=>{
  ev.preventDefault();
  touchId = null;
  joyThumb.style.transform = `translate(0,0)`;
  joyVec.set(0,0);
});

// mobile fire button
const fireBtn = document.getElementById('fire-btn');
fireBtn.addEventListener('touchstart', (ev)=>{ ev.preventDefault(); // shoot forward
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const dir = new THREE.Vector3(camDir.x, 0, camDir.z).normalize();
  shoot(dir);
});
fireBtn.addEventListener('click', (e)=>{ // fallback for non-touch
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const dir = new THREE.Vector3(camDir.x, 0, camDir.z).normalize();
  shoot(dir);
});

// ----- UI elements -----
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const restartBtn = document.getElementById('restart');
restartBtn.addEventListener('click', resetGame);

// ----- game loop -----
let last = performance.now();

function resetGame(){
  // remove coins & enemies & bullets
  coinsCleanup();
  enemiesCleanup();
  bulletsCleanup();
  player.mesh.position.set(0,0.6,0);
  player.lives = 3;
  player.score = 0;
  // respawn coins & enemies
  for(let i=0;i<18;i++) spawnCoinAt((Math.random()-0.5)*60, (Math.random()-0.5)*60);
  for(let i=0;i<6;i++) spawnEnemy((Math.random()-0.5)*60, (Math.random()-0.5)*60);
  updateHUD();
}

function coinsCleanup(){ while(coins.length){ const m = coins.pop(); scene.remove(m); } }
function enemiesCleanup(){ while(enemies.length){ const e = enemies.pop(); scene.remove(e.mesh); } }
function bulletsCleanup(){ while(bullets.length){ const b = bullets.pop(); scene.remove(b.mesh); } }

function spawnCoinAt(x,z){
  spawnCoin(x,z);
}
function spawnCoin(x,z){
  // reuse the coin creation function from top (but coins array local here)
  const m = new THREE.Mesh(coinGeo, coinMat);
  m.position.set(x, 0.6, z);
  m.rotation.x = Math.PI/2;
  scene.add(m);
  coins.push(m);
}
function spawnEnemy(x,z){
  spawnEnemyObj(x,z);
}
function spawnEnemyObj(x,z){
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.6, 0.5) });
  const m = new THREE.Mesh(enemyGeo, mat);
  m.position.set(x, 0.45, z);
  scene.add(m);
  enemies.push({ mesh: m, speed: 1.8 + Math.random()*1.2 });
}

// Note: because spawnCoin/spawnEnemy were earlier defined, we avoid duplicating; ensure functions are available
// to keep code consistent, small wrappers above call the earlier functions (they exist).

function updateHUD(){
  scoreEl.textContent = `Skor: ${player.score}`;
  livesEl.textContent = `Nyawa: ${player.lives}`;
}

// main animate
function animate(now){
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // handle input -> movement vector on XZ plane
  let inputX = 0, inputZ = 0;
  if(window.innerWidth > 900){
    // desktop WASD / arrows
    if(keys['w']||keys['arrowup']) inputZ -= 1;
    if(keys['s']||keys['arrowdown']) inputZ += 1;
    if(keys['a']||keys['arrowleft']) inputX -= 1;
    if(keys['d']||keys['arrowright']) inputX += 1;
    // mouse-based yaw applied to direction
  } else {
    // mobile joystick (joyVec: x right, y down). Map to camera orientation
    inputX = joyVec.x;
    inputZ = -joyVec.y;
  }

  // compute camera-forward-right on XZ plane
  const camForward = new THREE.Vector3();
  camera.getWorldDirection(camForward);
  camForward.y = 0; camForward.normalize();
  const camRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), camForward).normalize();

  // movement direction relative to camera
  const moveDir = new THREE.Vector3();
  moveDir.addScaledVector(camForward, inputZ);
  moveDir.addScaledVector(camRight, inputX);
  if(moveDir.lengthSq() > 0.0001) moveDir.normalize();

  // rotate player to face movement direction smoothly
  if(moveDir.lengthSq()>0.0001){
    const target = Math.atan2(moveDir.x, moveDir.z); // note: orientation mapping
    // apply rotation to mesh visually (y rotation)
    player.mesh.rotation.y += (target - player.mesh.rotation.y) * 8 * dt;
  }

  // move player
  player.mesh.position.addScaledVector(moveDir, player.speed * dt);

  // clamp player within large arena bounds
  const limit = 95;
  player.mesh.position.x = THREE.MathUtils.clamp(player.mesh.position.x, -limit, limit);
  player.mesh.position.z = THREE.MathUtils.clamp(player.mesh.position.z, -limit, limit);

  // rotate coins (visual)
  for(const c of coins){ c.rotation.z += dt * 3; }

  // bullets update
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.mesh.position.addScaledVector(b.vel, dt);
    b.life -= dt;
    if(b.life <= 0){
      scene.remove(b.mesh);
      bullets.splice(i,1);
      continue;
    }
    // bullet vs enemy
    for(let j=enemies.length-1;j>=0;j--){
      const e = enemies[j];
      if(e.mesh.position.distanceTo(b.mesh.position) < 0.9){
        // hit enemy: remove both
        scene.remove(e.mesh);
        enemies.splice(j,1);
        scene.remove(b.mesh);
        bullets.splice(i,1);
        player.score += 5;
        updateHUD();
        break;
      }
    }
  }

  // enemies behavior: simple chase
  for(const e of enemies){
    const dir = new THREE.Vector3().subVectors(player.mesh.position, e.mesh.position);
    dir.y = 0;
    const dist = dir.length();
    if(dist > 0.01){
      dir.normalize();
      e.mesh.position.addScaledVector(dir, e.speed * dt);
      // clamp
      e.mesh.position.x = THREE.MathUtils.clamp(e.mesh.position.x, -limit, limit);
      e.mesh.position.z = THREE.MathUtils.clamp(e.mesh.position.z, -limit, limit);
    }
    // collision with player
    if(e.mesh.position.distanceTo(player.mesh.position) < 1.0){
      // damage and knockback
      player.lives -= 1;
      updateHUD();
      // push enemy away briefly
      const push = new THREE.Vector3().subVectors(e.mesh.position, player.mesh.position).normalize().multiplyScalar(2);
      e.mesh.position.add(push);
      if(player.lives <= 0){
        // simple game over: reset
        alert(`Game Over! Skor: ${player.score}`);
        resetGame();
        last = performance.now();
        return;
      }
    }
  }

  // player vs coins (collect)
  for(let i=coins.length-1;i>=0;i--){
    const c = coins[i];
    if(c.position.distanceTo(player.mesh.position) < 1.2){
      // collect
      scene.remove(c);
      coins.splice(i,1);
      player.score += 1;
      updateHUD();
      // spawn a new coin somewhere
      spawnCoin((Math.random()-0.5)*60, (Math.random()-0.5)*60);
    }
  }

  // camera smooth follow: target above & behind player
  const desiredPos = player.mesh.position.clone().add(camOffset.clone().applyAxisAngle(new THREE.Vector3(0,1,0), yaw));
  camera.position.lerp(desiredPos, camLerp);
  // look at player
  const lookPos = player.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0));
  camera.lookAt(lookPos);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// ----- helpers: resize -----
window.addEventListener('resize', ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ----- expose some functions used earlier for spawn wrappers -----
function spawnCoin(x,z){ // ensure function exists for spawnCoinAt wrapper
  const m = new THREE.Mesh(coinGeo, coinMat);
  m.position.set(x, 0.6, z);
  m.rotation.x = Math.PI/2;
  scene.add(m);
  coins.push(m);
}
function spawnEnemy(x,z){
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.6, 0.5) });
  const m = new THREE.Mesh(enemyGeo, mat);
  m.position.set(x, 0.45, z);
  scene.add(m);
  enemies.push({ mesh: m, speed: 1.8 + Math.random()*1.2 });
}

// --- initial HUD update ---
updateHUD();
