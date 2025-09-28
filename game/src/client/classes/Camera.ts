import { NUIComms } from "@shared/types/nui-comms";
import { DoorConfig, ObjEntries, Vec3 } from "@shared/types/util";
import { degToRad } from "../util";
import { nuiComms } from "./NuiComms";
import {
	toggleDoorByDoorId,
	findEntityByDoorId,
	refreshEntityMappings,
} from "../index";

const FAR_DISTANCE = 50.0;
let keyTickId: number | null = null;

let allDoors: DoorConfig[] = [];

const doorStates = new Map<string, boolean>();

const initializeDoorStates = () => {
	allDoors.forEach((door) => {
		if (!doorStates.has(door.id)) {
			doorStates.set(door.id, false);
		}
	});
};

onNet("kbs_doorlock:initialize", (doorConfigs: DoorConfig[]) => {
	allDoors = doorConfigs.map((door) => ({
		...door,
		position: door.position,
		rotation: door.rotation,
	}));
	initializeDoorStates();
});
class Camera {
	private metadata: Required<NUIComms.Event["update"]["camera"]>["meta"];
	private thread: NodeJS.Timer | null;
	private nerbyDoorLocation: Vec3 | null;
	private currentDoorId: string | null;

	constructor() {
		this.metadata = {
			fov: 0,
			near: 0,
			far: 0,
		};
		this.thread = null;
		this.nerbyDoorLocation = null;
		this.currentDoorId = null;

		initializeDoorStates();
	}

	public startThread() {
		if (this.thread) return;

		this.startFarModeLoop();
	}

	public addDoor(doorConfig: DoorConfig) {
		if (!allDoors.find((d) => d.id === doorConfig.id)) {
			allDoors.push(doorConfig);
			doorStates.set(doorConfig.id, false);
			console.log(`Added door ${doorConfig.id} to camera system`);
		} else {
			console.log(
				`Door ${doorConfig.id} already exists in camera system`
			);
		}
	}

	public removeDoor(doorId: string) {
		allDoors = allDoors.filter((d) => d.id !== doorId);
		doorStates.delete(doorId);
		console.log(`Removed door ${doorId} from camera system`);
	}

	public getAllDoors(): DoorConfig[] {
		return [...allDoors];
	}

	public clearAllDoors() {
		allDoors = [];
		doorStates.clear();
	}

	public setOpened(doorId: string, isOpened: boolean) {
		doorStates.set(doorId, isOpened);
	}

	public getDoorState(doorId: string): boolean {
		return doorStates.get(doorId) ?? false;
	}

	public getCurrentDoorState(): boolean {
		if (this.currentDoorId === null) return false;
		return this.getDoorState(this.currentDoorId);
	}

	private getPlayerPosition(): Vec3 {
		const [x, y, z] = GetEntityCoords(PlayerPedId(), false);
		return { x, y, z };
	}

	public calculateDistance(pos1: Vec3, pos2: Vec3): number {
		const dx = pos1.x - pos2.x;
		const dy = pos1.y - pos2.y;
		const dz = pos1.z - pos2.z;
		const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

		return distance;
	}

	private getEntityCenterPosition(entity: number): Vec3 {
		const [x, y, z] = GetEntityCoords(entity, false);

		const model = GetEntityModel(entity);
		const [minVector, maxVector] = GetModelDimensions(model);

		const [minX, minY, minZ] = minVector;
		const [maxX, maxY, maxZ] = maxVector;

		const centerOffsetX = (minX + maxX) / 2;
		const centerOffsetY = (minY + maxY) / 2;
		const centerOffsetZ = (minZ + maxZ) / 2;

		const [rotX, rotY, rotZ] = GetEntityRotation(entity, 2);

		const rotXRad = (rotX * Math.PI) / 180;
		const rotYRad = (rotY * Math.PI) / 180;
		const rotZRad = (rotZ * Math.PI) / 180;

		const cosZ = Math.cos(rotZRad);
		const sinZ = Math.sin(rotZRad);

		const transformedOffsetX = centerOffsetX * cosZ - centerOffsetY * sinZ;
		const transformedOffsetY = centerOffsetX * sinZ + centerOffsetY * cosZ;
		const transformedOffsetZ = centerOffsetZ;

		return {
			x: x + transformedOffsetX,
			y: y + transformedOffsetY,
			z: z + transformedOffsetZ,
		};
	}

