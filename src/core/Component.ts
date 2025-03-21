/**
 * Base interface for all components in the entity system
 */
export interface Component {
  /**
   * Called when the component is added to an entity
   */
  onAttach?(): void;

  /**
   * Called when the component is removed from an entity
   */
  onDetach?(): void;

  /**
   * Called on each frame to update the component
   * @param dt Delta time in seconds
   */
  update?(dt: number): void;
}

/**
 * Component constructor type
 */
export type ComponentConstructor<T extends Component = Component> = new (
  ...args: any[]
) => T;
