// game.js — VoxelCraft prototype (complex web voxel with chunks + instancing)
// Requires three.js and PointerLockControls (loaded from CDN in index.html).

/* ========= Config ========= */
const CHUNK_SIZE = 16;        // blocks per chunk (X,Z)
const WORLD_CHUNKS_X = 4;     // number of chunks along X
const WORLD_CHUNKS_Z = 4;     // number of chunks along Z
const BLOCK_SIZE = 1;
const MAX_HEIGHT = 12;        // max stack height per (x,z)
const BLOCK_TYPES = {
  grass: { id: 1, colorTop: 0x6fbf5b, colorSide: 0x4ea04a },
  dirt:  { id: 2, colorTop: 0x8b5a3c, colorSide: 0x7a4b33 },
  stone: { id: 3, colorTop: 0x9ea3a6, colorSide: 0x7f8487 },
  wood:  { id: 4, colorTop: 0xC38A5A, colorSide: 0x98603a },
  leaves:{ id: 5, colorTop: 0x4db24d, colorSide: 0x3e9a3e }
};

const worldWidth = CHUNK_SIZE * WORLD_CHUNKS_X;
const worldDepth = CHUNK_SIZE * WORLD_CHUNKS_Z;

/* ========= THREE setup ========= */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fdcff);

// camera + controls
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);

const controls = new THREE.PointerLockControls(camera, document.body);

document.getElementById('btn-start').addEventListener('click', ()=>{
  controls.lock();
});
controls.addEventListener('lock', ()=> { document.getElementById('btn-start').style.display='none'; });
controls.addEventListener('unlock', ()=> { document.getElementById('btn-start').style.display='inline-block'; });

/* lights */
scene.add(new THREE.HemisphereLight(0xffffee, 0x444455, 0.8));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(30,50,10);
scene.add(dir);

/* ground plane fallback (below blocks) */
const groundMat = new THREE.MeshStandardMaterial({color:0x1f5a2b});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000,1000), groundMat);
ground.rotation.x = -Math.PI/2;
ground.position.y = -10;
scene.add(ground);

/* ========= World data structure =========
   worldChunks indexed by chunkX,chunkZ
   each chunk has blocks[x][z] = array of blockType ids bottom->top
   We'll generate initial terrain via simple heightmap function.
*/
const worldChunks = {}; // key: `${cx},${cz}`

function chunkKey(cx, cz){ return `${cx},${cz}`; }

function createEmptyChunk(cx, cz){
  const blocks = Array.from({length:CHUNK_SIZE}, ()=> Array.from({length:CHUNK_SIZE}, ()=> []));
  return { cx, cz, blocks, meshes: {} /* instanced meshes per type */, needsRebuild: true };
}

/* simple deterministic height function (no external noise lib) */
function heightAt(wx, wz){
  // combine sinusoids for gentle hills
  const h = Math.floor(
    2 + 2*Math.sin(wx*0.12) + 2*Math.cos(wz*0.15) + Math.sin((wx+wz)*0.07)
  );
  return Math.max(1, Math.min(MAX_HEIGHT, h));
}

function worldInit(){
  for(let cx=0; cx < WORLD_CHUNKS_X; cx++){
    for(let cz=0; cz < WORLD_CHUNKS_Z; cz++){
      const c = createEmptyChunk(cx, cz);
      // fill with terrain
      for(let lx=0; lx<CHUNK_SIZE; lx++){
        for(let lz=0; lz<CHUNK_SIZE; lz++){
          const wx = cx*CHUNK_SIZE + lx - Math.floor(worldWidth/2);
          const wz = cz*CHUNK_SIZE + lz - Math.floor(worldDepth/2);
          const h = heightAt(wx, wz);
          const col = [];
          for(let y=0; y<h; y++){
            if(y === h-1) col.push(BLOCK_TYPES.grass.id);
            else if(y > h-4) col.push(BLOCK_TYPES.dirt.id);
            else col.push(BLOCK_TYPES.stone.id);
          }
          // occasional tree
          if(Math.random() < 0.03){
            // trunk
            const trunkHeight = 3 + Math.floor(Math.random()*2);
            for(let t=0;t<trunkHeight;t++) col.push(BLOCK_TYPES.wood.id);
            // simple leaves around top
            // we'll add leaves into neighboring columns below when building meshes
          }
          c.blocks[lx][lz] = col;
        }
      }
      worldChunks[chunkKey(cx,cz)] = c;
    }
  }
}
worldInit();

