import { createContext, useCallback, useContext, useState } from "react";
import { NotificationData } from "../components/Notification";

interface NotificationContextType {
	notifications: NotificationData[];
	addNotification: (notification: Omit<NotificationData, "id">) => void;
	removeNotification: (id: string) => void;
	clearAllNotifications: () => void;
	// Convenience methods
	showSuccess: (title: string, message?: string, duration?: number) => void;
	showError: (title: string, message?: string, duration?: number) => void;
	showWarning: (title: string, message?: string, duration?: number) => void;
	showInfo: (title: string, message?: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
	undefined
);

interface NotificationProviderProps {
	children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
	const [notifications, setNotifications] = useState<NotificationData[]>([]);

	const addNotification = useCallback(
		(notification: Omit<NotificationData, "id">) => {
			const id =
				Date.now().toString() + Math.random().toString(36).substr(2, 9);
			const newNotification: NotificationData = {
				id,
				duration: 4000,
				...notification,
			};

			setNotifications((prev) => [...prev, newNotification]);
		},
		[]
	);

	const removeNotification = useCallback((id: string) => {
		setNotifications((prev) =>
			prev.filter((notification) => notification.id !== id)
		);
	}, []);

	const clearAllNotifications = useCallback(() => {
		setNotifications([]);
	}, []);

	const showSuccess = useCallback(
		(title: string, message?: string, duration?: number) => {
			addNotification({
				type: "success",
				title,
				message,
				duration,
			});
		},
		[addNotification]
	);

	const showError = useCallback(
		(title: string, message?: string, duration?: number) => {
			addNotification({
				type: "error",
				title,
				message,
				duration,
			});
		},
		[addNotification]
	);

	const showWarning = useCallback(
		(title: string, message?: string, duration?: number) => {
			addNotification({
				type: "warning",
				title,
				message,
				duration,
			});
		},
		[addNotification]
	);

	const showInfo = useCallback(
		(title: string, message?: string, duration?: number) => {
			addNotification({
				type: "info",
				title,
				message,
				duration,
			});
		},
		[addNotification]
	);

	const value: NotificationContextType = {
		notifications,
		addNotification,
		removeNotification,
		clearAllNotifications,
		showSuccess,
		showError,
		showWarning,
		showInfo,
	};

	return (
		<NotificationContext.Provider value={value}>
			{children}
		</NotificationContext.Provider>
	);
}

export function useNotifications() {
	const context = useContext(NotificationContext);
	if (!context) {
		throw new Error(
			"useNotifications must be used within a NotificationProvider"
		);
	}
	return context;
}
