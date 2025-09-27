import { camera } from "./classes/Camera";
import { nuiComms } from "./classes/NuiComms";
import { Raycast } from "./classes/Raycast";
import { getEntityCoords } from "./util";
import { DoorConfig, headingToRotation } from "../shared/config";

declare function AddDoorToSystem(
	doorHash: string,
	model: number,
	x: number,
	y: number,
	z: number,
	p5: boolean,
	p6: boolean,
	p7: boolean
): void;
declare function DoorSystemSetDoorState(
	doorHash: string,
	state: number,
	requestDoor: boolean,
	forceUpdate: boolean
): void;
declare function DoorSystemSetAutomaticDistance(
	doorHash: string,
	distance: number,
	requestDoor: boolean,
	forceUpdate: boolean
): void;
declare function DoorSystemSetAutomaticRate(
	doorHash: string,
	rate: number,
	requestDoor: boolean,
	forceUpdate: boolean
): void;
declare function DoorSystemGetDoorState(doorHash: string): number;
declare function NetworkDoesEntityExistWithNetworkId(
	networkId: number
): boolean;
declare function NetworkGetEntityFromNetworkId(networkId: number): number;
declare function NetworkGetNetworkIdFromEntity(entity: number): number;
declare function DoesEntityExist(entity: number): boolean;
declare function NetworkGetEntityIsNetworked(entity: number): boolean;
declare function NetworkRegisterEntityAsNetworked(entity: number): boolean;
declare function NetworkGetEntityOwner(entity: number): number;

interface ServerDoorData {
	id: string;
	entityId: string;
	label: string;
	doorType: "single" | "double" | "garage";
	entityId2?: string;
	x: number;
	y: number;
	z: number;
	heading: number;
	x2?: number;
	y2?: number;
	z2?: number;
	heading2?: number;
	isLocked: boolean;
	maxDistance?: number;
	openingSpeed?: number;
}

const managedDoors = new Map<string, ServerDoorData>();
const entityToDoorId = new Map<number, string>();
const unloadedDoors = new Map<string, ServerDoorData>(); // Track doors that are too far to load

export const findEntityByDoorId = (doorId: string): number | null => {
	for (const [entity, mappedDoorId] of entityToDoorId.entries()) {
		if (mappedDoorId === doorId) {
			if (DoesEntityExist(entity)) {
				return entity;
			} else {
				entityToDoorId.delete(entity);
			}
		}
	}

	const doorData = managedDoors.get(doorId);
	if (doorData) {
		const entity = findDoorEntity(doorData);
		if (entity) {
			entityToDoorId.set(entity, doorId);
			return entity;
		}

		if (
			doorData.doorType === "double" &&
			doorData.entityId2 &&
			doorData.x2 &&
			doorData.y2 &&
			doorData.z2
		) {
			const secondDoorData = {
				...doorData,
				entityId: doorData.entityId2,
				x: doorData.x2,
				y: doorData.y2,
				z: doorData.z2,
				heading: doorData.heading2 || doorData.heading,
			};
			const entity2 = findDoorEntity(secondDoorData);
			if (entity2) {
				entityToDoorId.set(entity2, doorId);
				return entity2;
			}
		}
	}

	return null;
};

setImmediate(async () => {
	await nuiComms.init();
	camera.startThread();

	setTimeout(() => {
		if (managedDoors.size === 0) {
			TriggerServerEvent("kbs_doorlock:requestDoorData");
		}
	}, 5000);

	// Start a timer to periodically check for unloaded doors that can now be loaded
	setInterval(() => {
		if (unloadedDoors.size > 0) {
			checkUnloadedDoors();
		}
	}, 2000); // Check every 2 seconds
});

const serverDoorToConfig = (doorData: ServerDoorData): DoorConfig => {
	return {
		id: doorData.id,
		position: { x: doorData.x, y: doorData.y, z: doorData.z },
		rotation: headingToRotation(doorData.heading),
		maxDistance: doorData.maxDistance || 2.0,
	};
};

const getEntityCenterPosition = (
	entity: number
): { x: number; y: number; z: number } => {
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
};

