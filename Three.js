// three-init.js
(() => {
  // Expose common globals for other modules
  window.T3 = window.T3 || {};

  const container = document.getElementById('viewport');
  const width = container.clientWidth;
  const height = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(0, 12, 26);
  camera.lookAt(0, 6, 0);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  // board group: we'll attach cubes here
  const boardGroup = new THREE.Group();
  boardGroup.position.set(-5, 0, 0);
  scene.add(boardGroup);

  // background plane for subtle color
  const bg = new THREE.PlaneGeometry(80, 40);
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x04030a });
  const bgMesh = new THREE.Mesh(bg, bgMat);
  bgMesh.position.set(0, 10, -40);
  scene.add(bgMesh);

  // responsive
  window.addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  function render() {
    // slight floating of board for 3D feel
    boardGroup.rotation.y = Math.sin(Date.now() * 0.0005) * 0.03;
    renderer.render(scene, camera);
  }

  // expose
  window.T3.renderer = renderer;
  window.T3.scene = scene;
  window.T3.camera = camera;
  window.T3.boardGroup = boardGroup;
  window.T3.renderThree = render;
})();
