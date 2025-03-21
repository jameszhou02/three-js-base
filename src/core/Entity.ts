import * as THREE from "three";
import { Component, ComponentConstructor } from "./Component";

/**
 * Represents a game entity with components
 */
export class Entity {
  /** Unique identifier for the entity */
  readonly id: string = crypto.randomUUID();

  /** The Three.js object associated with this entity */
  mesh?: THREE.Object3D;

  /** The physics body ID in the physics system */
  physicsId?: number;

  /** Map of components indexed by their constructor name */
  private components: Map<string, Component> = new Map();

  /** Whether this entity is marked for deletion */
  isDestroyed = false;

  /**
   * Creates a new entity
   * @param name Optional name for the entity
   * @param mesh Optional Three.js object to associate with this entity
   */
  constructor(public name: string = "Entity", mesh?: THREE.Object3D) {
    this.mesh = mesh;
  }

  /**
   * Adds a component to this entity
   * @param componentInstance The component to add
   */
  addComponent<T extends Component>(componentInstance: T): T {
    const constructor = componentInstance.constructor as Function;
    const name = constructor.name;

    if (this.components.has(name)) {
      console.warn(
        `Entity ${this.name} already has component ${name}. Replacing.`
      );
    }

    this.components.set(name, componentInstance);

    if (componentInstance.onAttach) {
      componentInstance.onAttach();
    }

    return componentInstance;
  }

  /**
   * Gets a component by its constructor
   * @param componentConstructor The component constructor
   * @returns The component instance or undefined if not found
   */
  getComponent<T extends Component>(
    componentConstructor: ComponentConstructor<T>
  ): T | undefined {
    return this.components.get(componentConstructor.name) as T | undefined;
  }

  /**
   * Checks if this entity has a component
   * @param componentConstructor The component constructor
   * @returns True if the entity has the component
   */
  hasComponent<T extends Component>(
    componentConstructor: ComponentConstructor<T>
  ): boolean {
    return this.components.has(componentConstructor.name);
  }

  /**
   * Removes a component from this entity
   * @param componentConstructor The component constructor
   * @returns True if the component was removed
   */
  removeComponent<T extends Component>(
    componentConstructor: ComponentConstructor<T>
  ): boolean {
    const name = componentConstructor.name;
    const component = this.components.get(name);

    if (component) {
      if (component.onDetach) {
        component.onDetach();
      }
      return this.components.delete(name);
    }

    return false;
  }

  /**
   * Updates all components that have an update method
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    this.components.forEach((component) => {
      if (component.update) {
        component.update(dt);
      }
    });
  }

  /**
   * Marks this entity for deletion
   */
  destroy(): void {
    this.isDestroyed = true;
  }
}
