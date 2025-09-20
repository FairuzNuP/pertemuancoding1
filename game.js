/* game.js
   Echoes of Isle — small story exploration (three.js)
   - Playable on Desktop (pointer lock, mouse+keyboard) and Mobile (virtual joystick + tap)
   - Collect 5 Memory Pages; each page reveals a part of the story.
   - Programmatic low-poly world, trees, stones, collectibles with glowing effect.
*/

/* ------------------- Basic three.js setup ------------------- */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x8fbfcf, 0.0025);

/* camera & player (camera represents head) */
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 2000);
camera.position.set(0, 1.6, 6);

/* hemisphere + directional (sun) */
const hemi = new THREE.HemisphereLight(0xffffee, 0x223344, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff6e0, 0.9);
sun.position.set(5, 20, -10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 100;
sun.shadow.camera.left = -30; sun.shadow.camera.right = 30; sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
scene.add(sun);

/* ground (height-field-like) */
const groundGeo = new THREE.PlaneGeometry(300, 300, 128, 128);
groundGeo.rotateX(-Math.PI/2);
// simple height function
for(let i=0;i<groundGeo.attributes.position.count;i++){
  const v = new THREE.Vector3().fromBufferAttribute(groundGeo.attributes.position, i);
  const h = Math.sin(v.x*0.02)*1.2 + Math.cos(v.z*0.015)*1.0 + Math.sin((v.x+v.z)*0.01)*0.6;
  groundGeo.attributes.position.setY(i, h - 2.0);
}
groundGeo.computeVertexNormals();
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2b7a4a, roughness: 1, metalness: 0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.receiveShadow = true;
scene.add(ground);

/* water plane (subtle reflective) */
const waterGeo = new THREE.PlaneGeometry(240, 240, 1, 1);
const waterMat = new THREE.MeshStandardMaterial({ color:0x4aa6d6, opacity:0.28, transparent:true, roughness:0.6, metalness:0.2 });
const water = new THREE.Mesh(waterGeo, waterMat);
water.rotation.x = -Math.PI/2;
water.position.set(0, -1.8, 0);
scene.add(water);

/* low-poly trees and rocks */
const treeGroup = new THREE.Group();
scene.add(treeGroup);
function addTree(x,z, scale=1.0){
  const trunkGeo = new THREE.CylinderGeometry(0.18*scale, 0.22*scale, 1.0*scale, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a35, roughness:1 });
  const t = new THREE.Mesh(trunkGeo, trunkMat);
  t.position.set(x, -1.0 + 0.5*scale, z);
  t.castShadow = true;

  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2e8b3a, roughness:0.8, metalness:0.0 });
  const leavesGeo = new THREE.ConeGeometry(0.9*scale, 1.6*scale, 8);
  const leaves = new THREE.Mesh(leavesGeo, foliageMat);
  leaves.position.set(x, -1.0 + 1.2*scale, z);
  leaves.castShadow = true;

  treeGroup.add(t); treeGroup.add(leaves);
}
function addRock(x,z, scale=1.0){
  const g = new THREE.DodecahedronGeometry(0.5*scale);
  const m = new THREE.MeshStandardMaterial({ color:0x6f6f6f, roughness:1 });
  const r = new THREE.Mesh(g,m);
  r.position.set(x, -1.0 + 0.2*scale, z);
  r.castShadow = true;
  scene.add(r);
}

/* scatter trees & rocks */
for(let i=0;i<60;i++){
  const x = Math.random()*220 - 110;
  const z = Math.random()*220 - 110;
  if(Math.hypot(x,z) < 12) continue; // keep start area clear
  addTree(x,z, 0.7 + Math.random()*1.0);
}
for(let i=0;i<26;i++) addRock(Math.random()*220-110, Math.random()*220-110, 0.6 + Math.random()*1.0);

/* collectible Memory Pages */
const pagesGroup = new THREE.Group();
scene.add(pagesGroup);
const pageGeo = new THREE.PlaneGeometry(0.6,0.4);
const pageMat = new THREE.MeshStandardMaterial({ color:0xfff6e3, emissive:0xfff6cc, emissiveIntensity:0.4, side:THREE.DoubleSide });
const pagePositions = [];
// pick 5 somewhat spaced positions
(function choosePages(){
  let count=0;
  while(count < 5){
    const x = Math.floor((Math.random()*160-80)/4)*4 + (Math.random()*1.6-0.8);
    const z = Math.floor((Math.random()*160-80)/4)*4 + (Math.random()*1.6-0.8);
    if(Math.hypot(x,z) < 8) continue;
    // avoid being too close to previous
    if(pagePositions.some(p=>Math.hypot(p.x-x,p.z-z) < 10)) continue;
    pagePositions.push({x,z});
    count++;
  }
})();
const pageMeshes = [];
for(let i=0;i<pagePositions.length;i++){
  const p = new THREE.Mesh(pageGeo, pageMat.clone());
  p.position.set(pagePositions[i].x, -1.0 + 0.6, pagePositions[i].z);
  p.rotation.y = Math.random()*Math.PI*2;
  p.userData = { type: 'page', index: i, text: storyTexts[i] || ("Memory fragment " + (i+1)) };
  p.castShadow = false; p.receiveShadow = false;
  pagesGroup.add(p); pageMeshes.push(p);
}

