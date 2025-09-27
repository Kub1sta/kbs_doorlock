import { Notification, NotificationData } from "./Notification";
import { useNotifications } from "../contexts/NotificationContext";
import "./Notification.scss";

interface NotificationContainerProps {
	notifications: NotificationData[];
	onDismiss: (id: string) => void;
}

function NotificationContainerInner({
	notifications,
	onDismiss,
}: NotificationContainerProps) {
	if (notifications.length === 0) return null;

	return (
		<div className='notifications-container'>
			{notifications.map((notification) => (
				<Notification
					key={notification.id}
					notification={notification}
					onDismiss={onDismiss}
				/>
			))}
		</div>
	);
}

export function NotificationContainer() {
	const { notifications, removeNotification } = useNotifications();

	return (
		<NotificationContainerInner
			notifications={notifications}
			onDismiss={removeNotification}
		/>
	);
}
