import * as THREE from "three";
// Use dynamic imports with type assertions to bypass type checking issues
const Stats = ((await import("three/examples/jsm/libs/stats.module")) as any)
  .default;
const OrbitControls = (
  (await import("three/examples/jsm/controls/OrbitControls")) as any
).OrbitControls;

import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import { PhysicsWorld } from "./physics/PhysicsWorld";
import { ChaseCamera } from "./cameras/ChaseCamera";
import { PhysicsShapeType } from "./physics/types";

// Scene variables
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let physics: PhysicsWorld;
let stats: any;
let currentSceneType: "orbit" | "chase" = "orbit";
let orbitControls: any;
let chaseCamera: ChaseCamera;
let targetSphereId: number;
let sphereMesh: THREE.Mesh;
let animationId: number;

// Movement controls for chase scene
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

// Initialize basic scene components
function initScene() {
  // Create a scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Create a camera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 10, 20);

  // Create a renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById("app")!.appendChild(renderer.domElement);

  // Stats (FPS counter)
  stats = new Stats();
  document.body.appendChild(stats.dom);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -15;
  directionalLight.shadow.camera.right = 15;
  directionalLight.shadow.camera.top = 15;
  directionalLight.shadow.camera.bottom = -15;
  scene.add(directionalLight);

  // Initialize physics
  physics = new PhysicsWorld(scene, false);

  // Add ground
  physics.addFloor(50);

  // Handle window resizing
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Initialize the orbit controls scene
function initOrbitScene() {
  currentSceneType = "orbit";

  // Clear any existing keyboard event listeners
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
  window.removeEventListener("wheel", handleWheel);

  // Add orbit controls
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.screenSpacePanning = false;
  orbitControls.minDistance = 5;
  orbitControls.maxDistance = 50;
  orbitControls.maxPolarAngle = Math.PI / 2;
  orbitControls.target.set(0, 2, 0);

  // Add some boxes and spheres
  const boxIds: number[] = [];
  const sphereIds: number[] = [];

  // Create stacked boxes
  for (let i = 0; i < 5; i++) {
    const boxId = physics.addBox(
      [1, 1, 1],
      [-3, 0.5 + i * 1.2, 0],
      1,
      0x4488ee
    );
    boxIds.push(boxId);
  }

  // Create pyramid of boxes
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4 - y; x++) {
      const boxId = physics.addBox(
        [1, 1, 1],
        [x * 1.1 + y * 0.55, 0.5 + y * 1.1, 3],
        1,
        0x44ee88
      );
      boxIds.push(boxId);
    }
  }

  // Create some spheres
  for (let i = 0; i < 10; i++) {
    const radius = 0.3 + Math.random() * 0.5;
    const sphereId = physics.addSphere(
      radius,
      [Math.random() * 10 - 5, 5 + Math.random() * 5, Math.random() * 10 - 5],
      radius * 5,
      0xff4422 + i * 0x112233
    );
    sphereIds.push(sphereId);
  }

  // Add a heavier sphere to knock things over
  physics.addSphere(1.5, [8, 8, 0], 20, 0xffff00);

  // Create UI
  createOrbitSceneUI();

  // Start animation loop
  animate();
}