/* subtle halo via sprite */
const spriteMaterial = new THREE.SpriteMaterial({ color: 0xffffcc, opacity: 0.18 });
pageMeshes.forEach(m=>{
  const s = new THREE.Sprite(spriteMaterial.clone());
  s.scale.set(1.8,1.2,1); s.position.copy(m.position).add(new THREE.Vector3(0,0.02,0));
  scene.add(s);
});

/* story fragments (5) */
const storyFragments = [
  "I remember the morning light. The island hummed like a living thing.",
  "There was laughter etched on the rocks, and footprints leading to the sea.",
  "A small house once stood where now only ruins whisper in the wind.",
  "You found a letter fragment: '—meet me where the tide keeps secrets—'.",
  "As the last page unfolds, the echo becomes clear: home is where we return."
];

/* attach text to each page mesh userData */
for(let i=0;i<pageMeshes.length;i++) pageMeshes[i].userData.text = storyFragments[i];

/* simple ambient particles (fireflies) */
const fireflies = new THREE.Group();
scene.add(fireflies);
const flGeo = new THREE.SphereGeometry(0.04,6,6);
for(let i=0;i<40;i++){
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent:true, opacity:0.9 });
  const m = new THREE.Mesh(flGeo, mat);
  m.position.set(Math.random()*160-80, -0.6 + Math.random()*3, Math.random()*160-80);
  fireflies.add(m);
}

/* sky gradient via big sphere */
const skyGeo = new THREE.SphereGeometry(500, 32, 16);
const skyMat = new THREE.MeshBasicMaterial({ color: 0x88cfe8, side: THREE.BackSide });
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

/* ------------------- Player controls (cross-platform) ------------------- */
const controls = new THREE.PointerLockControls(camera, document.body);
let locked = false;
document.addEventListener('click', ()=> { if(window.innerWidth > 900 && !locked) controls.lock(); });
controls.addEventListener('lock', ()=> { locked = true; });
controls.addEventListener('unlock', ()=> { locked = false; });

/* movement state */
const move = { forward:0, right:0 };
let velocity = new THREE.Vector3();
const speed = 3.2;
const jumpSpeed = 5;
let canJump = false;

/* keyboard */
const keys = {};
window.addEventListener('keydown', (e)=> {
  keys[e.code] = true;
  if(e.code === 'Space' && canJump){ velocity.y = jumpSpeed; canJump = false; }
});
window.addEventListener('keyup', (e)=> keys[e.code] = false);

/* drag-to-rotate (mobile & desktop fallback) */
let isPointerDown = false, lastPointer = {x:0,y:0};
window.addEventListener('pointerdown', (e)=>{ isPointerDown = true; lastPointer.x = e.clientX; lastPointer.y = e.clientY; });
window.addEventListener('pointerup', ()=> isPointerDown = false);
window.addEventListener('pointermove', (e)=>{
  if(isPointerDown && (!locked || window.innerWidth <= 900)){
    const dx = (e.clientX - lastPointer.x) * 0.002;
    controls.getObject().rotation.y -= dx;
    lastPointer.x = e.clientX; lastPointer.y = e.clientY;
  }
});

/* mobile virtual joystick */
const joyBase = document.getElementById('joystick-base'), joyThumb = document.getElementById('joystick-thumb');
let touchId = null, joyVec = {x:0,y:0};
if(joyBase){
  joyBase.addEventListener('touchstart', (ev)=>{ ev.preventDefault(); const t = ev.changedTouches[0]; touchId = t.identifier; });
  joyBase.addEventListener('touchmove', (ev)=>{ ev.preventDefault();
    const ts = [...ev.changedTouches].find(t => t.identifier===touchId) || ev.changedTouches[0];
    if(!ts) return;
    const rect = joyBase.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const dx = ts.clientX - cx, dy = ts.clientY - cy;
    const max = rect.width * 0.36;
    const ndx = Math.max(-max, Math.min(max, dx));
    const ndy = Math.max(-max, Math.min(max, dy));
    joyThumb.style.transform = `translate(${ndx}px, ${ndy}px)`;
    joyVec.x = ndx / max; joyVec.y = ndy / max;
  });
  joyBase.addEventListener('touchend', (ev)=>{ ev.preventDefault(); touchId = null; joyThumb.style.transform = 'translate(0,0)'; joyVec.x=0; joyVec.y=0; });
}

