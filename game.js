// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gameCanvas") });
renderer.setSize(window.innerWidth, window.innerHeight);

// Lighting
scene.add(new THREE.AmbientLight(0x888888));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(30, 50, 20);
scene.add(sun);

// Controls
const controls = new THREE.PointerLockControls(camera, document.body);
document.getElementById("startButton").addEventListener("click", () => {
  controls.lock();
  document.getElementById("ui").style.display = "none";
});

// Player
camera.position.set(0, 2, 5);
let velocity = new THREE.Vector3();
let canJump = false;
const keys = {};

// Movement input
document.addEventListener("keydown", e => { keys[e.code] = true; });
document.addEventListener("keyup", e => { keys[e.code] = false; });

// World generator
const blockSize = 1;
const blockGeo = new THREE.BoxGeometry(blockSize, blockSize, blockSize);

const materials = {
  grass: new THREE.MeshLambertMaterial({ color: 0x228B22 }),
  dirt: new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
  stone: new THREE.MeshLambertMaterial({ color: 0x808080 }),
};

let selectedBlock = "grass";
document.addEventListener("keydown", e => {
  if (e.code === "Digit1") selectedBlock = "grass";
  if (e.code === "Digit2") selectedBlock = "dirt";
  if (e.code === "Digit3") selectedBlock = "stone";
  document.getElementById("blockName").textContent = selectedBlock.charAt(0).toUpperCase() + selectedBlock.slice(1);
});

// Create ground
for (let x = -20; x < 20; x++) {
  for (let z = -20; z < 20; z++) {
    let mat = (Math.random() > 0.8) ? materials.stone : (Math.random() > 0.4) ? materials.dirt : materials.grass;
    const block = new THREE.Mesh(blockGeo, mat);
    block.position.set(x, -1, z);
    scene.add(block);
  }
}

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
document.addEventListener("mousedown", (e) => {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const intersects = raycaster.intersectObjects(scene.children);
  if (intersects.length > 0) {
    const hit = intersects[0];
    if (e.button === 0) {
      // Hancurkan
      scene.remove(hit.object);
    } else if (e.button === 2) {
      // Taruh
      const newBlock = new THREE.Mesh(blockGeo, materials[selectedBlock]);
      newBlock.position.copy(hit.point).add(hit.face.normal).divideScalar(blockSize).floor().multiplyScalar(blockSize).addScalar(blockSize/2);
      scene.add(newBlock);
    }
  }
});

// Prevent right click menu
document.addEventListener("contextmenu", e => e.preventDefault());

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Game loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  velocity.x -= velocity.x * 10 * delta;
  velocity.z -= velocity.z * 10 * delta;
  velocity.y -= 9.8 * delta; // gravity

  if (keys["KeyW"]) velocity.z -= 20 * delta;
  if (keys["KeyS"]) velocity.z += 20 * delta;
  if (keys["KeyA"]) velocity.x -= 20 * delta;
  if (keys["KeyD"]) velocity.x += 20 * delta;
  if (keys["Space"] && canJump) {
    velocity.y = 5;
    canJump = false;
  }

  controls.moveRight(velocity.x * delta);
  controls.moveForward(velocity.z * delta);
  camera.position.y += velocity.y * delta;

  if (camera.position.y < 2) {
    velocity.y = 0;
    camera.position.y = 2;
    canJump = true;
  }

  renderer.render(scene, camera);
}
animate();
