// game.js — MineLite (simple voxel place/break)
// - First-person / PointerLock (desktop)
// - Virtual joystick + buttons (mobile)
// - Small world grid, place/remove blocks at integer coordinates
// - No external assets, only three.js from CDN

/* ================== Basic three.js setup ================== */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fbfdc);

// camera & pointer controls
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);
const controls = new THREE.PointerLockControls(camera, document.body);
let isLocked = false;
controls.addEventListener('lock', ()=> isLocked = true);
controls.addEventListener('unlock', ()=> isLocked = false);

// lights
const hemi = new THREE.HemisphereLight(0xffffee, 0x223344, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5,10,2); dir.castShadow = true;
scene.add(dir);

/* ================== Ground & initial flat world ================== */
// parameters
const WORLD_W = 24, WORLD_D = 24, WORLD_H = 10;
const BLOCK = 1; // block size

// materials (simple colors)
const MATERIALS = {
  grass: new THREE.MeshLambertMaterial({ color: 0x66aa44 }),
  dirt:  new THREE.MeshLambertMaterial({ color: 0x8b5a3c }),
  stone: new THREE.MeshLambertMaterial({ color: 0x8b8f92 }),
  wood:  new THREE.MeshLambertMaterial({ color: 0xC38A5A })
};

// shared box geometry
const BOX_GEO = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);

// world storage: Map keyed by "x,y,z" -> mesh
const world = new Map();

// helper key
function keyOf(x,y,z){ return `${x},${y},${z}`; }

// create initial flat ground (y = 0..1)
for(let x = -WORLD_W/2; x < WORLD_W/2; x++){
  for(let z = -WORLD_D/2; z < WORLD_D/2; z++){
    const h = 1; // 1 block high
    for(let y= -1; y < h-1; y++){
      const mat = (y < 0) ? MATERIALS.dirt : MATERIALS.grass;
      placeBlockInstant(x, y, z, mat);
    }
  }
}

// optional decorative rocks/trees (simple)
(function scatterProps(){
  for(let i=0;i<40;i++){
    const x = Math.floor(Math.random() * WORLD_W) - WORLD_W/2;
    const z = Math.floor(Math.random() * WORLD_D) - WORLD_D/2;
    if(Math.random() < 0.18){
      // small pillar
      const h = 1 + Math.floor(Math.random()*2);
      for(let y=0;y<h;y++) placeBlockInstant(x, y, z, MATERIALS.stone);
    }
  }
})();

/* place block quickly (no checks) */
function placeBlockInstant(x,y,z, material){
  const m = new THREE.Mesh(BOX_GEO, material);
  m.position.set(x + 0.5, y + 0.5, z + 0.5);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  world.set(keyOf(x,y,z), { mesh: m, type: material });
}

/* remove block instantly */
function removeBlockInstant(x,y,z){
  const k = keyOf(x,y,z);
  if(!world.has(k)) return false;
  const o = world.get(k);
  scene.remove(o.mesh);
  world.delete(k);
  return true;
}

/* ================== Raycasting for target block (center of screen) ================== */
const raycaster = new THREE.Raycaster();
function getTargetBlock(){
  // cast from camera forward
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  raycaster.set(origin, dir);
  // intersect world meshes
  const meshes = Array.from(world.values()).map(v=>v.mesh);
  const inter = raycaster.intersectObjects(meshes, false);
  if(inter.length === 0) return null;
  const hit = inter[0];
  // compute integer block coord hit
  const p = hit.point.clone();
  // move slightly back along normal to find the block we hit
  const normal = hit.face.normal.clone();
  const inside = p.sub(normal.multiplyScalar(0.001));
  const bx = Math.floor(inside.x);
  const by = Math.floor(inside.y);
  const bz = Math.floor(inside.z);
  return { hit, bx, by, bz, normal: hit.face.normal.clone() };
}

/* ================== Place / Remove logic ================== */
let selectedType = 'grass';
const types = ['grass','dirt','stone','wood'];
document.getElementById('curBlock').textContent = capitalize(selectedType);