const findDoorEntity = (doorData: ServerDoorData): number | null => {
	const parts = doorData.entityId.split("_");
	if (parts.length < 4) {
		console.error(`Invalid entity ID format: ${doorData.entityId}`);
		return null;
	}

	const expectedModelHash = parseInt(parts[0]);
	const entities = GetGamePool("CObject");

	// First try to find entity using model hash and proximity
	for (const entity of entities) {
		if (GetEntityModel(entity) === expectedModelHash) {
			const [x, y, z] = GetEntityCoords(entity, false);
			const distance = Math.sqrt(
				Math.pow(x - doorData.x, 2) +
					Math.pow(y - doorData.y, 2) +
					Math.pow(z - doorData.z, 2)
			);

			if (distance < (doorData.maxDistance || 2.0)) {
				return entity;
			}
		}
	}

	return null;
};

onNet("kbs_doorlock:receiveDoorData", (doors: ServerDoorData[]) => {
	managedDoors.clear();
	entityToDoorId.clear();
	unloadedDoors.clear(); // Clear unloaded doors as well
	camera.clearAllDoors();

	for (const doorData of doors) {
		addDoorToClientSystem(doorData);
	}
});

onNet("kbs_doorlock:doorAdded", (doorData: ServerDoorData) => {
	console.log(`New door added: ${doorData.id}`);
	addDoorToClientSystem(doorData);
});

onNet("kbs_doorlock:doorRemoved", (doorId: string) => {
	console.log(`Door removed: ${doorId}`);
	removeDoorFromClientSystem(doorId);
});

onNet("kbs_doorlock:doorStateChanged", (doorId: string, isLocked: boolean) => {
	const doorData = managedDoors.get(doorId);
	if (doorData) {
		doorData.isLocked = isLocked;
		managedDoors.set(doorId, doorData);

		if (doorData.doorType === "double") {
			DoorSystemSetDoorState(
				doorId + "_1",
				isLocked ? 1 : 0,
				false,
				false
			);
			DoorSystemSetDoorState(
				doorId + "_2",
				isLocked ? 1 : 0,
				false,
				false
			);
		} else {
			DoorSystemSetDoorState(doorId, isLocked ? 1 : 0, false, false);
		}

		camera.setOpened(doorId, !isLocked);
		console.log(
			`Door ${doorId} is now ${isLocked ? "LOCKED" : "UNLOCKED"}`
		);
	}
});

onNet(
	"kbs_doorlock:doorAddResult",
	(success: boolean, doorId: string | null) => {
		if (success && doorId) {
			console.log(`Door ${doorId} added successfully`);
		} else {
			console.log("Failed to add door");
		}
	}
);

onNet(
	"kbs_doorlock:doorMaxDistanceUpdated",
	(doorId: string, maxDistance: number) => {
		const doorData = managedDoors.get(doorId);
		if (doorData) {
			doorData.maxDistance = maxDistance;
			managedDoors.set(doorId, doorData);

			if (doorData.doorType === "double") {
				DoorSystemSetAutomaticDistance(
					doorId + "_1",
					maxDistance,
					false,
					false
				);
				DoorSystemSetAutomaticDistance(
					doorId + "_2",
					maxDistance,
					false,
					false
				);
			} else {
				DoorSystemSetAutomaticDistance(
					doorId,
					maxDistance,
					false,
					false
				);
			}

			const updatedDoorConfig = serverDoorToConfig(doorData);
			camera.removeDoor(doorId);
			camera.addDoor(updatedDoorConfig);
			camera.setOpened(doorId, !doorData.isLocked);

			console.log(
				`Door ${doorId} max distance updated to ${maxDistance}m`
			);
		}
	}
);

onNet(
	"kbs_doorlock:doorOpeningSpeedUpdated",
	(doorId: string, openingSpeed: number) => {
		const doorData = managedDoors.get(doorId);
		if (doorData) {
			doorData.openingSpeed = openingSpeed;
			managedDoors.set(doorId, doorData);

			if (doorData.doorType === "double") {
				DoorSystemSetAutomaticRate(
					doorId + "_1",
					openingSpeed,
					false,
					false
				);
				DoorSystemSetAutomaticRate(
					doorId + "_2",
					openingSpeed,
					false,
					false
				);
			} else {
				DoorSystemSetAutomaticRate(doorId, openingSpeed, false, false);
			}
			console.log(
				`Door ${doorId} opening speed updated to ${openingSpeed}s`
			);
		}
	}
);