// Initialize the chase camera scene
function initChaseScene() {
  currentSceneType = "chase";

  // Remove orbit controls
  orbitControls = null;

  // Add our controllable sphere with damping
  sphereMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0xff4400,
      roughness: 0.7,
      metalness: 0.1,
    })
  );
  sphereMesh.castShadow = true;
  sphereMesh.receiveShadow = true;
  sphereMesh.position.set(0, 3, 0);
  scene.add(sphereMesh);

  // Add the sphere to physics
  targetSphereId = physics.addObject(sphereMesh, {
    type: PhysicsShapeType.SPHERE,
    mass: 5,
    position: [0, 3, 0],
    radius: 1,
    material: {
      friction: 0.9,
      restitution: 0.2,
    },
    linearDamping: 0.8, // Add damping to reduce jitter
    angularDamping: 0.9, // Add angular damping to reduce spinning
  });

  // Initialize chase camera with better smoothing - directly follow the sphere mesh
  chaseCamera = new ChaseCamera(camera, sphereMesh, {
    distance: 10,
    height: 5,
    damping: 0.05, // Lower value for smoother camera movement
    rotation: 0, // Changed from Math.PI to 0 to fix the control orientation
    lookAtTarget: true,
  });

  // Add obstacles
  for (let i = 0; i < 15; i++) {
    const boxSize = [
      1 + Math.random() * 2,
      1 + Math.random() * 3,
      1 + Math.random() * 2,
    ] as [number, number, number];

    const position = [
      Math.random() * 40 - 20,
      boxSize[1] / 2,
      Math.random() * 40 - 20,
    ] as [number, number, number];

    // Don't place obstacles too close to start position
    const distanceToStart = Math.sqrt(
      position[0] * position[0] + position[2] * position[2]
    );

    if (distanceToStart > 5) {
      physics.addBox(
        boxSize,
        position,
        0, // Static objects (mass = 0)
        0x44aa88 + Math.floor(Math.random() * 0x111111)
      );
    }
  }

  // Setup keyboard controls
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("wheel", handleWheel);

  // Create UI
  createChaseSceneUI();

  // Start animation loop
  animate();
}

// Handle key down events for chase scene
function handleKeyDown(event: KeyboardEvent) {
  switch (event.code) {
    case "KeyW":
      moveForward = true;
      break;
    case "KeyS":
      moveBackward = true;
      break;
    case "KeyA":
      moveLeft = true;
      break;
    case "KeyD":
      moveRight = true;
      break;
    case "KeyQ":
      if (chaseCamera) chaseCamera.setRotation(chaseCamera.rotation - 0.1);
      break;
    case "KeyE":
      if (chaseCamera) chaseCamera.setRotation(chaseCamera.rotation + 0.1);
      break;
  }
}

// Handle key up events for chase scene
function handleKeyUp(event: KeyboardEvent) {
  switch (event.code) {
    case "KeyW":
      moveForward = false;
      break;
    case "KeyS":
      moveBackward = false;
      break;
    case "KeyA":
      moveLeft = false;
      break;
    case "KeyD":
      moveRight = false;
      break;
  }
}

// Handle mouse wheel for zoom
function handleWheel(event: WheelEvent) {
  if (!chaseCamera) return;

  const zoomSpeed = 0.5;
  if (event.deltaY > 0) {
    chaseCamera.zoom(zoomSpeed); // Zoom out
  } else {
    chaseCamera.zoom(-zoomSpeed); // Zoom in
  }
}

// Create UI for orbit scene
function createOrbitSceneUI() {
  clearUI();

  // Add scene selector
  createSceneSelector();

  // Add UI for ball dropping
  const addBallButton = document.createElement("button");
  addBallButton.textContent = "Drop Ball";
  addBallButton.style.padding = "10px 20px";
  addBallButton.style.cursor = "pointer";
  addBallButton.style.marginTop = "10px";

  const controls = document.createElement("div");
  controls.style.position = "absolute";
  controls.style.bottom = "20px";
  controls.style.left = "20px";
  controls.style.display = "flex";
  controls.style.flexDirection = "column";
  controls.style.gap = "10px";
  controls.appendChild(addBallButton);
  document.body.appendChild(controls);

  addBallButton.addEventListener("click", () => {
    // Add a random ball from above the scene
    const radius = 0.3 + Math.random() * 0.7;
    physics.addSphere(
      radius,
      [
        Math.random() * 10 - 5,
        15, // Drop from y=15
        Math.random() * 10 - 5,
      ],
      radius * 5,
      Math.random() * 0xffffff
    );
  });
}

