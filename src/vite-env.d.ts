/// <reference types="vite/client" />

declare module "*.worker.ts?worker" {
  const WorkerConstructor: {
    new (): Worker;
  };
  export default WorkerConstructor;
}

// For imports from three.js examples
declare module "three/examples/jsm/controls/OrbitControls" {
  import { Camera, EventDispatcher } from "three";
  export class OrbitControls extends EventDispatcher {
    constructor(camera: Camera, domElement?: HTMLElement);
    enabled: boolean;
    enableDamping: boolean;
    dampingFactor: number;
    screenSpacePanning: boolean;
    maxPolarAngle: number;
    update(): void;
    handleResize(): void;
  }
}

declare module "three/examples/jsm/libs/stats.module" {
  class Stats {
    dom: HTMLElement;
    update(): void;
  }
  export default Stats;
}

// Add type declaration for cannon-es-debugger
declare module "cannon-es-debugger" {
  import { Scene } from "three";
  import { World } from "cannon-es";

  interface CannonDebuggerOptions {
    world: World;
    [key: string]: any;
  }

  class CannonDebugger {
    constructor(scene: Scene, options: CannonDebuggerOptions);
    update(): void;
  }

  export default CannonDebugger;
}

// Add type declaration for the GLTFLoader
declare module "three/examples/jsm/loaders/GLTFLoader" {
  import { Group, Loader, LoadingManager, Object3D } from "three";

  export interface GLTF {
    scene: Object3D;
    scenes: Object3D[];
    animations: any[];
    cameras: any[];
    asset: any;
  }

  export class GLTFLoader extends Loader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: { loaded: number; total: number }) => void,
      onError?: (event: Error) => void
    ): void;
    setDRACOLoader(dracoLoader: DRACOLoader): GLTFLoader;
    parse(
      data: ArrayBuffer | string,
      path: string,
      onLoad: (gltf: GLTF) => void,
      onError?: (event: Error) => void
    ): void;
  }
}

// Add type declaration for the DRACOLoader
declare module "three/examples/jsm/loaders/DRACOLoader" {
  import { Loader, LoadingManager, BufferGeometry } from "three";

  export class DRACOLoader extends Loader {
    constructor(manager?: LoadingManager);
    setDecoderPath(path: string): DRACOLoader;
    setDecoderConfig(config: object): DRACOLoader;
    setWorkerLimit(workerLimit: number): DRACOLoader;
    load(
      url: string,
      onLoad: (geometry: BufferGeometry) => void,
      onProgress?: (event: { loaded: number; total: number }) => void,
      onError?: (event: Error) => void
    ): void;
    preload(): DRACOLoader;
    dispose(): void;
  }
}

// Extend THREE.Scene to include camera property
import * as THREE from "three";

declare module "three" {
  interface Scene {
    camera?: THREE.Camera;
  }
}

// Add AudioLoader type declaration
declare module "three" {
  interface Scene {
    camera?: Camera;
  }

  class AudioLoader extends Loader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (buffer: ArrayBuffer) => void,
      onProgress?: (event: { loaded: number; total: number }) => void,
      onError?: (event: Error) => void
    ): void;
  }
}
