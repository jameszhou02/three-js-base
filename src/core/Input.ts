/**
 * Mouse state
 */
export interface MouseState {
  /** Current X position in window coordinates */
  x: number;
  /** Current Y position in window coordinates */
  y: number;
  /** Normalized X position (-1 to 1) */
  normalizedX: number;
  /** Normalized Y position (-1 to 1) */
  normalizedY: number;
  /** Left button state */
  leftButton: boolean;
  /** Middle button state */
  middleButton: boolean;
  /** Right button state */
  rightButton: boolean;
  /** Last frame's X position */
  prevX: number;
  /** Last frame's Y position */
  prevY: number;
  /** X movement since last frame */
  movementX: number;
  /** Y movement since last frame */
  movementY: number;
}

/**
 * Manages keyboard and mouse input
 */
export class InputManager {
  /** Map of key states indexed by key code */
  private keys: Map<string, boolean> = new Map();

  /** Map of key press states from the current frame */
  private keysPressedThisFrame: Map<string, boolean> = new Map();

  /** Map of key release states from the current frame */
  private keysReleasedThisFrame: Map<string, boolean> = new Map();

  /** Mouse state */
  private mouse: MouseState = {
    x: 0,
    y: 0,
    normalizedX: 0,
    normalizedY: 0,
    leftButton: false,
    middleButton: false,
    rightButton: false,
    prevX: 0,
    prevY: 0,
    movementX: 0,
    movementY: 0,
  };

  /** Whether event listeners have been initialized */
  private initialized = false;

  /** Target DOM element for events (defaults to document.body) */
  private target: HTMLElement;

  /**
   * Creates a new InputManager
   * @param target Optional target element (defaults to document.body)
   */
  constructor(target?: HTMLElement) {
    this.target = target || document.body;
  }

  /**
   * Initializes the input manager
   * Attaches event listeners for keyboard and mouse
   */
  initialize(): void {
    if (this.initialized) return;

    // Keyboard events
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

    // Mouse events
    this.target.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    this.target.addEventListener("mousemove", this.handleMouseMove);
    this.target.addEventListener("contextmenu", this.handleContextMenu);

    this.initialized = true;
  }

  /**
   * Cleans up event listeners
   * Call this when you're done with the input manager
   */
  dispose(): void {
    if (!this.initialized) return;

    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);

    this.target.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    this.target.removeEventListener("mousemove", this.handleMouseMove);
    this.target.removeEventListener("contextmenu", this.handleContextMenu);

    this.initialized = false;
  }

  /**
   * Updates the input manager state
   * Call this once per frame
   */
  update(): void {
    // Clear per-frame states
    this.keysPressedThisFrame.clear();
    this.keysReleasedThisFrame.clear();

    // Update mouse movement
    this.mouse.movementX = this.mouse.x - this.mouse.prevX;
    this.mouse.movementY = this.mouse.y - this.mouse.prevY;
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;
  }

  /**
   * Checks if a key is currently down
   * @param key The key code (e.g., 'KeyA', 'Space')
   * @returns True if the key is down
   */
  isKeyDown(key: string): boolean {
    return this.keys.get(key) || false;
  }

  /**
   * Checks if a key was pressed this frame
   * @param key The key code (e.g., 'KeyA', 'Space')
   * @returns True if the key was pressed this frame
   */
  wasKeyPressed(key: string): boolean {
    return this.keysPressedThisFrame.get(key) || false;
  }

  /**
   * Checks if a key was released this frame
   * @param key The key code (e.g., 'KeyA', 'Space')
   * @returns True if the key was released this frame
   */
  wasKeyReleased(key: string): boolean {
    return this.keysReleasedThisFrame.get(key) || false;
  }

  /**
   * Gets the current mouse state
   * @returns The mouse state
   */
  getMouseState(): MouseState {
    return { ...this.mouse };
  }

  /**
   * Handles the keydown event
   * @param event The keyboard event
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.code;

    // Only fire pressed event if the key wasn't already down
    if (!this.keys.get(key)) {
      this.keysPressedThisFrame.set(key, true);
    }

    this.keys.set(key, true);
  };

  /**
   * Handles the keyup event
   * @param event The keyboard event
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.code;
    this.keys.set(key, false);
    this.keysReleasedThisFrame.set(key, true);
  };

  /**
   * Handles the mousedown event
   * @param event The mouse event
   */
  private handleMouseDown = (event: MouseEvent): void => {
    event.preventDefault();

    switch (event.button) {
      case 0:
        this.mouse.leftButton = true;
        break;
      case 1:
        this.mouse.middleButton = true;
        break;
      case 2:
        this.mouse.rightButton = true;
        break;
    }
  };

  /**
   * Handles the mouseup event
   * @param event The mouse event
   */
  private handleMouseUp = (event: MouseEvent): void => {
    switch (event.button) {
      case 0:
        this.mouse.leftButton = false;
        break;
      case 1:
        this.mouse.middleButton = false;
        break;
      case 2:
        this.mouse.rightButton = false;
        break;
    }
  };

  /**
   * Handles the mousemove event
   * @param event The mouse event
   */
  private handleMouseMove = (event: MouseEvent): void => {
    const rect = this.target.getBoundingClientRect();

    this.mouse.x = event.clientX - rect.left;
    this.mouse.y = event.clientY - rect.top;

    // Normalize coordinates
    this.mouse.normalizedX = (this.mouse.x / rect.width) * 2 - 1;
    this.mouse.normalizedY = -((this.mouse.y / rect.height) * 2 - 1);
  };

  /**
   * Handles the contextmenu event
   * Prevents the default right-click menu
   * @param event The mouse event
   */
  private handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}