	private isNearAnyDoor(): {
		id: string;
		x: number;
		y: number;
		z: number;
		closestDistance: number;
	} | null {
		const playerPos = this.getPlayerPosition();
		let closestDoor: {
			id: string;
			x: number;
			y: number;
			z: number;
		} | null = null;
		let closestDistance = Infinity;

		for (const doorData of allDoors) {
			const doorMaxDistance = doorData.maxDistance || 3.0;

			// Try multiple approaches to get the door position
			let doorPosition: Vec3 | null = null;

			// 1. Try to get live entity position first (most accurate)
			const doorEntity = findEntityByDoorId(doorData.id);
			if (doorEntity && DoesEntityExist(doorEntity)) {
				doorPosition = this.getEntityCenterPosition(doorEntity);
				// console.log(`Using live entity position for door ${doorData.id}`);
			}

			// 2. Fallback to stored coordinates if entity not available
			if (
				!doorPosition &&
				doorData.position &&
				(doorData.position.x !== 0 ||
					doorData.position.y !== 0 ||
					doorData.position.z !== 0)
			) {
				doorPosition = doorData.position;
				// console.log(`Using stored position for door ${doorData.id}`);
			}

			// 3. If no stored position, skip this door
			if (!doorPosition) {
				console.warn(
					`Camera: Door ${doorData.id} has no valid position, skipping`
				);
				continue;
			}

			const distance = this.calculateDistance(playerPos, doorPosition);
			// console.log(
			// 	`Camera: Door ${doorData.id} distance: ${distance.toFixed(
			// 		2
			// 	)}m (threshold: ${doorMaxDistance}m)`
			// );

			// Use each door's individual maxDistance instead of global MAX_DISTANCE
			if (distance <= doorMaxDistance && distance < closestDistance) {
				closestDistance = distance;
				closestDoor = {
					id: doorData.id,
					x: doorPosition.x,
					y: doorPosition.y,
					z: doorPosition.z,
				};
				// console.log(
				// 	`Camera: Door ${
				// 		doorData.id
				// 	} is now the closest at ${distance.toFixed(2)}m`
				// );
			}
		}

		if (closestDoor) {
			return {
				id: closestDoor.id,
				x: closestDoor.x,
				y: closestDoor.y,
				z: closestDoor.z,
				closestDistance,
			};
		}
		// console.log("Camera: No doors within range");
		return null;
	}

	// Check if player is within FAR_DISTANCE of any door (with entity lookup for precision)
	private isWithinFarDistance(): boolean {
		const playerPos = this.getPlayerPosition();
		// console.log(
		// 	`Camera: isWithinFarDistance check - Player at: ${playerPos.x.toFixed(
		// 		1
		// 	)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)}`
		// );
		// console.log(
		// 	`Camera: Checking against ${allDoors.length} doors with FAR_DISTANCE=${FAR_DISTANCE}m`
		// );

		for (const doorData of allDoors) {
			// Get this door's specific max distance (fallback to default if not set)
			const doorMaxDistance = doorData.maxDistance || 3.0;
			// Use a multiplier for far distance check (e.g., 10x the door's max distance)
			const doorFarDistance = Math.max(
				doorMaxDistance * 10,
				FAR_DISTANCE
			);

			// First try to use stored position (which should be the real position)
			let doorPosition: Vec3;

			if (
				doorData.position &&
				(doorData.position.x !== 0 ||
					doorData.position.y !== 0 ||
					doorData.position.z !== 0)
			) {
				// Use stored coordinates (should be the real center position)
				doorPosition = doorData.position;
				// console.log(
				// 	`Camera: Door ${
				// 		doorData.id
				// 	} - Using stored position: ${doorPosition.x.toFixed(
				// 		1
				// 	)}, ${doorPosition.y.toFixed(1)}, ${doorPosition.z.toFixed(
				// 		1
				// 	)}`
				// );
			} else {
				// Fallback: try to get entity center position
				const doorEntity = findEntityByDoorId(doorData.id);
				if (doorEntity) {
					doorPosition = this.getEntityCenterPosition(doorEntity);
					// console.log(
					// 	`Camera: Door ${
					// 		doorData.id
					// 	} - Using entity center position: ${doorPosition.x.toFixed(
					// 		1
					// 	)}, ${doorPosition.y.toFixed(
					// 		1
					// 	)}, ${doorPosition.z.toFixed(1)}`
					// );
				} else {
					// Skip this door if no valid position available
					console.warn(
						`Camera: Door ${doorData.id} has no valid position, skipping`
					);
					continue;
				}
			}

			const distance = this.calculateDistance(playerPos, doorPosition);
			// console.log(
			// 	`Camera: Door ${doorData.id} - Distance: ${distance.toFixed(
			// 		2
			// 	)}m (threshold: ${doorFarDistance}m)`
			// );

			if (distance <= doorFarDistance) {
				// console.log(
				// 	`Camera: Door ${doorData.id} is within far distance, returning TRUE`
				// );
				return true;
			}
		}

		// console.log("Camera: No doors within far distance, returning FALSE");
		return false;
	}

