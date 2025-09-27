import { Vec3 } from "../../../shared/types/util";
import { Vector3 } from "./vector3";

export interface DoorConfig {
	id: string;
	position?: Vec3;
	rotation?: Vec3;
	maxDistance?: number;
}

// Helper function to convert GTA heading to Three.js rotation
export const headingToRotation = (headingDegrees: number): Vec3 => {
	// Convert degrees to radians
	const headingRadians = (headingDegrees * Math.PI) / 180;

	return {
		x: 0, // No pitch rotation
		y: -headingRadians + Math.PI, // Add 180° (π radians) to face towards player
		z: 0, // No roll rotation
	};
};

export const DOOR_LOCATIONS: DoorConfig[] = [
	// Static doors can be added here if needed
	// Example:
	// {
	// 	id: "main_entrance",
	// 	position: { x: 123.45, y: -678.90, z: 12.34 },
	// 	rotation: { x: 0, y: 0, z: 0 }
	// }
];
