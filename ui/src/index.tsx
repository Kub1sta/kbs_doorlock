import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { NUIComms } from "@shared/types/nui-comms";
import { FC, useEffect, useState } from "react";
import { Euler } from "three";
import { UI } from "./components/ui";
import { ROTATION_ORDER } from "./constants";
import { nuiComms } from "./lib/NuiComms";
import { transformCoords, transformRotation } from "./lib/util";
import { useNuiEvent } from "./utils/useNuiEvent";

export const App: FC = () => {
	const { camera } = useThree((s) => ({ camera: s.camera }));
	const [isOpened, setIsOpened] = useState(false);
	const [nerbyDoorLocation, setNerbyDoorLocation] =
		useState<NUIComms.Event["update"]["nerbyDoorLocation"]>(null);
	const [rotation, setRotation] = useState<{
		x: number;
		y: number;
		z: number;
	}>({ x: 0, y: 0, z: 0 });

	if (!("isPerspectiveCamera" in camera)) {
		console.error("Main camera is not perspective camera");
		return null;
	}

	useNuiEvent<NUIComms.Event["update"]>("update", (data) => {
		// console.log("Received update event:", data);
		if (data.camera.meta) {
			camera.near = data.camera.meta.near;
			camera.far = data.camera.meta.far;
			camera.fov = data.camera.meta.fov;
			camera.rotation.order = ROTATION_ORDER;
			camera.updateProjectionMatrix();
		}

		const camPos = transformCoords(data.camera.position);
		camera.position.set(camPos.x, camPos.y, camPos.z);

		const camRot = transformRotation(data.camera.rotation);
		camera.rotation.set(camRot.x, camRot.y, camRot.z);

		// Update isOpened state from the event data
		setNerbyDoorLocation(data.nerbyDoorLocation);
		setRotation(data.rotation);
		setIsOpened(data.isOpened);
	});

	// send ready event on first ready
	useEffect(() => {
		nuiComms.request("ready");
	}, []);

	if (nerbyDoorLocation === null) {
		console.log("No nearby door location, not rendering UI");
		return;
	}

	// Transform door position to Three.js coordinates
	const doorPos = transformCoords(nerbyDoorLocation);
	// Transform door rotation to Three.js coordinates
	const doorRot = transformRotation(rotation);

	return (
		<>
			<mesh
				position={[doorPos.x, doorPos.y, doorPos.z]}
				rotation={
					new Euler(doorRot.y, doorRot.z, doorRot.x, ROTATION_ORDER)
				}
			>
				<Html transform occlude scale={0.08}>
					<UI isOpened={isOpened} />
				</Html>
			</mesh>
		</>
	);
};
