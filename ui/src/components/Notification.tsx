import { useEffect, useState } from "react";
import "./Notification.scss";
import {
	FaCheckCircle,
	FaExclamationCircle,
	FaInfoCircle,
	FaTimesCircle,
} from "react-icons/fa";

export interface NotificationData {
	id: string;
	type: "success" | "error" | "warning" | "info";
	title: string;
	message?: string;
	duration?: number;
}

interface NotificationProps {
	notification: NotificationData;
	onDismiss: (id: string) => void;
}

export function Notification({ notification, onDismiss }: NotificationProps) {
	const [isVisible, setIsVisible] = useState(false);
	const [isLeaving, setIsLeaving] = useState(false);

	useEffect(() => {
		// Trigger animation after mount
		const timer = setTimeout(() => setIsVisible(true), 10);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (notification.duration !== 0) {
			const timer = setTimeout(() => {
				handleDismiss();
			}, notification.duration || 4000);
			return () => clearTimeout(timer);
		}
	}, [notification.duration]);

	const handleDismiss = () => {
		setIsLeaving(true);
		setTimeout(() => {
			onDismiss(notification.id);
		}, 300);
	};

	const getIcon = () => {
		switch (notification.type) {
			case "success":
				return <FaCheckCircle />;
			case "error":
				return <FaTimesCircle />;
			case "warning":
				return <FaExclamationCircle />;
			case "info":
				return <FaInfoCircle />;
			default:
				return <FaInfoCircle />;
		}
	};

	return (
		<div
			className={`notification notification--${notification.type} ${
				isVisible ? "notification--visible" : ""
			} ${isLeaving ? "notification--leaving" : ""}`}
		>
			<div className='notification__icon'>{getIcon()}</div>
			<div className='notification__content'>
				<div className='notification__title'>{notification.title}</div>
				{notification.message && (
					<div className='notification__message'>
						{notification.message}
					</div>
				)}
			</div>
		</div>
	);
}