onNet("kbs_doorlock:doorRemoveResult", (success: boolean) => {
	if (success) {
		console.log("Door removed successfully");
	} else {
		console.log("Failed to remove door");
	}
});

onNet("kbs_doorlock:doorToggled", (doorId: string, isLocked: boolean) => {
	console.log(
		`Door ${doorId} toggled to ${isLocked ? "LOCKED" : "UNLOCKED"}`
	);
});

const addDoorToClientSystem = (doorData: ServerDoorData) => {
	const playerPos = getEntityCoords(PlayerPedId());

	if (
		camera.calculateDistance(playerPos, {
			x: doorData.x,
			y: doorData.y,
			z: doorData.z,
		}) > 30.0
	) {
		console.log(
			`Door ${doorData.id} is too far from player, adding to unloaded doors`
		);
		// Store in unloaded doors instead of skipping completely
		unloadedDoors.set(doorData.id, doorData);
		return;
	}

	// Remove from unloaded doors if it was there
	unloadedDoors.delete(doorData.id);

	managedDoors.set(doorData.id, doorData);

	const entity = findDoorEntity(doorData);

	if (entity) {
		entityToDoorId.set(entity, doorData.id);
	} else {
		console.warn(`Could not find entity for door ${doorData.id}`);
	}

	let entity2: number | null = null;
	if (
		doorData.doorType === "double" &&
		doorData.entityId2 &&
		doorData.x2 &&
		doorData.y2 &&
		doorData.z2
	) {
		const secondDoorData = {
			...doorData,
			entityId: doorData.entityId2,
			x: doorData.x2,
			y: doorData.y2,
			z: doorData.z2,
			heading: doorData.heading2 || doorData.heading,
		};
		entity2 = findDoorEntity(secondDoorData);
		if (entity2) {
			entityToDoorId.set(entity2, doorData.id);
		} else {
			console.warn(
				`Could not find second entity for double door ${doorData.id}`
			);
		}
	}

	try {
		if (
			doorData.doorType === "double" &&
			entity2 &&
			doorData.x2 &&
			doorData.y2 &&
			doorData.z2
		) {
			const modelHash1 = entity ? GetEntityModel(entity) : 0;
			const modelHash2 = GetEntityModel(entity2);

			AddDoorToSystem(
				doorData.id + "_1",
				modelHash1,
				doorData.x,
				doorData.y,
				doorData.z,
				false,
				false,
				false
			);

			AddDoorToSystem(
				doorData.id + "_2",
				modelHash2,
				doorData.x2,
				doorData.y2,
				doorData.z2,
				false,
				false,
				false
			);

			DoorSystemSetDoorState(
				doorData.id + "_1",
				doorData.isLocked ? 1 : 0,
				false,
				false
			);

			DoorSystemSetDoorState(
				doorData.id + "_2",
				doorData.isLocked ? 1 : 0,
				false,
				false
			);

			DoorSystemSetAutomaticDistance(
				doorData.id + "_1",
				doorData.maxDistance || 2.0,
				false,
				false
			);

			DoorSystemSetAutomaticDistance(
				doorData.id + "_2",
				doorData.maxDistance || 2.0,
				false,
				false
			);

			DoorSystemSetAutomaticRate(
				doorData.id + "_1",
				doorData.openingSpeed || 1.0,
				false,
				false
			);

			DoorSystemSetAutomaticRate(
				doorData.id + "_2",
				doorData.openingSpeed || 1.0,
				false,
				false
			);
		} else {
			const modelHash = entity ? GetEntityModel(entity) : 0;

			AddDoorToSystem(
				doorData.id,
				modelHash,
				doorData.x,
				doorData.y,
				doorData.z,
				false,
				false,
				false
			);

			DoorSystemSetDoorState(
				doorData.id,
				doorData.isLocked ? 1 : 0,
				false,
				false
			);

			DoorSystemSetAutomaticDistance(
				doorData.id,
				doorData.maxDistance || 2.0,
				false,
				false
			);

			DoorSystemSetAutomaticRate(
				doorData.id,
				doorData.openingSpeed || 1.0,
				false,
				false
			);
		}
	} catch (error) {
		console.error(
			`Failed to register door ${doorData.id} with FiveM system:`,
			error
		);
	}

	let doorConfig = serverDoorToConfig(doorData);

	if (entity) {
		const entityCenter = getEntityCenterPosition(entity);
		doorConfig.position = entityCenter;
	}

	camera.addDoor(doorConfig);
	camera.setOpened(doorData.id, !doorData.isLocked);

	console.log(`Successfully added door ${doorData.id}`);
};

