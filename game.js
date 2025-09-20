let scene, camera, renderer, controls;
let raycaster, pointer;
let world = {};

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);

  renderer = new THREE.WebGLRenderer({canvas: document.getElementById("gameCanvas")});
  renderer.setSize(window.innerWidth, window.innerHeight);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  scene.add(light);

  // Ground
  const groundGeo = new THREE.BoxGeometry(1, 1, 1);
  const groundMat = new THREE.MeshLambertMaterial({color: 0x228B22});
  for (let x=-10; x<=10; x++) {
    for (let z=-10; z<=10; z++) {
      placeBlock(x,0,z, groundMat);
    }
  }

  // Controls
  controls = new THREE.PointerLockControls(camera, document.body);
  document.body.addEventListener("click", () => controls.lock());

  // Raycaster for block select
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  // Mouse actions
  document.addEventListener("mousedown", (e)=>{
    raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
    const intersects = raycaster.intersectObjects(Object.values(world));
    if(intersects.length > 0) {
      const target = intersects[0].object;
      const pos = target.position;
      if(e.button === 0) { // left click = destroy
        scene.remove(target);
        delete world[`${pos.x},${pos.y},${pos.z}`];
      } else if(e.button === 2) { // right click = place
        let normal = intersects[0].face.normal;
        let newPos = pos.clone().add(normal);
        placeBlock(newPos.x, newPos.y, newPos.z, groundMat);
      }
    }
  });
  document.addEventListener("contextmenu", e=> e.preventDefault()); // disable right-click menu

  // Resize
  window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Function to place block
function placeBlock(x,y,z, material) {
  const geo = new THREE.BoxGeometry(1,1,1);
  const cube = new THREE.Mesh(geo, material);
  cube.position.set(x,y,z);
  scene.add(cube);
  world[`${x},${y},${z}`] = cube;
}

// Game Loop
function animate() {
  requestAnimationFrame(animate);
  controls.moveForward(0); // keep controls active
  renderer.render(scene, camera);
}
