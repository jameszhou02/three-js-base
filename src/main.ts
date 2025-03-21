import * as THREE from "three";
// Use dynamic imports with type assertions to bypass type checking issues
const OrbitControls = (
  (await import("three/examples/jsm/controls/OrbitControls")) as any
).OrbitControls;
const Stats = ((await import("three/examples/jsm/libs/stats.module")) as any)
  .default;

import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import { PhysicsWorld } from "./physics/PhysicsWorld";

// Create a scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// Create a camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

// Create a renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("app")!.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 5;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI / 2;
controls.target.set(0, 2, 0);

// Stats (FPS counter)
const stats = new Stats();
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
const physics = new PhysicsWorld(scene, false);

// Add ground
physics.addFloor(50);

// Add some boxes and spheres
const boxIds: number[] = [];
const sphereIds: number[] = [];

// Create stacked boxes
for (let i = 0; i < 5; i++) {
  const boxId = physics.addBox([1, 1, 1], [-3, 0.5 + i * 1.2, 0], 1, 0x4488ee);
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

// Handle window resizing
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Add UI for ball dropping
const addBallButton = document.createElement("button");
addBallButton.textContent = "Drop Ball";
addBallButton.style.position = "absolute";
addBallButton.style.bottom = "20px";
addBallButton.style.left = "20px";
addBallButton.style.padding = "10px 20px";
addBallButton.style.cursor = "pointer";
document.body.appendChild(addBallButton);

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

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update physics
  physics.update();

  // Update controls
  controls.update();

  // Update stats
  stats.update();

  // Render the scene
  renderer.render(scene, camera);
}

animate();
