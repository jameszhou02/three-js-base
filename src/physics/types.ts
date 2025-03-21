// Physics object types
export enum PhysicsShapeType {
  BOX = "box",
  SPHERE = "sphere",
  PLANE = "plane",
}

export interface PhysicsObjectOptions {
  type: PhysicsShapeType;
  mass: number;
  position: [number, number, number];
  quaternion?: [number, number, number, number];
  size?: [number, number, number]; // For box
  radius?: number; // For sphere
  material?: {
    friction: number;
    restitution: number;
  };
  linearDamping?: number;
  angularDamping?: number;
  fixedRotation?: boolean;
}

// Worker message types
export enum PhysicsWorkerMessageType {
  INIT = "init",
  ADD_BODY = "add_body",
  REMOVE_BODY = "remove_body",
  UPDATE = "update",
  SYNC = "sync",
  APPLY_FORCE = "apply_force",
  APPLY_IMPULSE = "apply_impulse",
  SET_POSITION = "set_position",
  SET_VELOCITY = "set_velocity",
  GET_BODY_PROPS = "get_body_props",
}

// Messages from main thread to worker
export interface PhysicsWorkerInitMessage {
  type: PhysicsWorkerMessageType.INIT;
  gravity: [number, number, number];
  iterations?: number;
}

export interface PhysicsWorkerAddBodyMessage {
  type: PhysicsWorkerMessageType.ADD_BODY;
  id: number;
  options: PhysicsObjectOptions;
}

export interface PhysicsWorkerRemoveBodyMessage {
  type: PhysicsWorkerMessageType.REMOVE_BODY;
  id: number;
}

export interface PhysicsWorkerUpdateMessage {
  type: PhysicsWorkerMessageType.UPDATE;
  dt: number;
}

export interface PhysicsWorkerApplyForceMessage {
  type: PhysicsWorkerMessageType.APPLY_FORCE;
  id: number;
  force: [number, number, number];
  worldPoint?: [number, number, number];
}

export interface PhysicsWorkerApplyImpulseMessage {
  type: PhysicsWorkerMessageType.APPLY_IMPULSE;
  id: number;
  impulse: [number, number, number];
  worldPoint?: [number, number, number];
}

export interface PhysicsWorkerSetPositionMessage {
  type: PhysicsWorkerMessageType.SET_POSITION;
  id: number;
  position: [number, number, number];
}

export interface PhysicsWorkerSetVelocityMessage {
  type: PhysicsWorkerMessageType.SET_VELOCITY;
  id: number;
  velocity: [number, number, number];
}

export interface PhysicsWorkerGetBodyPropsMessage {
  type: PhysicsWorkerMessageType.GET_BODY_PROPS;
  id: number;
  requestId: string;
}

// Messages from worker to main thread
export interface PhysicsWorkerSyncMessage {
  type: PhysicsWorkerMessageType.SYNC;
  bodies: {
    positions: Float32Array;
    quaternions: Float32Array;
  };
}

export interface PhysicsBodyProperties {
  mass: number;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  velocity: [number, number, number];
  angularVelocity: [number, number, number];
  type: string;
  fixedRotation: boolean;
  sleepState: number;
  requestId: string;
}

export type PhysicsWorkerIncomingMessage =
  | PhysicsWorkerInitMessage
  | PhysicsWorkerAddBodyMessage
  | PhysicsWorkerRemoveBodyMessage
  | PhysicsWorkerUpdateMessage
  | PhysicsWorkerApplyForceMessage
  | PhysicsWorkerApplyImpulseMessage
  | PhysicsWorkerSetPositionMessage
  | PhysicsWorkerSetVelocityMessage
  | PhysicsWorkerGetBodyPropsMessage;

export type PhysicsWorkerOutgoingMessage =
  | PhysicsWorkerSyncMessage
  | PhysicsBodyProperties;
