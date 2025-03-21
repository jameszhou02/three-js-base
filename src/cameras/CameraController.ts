import * as THREE from "three";

/**
 * Base interface for camera controllers
 */
export interface CameraController {
  /**
   * The controlled camera
   */
  camera: THREE.Camera;

  /**
   * Updates the camera
   * @param dt Delta time in seconds
   */
  update(dt: number): void;

  /**
   * Resets the camera controller
   */
  reset?(): void;

  /**
   * Disposes the camera controller
   */
  dispose?(): void;
}