// selector buttons
document.querySelectorAll('.sel').forEach(b=>{
  b.addEventListener('click', ()=> {
    document.querySelectorAll('.sel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    selectedType = b.dataset.type;
    document.getElementById('curBlock').textContent = capitalize(selectedType);
  });
});
document.querySelector('.sel').classList.add('active');

function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

/* place block: find face and put adjacent in normal direction */
function placeBlock(){
  const t = getTargetBlock();
  if(!t) return;
  const nx = t.bx + Math.round(t.normal.x);
  const ny = t.by + Math.round(t.normal.y);
  const nz = t.bz + Math.round(t.normal.z);
  const k = keyOf(nx,ny,nz);
  if(world.has(k)) return; // occupied
  const mat = MATERIALS[selectedType] || MATERIALS.grass;
  placeBlockInstant(nx, ny, nz, mat);
}

/* remove block: remove the target block (but prevent removing ground lowest layer y <= -1) */
function removeBlock(){
  const t = getTargetBlock();
  if(!t) return;
  // remove the hit block
  const rx = t.bx, ry = t.by, rz = t.bz;
  if(ry <= -1) return; // protect deep base
  removeBlockInstant(rx, ry, rz);
}

/* keyboard shortcuts: 1..4 choose block */
window.addEventListener('keydown', (e)=>{
  if(e.key >= '1' && e.key <= '4'){
    const idx = parseInt(e.key) - 1;
    selectedType = types[idx];
    document.getElementById('curBlock').textContent = capitalize(selectedType);
    document.querySelectorAll('.sel').forEach(x=>x.classList.toggle('active', x.dataset.type === selectedType));
  }
  if(e.key.toLowerCase() === 'e'){ placeBlock(); }
  if(e.key.toLowerCase() === 'q'){ removeBlock(); }
});

/* mouse click: left click removes, right click places (desktop) */
/* prevent context menu */
window.addEventListener('contextmenu', e=> e.preventDefault());
window.addEventListener('mousedown', (e)=>{
  if(window.innerWidth > 900 && !isLocked) return; // require pointer lock on desktop
  if(e.button === 0) removeBlock();
  if(e.button === 2) placeBlock();
});

/* also allow center-screen tap for mobile: single tap => remove, double-tap => place (handled via buttons below) */

/* ================== Basic movement (WASD + jump) ================== */
let move = { forward:0, back:0, left:0, right:0 };
let velocity = new THREE.Vector3();
let canJump = false;
const WALK_SPEED = 4.0;
const JUMP_SPEED = 5.0;

document.addEventListener('keydown', (e)=>{
  if(e.code === 'KeyW' || e.code === 'ArrowUp') move.forward = 1;
  if(e.code === 'KeyS' || e.code === 'ArrowDown') move.back = 1;
  if(e.code === 'KeyA' || e.code === 'ArrowLeft') move.left = 1;
  if(e.code === 'KeyD' || e.code === 'ArrowRight') move.right = 1;
  if(e.code === 'Space' && canJump){ velocity.y = JUMP_SPEED; canJump = false; }
});
document.addEventListener('keyup', (e)=>{
  if(e.code === 'KeyW' || e.code === 'ArrowUp') move.forward = 0;
  if(e.code === 'KeyS' || e.code === 'ArrowDown') move.back = 0;
  if(e.code === 'KeyA' || e.code === 'ArrowLeft') move.left = 0;
  if(e.code === 'KeyD' || e.code === 'ArrowRight') move.right = 0;
});

/* pointer lock trigger: click canvas on desktop */
canvas.addEventListener('click', () => {
  if(window.innerWidth > 900){
    controls.lock();
  }
});

/* simple ground height function (flat ground at y=0 with small noise) */
function groundHeightAt(x,z){
  // keep flat for now; could add small noise
  return 0;
}

/* ================== Mobile joystick implementation ================== */
const joyBase = document.getElementById('joystick-base');
const joyThumb = document.getElementById('joystick-thumb');
let touchId = null;
let joy = { x:0, y:0 };
if(joyBase){
  joyBase.addEventListener('touchstart', (ev)=>{ ev.preventDefault(); const t = ev.changedTouches[0]; touchId = t.identifier; });
  joyBase.addEventListener('touchmove', (ev)=>{
    ev.preventDefault();
    const ts = [...ev.changedTouches].find(t=>t.identifier===touchId) || ev.changedTouches[0];
    if(!ts) return;
    const rect = joyBase.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const dx = ts.clientX - cx, dy = ts.clientY - cy;
    const max = rect.width * 0.36;
    const ndx = Math.max(-max, Math.min(max, dx));
    const ndy = Math.max(-max, Math.min(max, dy));
    joyThumb.style.transform = `translate(${ndx}px, ${ndy}px)`;
    joy.x = ndx / max; joy.y = ndy / max;
  }, { passive: false });
  joyBase.addEventListener('touchend', (ev)=>{ ev.preventDefault(); touchId = null; joyThumb.style.transform = 'translate(0,0)'; joy.x = 0; joy.y = 0; }, { passive: false });
}

/* mobile buttons */
document.getElementById('btn-place').addEventListener('touchstart', (e)=>{ e.preventDefault(); placeBlock(); }, { passive:false });
document.getElementById('btn-remove').addEventListener('touchstart', (e)=>{ e.preventDefault(); removeBlock(); }, { passive:false });

/* ================== HUD helper: show target highlight ================== */
// small transparent box for previewing where a place will happen
const previewMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent:true, opacity:0.2 });
const previewMesh = new THREE.Mesh(BOX_GEO, previewMat);
previewMesh.visible = false;
scene.add(previewMesh);