const removeDoorFromClientSystem = (doorId: string) => {
	const entitiesToRemove: number[] = [];
	for (const [entity, mappedDoorId] of entityToDoorId.entries()) {
		if (mappedDoorId === doorId) {
			entitiesToRemove.push(entity);
		}
	}

	entitiesToRemove.forEach((entity) => {
		entityToDoorId.delete(entity);
	});

	managedDoors.delete(doorId);
	unloadedDoors.delete(doorId); // Also remove from unloaded doors

	camera.removeDoor(doorId);

	console.log(`Removed door ${doorId}`);
};

export const toggleDoorByDoorId = async (doorId: string) => {
	TriggerServerEvent("kbs_doorlock:toggleDoor", doorId);
};

export const refreshEntityMappings = () => {
	let refreshCount = 0;

	for (const [doorId, doorData] of managedDoors.entries()) {
		const entity = findDoorEntity(doorData);
		if (entity) {
			for (const [oldEntity, mappedDoorId] of entityToDoorId.entries()) {
				if (mappedDoorId === doorId) {
					entityToDoorId.delete(oldEntity);
				}
			}

			entityToDoorId.set(entity, doorId);
			refreshCount++;
		}

		if (
			doorData.doorType === "double" &&
			doorData.entityId2 &&
			doorData.x2 &&
			doorData.y2 &&
			doorData.z2
		) {
			const secondDoorData = {
				...doorData,
				entityId: doorData.entityId2,
				x: doorData.x2,
				y: doorData.y2,
				z: doorData.z2,
				heading: doorData.heading2 || doorData.heading,
			};
			const entity2 = findDoorEntity(secondDoorData);
			if (entity2) {
				entityToDoorId.set(entity2, doorId);
				refreshCount++;
			}
		}
	}
};

export const checkUnloadedDoors = () => {
	const playerPos = getEntityCoords(PlayerPedId());
	const doorsToLoad: string[] = [];

	for (const [doorId, doorData] of unloadedDoors.entries()) {
		const distance = camera.calculateDistance(playerPos, {
			x: doorData.x,
			y: doorData.y,
			z: doorData.z,
		});

		if (distance <= 50.0) {
			doorsToLoad.push(doorId);
		}
	}

	for (const doorId of doorsToLoad) {
		const doorData = unloadedDoors.get(doorId);
		if (doorData) {
			console.log(`Player now close to door ${doorId}, loading it`);
			addDoorToClientSystem(doorData);
		}
	}
};

RegisterCommand(
	"doorSystem",
	async () => {
		TriggerServerEvent("kbs_doorlock:requestDoorData");

		const doorListLoaded = Array.from(managedDoors.values()).map(
			(door) => ({
				id: door.id,
				name: door.label || `Door ${door.id}`,
				type: door.doorType || "single",
				position: { x: door.x, y: door.y, z: door.z },
				isLocked: door.isLocked,
				maxDistance: door.maxDistance || 2.0,
				openingSpeed: door.openingSpeed || 1.0,
			})
		);

		const doorlistUnloaded = Array.from(unloadedDoors.values()).map(
			(door) => ({
				id: door.id,
				name: door.label || `Door ${door.id}`,
				type: door.doorType || "single",
				position: { x: door.x, y: door.y, z: door.z },
				isLocked: door.isLocked,
				maxDistance: door.maxDistance || 2.0,
				openingSpeed: door.openingSpeed || 1.0,
			})
		);

		const doorList = [...doorListLoaded, ...doorlistUnloaded];

		SetNuiFocus(true, true);

		setTimeout(() => {
			nuiComms.send("openMenu", { doors: doorList });
		}, 100);
	},
	false
);

