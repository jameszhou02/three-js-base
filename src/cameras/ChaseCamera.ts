import * as THREE from "three";
import { CameraController } from "./CameraController";

/**
 * Configuration options for the chase camera
 */
export interface ChaseCameraOptions {
  /** Offset from target position */
  offset?: THREE.Vector3;
  /** How far camera should stay from target */
  distance?: number;
  /** Damping factor for smooth movement (0-1, higher = smoother) */
  damping?: number;
  /** Rotation offset in radians */
  rotation?: number;
  /** Height offset */
  height?: number;
  /** Whether to automatically look at the target */
  lookAtTarget?: boolean;
  /** Minimum distance to target */
  minDistance?: number;
  /** Maximum distance to target */
  maxDistance?: number;
}

/**
 * A camera controller that chases a target object
 */
export class ChaseCamera implements CameraController {
  camera: THREE.Camera;
  target: THREE.Object3D;

  // Configuration
  offset: THREE.Vector3;
  distance: number;
  damping: number;
  rotation: number;
  height: number;
  lookAtTarget: boolean;
  minDistance: number;
  maxDistance: number;

  // Internal state
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private desiredPosition: THREE.Vector3 = new THREE.Vector3();
  private targetPosition: THREE.Vector3 = new THREE.Vector3();

  /**
   * Creates a chase camera
   * @param camera The camera to control
   * @param target The target to follow
   * @param options Configuration options
   */
  constructor(
    camera: THREE.Camera,
    target: THREE.Object3D,
    options: ChaseCameraOptions = {}
  ) {
    this.camera = camera;
    this.target = target;

    this.offset = options.offset ?? new THREE.Vector3(0, 0, 0);
    this.distance = options.distance ?? 5;
    this.damping = options.damping ?? 0.1;
    this.rotation = options.rotation ?? 0;
    this.height = options.height ?? 2;
    this.lookAtTarget = options.lookAtTarget ?? true;
    this.minDistance = options.minDistance ?? 2;
    this.maxDistance = options.maxDistance ?? 10;

    // Initialize position
    this.updateTargetPosition();
    this.calculateDesiredPosition();
    this.currentPosition.copy(this.desiredPosition);
    this.updateCamera();
  }

  /**
   * Updates the camera position and orientation
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    // Skip with zero dt
    if (dt <= 0) return;

    // Update positions
    this.updateTargetPosition();
    this.calculateDesiredPosition();

    // Smoothly move towards the desired position
    this.currentPosition.lerp(this.desiredPosition, this.damping);

    // Update the camera
    this.updateCamera();
  }

  /**
   * Updates the stored target position
   */
  private updateTargetPosition(): void {
    this.targetPosition.setFromMatrixPosition(this.target.matrixWorld);
    this.targetPosition.add(this.offset);
  }

  /**
   * Calculates the desired camera position based on target and settings
   */
  private calculateDesiredPosition(): void {
    // Start with the target position
    this.desiredPosition.copy(this.targetPosition);

    // Apply rotation around target
    const angle = this.rotation;
    const distance = this.distance;

    this.desiredPosition.x += Math.sin(angle) * distance;
    this.desiredPosition.z += Math.cos(angle) * distance;
    this.desiredPosition.y += this.height;
  }

  /**
   * Updates the camera position and orientation
   */
  private updateCamera(): void {
    this.camera.position.copy(this.currentPosition);

    if (this.lookAtTarget) {
      this.camera.lookAt(this.targetPosition);
    }
  }

  /**
   * Sets the rotation angle in radians
   * @param angle The new rotation angle in radians
   */
  setRotation(angle: number): void {
    this.rotation = angle;
  }

  /**
   * Sets the distance from target
   * @param distance The new distance
   */
  setDistance(distance: number): void {
    this.distance = THREE.MathUtils.clamp(
      distance,
      this.minDistance,
      this.maxDistance
    );
  }

  /**
   * Changes the distance by the given amount
   * @param delta The amount to change the distance by
   */
  zoom(delta: number): void {
    this.setDistance(this.distance + delta);
  }

  /**
   * Resets the camera to default position
   */
  reset(): void {
    this.updateTargetPosition();
    this.calculateDesiredPosition();
    this.currentPosition.copy(this.desiredPosition);
    this.updateCamera();
  }
}
