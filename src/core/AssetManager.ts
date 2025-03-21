import * as THREE from "three";
// Import with type assertions to bypass type checking
// We've provided types in vite-env.d.ts but the import is still giving errors
const GLTFLoader = (
  (await import("three/examples/jsm/loaders/GLTFLoader")) as any
).GLTFLoader;
const DRACOLoader = (
  (await import("three/examples/jsm/loaders/DRACOLoader")) as any
).DRACOLoader;

/**
 * Asset types that can be loaded
 */
export enum AssetType {
  TEXTURE = "texture",
  MODEL = "model",
  AUDIO = "audio",
}

// Helper types for loading events
interface LoadingEvent {
  loaded: number;
  total: number;
}

// Audio types
interface AudioContext {
  decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer>;
  close(): void;
}

interface AudioBuffer {}

/**
 * Progress callback for asset loading
 */
export type ProgressCallback = (
  url: string,
  loaded: number,
  total: number
) => void;

/**
 * Error callback for asset loading
 */
export type ErrorCallback = (url: string, error: Error) => void;

/**
 * Manages loading and caching of assets like models, textures, and audio
 */
export class AssetManager {
  /** Loaded textures cache */
  private textures: Map<string, THREE.Texture> = new Map();

  /** Loaded models cache */
  private models: Map<string, THREE.Object3D> = new Map();

  /** Loaded audio cache */
  private audio: Map<string, AudioBuffer> = new Map();

  /** Texture loader */
  private textureLoader: THREE.TextureLoader;

  /** GLTF loader */
  private gltfLoader: any;

  /** DRACO loader for compressed models */
  private dracoLoader: any;

  /** Audio loader */
  private audioLoader: THREE.AudioLoader;

  /** Audio context */
  private audioContext: AudioContext;

  /** Global progress callback */
  private onProgress?: ProgressCallback;

  /** Global error callback */
  private onError?: ErrorCallback;

  /**
   * Creates a new asset manager
   * @param onProgress Global progress callback
   * @param onError Global error callback
   */
  constructor(onProgress?: ProgressCallback, onError?: ErrorCallback) {
    this.onProgress = onProgress;
    this.onError = onError;

    // Initialize loaders
    this.textureLoader = new THREE.TextureLoader();

    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
    );

    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    this.audioLoader = new THREE.AudioLoader();

