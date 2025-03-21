import * as THREE from "three";
import { Scene } from "./Scene";
import { AssetManager } from "./AssetManager";
import { InputManager } from "./Input";

/**
 * Game configuration options
 */
export interface GameOptions {
  /** The DOM container for the game canvas */
  container?: HTMLElement;
  /** Clear color for the renderer */
  clearColor?: number;
  /** Enable shadows */
  shadows?: boolean;
  /** Enable physics debug rendering */
  physicsDebug?: boolean;
  /** Whether to start the game automatically */
  autoStart?: boolean;
}

/**
 * Main game class that integrates all systems
 */
export class Game {
  /** Game container element */
  container: HTMLElement;

  /** THREE.js renderer */
  renderer: THREE.WebGLRenderer;

  /** Current active scene */
  currentScene?: Scene;

  /** Asset manager */
  assets: AssetManager;

  /** Input manager */
  input: InputManager;

  /** Clock for timing */
  clock: THREE.Clock;

  /** Animation frame request ID */
  private animationId: number = 0;

  /** Whether the game is currently running */
  private running: boolean = false;

  /**
   * Creates a new game
   * @param options Game configuration options
   */
  constructor(options: GameOptions = {}) {
    // Set container (default to document.body)
    this.container = options.container || document.body;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });

    // Configure renderer
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(options.clearColor ?? 0x000000);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Enable shadows if requested
    if (options.shadows !== false) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // Append canvas to container
    this.container.appendChild(this.renderer.domElement);

    // Create managers
    this.assets = new AssetManager();
    this.input = new InputManager(this.renderer.domElement);
    this.input.initialize();

    // Create clock for timing
    this.clock = new THREE.Clock();

    // Setup resize handling
    window.addEventListener("resize", this.handleResize);

    // Auto-start if requested
    if (options.autoStart !== false) {
      this.start();
    }
  }

  /**
   * Sets the active scene
   * @param scene The scene to set as active
   */
  setScene(scene: Scene): void {
    // Clean up old scene if exists
    if (this.currentScene) {
      this.currentScene.dispose();
    }

    // Set new scene
    this.currentScene = scene;

    // Initialize the scene
    scene.initialize();
  }

  /**
   * Starts the game loop
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.clock.start();
    this.animate();
  }

  /**
   * Stops the game loop
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    this.clock.stop();

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  /**
   * Main animation loop
   */
  private animate = (): void => {
    if (!this.running) return;

    this.animationId = requestAnimationFrame(this.animate);

    // Get delta time
    const dt = this.clock.getDelta();

    // Update input
    this.input.update();

    // Update current scene
    if (this.currentScene) {
      this.currentScene.update(dt);

      // Render scene
      this.renderer.render(
        this.currentScene.threeScene,
        this.getActiveCamera()
      );
    }
  };

  /**
   * Gets the active camera from the current scene
   */
  private getActiveCamera(): THREE.Camera {
    if (this.currentScene && this.currentScene.threeScene.camera) {
      return this.currentScene.threeScene.camera;
    }

    // Return a default camera if none is set
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    return camera;
  }

  /**
   * Handles window resize events
   */
  private handleResize = (): void => {
    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Update camera aspect ratio
    const camera = this.getActiveCamera();
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
  };

  /**
   * Cleans up the game
   * Call this when done with the game to prevent memory leaks
   */
  dispose(): void {
    // Stop the game loop
    this.stop();

    // Remove event listeners
    window.removeEventListener("resize", this.handleResize);

    // Dispose of current scene
    if (this.currentScene) {
      this.currentScene.dispose();
    }

    // Dispose of managers
    this.input.dispose();
    this.assets.dispose();

    // Dispose of renderer
    this.renderer.dispose();

    // Remove canvas from DOM
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
