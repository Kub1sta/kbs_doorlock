import { Vec3 } from "@shared/types/util";
import { useEffect } from "react";

export const transformCoords = (gtaCoords: Vec3) => {
	const { x, y, z } = gtaCoords;
	return {
		x,
		y: z,
		z: y * -1,
	};
};

export const transformRotation = (gtaRotation: Vec3) => {
	return {
		x: gtaRotation.x,
		y:
			Math.abs(gtaRotation.y) > Math.PI / 4
				? -gtaRotation.z
				: gtaRotation.z,
		z: gtaRotation.y,
	};
};

/**
 * Converts polar coordinates to cartesian
 * @param distance
 * @param angle - in degrees
 * @returns Vec3
 */
export const polar = (distance: number, angle: number) => ({
	x: distance * Math.cos(degToRad(angle)),
	y: distance * Math.sin(degToRad(angle)),
	z: 0,
});

/**
 * Converts degrees to radians
 * @param degrees
 */
export const degToRad = (degrees: number) => (degrees * Math.PI) / 180;

// NUI Event hook for React components
export const useNuiEvent = (action: string, handler: (data: any) => void) => {
	useEffect(() => {
		const eventListener = (event: MessageEvent) => {
			if (event.data.action && event.data.action === action) {
				handler(event.data.data);
			}
		};

		window.addEventListener("message", eventListener);

		return () => window.removeEventListener("message", eventListener);
	}, [action, handler]);
};