/* ========= Rendering strategy: InstancedMesh per-chunk per-blockType =========
   For each chunk, for each block type present, create InstancedMesh with
   capacity = number of blocks of that type in chunk. When blocks change,
   rebuild that chunk's instanced meshes. This is moderately efficient.
*/

const boxGeo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

/* helper create material with top/side color simple shading (no textures) */
function makeBlockMaterial(hexTop, hexSide){
  return new THREE.MeshStandardMaterial({ color: hexSide, roughness:0.9, metalness:0.0 });
}

/* chunk rebuild */
function rebuildChunk(chunk){
  // dispose old instanced meshes
  for(const key in chunk.meshes){
    const mesh = chunk.meshes[key];
    scene.remove(mesh);
    if(mesh.geometry) mesh.geometry.dispose();
    if(mesh.material) mesh.material.dispose();
  }
  chunk.meshes = {};

  // collect positions per block type
  const positionsByType = {};
  for(let lx=0; lx<CHUNK_SIZE; lx++){
    for(let lz=0; lz<CHUNK_SIZE; lz++){
      const stack = chunk.blocks[lx][lz];
      for(let y=0; y<stack.length; y++){
        const bId = stack[y];
        if(!positionsByType[bId]) positionsByType[bId] = [];
        // compute world coords
        const wx = (chunk.cx*CHUNK_SIZE + lx) - Math.floor(worldWidth/2);
        const wz = (chunk.cz*CHUNK_SIZE + lz) - Math.floor(worldDepth/2);
        const wy = y;
        positionsByType[bId].push([wx + 0.5, wy + 0.5, wz + 0.5]);
      }
    }
  }

  // build instanced mesh per type
  Object.keys(positionsByType).forEach(idStr=>{
    const id = Number(idStr);
    const positions = positionsByType[id];
    const typeKey = Object.keys(BLOCK_TYPES).find(k=>BLOCK_TYPES[k].id===id);
    const typ = BLOCK_TYPES[typeKey];
    const mat = makeBlockMaterial(typ.colorTop, typ.colorSide);
    const inst = new THREE.InstancedMesh(boxGeo, mat, positions.length);
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const dummy = new THREE.Object3D();
    for(let i=0;i<positions.length;i++){
      dummy.position.set(positions[i][0], positions[i][1], positions[i][2]);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.userData = { blockId: id };
    chunk.meshes[id] = inst;
    scene.add(inst);
  });

  chunk.needsRebuild = false;
}

/* build all initially */
for(const k in worldChunks) rebuildChunk(worldChunks[k]);

/* ========= World editing: place/destroy blocks =========
   Raycast from camera to find block face; left click destroy; right click place.
*/
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentBlockType = 'grass';
document.getElementById('blockPicker').addEventListener('change', (e)=>{
  currentBlockType = e.target.value;
  document.getElementById('curBlock').textContent = currentBlockType.charAt(0).toUpperCase()+currentBlockType.slice(1);
});

/* utility: convert world floored coords to chunk/local coords and check bounds */
function worldToChunk(wx, wy, wz){
  // wx/wz in world units (block coords base)
  const halfW = Math.floor(worldWidth/2);
  const halfD = Math.floor(worldDepth/2);
  const gx = Math.floor(wx) + halfW;   // 0..worldWidth-1
  const gz = Math.floor(wz) + halfD;
  if(gx < 0 || gz < 0 || gx >= worldWidth || gz >= worldDepth) return null;
  const cx = Math.floor(gx / CHUNK_SIZE);
  const cz = Math.floor(gz / CHUNK_SIZE);
  const lx = gx % CHUNK_SIZE;
  const lz = gz % CHUNK_SIZE;
  return { cx, cz, lx, lz };
}

/* get first intersected instanced mesh/object and compute block coords */
function getBlockTarget(){
  // raycast scene
  raycaster.setFromCamera({ x: 0, y: 0 }, camera); // center screen
  const intersects = raycaster.intersectObjects(scene.children, true);
  for(let inter of intersects){
    // ignore ground plane
    if(inter.object === ground) continue;
    // position of intersection in world coordinates
    const p = inter.point.clone().sub(inter.face.normal.clone().multiplyScalar(0.01));
    // derive block coords by flooring minus 0.5 offset (since we placed blocks at center +0.5)
    const bx = Math.floor(p.x);
    const by = Math.floor(p.y);
    const bz = Math.floor(p.z);
    // For placing we will use the face normal to offset
    return { intersect: inter, bx, by, bz, faceNormal: inter.face.normal.clone() };
  }
  return null;
}

/* mouse handlers */
window.addEventListener('mousedown', (e)=>{
  if(!controls.isLocked) return;
  e.preventDefault();
  const target = getBlockTarget();
  if(!target) return;
  const { bx, by, bz, faceNormal } = target;

  if(e.button === 0){
    // destroy block at bx,by,bz if present
    const chunkInfo = worldToChunk(bx, by, bz);
    if(!chunkInfo) return;
    const chunk = worldChunks[chunkKey(chunkInfo.cx, chunkInfo.cz)];
    if(!chunk) return;
    const stack = chunk.blocks[chunkInfo.lx][chunkInfo.lz];
    // ensure by within stack
    if(by >=0 && by < stack.length){
      stack.splice(by, 1); // remove block at that height
      chunk.needsRebuild = true;
      rebuildChunk(chunk);
    }
  } else if(e.button === 2){
    // place block on face (bx + faceNormal)
    const placeX = bx + faceNormal.x*(faceNormal.x>0?1:0);
    const placeY = by + faceNormal.y*(faceNormal.y>0?1:0);
    const placeZ = bz + faceNormal.z*(faceNormal.z>0?1:0);
    const targetPlace = worldToChunk(placeX, placeY, placeZ);
    if(!targetPlace) return;
    const chunkP = worldChunks[chunkKey(targetPlace.cx, targetPlace.cz)];
    if(!chunkP) return;
    const stackP = chunkP.blocks[targetPlace.lx][targetPlace.lz];
    // we only allow placing at top of column or filling a gap at that y
    if(placeY <= stackP.length){
      // insert at position placeY
      stackP.splice(placeY, 0, BLOCK_TYPES[currentBlockType].id);
      chunkP.needsRebuild = true;
      rebuildChunk(chunkP);
    }
  }
});

// prevent context menu on right click
window.addEventListener('contextmenu', (e)=> e.preventDefault());

/* ========= Player physics & movement ========= */
let velocity = new THREE.Vector3();
let canJump = false;
const moveState = { forward:false, back:false, left:false, right:false };
const onKey = (e, down)=>{
  if(e.code === 'KeyW') moveState.forward = down;
  if(e.code === 'KeyS') moveState.back = down;
  if(e.code === 'KeyA') moveState.left = down;
  if(e.code === 'KeyD') moveState.right = down;
  if(e.code === 'Space' && down && canJump){
    velocity.y = 6;
    canJump = false;
  }
};
window.addEventListener('keydown', (e)=> onKey(e, true));
window.addEventListener('keyup', (e)=> onKey(e, false));

/* simple player collision against blocks: treat player as point at feet at camera.position */
function getBlockAtWorld(wx, wy, wz){
  const info = worldToChunk(Math.floor(wx), Math.floor(wy), Math.floor(wz));
  if(!info) return null;
  const c = worldChunks[chunkKey(info.cx, info.cz)];
  if(!c) return null;
  const stack = c.blocks[info.lx][info.lz];
  if(stack.length === 0) return null;
  return { blockId: stack[Math.min(stack.length-1, Math.floor(wy))], height: stack.length };
}

/* ========= Save / Load ========= */
document.getElementById('btn-save').addEventListener('click', ()=>{
  const payload = {};
  for(const k in worldChunks){
    const c = worldChunks[k];
    payload[k] = c.blocks;
  }
  localStorage.setItem('voxel_world_v1', JSON.stringify(payload));
  alert('Dunia disimpan ke localStorage.');
});
document.getElementById('btn-load').addEventListener('click', ()=>{
  const raw = localStorage.getItem('voxel_world_v1');
  if(!raw){ alert('Tidak ada data tersimpan.'); return; }
  const parsed = JSON.parse(raw);
  for(const k in parsed){
    if(worldChunks[k]){
      worldChunks[k].blocks = parsed[k];
      worldChunks[k].needsRebuild = true;
      rebuildChunk(worldChunks[k]);
    }
  }
  alert('Dunia dimuat.');
});

/* ========= HUD pos update ========= */
const posEl = document.getElementById('pos');
function updateHudPos(){
  posEl.textContent = `${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`;
}

/* ========= Resize handler ========= */
window.addEventListener('resize', ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

/* ========= Main loop ========= */
let prevTime = performance.now();
function animate(){
  const time = performance.now();
  const delta = (time - prevTime)/1000;
  prevTime = time;

  // movement
  const speed = controls.isLocked ? 6 : 0; // only move when locked
  const dir = new THREE.Vector3();
  if(moveState.forward) dir.z -= 1;
  if(moveState.back) dir.z += 1;
  if(moveState.left) dir.x -= 1;
  if(moveState.right) dir.x += 1;
  if(dir.lengthSq() > 0) dir.normalize();

  // convert local camera direction to world movement
  const camQuaternion = camera.quaternion;
  const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camQuaternion);
  forward.y = 0; forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

  const moveVec = new THREE.Vector3();
  moveVec.addScaledVector(forward, dir.z);
  moveVec.addScaledVector(right, dir.x);
  if(moveVec.lengthSq()>0) moveVec.normalize();

  // apply horizontal velocity
  camera.position.addScaledVector(moveVec, speed * delta);

  // gravity
  velocity.y -= 9.8 * delta;
  camera.position.y += velocity.y * delta;

  // simple collision with blocks below: ensure camera.y > top of column + eyeHeight
  const footX = camera.position.x;
  const footZ = camera.position.z;
  const colInfo = worldToChunk(Math.floor(footX), 0, Math.floor(footZ));
  let groundHeight = -100;
  if(colInfo){
    const c = worldChunks[chunkKey(colInfo.cx, colInfo.cz)];
    if(c){
      const st = c.blocks[colInfo.lx][colInfo.lz];
      groundHeight = st.length - 0.001 - 0.0; // top y of blocks
    }
  }
  const eyeHeight = 1.6;
  const minEyeY = groundHeight + eyeHeight;
  if(camera.position.y <= minEyeY){
    velocity.y = 0;
    camera.position.y = minEyeY;
    canJump = true;
  }

  // rebuild any dirty chunks (we rebuild immediately in handlers but ensure)
  for(const k in worldChunks){
    const ch = worldChunks[k];
    if(ch.needsRebuild) rebuildChunk(ch);
  }

  updateHudPos();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

/* ========= Mobile: simple touch joystick (optional) ========= */
// For brevity: the prototype focuses on desktop pointer-lock. To support mobile,
// additional virtual joystick mapping should be implemented (touchstart/touchmove).
// Simple fallback: if not pointer locked, user can still pan camera with OrbitControls or drag.
// (We skip OrbitControls to keep code compact; could be added later.)

/* ========= Final notes =========
 - This prototype uses InstancedMesh per chunk per block type. When blocks change,
   we rebuild that chunk instanced meshes (moderate complexity).
 - For heavy worlds, consider chunking on demand, greedy meshing, texture atlases,
   and GPU frustum culling.
 - To extend: add sounds, tools (pickaxe), block-break animation, particle effects, multiplayer.
*/
