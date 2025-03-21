import * as CANNON from "cannon-es";
import {
  PhysicsObjectOptions,
  PhysicsShapeType,
  PhysicsWorkerIncomingMessage,
  PhysicsWorkerMessageType,
} from "../physics/types";

// Store bodies with their IDs for lookups
type BodyMap = Map<number, CANNON.Body>;

class PhysicsWorker {
  private world!: CANNON.World; // Use definite assignment assertion
  private bodies: BodyMap = new Map();
  private positions: Float32Array = new Float32Array(0);
  private quaternions: Float32Array = new Float32Array(0);

  constructor() {
    // Set up self as message handler
    self.onmessage = this.handleMessage.bind(this);
  }

  // Initialize the physics world
  private init(gravity: [number, number, number], iterations = 10): void {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(...gravity),
    });

    // Set iteration property in a type-safe way
    (this.world.solver as any).iterations = iterations;
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;
  }

  // Create a physics body based on shape type
  private createBody(id: number, options: PhysicsObjectOptions): void {
    let shape: CANNON.Shape;

    // Create the shape based on the type
    switch (options.type) {
      case PhysicsShapeType.BOX:
        if (!options.size) throw new Error("Box shape requires size");
        shape = new CANNON.Box(
          new CANNON.Vec3(
            options.size[0] / 2,
            options.size[1] / 2,
            options.size[2] / 2
          )
        );
        break;
      case PhysicsShapeType.SPHERE:
        if (!options.radius) throw new Error("Sphere shape requires radius");
        shape = new CANNON.Sphere(options.radius);
        break;
      case PhysicsShapeType.PLANE:
        shape = new CANNON.Plane();
        break;
      default:
        throw new Error(`Unsupported shape type: ${options.type}`);
    }

    // Create a material if specified
    let material: CANNON.Material | undefined;
    if (options.material) {
      material = new CANNON.Material();
      material.friction = options.material.friction;
      material.restitution = options.material.restitution;
    }

    // Create the body
    const body = new CANNON.Body({
      mass: options.mass,
      position: new CANNON.Vec3(...options.position),
      material: material,
      linearDamping: options.linearDamping ?? 0.01,
      angularDamping: options.angularDamping ?? 0.01,
      fixedRotation: options.fixedRotation ?? false,
    });

    // Add the shape to the body
    body.addShape(shape);

    // Set quaternion if specified
    if (options.quaternion) {
      body.quaternion.set(
        options.quaternion[0],
        options.quaternion[1],
        options.quaternion[2],
        options.quaternion[3]
      );
    }

    // Add the body to the world and store it in our map
    this.world.addBody(body);
    this.bodies.set(id, body);

    // Resize our data arrays if needed
    this.resizeArrays();
  }

  // Remove a body from the physics world
  private removeBody(id: number): void {
    const body = this.bodies.get(id);
    if (body) {
      this.world.removeBody(body);
      this.bodies.delete(id);
    }
  }

  // Update the physics world by one step
  private update(dt: number): void {
    // Step the physics simulation
    this.world.step(dt);

    // Copy positions and quaternions to our arrays
    let i = 0;
    this.bodies.forEach((body) => {
      // Position
      this.positions[i * 3] = body.position.x;
      this.positions[i * 3 + 1] = body.position.y;
      this.positions[i * 3 + 2] = body.position.z;

      // Quaternion (XYZW)
      this.quaternions[i * 4] = body.quaternion.x;
      this.quaternions[i * 4 + 1] = body.quaternion.y;
      this.quaternions[i * 4 + 2] = body.quaternion.z;
      this.quaternions[i * 4 + 3] = body.quaternion.w;

      i++;
    });

    // Send the data back to the main thread
    this.sync();
  }

  // Apply a force to a body
  private applyForce(
    id: number,
    force: [number, number, number],
    worldPoint?: [number, number, number]
  ): void {
    const body = this.bodies.get(id);
    if (body) {
      const forceVec = new CANNON.Vec3(...force);
      if (worldPoint) {
        const pointVec = new CANNON.Vec3(...worldPoint);
        body.applyForce(forceVec, pointVec);
      } else {
        body.applyForce(forceVec, body.position);
      }
    }
  }

  // Apply an impulse to a body
  private applyImpulse(
    id: number,
    impulse: [number, number, number],
    worldPoint?: [number, number, number]
  ): void {
    const body = this.bodies.get(id);
    if (body) {
      const impulseVec = new CANNON.Vec3(...impulse);
      if (worldPoint) {
        const pointVec = new CANNON.Vec3(...worldPoint);
        body.applyImpulse(impulseVec, pointVec);
      } else {
        body.applyImpulse(impulseVec, body.position);
      }
    }
  }

  // Set position of a body
  private setPosition(id: number, position: [number, number, number]): void {
    const body = this.bodies.get(id);
    if (body) {
      body.position.set(...position);
      body.previousPosition.set(...position);
      body.interpolatedPosition.set(...position);
    }
  }

  // Set velocity of a body
  private setVelocity(id: number, velocity: [number, number, number]): void {
    const body = this.bodies.get(id);
    if (body) {
      body.velocity.set(...velocity);
    }
  }

  // Sync data with main thread
  private sync(): void {
    // Send positions and quaternions back to main thread
    const message = {
      type: PhysicsWorkerMessageType.SYNC,
      bodies: {
        positions: this.positions,
        quaternions: this.quaternions,
      },
    };

    // Use transferable objects for better performance
    // Cast to any to bypass type checking for web worker environment
    (self as any).postMessage(message, [
      this.positions.buffer,
      this.quaternions.buffer,
    ]);

    // Create new arrays since we transferred the old ones
    this.positions = new Float32Array(this.bodies.size * 3);
    this.quaternions = new Float32Array(this.bodies.size * 4);
  }

  // Resize data arrays if needed
  private resizeArrays(): void {
    const size = this.bodies.size;

    // Only resize if current arrays are too small
    if (this.positions.length < size * 3) {
      const newPositions = new Float32Array(size * 3);
      newPositions.set(this.positions);
      this.positions = newPositions;
    }

    if (this.quaternions.length < size * 4) {
      const newQuaternions = new Float32Array(size * 4);
      newQuaternions.set(this.quaternions);
      this.quaternions = newQuaternions;
    }
  }

  // Get body properties
  private getBodyProps(id: number, requestId: string): void {
    const body = this.bodies.get(id);
    if (!body) {
      console.warn(`Body with id ${id} not found`);
      return;
    }

    // Create a properties object with key Cannon.js body properties
    const props = {
      type: PhysicsWorkerMessageType.GET_BODY_PROPS,
      mass: body.mass,
      position: [body.position.x, body.position.y, body.position.z] as [
        number,
        number,
        number
      ],
      quaternion: [
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w,
      ] as [number, number, number, number],
      velocity: [body.velocity.x, body.velocity.y, body.velocity.z] as [
        number,
        number,
        number
      ],
      angularVelocity: [
        body.angularVelocity.x,
        body.angularVelocity.y,
        body.angularVelocity.z,
      ] as [number, number, number],
      fixedRotation: body.fixedRotation,
      sleepState: body.sleepState,
      requestId: requestId,
    };

    // Send the properties back to the main thread
    (self as any).postMessage(props);
  }

  // Handle incoming messages
  private handleMessage(
    event: MessageEvent<PhysicsWorkerIncomingMessage>
  ): void {
    const message = event.data;

    switch (message.type) {
      case PhysicsWorkerMessageType.INIT:
        this.init(message.gravity, message.iterations);
        break;
      case PhysicsWorkerMessageType.ADD_BODY:
        this.createBody(message.id, message.options);
        break;
      case PhysicsWorkerMessageType.REMOVE_BODY:
        this.removeBody(message.id);
        break;
      case PhysicsWorkerMessageType.UPDATE:
        this.update(message.dt);
        break;
      case PhysicsWorkerMessageType.APPLY_FORCE:
        this.applyForce(message.id, message.force, message.worldPoint);
        break;
      case PhysicsWorkerMessageType.APPLY_IMPULSE:
        this.applyImpulse(message.id, message.impulse, message.worldPoint);
        break;
      case PhysicsWorkerMessageType.SET_POSITION:
        this.setPosition(message.id, message.position);
        break;
      case PhysicsWorkerMessageType.SET_VELOCITY:
        this.setVelocity(message.id, message.velocity);
        break;
      case PhysicsWorkerMessageType.GET_BODY_PROPS:
        this.getBodyProps(message.id, message.requestId);
        break;
      default:
        console.error("Unknown message type:", (message as any).type);
    }
  }
}

// Instantiate the worker
new PhysicsWorker();
