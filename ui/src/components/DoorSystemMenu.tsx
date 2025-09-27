import { useState, useEffect } from "react";
import "./DoorSystemMenu.scss";
import { useNuiEvent } from "../lib/util";
import { fetchNui } from "../lib/NuiComms";
import { Modal } from "./Modal";
import { FaClipboardList, FaPlus } from "react-icons/fa6";
import { BsFillDoorClosedFill } from "react-icons/bs";
import { MdDoorSliding } from "react-icons/md";
import { PiGarageFill } from "react-icons/pi";
import { FaSearch, FaTrash } from "react-icons/fa";
import { GiTeleport } from "react-icons/gi";
import { IoArrowBackCircle } from "react-icons/io5";

interface Door {
	id: string;
	name: string;
	type: "single" | "double" | "garage";
	position: { x: number; y: number; z: number };
	isLocked: boolean;
	maxDistance: number;
	openingSpeed: number;
}

type DoorType = "single" | "double" | "garage";
type ViewType = "list" | "add";
type FilterType = "all" | "locked" | "unlocked";

export function DoorSystemMenu() {
	const [isOpen, setIsOpen] = useState(false);
	const [doors, setDoors] = useState<Door[]>([]);
	const [selectedDoor, setSelectedDoor] = useState<Door | null>(null);
	const [currentView, setCurrentView] = useState<ViewType>("list");
	const [newDoorType, setNewDoorType] = useState<DoorType>("single");
	const [newDoorName, setNewDoorName] = useState("");
	const [newDoorMaxDistance, setNewDoorMaxDistance] = useState(2.0);
	const [newDoorOpeningSpeed, setNewDoorOpeningSpeed] = useState(1.0);
	const [isSelectingDoor, setIsSelectingDoor] = useState(false);

	const [editingMaxDistance, setEditingMaxDistance] = useState<number | null>(
		null
	);
	const [editingOpeningSpeed, setEditingOpeningSpeed] = useState<
		number | null
	>(null);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [doorToDelete, setDoorToDelete] = useState<Door | null>(null);

	const [searchTerm, setSearchTerm] = useState("");
	const [filterType, setFilterType] = useState<FilterType>("all");
	const [filterByType, setFilterByType] = useState<DoorType | "all">("all");

	useNuiEvent("openMenu", (data) => {
		setIsOpen(true);
		if (data.doors) {
			setDoors(data.doors);
		}
		setIsSelectingDoor(false);
		if (currentView === "add") {
			setCurrentView("list");
		}
	});

	useNuiEvent("closeMenu", () => {
		setIsOpen(false);
	});

	useNuiEvent("updateDoors", (data) => {
		setDoors(data.doors || []);
	});

	useNuiEvent("doorAdded", (data) => {
		if (data.door) {
			setDoors((prev) => [...prev, data.door]);
		}
	});

	const closeMenu = () => {
		setIsOpen(false);
		fetchNui("closeMenu", {});
	};

	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (event.key === "Escape" && isOpen) {
				closeMenu();
			}
		};

		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [isOpen]);

	const filteredDoors = doors.filter((door) => {
		const matchesSearch =
			door.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			door.id.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesStatusFilter =
			filterType === "all" ||
			(filterType === "locked" && door.isLocked) ||
			(filterType === "unlocked" && !door.isLocked);

		const matchesTypeFilter =
			filterByType === "all" || door.type === filterByType;

		return matchesSearch && matchesStatusFilter && matchesTypeFilter;
	});

	const handleDoorClick = (door: Door) => {
		setSelectedDoor(door);
		setEditingMaxDistance(door.maxDistance);
		setEditingOpeningSpeed(door.openingSpeed);
		setHasUnsavedChanges(false);
	};

	const handleBackToList = () => {
		setSelectedDoor(null);
		setCurrentView("list");
		setIsSelectingDoor(false);
		setEditingMaxDistance(null);
		setEditingOpeningSpeed(null);
		setHasUnsavedChanges(false);
		setNewDoorName("");
		setNewDoorType("single");
		setNewDoorMaxDistance(2.0);
		setNewDoorOpeningSpeed(1.0);
	};

	const handleNavigation = (view: ViewType) => {
		setCurrentView(view);
		setSelectedDoor(null);
		setIsSelectingDoor(false);
		if (view === "add") {
			setNewDoorName("");
			setNewDoorType("single");
			setNewDoorMaxDistance(2.0);
			setNewDoorOpeningSpeed(1.0);
		}
	};

	const handleStartSelection = async () => {
		if (!newDoorName.trim()) {
			alert("Please enter a door name before selecting.");
			return;
		}

		if (newDoorMaxDistance < 0.5 || newDoorMaxDistance > 10) {
			alert(
				"Please enter a valid max distance between 0.5 and 10 meters."
			);
			return;
		}

		if (newDoorOpeningSpeed < 0.1 || newDoorOpeningSpeed > 10) {
			alert(
				"Please enter a valid opening speed between 0.1 and 10.0 seconds."
			);
			return;
		}

		setIsOpen(false);
		setIsSelectingDoor(true);

		await fetchNui("startDoorSelection", {
			type: newDoorType,
			name: newDoorName,
			maxDistance: newDoorMaxDistance,
			openingSpeed: newDoorOpeningSpeed,
		});
	};

	const handleDeleteDoor = (doorId: string) => {
		const door = doors.find((d) => d.id === doorId);
		if (door) {
			setDoorToDelete(door);
			setDeleteModalOpen(true);
		}
	};

	const confirmDeleteDoor = async () => {
		if (!doorToDelete) return;
		await fetchNui("deleteDoor", {
			doorId: doorToDelete.id,
		});

		setDoors(doors.filter((door) => door.id !== doorToDelete.id));
		if (selectedDoor && selectedDoor.id === doorToDelete.id) {
			setSelectedDoor(null);
		}

		setDeleteModalOpen(false);
		setDoorToDelete(null);
	};

	const cancelDeleteDoor = () => {
		setDeleteModalOpen(false);
		setDoorToDelete(null);
	};

	const handleTeleportToDoor = async (door: Door) => {
		await fetchNui("teleportToDoor", {
			doorId: door.id,
			position: door.position,
		});
	};

	const handleUpdateMaxDistance = async (
		doorId: string,
		newMaxDistance: number
	) => {
		await fetchNui("updateDoorMaxDistance", {
			doorId,
			maxDistance: newMaxDistance,
		});

		setDoors(
			doors.map((door) =>
				door.id === doorId
					? { ...door, maxDistance: newMaxDistance }
					: door
			)
		);
		if (selectedDoor && selectedDoor.id === doorId) {
			setSelectedDoor({ ...selectedDoor, maxDistance: newMaxDistance });
		}
	};

	const handleUpdateOpeningSpeed = async (
		doorId: string,
		newOpeningSpeed: number
	) => {
		await fetchNui("updateDoorOpeningSpeed", {
			doorId,
			openingSpeed: newOpeningSpeed,
		});

		setDoors(
			doors.map((door) =>
				door.id === doorId
					? { ...door, openingSpeed: newOpeningSpeed }
					: door
			)
		);
		if (selectedDoor && selectedDoor.id === doorId) {
			setSelectedDoor({
				...selectedDoor,
				openingSpeed: newOpeningSpeed,
			});
		}
	};

	const handleSaveChanges = async () => {
		if (!selectedDoor || !hasUnsavedChanges) return;

		if (
			editingMaxDistance !== null &&
			editingMaxDistance !== selectedDoor.maxDistance
		) {
			await handleUpdateMaxDistance(selectedDoor.id, editingMaxDistance);
		}

		if (
			editingOpeningSpeed !== null &&
			editingOpeningSpeed !== selectedDoor.openingSpeed
		) {
			await handleUpdateOpeningSpeed(
				selectedDoor.id,
				editingOpeningSpeed
			);
		}

		setHasUnsavedChanges(false);
	};

	const handleDiscardChanges = () => {
		if (!selectedDoor) return;

		setEditingMaxDistance(selectedDoor.maxDistance);
		setEditingOpeningSpeed(selectedDoor.openingSpeed);
		setHasUnsavedChanges(false);
	};

	const getDoorTypeIcon = (type: DoorType): JSX.Element => {
		switch (type) {
			case "single":
				return <BsFillDoorClosedFill />;
			case "double":
				return <MdDoorSliding />;
			case "garage":
				return <PiGarageFill />;
			default:
				return <BsFillDoorClosedFill />;
		}
	};

	const getDoorTypeColor = (type: DoorType): string => {
		switch (type) {
			case "single":
				return "#4caf50";
			case "double":
				return "#2196f3";
			case "garage":
				return "#ff9800";
			default:
				return "#4caf50";
		}
	};

	// if (!isOpen) {
	// 	return (
	// 		<div className='door-system-toggle'>
	// 			<button
	// 				onClick={() => setIsOpen(true)}
	// 				className='toggle-button'
	// 			>
	// 				🔒 Door System
	// 			</button>
	// 		</div>
	// 	);
	// }

	if (!isOpen) {
		return null;
	}

	return (
		<div className='door-system-menu'>
			<div className='menu-header'>
				<h2>🔒 Door Lock System</h2>
				<button onClick={closeMenu} className='close-button'>
					✕
				</button>
			</div>

			<div className='menu-content'>
				{/* Sidebar Navigation */}
				<div className='sidebar'>
					<div className='nav-section'>
						<div className='section-title'>Navigation</div>
						<div className='nav-items'>
							<div
								className={`nav-item ${
									currentView === "list" ? "active" : ""
								}`}
								onClick={() => handleNavigation("list")}
							>
								<span className='nav-icon'>
									<FaClipboardList />
								</span>
								Door List
							</div>
							<div
								className={`nav-item ${
									currentView === "add" ? "active" : ""
								}`}
								onClick={() => handleNavigation("add")}
							>
								<span className='nav-icon'>
									<FaPlus />
								</span>
								Add Door
							</div>
						</div>
					</div>

					{currentView === "list" && (
						<div className='search-filter-section'>
							<div className='search-box'>
								<span className='search-icon'>
									<FaSearch />
								</span>
								<input
									type='text'
									placeholder='Search by ID or name...'
									value={searchTerm}
									onChange={(e) =>
										setSearchTerm(e.target.value)
									}
								/>
							</div>

							<div className='filter-options'>
								<div className='filter-title'>
									Status Filter
								</div>
								<div className='filter-group'>
									<div
										className={`filter-tag ${
											filterType === "all" ? "active" : ""
										}`}
										onClick={() => setFilterType("all")}
									>
										All
									</div>
									<div
										className={`filter-tag ${
											filterType === "locked"
												? "active"
												: ""
										}`}
										onClick={() => setFilterType("locked")}
									>
										Locked
									</div>
									<div
										className={`filter-tag ${
											filterType === "unlocked"
												? "active"
												: ""
										}`}
										onClick={() =>
											setFilterType("unlocked")
										}
									>
										Unlocked
									</div>
								</div>

								<div
									className='filter-title'
									style={{ marginTop: "16px" }}
								>
									Type Filter
								</div>
								<div className='filter-group'>
									<div
										className={`filter-tag ${
											filterByType === "all"
												? "active"
												: ""
										}`}
										onClick={() => setFilterByType("all")}
									>
										All Types
									</div>
									<div
										className={`filter-tag ${
											filterByType === "single"
												? "active"
												: ""
										}`}
										onClick={() =>
											setFilterByType("single")
										}
									>
										Single
									</div>
									<div
										className={`filter-tag ${
											filterByType === "double"
												? "active"
												: ""
										}`}
										onClick={() =>
											setFilterByType("double")
										}
									>
										Double
									</div>
									<div
										className={`filter-tag ${
											filterByType === "garage"
												? "active"
												: ""
										}`}
										onClick={() =>
											setFilterByType("garage")
										}
									>
										Garage
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Main Content Area */}
				<div className='main-content'>
					{!selectedDoor && currentView === "list" && (
						<div className='door-list-view'>
							<div className='view-header'>
								<h3>Doors ({filteredDoors.length})</h3>
							</div>

							<div className='door-list'>
								{filteredDoors.map((door) => (
									<div
										key={door.id}
										className='door-item'
										onClick={() => handleDoorClick(door)}
									>
										<div
											className='door-icon'
											style={{
												color: getDoorTypeColor(
													door.type
												),
											}}
										>
											{getDoorTypeIcon(door.type)}
										</div>
										<div className='door-info'>
											<h4>{door.name}</h4>
											<div className='door-details-row'>
												<span className='door-type'>
													{door.type}
												</span>
												<span
													className={`door-status ${
														door.isLocked
															? "locked"
															: "unlocked"
													}`}
												>
													{door.isLocked
														? "Locked"
														: "Unlocked"}
												</span>
												<span className='door-position'>
													(
													{door.position.x.toFixed(1)}
													,{" "}
													{door.position.y.toFixed(1)}
													,{" "}
													{door.position.z.toFixed(1)}
													)
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{selectedDoor && (
						<div className='door-detail-view'>
							<div className='detail-header'>
								<button
									onClick={handleBackToList}
									className='back-button flex items-center gap-2 justify-center bg-[#ffffff]'
								>
									<span className='nav-icon'>
										<IoArrowBackCircle />
									</span>
									Back
								</button>
								<h3>
									Door Details
									{hasUnsavedChanges && (
										<span
											style={{
												color: "#ffc107",
												fontSize: "14px",
												marginLeft: "10px",
												fontWeight: "normal",
											}}
										>
											Unsaved Changes
										</span>
									)}
								</h3>
							</div>

							<div className='door-details'>
								<div className='detail-section'>
									<div className='door-title'>
										<span
											className='door-icon'
											style={{
												color: getDoorTypeColor(
													selectedDoor.type
												),
											}}
										>
											{getDoorTypeIcon(selectedDoor.type)}
										</span>
										<h2>{selectedDoor.name}</h2>
									</div>

									<div className='detail-grid'>
										<div className='detail-item'>
											<label>Door ID</label>
											<span>{selectedDoor.id}</span>
										</div>
										<div className='detail-item'>
											<label>Type</label>
											<span
												className='door-type-badge'
												style={{
													backgroundColor:
														getDoorTypeColor(
															selectedDoor.type
														),
												}}
											>
												{selectedDoor.type}
											</span>
										</div>
										<div className='detail-item'>
											<label>Status</label>
											<span
												className={`status-badge ${
													selectedDoor.isLocked
														? "locked"
														: "unlocked"
												}`}
											>
												{selectedDoor.isLocked
													? "🔒 Locked"
													: "🔓 Unlocked"}
											</span>
										</div>
										<div className='detail-item'>
											<label>Max Distance</label>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "8px",
												}}
											>
												<input
													type='number'
													step='0.1'
													min='0.5'
													max='10'
													value={
														editingMaxDistance ||
														selectedDoor.maxDistance
													}
													onChange={(e) => {
														const newValue =
															parseFloat(
																e.target.value
															) || 0.5;
														setEditingMaxDistance(
															newValue
														);
														setHasUnsavedChanges(
															true
														);
													}}
													style={{
														background:
															hasUnsavedChanges &&
															editingMaxDistance !==
																selectedDoor.maxDistance
																? "rgba(255, 193, 7, 0.2)"
																: "rgba(29, 29, 29, 0.5)",
														border:
															hasUnsavedChanges &&
															editingMaxDistance !==
																selectedDoor.maxDistance
																? "1px solid #ffc107"
																: "1px solid #4a4a4a",
														borderRadius: "4px",
														color: "#ffffff",
														padding: "4px 8px",
														fontSize: "14px",
														width: "80px",
													}}
												/>
												<span
													style={{
														fontSize: "14px",
														color: "#b0b0b0",
													}}
												>
													m
												</span>
											</div>
										</div>
										{selectedDoor.type === "garage" && (
											<div className='detail-item'>
												<label>Opening Speed</label>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: "8px",
													}}
												>
													<input
														type='number'
														step='0.1'
														min='0.1'
														max='10'
														value={
															editingOpeningSpeed ||
															selectedDoor.openingSpeed
														}
														onChange={(e) => {
															const newValue =
																parseFloat(
																	e.target
																		.value
																) || 0.1;
															setEditingOpeningSpeed(
																newValue
															);
															setHasUnsavedChanges(
																true
															);
														}}
														style={{
															background:
																hasUnsavedChanges &&
																editingOpeningSpeed !==
																	selectedDoor.openingSpeed
																	? "rgba(255, 193, 7, 0.2)"
																	: "rgba(29, 29, 29, 0.5)",
															border:
																hasUnsavedChanges &&
																editingOpeningSpeed !==
																	selectedDoor.openingSpeed
																	? "1px solid #ffc107"
																	: "1px solid #4a4a4a",
															borderRadius: "4px",
															color: "#ffffff",
															padding: "4px 8px",
															fontSize: "14px",
															width: "80px",
														}}
													/>
													<span
														style={{
															fontSize: "14px",
															color: "#b0b0b0",
														}}
													>
														Speed (10 is highest i
														guess but can be higher
														idk how it will look in
														game)
													</span>
												</div>
											</div>
										)}
									</div>

									<div className='position-section'>
										<label>Position</label>
										<div className='position-grid'>
											<div className='coord-item'>
												<label>X</label>
												<span>
													{selectedDoor.position.x.toFixed(
														3
													)}
												</span>
											</div>
											<div className='coord-item'>
												<label>Y</label>
												<span>
													{selectedDoor.position.y.toFixed(
														3
													)}
												</span>
											</div>
											<div className='coord-item'>
												<label>Z</label>
												<span>
													{selectedDoor.position.z.toFixed(
														3
													)}
												</span>
											</div>
										</div>
									</div>
								</div>

								<div className='action-buttons flex gap-3 justify-between'>
									{hasUnsavedChanges && (
										<>
											<button
												onClick={handleSaveChanges}
												className='action-button save-button'
												style={{
													backgroundColor: "#28a745",
													color: "white",
													border: "1px solid #28a745",
												}}
											>
												💾 Save Changes
											</button>
											<button
												onClick={handleDiscardChanges}
												className='action-button discard-button'
												style={{
													backgroundColor: "#6c757d",
													color: "white",
													border: "1px solid #6c757d",
												}}
											>
												↶ Discard Changes
											</button>
										</>
									)}
									<button
										onClick={() =>
											handleTeleportToDoor(selectedDoor)
										}
										className='action-button teleport-button'
									>
										<span className='nav-icon'>
											<GiTeleport />
										</span>
										Teleport to Door
									</button>
									<button
										onClick={() =>
											handleDeleteDoor(selectedDoor.id)
										}
										className='action-button delete-button'
									>
										<span className='nav-icon'>
											<FaTrash />
										</span>
										Delete Door
									</button>
								</div>
							</div>
						</div>
					)}

					{currentView === "add" && (
						<div className='add-door-view'>
							<div className='detail-header'>
								<button
									onClick={handleBackToList}
									className='back-button flex items-center gap-2 justify-center bg-[#ffffff]'
								>
									<span className='nav-icon'>
										<IoArrowBackCircle />
									</span>
									Back
								</button>
								<h3>Add New Door</h3>
							</div>

							<div className='add-door-form'>
								<div className='form-section'>
									<label>Door Type</label>
									<div className='door-type-selector'>
										{(
											[
												"single",
												"double",
												"garage",
											] as DoorType[]
										).map((type) => (
											<div
												key={type}
												className={`type-option ${
													newDoorType === type
														? "selected"
														: ""
												}`}
												onClick={() =>
													setNewDoorType(type)
												}
											>
												<div
													className='type-icon'
													style={{
														color: getDoorTypeColor(
															type
														),
													}}
												>
													{getDoorTypeIcon(type)}
												</div>
												<span className='type-label'>
													{type}
												</span>
											</div>
										))}
									</div>
								</div>

								<div className='form-section'>
									<label>Door Name/Label</label>
									<input
										type='text'
										className='form-input'
										placeholder='Enter door name (e.g., Main Entrance, Office Door)'
										value={newDoorName}
										onChange={(e) =>
											setNewDoorName(e.target.value)
										}
									/>
								</div>

								<div className='form-section'>
									<label>Opening Distance</label>
									<div className='distance-input-group'>
										<input
											type='number'
											step='0.1'
											min='0.5'
											max='50'
											className='form-input distance-input'
											value={newDoorMaxDistance}
											onChange={(e) =>
												setNewDoorMaxDistance(
													parseFloat(
														e.target.value
													) || 2.0
												)
											}
										/>
										<span className='distance-unit'>
											meters
										</span>
									</div>
									<p className='form-help'>
										Distance at which the door interaction
										prompt will appear (0.5m - 50m)
									</p>
								</div>

								{newDoorType === "garage" && (
									<div className='form-section'>
										<label>Opening Speed</label>
										<div className='distance-input-group'>
											<input
												type='number'
												step='0.1'
												min='0.1'
												max='10'
												className='form-input distance-input'
												value={newDoorOpeningSpeed}
												onChange={(e) =>
													setNewDoorOpeningSpeed(
														parseFloat(
															e.target.value
														) || 1.0
													)
												}
											/>
											<span className='distance-unit'>
												seconds
											</span>
										</div>
										<p className='form-help'>
											Time duration for door to fully
											open/close (0.1s - 10.0s)
										</p>
									</div>
								)}

								<div className='form-section'>
									<label>Selection Method</label>
									<div className='selection-options'>
										<button
											onClick={handleStartSelection}
											className={`selection-button ${
												isSelectingDoor
													? "selecting"
													: ""
											}`}
											disabled={isSelectingDoor}
										>
											{isSelectingDoor
												? "🎯 Selecting..."
												: "🎯 Select Door in Game"}
										</button>
									</div>
									<p className='selection-help'>
										Fill in the door details above, then
										click the button and select{" "}
										{newDoorType === "double"
											? "TWO door entities"
											: "a door entity"}{" "}
										in the game world to add{" "}
										{newDoorType === "double"
											? "them"
											: "it"}{" "}
										to the system.
										{newDoorType === "double" && (
											<>
												<br />
												<strong>
													Double Door:
												</strong>{" "}
												You will need to select two
												separate door entities that work
												together.
											</>
										)}
									</p>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			<Modal
				isOpen={deleteModalOpen}
				onClose={cancelDeleteDoor}
				title='Delete Door'
				showCloseButton={true}
			>
				<div className='delete-modal-content'>
					<div className='delete-modal-icon'>🗑️</div>
					<div className='delete-modal-text'>
						Are you sure you want to delete:
					</div>
					<div className='delete-modal-door-name'>
						{doorToDelete?.name}
					</div>
					<div className='delete-modal-warning'>
						This action cannot be undone.
					</div>
					<div className='modal-actions'>
						<button
							className='modal-button secondary'
							onClick={cancelDeleteDoor}
						>
							Cancel
						</button>
						<button
							className='modal-button primary'
							onClick={confirmDeleteDoor}
						>
							Delete Door
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