    // Create audio context
    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }

  /**
   * Loads a texture
   * @param url URL of the texture
   * @param onProgress Progress callback
   * @param onError Error callback
   * @returns Promise that resolves with the loaded texture
   */
  loadTexture(
    url: string,
    onProgress?: ProgressCallback,
    onError?: ErrorCallback
  ): Promise<THREE.Texture> {
    // Return cached texture if available
    if (this.textures.has(url)) {
      return Promise.resolve(this.textures.get(url)!);
    }

    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.textures.set(url, texture);
          resolve(texture);
        },
        (event: LoadingEvent) => {
          if (onProgress) {
            onProgress(url, event.loaded, event.total);
          } else if (this.onProgress) {
            this.onProgress(url, event.loaded, event.total);
          }
        },
        (error: unknown) => {
          const err = new Error(`Failed to load texture: ${url}`);
          if (onError) {
            onError(url, err);
          } else if (this.onError) {
            this.onError(url, err);
          }
          reject(err);
        }
      );
    });
  }

  /**
   * Loads a GLTF model
   * @param url URL of the model
   * @param onProgress Progress callback
   * @param onError Error callback
   * @returns Promise that resolves with the loaded model
   */
  loadModel(
    url: string,
    onProgress?: ProgressCallback,
    onError?: ErrorCallback
  ): Promise<THREE.Object3D> {
    // Return cached model if available
    if (this.models.has(url)) {
      // Deep clone the model to avoid modifying the cached version
      const cachedModel = this.models.get(url)!;
      return Promise.resolve(cachedModel.clone());
    }

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf: any) => {
          const model = gltf.scene;

          // Enable shadows for all meshes
          model.traverse((child: any) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Store the model in the cache
          this.models.set(url, model.clone());

          resolve(model);
        },
        (event: LoadingEvent) => {
          if (onProgress) {
            onProgress(url, event.loaded, event.total);
          } else if (this.onProgress) {
            this.onProgress(url, event.loaded, event.total);
          }
        },
        (error: unknown) => {
          const err = new Error(`Failed to load model: ${url}`);
          if (onError) {
            onError(url, err);
          } else if (this.onError) {
            this.onError(url, err);
          }
          reject(err);
        }
      );
    });
  }

  /**
   * Loads an audio file
   * @param url URL of the audio file
   * @param onProgress Progress callback
   * @param onError Error callback
   * @returns Promise that resolves with the loaded audio buffer
   */
  loadAudio(
    url: string,
    onProgress?: ProgressCallback,
    onError?: ErrorCallback
  ): Promise<AudioBuffer> {
    // Return cached audio if available
    if (this.audio.has(url)) {
      return Promise.resolve(this.audio.get(url)!);
    }

    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        url,
        async (buffer: ArrayBuffer) => {
          try {
            const audioBuffer = await this.audioContext.decodeAudioData(buffer);
            this.audio.set(url, audioBuffer);
            resolve(audioBuffer);
          } catch (error) {
            const err =
              error instanceof Error
                ? error
                : new Error(`Failed to decode audio: ${url}`);
            if (onError) {
              onError(url, err);
            } else if (this.onError) {
              this.onError(url, err);
            }
            reject(err);
          }
        },
        (event: LoadingEvent) => {
          if (onProgress) {
            onProgress(url, event.loaded, event.total);
          } else if (this.onProgress) {
            this.onProgress(url, event.loaded, event.total);
          }
        },
        (error: unknown) => {
          const err = new Error(`Failed to load audio: ${url}`);
          if (onError) {
            onError(url, err);
          } else if (this.onError) {
            this.onError(url, err);
          }
          reject(err);
        }
      );
    });
  }

  /**
   * Gets a cached texture
   * @param url URL of the texture
   * @returns The cached texture or undefined if not loaded
   */
  getTexture(url: string): THREE.Texture | undefined {
    return this.textures.get(url);
  }

  /**
   * Gets a cached model
   * @param url URL of the model
   * @returns A clone of the cached model or undefined if not loaded
   */
  getModel(url: string): THREE.Object3D | undefined {
    const model = this.models.get(url);
    return model ? model.clone() : undefined;
  }

  /**
   * Gets a cached audio buffer
   * @param url URL of the audio file
   * @returns The cached audio buffer or undefined if not loaded
   */
  getAudio(url: string): AudioBuffer | undefined {
    return this.audio.get(url);
  }

  /**
   * Releases a texture from the cache
   * @param url URL of the texture to release
   */
  releaseTexture(url: string): void {
    const texture = this.textures.get(url);
    if (texture) {
      texture.dispose();
      this.textures.delete(url);
    }
  }

  /**
   * Releases a model from the cache
   * @param url URL of the model to release
   */
  releaseModel(url: string): void {
    this.models.delete(url);
  }

  /**
   * Releases an audio buffer from the cache
   * @param url URL of the audio to release
   */
  releaseAudio(url: string): void {
    this.audio.delete(url);
  }

  /**
   * Releases all assets from the cache
   */
  releaseAll(): void {
    // Dispose textures
    this.textures.forEach((texture) => texture.dispose());

    // Clear caches
    this.textures.clear();
    this.models.clear();
    this.audio.clear();
  }

  /**
   * Disposes the asset manager
   * Releases all assets and closes the audio context
   */
  dispose(): void {
    this.releaseAll();
    this.audioContext.close();

    // Clean up DRACO loader
    this.dracoLoader.dispose();
  }
}