// Create UI for chase scene
function createChaseSceneUI() {
  clearUI();

  // Add scene selector
  createSceneSelector();

  // Add movement instructions
  const instructions = document.createElement("div");
  instructions.textContent = "Use WASD to move the target sphere";
  instructions.style.position = "absolute";
  instructions.style.top = "80px"; // Below scene selector
  instructions.style.left = "20px";
  instructions.style.color = "white";
  instructions.style.background = "rgba(0,0,0,0.5)";
  instructions.style.padding = "10px";
  instructions.style.borderRadius = "5px";
  document.body.appendChild(instructions);

  // Camera controls
  const cameraControls = document.createElement("div");
  cameraControls.style.position = "absolute";
  cameraControls.style.top = "80px"; // Below scene selector
  cameraControls.style.right = "20px";
  cameraControls.style.color = "white";
  cameraControls.style.background = "rgba(0,0,0,0.5)";
  cameraControls.style.padding = "10px";
  cameraControls.style.borderRadius = "5px";
  cameraControls.innerHTML = "Mouse Wheel: Zoom<br>Q/E: Rotate Camera";
  document.body.appendChild(cameraControls);
}

// Create scene selector UI
function createSceneSelector() {
  const sceneSelector = document.createElement("div");
  sceneSelector.style.position = "absolute";
  sceneSelector.style.top = "20px";
  sceneSelector.style.left = "50%";
  sceneSelector.style.transform = "translateX(-50%)";
  sceneSelector.style.background = "rgba(0,0,0,0.7)";
  sceneSelector.style.padding = "10px";
  sceneSelector.style.borderRadius = "5px";
  sceneSelector.style.display = "flex";
  sceneSelector.style.gap = "10px";
  document.body.appendChild(sceneSelector);

  const orbitButton = document.createElement("button");
  orbitButton.textContent = "Orbit Scene";
  orbitButton.style.padding = "8px 16px";
  orbitButton.style.cursor = "pointer";
  orbitButton.disabled = currentSceneType === "orbit";
  sceneSelector.appendChild(orbitButton);

  const chaseButton = document.createElement("button");
  chaseButton.textContent = "Chase Camera Scene";
  chaseButton.style.padding = "8px 16px";
  chaseButton.style.cursor = "pointer";
  chaseButton.disabled = currentSceneType === "chase";
  sceneSelector.appendChild(chaseButton);

  orbitButton.addEventListener("click", () => {
    if (currentSceneType !== "orbit") {
      cleanupScene();
      initOrbitScene();
    }
  });

  chaseButton.addEventListener("click", () => {
    if (currentSceneType !== "chase") {
      cleanupScene();
      initChaseScene();
    }
  });
}

// Clear all UI elements
function clearUI() {
  const existingUI = document.querySelectorAll("div:not(#app), button");
  existingUI.forEach((element) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
}

// Clean up current scene before switching
function cleanupScene() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  // Reset physics world
  while (scene.children.length > 0) {
    const object = scene.children[0];
    scene.remove(object);
  }

  // Initialize fresh scene and physics
  physics = new PhysicsWorld(scene, false);
  physics.addFloor(50);

  // Add lights back
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -15;
  directionalLight.shadow.camera.right = 15;
  directionalLight.shadow.camera.top = 15;
  directionalLight.shadow.camera.bottom = -15;
  scene.add(directionalLight);

  // Reset movement flags
  moveForward = false;
  moveBackward = false;
  moveLeft = false;
  moveRight = false;
}

// Animation loop
function animate() {
  animationId = requestAnimationFrame(animate);

  if (currentSceneType === "chase") {
    // Apply movement to target sphere
    if (moveForward || moveBackward || moveLeft || moveRight) {
      const force = 5; // Reduced force for more controlled movement
      const impulse: [number, number, number] = [0, 0, 0];

      // Note: we're using world-space coordinates here, not camera-relative
      // In this coordinate system:
      // +Z is forward, -Z is backward
      // +X is right, -X is left
      if (moveForward) impulse[2] = -force; // Move in -Z direction (forward)
      if (moveBackward) impulse[2] = force; // Move in +Z direction (backward)
      if (moveLeft) impulse[0] = -force; // Move in -X direction (left)
      if (moveRight) impulse[0] = force; // Move in +X direction (right)

      physics.applyImpulse(targetSphereId, impulse);
    }

    // Update chase camera
    chaseCamera.update(1 / 60);
  } else if (currentSceneType === "orbit") {
    // Update orbit controls
    if (orbitControls) orbitControls.update();
  }

  // Update physics
  physics.update();

  // Update stats
  stats.update();

  // Render the scene
  renderer.render(scene, camera);
}

// Initialize and start
initScene();
initOrbitScene();