RegisterNuiCallback("closeMenu", (data: any, cb: Function) => {
	SetNuiFocus(false, false);
	cb("ok");
});

RegisterNuiCallback(
	"startDoorSelection",
	async (
		data: {
			type: string;
			name: string;
			maxDistance: number;
			openingSpeed: number;
		},
		cb: Function
	) => {
		SetNuiFocus(false, false);

		const isDoubleDoor = data.type === "double";
		let selectedEntities: number[] = [];
		let entityData: any[] = [];
		const maxSelections = isDoubleDoor ? 2 : 1;
		let currentSelection = 0;

		const performSelection = () =>
			new Promise<boolean>((resolve) => {
				const thread = setInterval(() => {
					const raycast = new Raycast();
					const plyCoords = getEntityCoords(PlayerPedId());

					if (raycast.hit && raycast.entity && raycast.coords) {
						SetEntityDrawOutline(raycast.entity, true);
						SetEntityDrawOutlineColor(255, 165, 0, 255);

						DrawLine(
							plyCoords.x,
							plyCoords.y,
							plyCoords.z,
							raycast.coords.x,
							raycast.coords.y,
							raycast.coords.z,
							255,
							165,
							0,
							255
						);

						DrawMarker(
							28,
							raycast.coords.x,
							raycast.coords.y,
							raycast.coords.z,
							0,
							0,
							0,
							0,
							0,
							0,
							0.1,
							0.1,
							0.1,
							255,
							165,
							0,
							255,
							false,
							true,
							2,
							false,
							//@ts-ignore
							null,
							null,
							false
						);

						const entityModel = GetEntityModel(raycast.entity);
						const alreadySelected = selectedEntities.includes(
							raycast.entity
						);

						let displayText = "";
						if (isDoubleDoor) {
							displayText = `Entity: ${
								raycast.entity
							} | Model: ${entityModel}~n~${
								data.name
							} | ${data.type.toUpperCase()} DOOR (${
								currentSelection + 1
							}/${maxSelections})~n~Distance: ${
								data.maxDistance
							}m`;
							if (alreadySelected) {
								displayText += "~n~~r~Entity already selected!";
							} else {
								displayText +=
									"~n~Press ENTER to select this door part";
							}
						} else {
							displayText = `Entity: ${raycast.entity} | Model: ${entityModel}~n~Name: ${data.name} | Type: ${data.type} | Distance: ${data.maxDistance}m~n~Press ENTER to select this door`;
						}

						SetTextFont(4);
						SetTextScale(0.4, 0.4);
						SetTextColour(255, 255, 255, 255);
						SetTextOutline();
						BeginTextCommandDisplayText("STRING");
						AddTextComponentSubstringPlayerName(displayText);
						EndTextCommandDisplayText(0.01, 0.5);

						if (IsControlJustPressed(0, 18) && !alreadySelected) {
							SetEntityDrawOutline(raycast.entity, false);

							selectedEntities.push(raycast.entity);

							const entityCoords = getEntityCoords(
								raycast.entity
							);
							const entityHeading = GetEntityHeading(
								raycast.entity
							);
							const uniqueEntityId = `${entityModel}_${Math.round(
								entityCoords.x * 1000
							)}_${Math.round(
								entityCoords.y * 1000
							)}_${Math.round(entityCoords.z * 1000)}`;

							entityData.push({
								entity: raycast.entity,
								model: entityModel,
								coords: entityCoords,
								heading: entityHeading,
								uniqueId: uniqueEntityId,
							});

							currentSelection++;

							if (currentSelection >= maxSelections) {
								clearInterval(thread);
								resolve(true);
								return;
							}
						}
					} else {
						let helpText = "";
						if (isDoubleDoor) {
							helpText = `Double Door Selection (${currentSelection}/${maxSelections})~n~Aim at door entities and press ENTER to select`;
						} else {
							helpText =
								"Aim at a door entity and press ENTER to select";
						}

						SetTextFont(4);
						SetTextScale(0.4, 0.4);
						SetTextColour(255, 255, 255, 255);
						SetTextOutline();
						BeginTextCommandDisplayText("STRING");
						AddTextComponentSubstringPlayerName(helpText);
						EndTextCommandDisplayText(0.01, 0.5);
					}

					if (IsControlJustPressed(0, 177)) {
						selectedEntities.forEach((entity) => {
							SetEntityDrawOutline(entity, false);
						});
						if (raycast.entity) {
							SetEntityDrawOutline(raycast.entity, false);
						}
						clearInterval(thread);
						resolve(false);
						return;
					}
				}, 0);
			});

		const selectionResult = await performSelection();

		if (selectionResult && entityData.length > 0) {
			let doorData: any = {
				entityId: entityData[0].uniqueId,
				name: data.name,
				type: data.type,
				maxDistance: data.maxDistance,
				openingSpeed: data.openingSpeed,
				x: entityData[0].coords.x,
				y: entityData[0].coords.y,
				z: entityData[0].coords.z,
				heading: entityData[0].heading,
			};

			if (isDoubleDoor && entityData[1]) {
				doorData.entityId2 = entityData[1].uniqueId;
				doorData.x2 = entityData[1].coords.x;
				doorData.y2 = entityData[1].coords.y;
				doorData.z2 = entityData[1].coords.z;
				doorData.heading2 = entityData[1].heading;
			}

			TriggerServerEvent("kbs_doorlock:addDoorWithDetails", doorData);
		}

		setTimeout(() => {
			const doorList = Array.from(managedDoors.values()).map((door) => ({
				id: door.id,
				name: door.label || `Door ${door.id}`,
				type: door.doorType || "single",
				position: { x: door.x, y: door.y, z: door.z },
				isLocked: door.isLocked,
				maxDistance: door.maxDistance || 2.0,
				openingSpeed: door.openingSpeed || 1.0,
			}));
			SetNuiFocus(true, true);
			nuiComms.send("openMenu", { doors: doorList });
		}, 500);

		cb("ok");
	}
);

