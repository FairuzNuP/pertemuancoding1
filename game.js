let scene, camera, renderer, controls;
let player, clock;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202040);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.y = 2;

  renderer = new THREE.WebGLRenderer({canvas: document.getElementById("gameCanvas")});
  renderer.setSize(window.innerWidth, window.innerHeight);

  clock = new THREE.Clock();

  // Light
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 5);
  scene.add(light);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshPhongMaterial({color: 0x228833});
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  // Cube as "Story Object"
  const boxGeo = new THREE.BoxGeometry(1,1,1);
  const boxMat = new THREE.MeshPhongMaterial({color: 0xff0000});
  player = new THREE.Mesh(boxGeo, boxMat);
  player.position.set(0,0.5,-5);
  scene.add(player);

  // Controls (Pointer Lock)
  controls = new THREE.PointerLockControls(camera, document.body);
  document.body.addEventListener("click", () => controls.lock());

  // Movement
  const onKeyDown = (e) => {
    if (e.code === "KeyW") camera.position.z -= 0.5;
    if (e.code === "KeyS") camera.position.z += 0.5;
    if (e.code === "KeyA") camera.position.x -= 0.5;
    if (e.code === "KeyD") camera.position.x += 0.5;
  };
  document.addEventListener("keydown", onKeyDown);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function animate() {
  requestAnimationFrame(animate);

  // Check if player reached cube
  if (camera.position.distanceTo(player.position) < 2) {
    document.getElementById("story").innerText = "You found a glowing cube... The journey continues!";
  }

  renderer.render(scene, camera);
}