/* interact button for mobile */
const btnInteract = document.getElementById('btn-interact');
btnInteract && btnInteract.addEventListener('click', ()=> tryInteract());

/* click/tap or key E for interact */
window.addEventListener('keydown', (e)=>{ if(e.key.toLowerCase()==='e') tryInteract(); });
window.addEventListener('pointerdown', (e)=>{ if(e.button === 0 && window.innerWidth <= 900) tryInteract(); });

/* raycaster for interactions */
const ray = new THREE.Raycaster();

/* keep track pages collected */
let pagesCollected = 0;
const pagesTotal = pageMeshes.length;
const pagesCounterEl = document.getElementById('pages');
function updatePagesUI(){ pagesCounterEl.textContent = `Pages: ${pagesCollected} / ${pagesTotal}`; }

/* story panel */
const storyBox = document.getElementById('storyBox');
const storyTextEl = document.getElementById('storyText');
const storyNext = document.getElementById('storyNext');
const closeStory = document.getElementById('closeStory');
let currentStoryIndex = -1;
function openStory(index){
  if(index < 0 || index >= storyFragments.length) return;
  currentStoryIndex = index;
  storyTextEl.textContent = storyFragments[index];
  storyBox.classList.remove('hidden');
}
storyNext.addEventListener('click', ()=> {
  currentStoryIndex++;
  if(currentStoryIndex >= storyFragments.length) currentStoryIndex = storyFragments.length - 1;
  storyTextEl.textContent = storyFragments[currentStoryIndex];
});
closeStory.addEventListener('click', ()=> { storyBox.classList.add('hidden'); });

/* try interact: cast center ray or camera direction */
function tryInteract(){
  // origin at camera
  ray.set(camera.getWorldPosition(new THREE.Vector3()), camera.getWorldDirection(new THREE.Vector3()));
  const intersects = ray.intersectObjects(pageMeshes, true);
  if(intersects.length > 0){
    const m = intersects[0].object;
    collectPage(m);
    return true;
  }
  return false;
}

/* collect page logic */
function collectPage(mesh){
  if(mesh.userData.collected) return;
  mesh.userData.collected = true;
  pagesCollected++;
  updatePagesUI();
  // animate scale & fade
  const target = mesh;
  // remove from scene with small animation
  const start = performance.now();
  const dur = 700;
  const pos = target.position.clone();
  (function anim(t){
    const p = (t - start) / dur;
    if(p >= 1){
      scene.remove(target);
    } else {
      target.position.y = pos.y + Math.sin(p*Math.PI)*0.8;
      target.rotation.y += 0.06;
      requestAnimationFrame(anim);
    }
  })(start);
  // show fragment text
  openStory(mesh.userData.index);
  saveState();
  // win condition
  if(pagesCollected >= pagesTotal){
    setTimeout(()=> showEnding(), 800);
  }
}

/* ending sequence */
function showEnding(){
  storyTextEl.textContent = "You gather the final memory. The island exhales — echoes coalesce into a single, warm truth. You remember where you belong.";
  storyBox.classList.remove('hidden');
  // gentle camera lift
  const t0 = performance.now();
  const dur = 2400;
  const startPos = camera.position.clone();
  (function liftLoop(now){
    const p = Math.min(1, (now - t0) / dur);
    camera.position.y = startPos.y + p * 6.0;
    camera.lookAt(0,0,0);
    if(p < 1) requestAnimationFrame(liftLoop);
  })(t0);
}

/* save/load world & progress */
function saveState(){
  const s = { pages: pageMeshes.map(m=>!!m.userData.collected) };
  localStorage.setItem('echoes_state_v1', JSON.stringify(s));
}
function loadState(){
  try{
    const raw = localStorage.getItem('echoes_state_v1');
    if(!raw) return;
    const parsed = JSON.parse(raw);
    if(parsed.pages && Array.isArray(parsed.pages)){
      parsed.pages.forEach((col,i)=>{
        if(col && pageMeshes[i]){ pageMeshes[i].userData.collected = true; scene.remove(pageMeshes[i]); }
      });
      pagesCollected = parsed.pages.filter(Boolean).length;
      updatePagesUI();
    }
  }catch(e){ console.warn('Failed to load state', e); }
}
loadState();
updatePagesUI();