RegisterNuiCallback(
	"deleteDoor",
	(data: { doorHash: string; doorId: string }, cb: Function) => {
		const doorData = managedDoors.get(data.doorId);

		if (doorData) {
			if (doorData.doorType === "double") {
				const doorState1 = DoorSystemGetDoorState(data.doorId + "_1");
				const doorState2 = DoorSystemGetDoorState(data.doorId + "_2");

				if (doorState1 === 1) {
					DoorSystemSetDoorState(data.doorId + "_1", 0, false, false);
				}
				if (doorState2 === 1) {
					DoorSystemSetDoorState(data.doorId + "_2", 0, false, false);
				}
			} else {
				const doorState = DoorSystemGetDoorState(data.doorHash);
				if (doorState === 1) {
					DoorSystemSetDoorState(data.doorHash, 0, false, false);
				}
			}
		} else {
			const doorState = DoorSystemGetDoorState(data.doorHash);
			if (doorState === 1) {
				DoorSystemSetDoorState(data.doorHash, 0, false, false);
			}
		}

		TriggerServerEvent("kbs_doorlock:removeDoor", data.doorId);
		cb("ok");
	}
);

RegisterNuiCallback(
	"teleportToDoor",
	(
		data: { doorId: string; position: { x: number; y: number; z: number } },
		cb: Function
	) => {
		const ped = PlayerPedId();
		SetEntityCoords(
			ped,
			data.position.x,
			data.position.y,
			data.position.z + 1,
			false,
			false,
			false,
			false
		);
		cb("ok");
	}
);

RegisterNuiCallback(
	"updateDoorMaxDistance",
	(data: { doorId: string; maxDistance: number }, cb: Function) => {
		TriggerServerEvent(
			"kbs_doorlock:updateDoorMaxDistance",
			data.doorId,
			data.maxDistance
		);
		cb("ok");
	}
);

RegisterNuiCallback(
	"updateDoorOpeningSpeed",
	(data: { doorId: string; openingSpeed: number }, cb: Function) => {
		TriggerServerEvent(
			"kbs_doorlock:updateDoorOpeningSpeed",
			data.doorId,
			data.openingSpeed
		);
		cb("ok");
	}
);
