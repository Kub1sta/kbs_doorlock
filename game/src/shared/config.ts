import { Vec3 } from "../../../shared/types/util";

export const CHECK_INTERVAL = 2000;
export const MAX_LOAD_DISTANCE = 30.0;

export const headingToRotation = (headingDegrees: number): Vec3 => {
	// Convert degrees to radians
	const headingRadians = (headingDegrees * Math.PI) / 180;

	return {
		x: 0, // No pitch rotation
		y: -headingRadians + Math.PI, // Add 180° (π radians) to face towards player
		z: 0, // No roll rotation
	};
};