/* reset button */
document.getElementById('btn-reset').addEventListener('click', ()=> {
  if(confirm('Restart cerita dan tempatkan ulang Pages?')){
    // restore pages
    pageMeshes.forEach((m,i)=>{ if(!scene.children.includes(m)) scene.add(m); m.userData.collected = false; m.position.set(pagePositions[i].x, -1.0+0.6, pagePositions[i].z); });
    pagesCollected = 0; updatePagesUI();
    localStorage.removeItem('echoes_state_v1');
    storyBox.classList.add('hidden');
  }
});

/* initial player position */
camera.position.set(0, 1.6, 6);

/* simple ground collision: keep camera above ground sample */
function sampleGroundY(x,z){
  // approximate by sampling plane geometry via height function used earlier
  const h = Math.sin(x*0.02)*1.2 + Math.cos(z*0.015)*1.0 + Math.sin((x+z)*0.01)*0.6 - 2.0;
  return h + 0.9; // eye height above ground
}

/* ------------------- animation loop ------------------- */
let prev = performance.now();
function animate(now){
  const dt = Math.min(0.05, (now - prev) / 1000);
  prev = now;

  // input -> movement vector
  let forward = 0, right = 0;
  // desktop keys
  if(keys['KeyW'] || keys['ArrowUp']) forward += 1;
  if(keys['KeyS'] || keys['ArrowDown']) forward -= 1;
  if(keys['KeyA'] || keys['ArrowLeft']) right -= 1;
  if(keys['KeyD'] || keys['ArrowRight']) right += 1;
  // mobile joystick overrides if present
  if(Math.abs(joyVec.x) > 0.01 || Math.abs(joyVec.y) > 0.01){
    right = joyVec.x;
    forward = -joyVec.y;
  }

  // compute direction from camera yaw (controls.getObject orientation)
  const yaw = controls.getObject().rotation.y || 0;
  const dir = new THREE.Vector3();
  dir.x = Math.sin(yaw) * forward + Math.cos(yaw) * right;
  dir.z = Math.cos(yaw) * forward - Math.sin(yaw) * right;
  if(dir.lengthSq() > 0.0001) dir.normalize();

  // ground-adapted speed
  const moveDelta = dir.clone().multiplyScalar(speed * dt);
  controls.getObject().position.add(moveDelta);

  // gravity
  velocity.y -= 9.8 * dt;
  controls.getObject().position.y += velocity.y * dt;
  // keep above terrain
  const gx = controls.getObject().position.x;
  const gz = controls.getObject().position.z;
  const targetY = sampleGroundY(gx, gz);
  if(controls.getObject().position.y < targetY){
    velocity.y = 0;
    controls.getObject().position.y = targetY;
    canJump = true;
  }

  // subtle animate pages & fireflies
  const t = now * 0.001;
  pageMeshes.forEach((m,i)=>{ m.rotation.y += 0.4 * dt; m.position.y = -1.0 + 0.6 + Math.sin(t*1.2 + i)*0.06; });
  fireflies.children.forEach((f, idx)=>{ f.material.opacity = 0.6 + Math.sin(t*1.5 + idx)*0.3; f.position.y += Math.sin(t*0.2 + idx)*0.002; });

  // look-at stabilization: camera always slightly looks forward
  const lookPoint = new THREE.Vector3();
  controls.getObject().getWorldDirection(lookPoint);
  const camPos = controls.getObject().position.clone();
  camera.position.copy(camPos);
  camera.position.y += 0.0; // eye offset included
  // target point ahead
  camera.lookAt(camPos.clone().add(lookPoint.multiplyScalar(10)));

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

/* handle resize */
window.addEventListener('resize', ()=> {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

/* ------------------- Misc: small helpers & initial messages ------------------- */
function centerMessage(txt, duration=3200){
  const el = document.createElement('div');
  el.style.position='fixed'; el.style.left='50%'; el.style.top='50%';
  el.style.transform='translate(-50%,-50%)'; el.style.background='rgba(0,0,0,0.6)';
  el.style.color='#fff'; el.style.padding='10px 16px'; el.style.borderRadius='8px'; el.style.zIndex=80;
  el.textContent = txt; document.body.appendChild(el);
  setTimeout(()=> el.remove(), duration);
}
centerMessage('Welcome — explore the island and collect the Memory Pages (E / Interact).');

/* prevent accidental scroll on mobile when touching joystick */
document.body.addEventListener('touchmove', (e)=> {
  if(e.target === joyBase || e.target === joyThumb) e.preventDefault();
}, { passive: false });

/* expose for debug */
window.Echoes = { scene, camera, renderer, pageMeshes };