/* ================== Animation loop ================== */
let prevTime = performance.now();
function animate(now){
  const dt = Math.min(0.05, (now - prevTime)/1000);
  prevTime = now;

  // movement via keyboard or joystick
  let forward = move.forward - move.back;
  let strafe = move.right - move.left;
  // joystick overrides if present
  if(Math.abs(joy.x) > 0.01 || Math.abs(joy.y) > 0.01){
    // joy.y: up is negative
    forward = -joy.y;
    strafe = joy.x;
  }

  // create move vector in world space using camera yaw
  const yaw = controls.getObject().rotation.y || 0;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const vx = (sin * forward + cos * strafe) * WALK_SPEED;
  const vz = (cos * forward - sin * strafe) * WALK_SPEED;

  controls.getObject().position.x += vx * dt;
  controls.getObject().position.z += vz * dt;

  // gravity & vertical
  velocity.y -= 9.8 * dt;
  controls.getObject().position.y += velocity.y * dt;

  // keep above ground
  const gx = controls.getObject().position.x;
  const gz = controls.getObject().position.z;
  const groundY = groundHeightAt(gx, gz) + 1.6; // eye height
  if(controls.getObject().position.y < groundY){
    velocity.y = 0;
    controls.getObject().position.y = groundY;
    canJump = true;
  }

  // update preview for placement
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  raycaster.set(origin, dir);
  const meshes = Array.from(world.values()).map(v=>v.mesh);
  const inter = raycaster.intersectObjects(meshes, false);
  if(inter.length > 0){
    const hit = inter[0];
    const p = hit.point.clone().sub(hit.face.normal.clone().multiplyScalar(0.001));
    const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
    // preview place adjacent
    const placeX = bx + Math.round(hit.face.normal.x);
    const placeY = by + Math.round(hit.face.normal.y);
    const placeZ = bz + Math.round(hit.face.normal.z);
    previewMesh.position.set(placeX + 0.5, placeY + 0.5, placeZ + 0.5);
    previewMesh.visible = true;
  } else {
    previewMesh.visible = false;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

/* ================== Resize handler ================== */
window.addEventListener('resize', ()=> {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

/* ================== Utility: simple deploy notes ================== */
/* This project is self-contained. To run online:
   - Put index.html, styles.css, game.js in a public GitHub repo (root)
   - Enable GitHub Pages (main branch, root)
   - Open https://<username>.github.io/<repo>/
   No extra server code required.
*/

/* ================== Done ================== */
window.MineLite = { scene, world, placeBlock, removeBlock };
