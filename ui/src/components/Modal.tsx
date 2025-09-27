import React from "react";
import "./Modal.scss";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	showCloseButton?: boolean;
}

export function Modal({
	isOpen,
	onClose,
	title,
	children,
	showCloseButton = true,
}: ModalProps) {
	if (!isOpen) return null;

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div className='modal-overlay' onClick={handleOverlayClick}>
			<div className='modal-content'>
				<div className='modal-header'>
					<h3 className='modal-title'>{title}</h3>
					{showCloseButton && (
						<button
							className='modal-close-button'
							onClick={onClose}
							aria-label='Close modal'
						>
							✕
						</button>
					)}
				</div>
				<div className='modal-body'>{children}</div>
			</div>
		</div>
	);
}
