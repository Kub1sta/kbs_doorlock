# KBS Door Lock System

A comprehensive and advanced door lock system for FiveM servers with modern UI, individual door configurations, and intelligent distance-based loading.

-   Huge thanks to the [Gallejeans](https://github.com/gallejens) for the basic implementation of the TreeJS
-   Default resource [Boilerplate for fivem](https://github.com/gallejens/fivem-threejs-wrapper)

## 🎬 Showcase

-   **Screenshots**: [Showcase images](https://imgur.com/a/RbFRxiL)

---

## ✨ Features

### 🚪 Door Management

-   **Multiple Door Types**: Support for single doors, double doors, and garage doors
-   **Individual Configuration**: Each door has its own max distance and opening speed settings
-   **Real-time Management**: Add, remove, and configure doors in-game
-   **Persistent Storage**: All door configurations saved to database

### 🎮 User Experience

-   **Modern React UI**: Clean, responsive interface with dark theme
-   **In-game Door Selection**: Point and click to select doors directly in the game world
-   **Distance-based Interaction**: Doors only appear when you're close enough
-   **Visual Feedback**: Door outlines and markers during selection process

### ⚡ Performance & Optimization

-   **Smart Loading System**: Doors only load when player is within range (50m)
-   **Lazy Loading**: Distant doors are tracked but not loaded until needed

### 🔧 Advanced Configuration

-   **Per-door Max Distance**: Individual interaction distances (0.5m - 50m)
-   **Opening Speed Control**: Garage doors have configurable opening speeds
-   **Double Door Centering**: UI automatically centers between double door pairs
-   **Automatic State Sync**: Door states synchronized across all players

---

## 📋 Requirements

-   **oxmysql** [OxMySql resource](https://github.com/overextended/oxmysql)

---

## 🚀 Installation

### 1. Download & Extract

```bash
# Clone the repository or download the ZIP
git clone https://github.com/Kub1sta/kbs_doorlock.git
# Move to your resources folder
```

### 2. Database Setup

```sql
Just ensure the script sql will be automaticly imported
```

### 3. Build both scripts and UI

```bash
cd kbs_doorlock
npm run fullinstall
```

### 4. Server Configuration

```lua
-- Add to server.cfg
ensure kbs_doorlock
```

---

## 🎯 Usage

### Opening the Door Management System

```
/doorSystem
```

### Adding New Doors

1. Open the door management system (`/doorSystem`)
2. Click "Add Door" in the navigation
3. Configure door settings:
    - **Door Type**: Single, Double, or Garage
    - **Name/Label**: Custom door name
    - **Max Distance**: Interaction range (0.5m - 50m)
    - **Opening Speed**: For garage doors only (Using base fivem opening speed ratio so it is x normal opening rate)
4. Click "Select Door in Game"
5. Aim at the door entity and press ENTER to select
6. For double doors, select both door entities

### Managing Existing Doors

-   **View All Doors**: Browse with search and filter options
-   **Edit Properties**: Modify distance and speed settings
-   **Teleport to Door**: Quick navigation to door locations
-   **Delete Doors**: Remove doors from the system

### Player Interaction

-   **Approach Door**: Get within the configured max distance
-   **Press E**: Toggle door lock/unlock state
-   **Visual Indicator**: UI appears when near doors

---

## ⚙️ Configuration

### Door Types

| Type       | Description          | Configurable Speed        | Max Distance    |
| ---------- | -------------------- | ------------------------- | --------------- |
| **Single** | Standard single door | ❌                        | ✅ (0.5m - 50m) |
| **Double** | Paired door system   | ❌                        | ✅ (0.5m - 50m) |
| **Garage** | Large overhead doors | ✅ (x times normal speed) | ✅ (0.5m - 50m) |

### Performance Settings

```js
// Distance for loading door entities (Can be changed in config)
const MAX_LOAD_DISTANCE = 50.0; // meters

// Check interval for unloaded doors (Can be changed in config)
const CHECK_INTERVAL = 2000; // milliseconds
```

---

## 🗃️ Database Schema

```sql
CREATE TABLE `kbs_doors` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`entityId` VARCHAR(255) NOT NULL COLLATE 'utf8mb3_uca1400_ai_ci',
	`label` VARCHAR(255) NOT NULL DEFAULT 'Unnamed Door' COLLATE 'utf8mb3_uca1400_ai_ci',
	`door_type` ENUM('single','double','garage') NULL DEFAULT 'single' COLLATE 'utf8mb3_uca1400_ai_ci',
	`entity_id_2` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb3_uca1400_ai_ci',
	`x` FLOAT NOT NULL,
	`y` FLOAT NOT NULL,
	`z` FLOAT NOT NULL,
	`heading` FLOAT NOT NULL,
	`x2` FLOAT NULL DEFAULT NULL,
	`y2` FLOAT NULL DEFAULT NULL,
	`z2` FLOAT NULL DEFAULT NULL,
	`heading2` FLOAT NULL DEFAULT NULL,
	`is_locked` TINYINT(1) NULL DEFAULT '0',
	`max_distance` FLOAT NULL DEFAULT '2',
	`opening_speed` FLOAT NULL DEFAULT '1',
	`created_at` TIMESTAMP NULL DEFAULT current_timestamp(),
	PRIMARY KEY (`id`) USING BTREE
);

```

---

## 🛠️ Development

### Tech Stack

-   **Frontend**: React 18, TypeScript, SCSS
-   **Backend**: Node.js, TypeScript
-   **Database**: MySQL
-   **Build Tools**: Vite, ESBuild

---

## 📝 Changelog

### Version 0.8.0

-   Initial release with basic door lock functionality
-   Support for single, double, and garage doors
-   Modern React UI with dark theme
-   Individual door configuration system
-   Distance-based loading optimization

---

## 🐛 Known Issues

-   Basicly when u use double doors the UI will show on one of the doors
-   High resmon while idle mode
-   Doors when locked are sometimes stays open (as if the door in the game is open, but when aligned correctly, they will lock)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

-   **GitHub Issues**: [Create an Issue](https://github.com/Kub1sta/kbs_doorlock/issues)
-   **Discord**: kubista\_ (ID: 459699240395079680)

---

## 📊 Statistics

-   **Performance Impact**: Idle (~0.02ms) Maximal (~0.1 - ~0.13) bcs of the Tree JS update position
-   **Database Queries**: Optimized with prepared statements
-   **Supported Doors**: Unlimited per server
