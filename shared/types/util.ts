export type Vec3 = { x: number; y: number; z: number };

export type ObjEntries<T> = {
	[K in keyof T]: [K, T[K]];
}[keyof T][];

export interface DoorConfig {
	id: string;
	position?: Vec3;
	rotation?: Vec3;
	maxDistance?: number;
}
