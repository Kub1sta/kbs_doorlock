import { BiSolidLockAlt, BiSolidLockOpenAlt } from "react-icons/bi";
import styles from "./ui.module.scss";

interface UIProps {
	isOpened?: boolean;
}

export function UI({ isOpened }: UIProps) {
	return (
		<div className={styles.ui}>
			<button
				type='button'
				className={`${styles.button} ${isOpened ? styles.opened : ""}`}
			>
				{isOpened ? <BiSolidLockOpenAlt /> : <BiSolidLockAlt />}
			</button>
		</div>
	);
}
