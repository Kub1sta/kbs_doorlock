import { Vec3 } from "./util";

export namespace NUIComms {
	export type Event = {
		update: {
			camera: {
				position: Vec3;
				rotation: Vec3;
				meta?: {
					fov: number;
					near: number;
					far: number;
				};
			};
			isOpened: boolean;
			nerbyDoorLocation: Vec3 | null; // New field to indicate nearby door location
			rotation: Vec3;
		};
		openMenu: {
			doors: Array<{
				id: string;
				name: string;
				type: "single" | "double" | "garage";
				position: { x: number; y: number; z: number };
				isLocked: boolean;
				maxDistance: number;
				openingSpeed: number;
			}>;
		};
		closeMenu: {};
		updateDoors: {
			doors: Array<{
				id: string;
				name: string;
				type: "single" | "double" | "garage";
				position: { x: number; y: number; z: number };
				isLocked: boolean;
				maxDistance: number;
				openingSpeed: number;
			}>;
		};
		doorAdded: {
			door: {
				id: string;
				name: string;
				type: "single" | "double" | "garage";
				position: { x: number; y: number; z: number };
				isLocked: boolean;
				maxDistance: number;
				openingSpeed: number;
			};
		};
	};

	export type EventBody = {
		[K in keyof Event]: {
			action: K;
			data: Event[K];
		};
	}[keyof Event];

	// NUI -> Game Request
	type RequestWrapper<Data = any, Response = any> = {
		data: Data;
		response: Response;
	};

	export type Request = {
		ready: RequestWrapper<null, null>;
	};

	export type Response<T extends keyof Request> = {
		data: Request[T]["response"];
		meta:
			| {
					ok: true;
			  }
			| {
					ok: false;
					message: string;
			  };
	};
}
