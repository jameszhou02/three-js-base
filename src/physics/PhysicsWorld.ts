import * as THREE from "three";
import {
  PhysicsObjectOptions,
  PhysicsWorkerMessageType,
  PhysicsWorkerOutgoingMessage,
  PhysicsShapeType,
  PhysicsBodyProperties,
} from "./types";
import CannonDebugger from "cannon-es-debugger";
import * as CANNON from "cannon-es";

// Import the worker using Vite's ?worker syntax
import PhysicsWorker from "../workers/physics.worker.ts?worker";

// Map to store callbacks for body property requests
type BodyPropsCallback = (props: PhysicsBodyProperties) => void;

export class PhysicsWorld {
  private worker: Worker;
  private objects: Map<number, THREE.Object3D> = new Map();
  private nextBodyId = 1;
  private lastUpdateTime = 0;
  private debugRenderer: any;
  private scene: THREE.Scene;
  private bodyPropsCallbacks: Map<string, BodyPropsCallback> = new Map();

  constructor(scene: THREE.Scene, private debugEnabled = false) {
    this.scene = scene;
    this.worker = new PhysicsWorker();
    this.worker.onmessage = this.handleMessage.bind(this);

    // Initialize the physics world
    this.worker.postMessage({
      type: PhysicsWorkerMessageType.INIT,
      gravity: [0, -9.82, 0], // Default gravity
      iterations: 10,
    });

    // Set up debug renderer if enabled
    if (debugEnabled) {
      // We need a fake world for the debugger
      const fakeWorld = new CANNON.World();
      fakeWorld.gravity.set(0, -9.82, 0);

      // Use assertion to bypass typechecking for the debugger
      this.debugRenderer = (CannonDebugger as any)(scene, {
        world: fakeWorld,
      });
    }
  }

  // Add an object to the physics world
  addObject(object: THREE.Object3D, options: PhysicsObjectOptions): number {
    const id = this.nextBodyId++;

    this.objects.set(id, object);

    // Send to worker
    this.worker.postMessage({
      type: PhysicsWorkerMessageType.ADD_BODY,
      id,
      options,
    });

    return id;
  }

  // Remove an object from the physics world
  removeObject(id: number): void {
    this.objects.delete(id);

    this.worker.postMessage({
      type: PhysicsWorkerMessageType.REMOVE_BODY,
      id,
    });
  }

  // Apply a force to an object
  applyForce(
    id: number,
    force: [number, number, number],
    worldPoint?: [number, number, number]
  ): void {
    this.worker.postMessage({
      type: PhysicsWorkerMessageType.APPLY_FORCE,
      id,
      force,
      worldPoint,
    });
  }

  // Apply an impulse to an object
  applyImpulse(
    id: number,
    impulse: [number, number, number],
    worldPoint?: [number, number, number]
  ): void {
    this.worker.postMessage({
      type: PhysicsWorkerMessageType.APPLY_IMPULSE,
      id,
      impulse,
      worldPoint,
    });
  }

  // Set the position of an object
  setPosition(id: number, position: [number, number, number]): void {
    this.worker.postMessage({
      type: PhysicsWorkerMessageType.SET_POSITION,
      id,
      position,
    });
  }

  // Set the velocity of an object
  setVelocity(id: number, velocity: [number, number, number]): void {
    this.worker.postMessage({
      type: PhysicsWorkerMessageType.SET_VELOCITY,
      id,
      velocity,
    });
  }

  // Update the physics world
  update(): void {
    const now = performance.now();
    let dt = (now - this.lastUpdateTime) / 1000;

    // Cap the delta time to avoid large jumps
    if (dt > 1 / 30) dt = 1 / 30;

    this.lastUpdateTime = now;

    this.worker.postMessage({
      type: PhysicsWorkerMessageType.UPDATE,
      dt,
    });
  }

  // Handle messages from the worker
  private handleMessage(event: MessageEvent<any>): void {
    const message = event.data;

    switch (message.type) {
      case PhysicsWorkerMessageType.SYNC:
        this.updateObjects(
          message.bodies.positions,
          message.bodies.quaternions
        );
        break;
      case PhysicsWorkerMessageType.GET_BODY_PROPS:
        const callback = this.bodyPropsCallbacks.get(message.requestId);
        if (callback) {
          callback(message as PhysicsBodyProperties);
          this.bodyPropsCallbacks.delete(message.requestId);
        }
        break;
      default:
        console.error("Unknown message type:", (message as any).type);
    }
  }

  // Update object positions and rotations
  private updateObjects(
    positions: Float32Array,
    quaternions: Float32Array
  ): void {
    let i = 0;
    this.objects.forEach((object) => {
      if (i * 3 < positions.length && i * 4 < quaternions.length) {
        // Update position
        object.position.set(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        );

        // Update quaternion
        object.quaternion.set(
          quaternions[i * 4],
          quaternions[i * 4 + 1],
          quaternions[i * 4 + 2],
          quaternions[i * 4 + 3]
        );
      }
      i++;
    });
  }

  // Helper method to create a floor
  addFloor(size: number = 100): number {
    // Create a box geometry instead of a plane
    const floorGeometry = new THREE.BoxGeometry(size, 1, size);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);

    // Position the floor slightly below y=0 so the visible surface is at y=0
    floor.position.set(0, -0.5, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Add to physics world as a box
    return this.addObject(floor, {
      type: PhysicsShapeType.BOX,
      mass: 0, // Zero mass makes it static
      position: [0, -0.5, 0],
      size: [size, 1, size],
      material: {
        friction: 0.3,
        restitution: 0.3,
      },
    });
  }

  // Helper method to create a box
  addBox(
    size: [number, number, number] = [1, 1, 1],
    position: [number, number, number] = [0, 1, 0],
    mass: number = 1,
    color: number = 0x4488ee
  ): number {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1,
    });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(...position);
    box.castShadow = true;
    box.receiveShadow = true;
    this.scene.add(box);

    // Add to physics world
    return this.addObject(box, {
      type: PhysicsShapeType.BOX,
      mass,
      position,
      size,
      material: {
        friction: 0.3,
        restitution: 0.3,
      },
    });
  }

  // Helper method to create a sphere
  addSphere(
    radius: number = 0.5,
    position: [number, number, number] = [0, 1, 0],
    mass: number = 1,
    color: number = 0xee4488
  ): number {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(...position);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    this.scene.add(sphere);

    // Add to physics world
    return this.addObject(sphere, {
      type: PhysicsShapeType.SPHERE,
      mass,
      position,
      radius,
      material: {
        friction: 0.3,
        restitution: 0.7,
      },
    });
  }

  // Enable or disable debug renderer
  setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
  }

  /**
   * Get properties of a physics body
   * This is useful for accessing advanced properties not exposed by the standard API
   * @param id The physics body ID
   * @returns A promise that resolves with the body properties
   */
  getBodyProperties(id: number): Promise<PhysicsBodyProperties> {
    return new Promise((resolve) => {
      const requestId = crypto.randomUUID();
      this.bodyPropsCallbacks.set(requestId, resolve);

      this.worker.postMessage({
        type: PhysicsWorkerMessageType.GET_BODY_PROPS,
        id,
        requestId,
      });
    });
  }
}