	private startFarModeLoop() {
		if (this.thread) {
			clearInterval(this.thread);
		}

		this.thread = setInterval(() => {
			if (allDoors.length === 0) {
				return;
			}

			if (this.isWithinFarDistance()) {
				this.startNearModeLoop();
			}
		}, 2000);
	}

	private startNearModeLoop() {
		if (this.thread) {
			clearInterval(this.thread);
		}

		refreshEntityMappings();

		this.thread = setInterval(this.onFrame, 16);
	}

	private onFrame = () => {
		const nearbyDoor = this.isNearAnyDoor();
		if (nearbyDoor === null) {
			if (this.nerbyDoorLocation !== null) {
				nuiComms.send("update", {
					camera: {
						position: this.getCameraPosition(),
						rotation: this.getCameraRotation(),
					},
					nerbyDoorLocation: null,
					isOpened: false,
					rotation: { x: 0, y: 0, z: 0 },
				});
			}

			this.nerbyDoorLocation = null;
			this.currentDoorId = null;
			this.stopKeyListener();

			if (!this.isWithinFarDistance()) {
				this.startFarModeLoop();
			}
			return;
		}

		this.nerbyDoorLocation = {
			x: nearbyDoor.x,
			y: nearbyDoor.y,
			z: nearbyDoor.z,
		};
		this.currentDoorId = nearbyDoor.id;

		const newMetadata: typeof this.metadata = {
			fov: GetFinalRenderedCamFov(),
			near: GetFinalRenderedCamNearClip(),
			far: GetFinalRenderedCamFarClip(),
		};

		const metaChanged = (
			Object.entries(newMetadata) as ObjEntries<typeof newMetadata>
		).some(([k, v]) => this.metadata[k] !== v);

		// Only send update if player is near a door
		const updateData = {
			camera: {
				position: this.getCameraPosition(),
				rotation: this.getCameraRotation(),
				meta: metaChanged ? newMetadata : undefined,
			},
			nerbyDoorLocation: this.nerbyDoorLocation,
			isOpened: this.getCurrentDoorState(),
			rotation: allDoors.find((d) => d.id === this.currentDoorId)
				?.rotation || { x: 0, y: 0, z: 0 },
		};

		nuiComms.send("update", updateData);

		if (keyTickId === null) {
			this.startKeyListener();
		}

		this.metadata = newMetadata;
	};

	private startKeyListener() {
		if (keyTickId !== null) return;

		keyTickId = setTick(() => {
			if (this.isNearAnyDoor() === null) {
				this.stopKeyListener();
				return;
			}

			const keyPressed = IsControlJustPressed(0, 51); // E key
			if (keyPressed) {
				this.toggleDoor();
			}
		});
	}

	private stopKeyListener() {
		if (keyTickId !== null) {
			clearTick(keyTickId);
			keyTickId = null;
		}
	}

	private async toggleDoor() {
		if (this.currentDoorId === null) return;

		// Call the actual physics toggle function
		await toggleDoorByDoorId(this.currentDoorId);
	}

	private getCameraPosition() {
		const [x, y, z] = GetFinalRenderedCamCoord();
		return { x, y, z };
	}

	private getCameraRotation() {
		const [x, y, z] = GetFinalRenderedCamRot(1);
		return degToRad({ x, y, z });
	}
}

export const camera = new Camera();
