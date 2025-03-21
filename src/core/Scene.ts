import * as THREE from "three";
import { Entity } from "./Entity";
import { PhysicsWorld } from "../physics/PhysicsWorld";

/**
 * Manages a collection of entities and the game world
 */
export class Scene {
  /** Three.js scene */
  threeScene: THREE.Scene;

  /** Physics world */
  physics: PhysicsWorld;

  /** Map of entities indexed by their ID */
  private entities: Map<string, Entity> = new Map();

  /** Entities that need to be added on the next update */
  private entitiesToAdd: Entity[] = [];

  /** Whether the scene has been initialized */
  private isInitialized = false;

  /**
   * Creates a new scene
   * @param enablePhysicsDebug Whether to enable physics debug rendering
   */
  constructor(enablePhysicsDebug = false) {
    this.threeScene = new THREE.Scene();
    this.physics = new PhysicsWorld(this.threeScene, enablePhysicsDebug);
  }

  /**
   * Initializes the scene
   * Override this in derived scenes
   */
  initialize(): void {
    this.isInitialized = true;
  }

  /**
   * Adds an entity to the scene
   * If the scene is already initialized, the entity will be added on the next update
   * @param entity The entity to add
   */
  addEntity(entity: Entity): Entity {
    if (this.isInitialized) {
      // If the scene is already initialized, queue the entity to be added
      this.entitiesToAdd.push(entity);
    } else {
      // Otherwise, add it immediately
      this.entities.set(entity.id, entity);
    }
    return entity;
  }

  /**
   * Gets an entity by its ID
   * @param id The entity ID
   * @returns The entity or undefined if not found
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Gets all entities
   * @returns An array of all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Removes an entity from the scene
   * @param entityOrId The entity or its ID
   * @returns True if the entity was removed
   */
  removeEntity(entityOrId: Entity | string): boolean {
    const id = typeof entityOrId === "string" ? entityOrId : entityOrId.id;
    const entity = this.entities.get(id);

    if (entity) {
      // If the entity has a physics body, remove it
      if (entity.physicsId !== undefined) {
        this.physics.removeObject(entity.physicsId);
      }

      // If the entity has a mesh, remove it from the scene
      if (entity.mesh) {
        this.threeScene.remove(entity.mesh);
      }

      return this.entities.delete(id);
    }

    return false;
  }

  /**
   * Updates all entities in the scene
   * Also processes the queue of entities to add and removes destroyed entities
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    // Add queued entities
    if (this.entitiesToAdd.length > 0) {
      for (const entity of this.entitiesToAdd) {
        this.entities.set(entity.id, entity);
      }
      this.entitiesToAdd = [];
    }

    // Update physics
    this.physics.update();

    // Update entities
    this.entities.forEach((entity) => {
      entity.update(dt);
    });

    // Remove destroyed entities
    this.entities.forEach((entity, id) => {
      if (entity.isDestroyed) {
        this.removeEntity(id);
      }
    });
  }

  /**
   * Cleans up the scene
   * Call this when you're done with the scene
   */
  dispose(): void {
    // Clear all entities
    this.entities.clear();
    this.entitiesToAdd = [];
  }
}
