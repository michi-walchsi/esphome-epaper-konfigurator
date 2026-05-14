# ESPHome e-Paper Configurator

Visual configurator for ESPHome e-Paper displays — directly in the Home Assistant sidebar.

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

## Features

- **Devices Tab** — Overview of all configured e-Paper devices
- **Configurator Tab** — Visual editor with live preview at correct aspect ratio
- **YAML Tab** — Ready-to-use ESPHome YAML with syntax highlighting, copy & download
- **7 Display Models** — Waveshare 7.5" V2, 4.2", 2.9", 1.54" · LILYGO T5 4.7" · Good Display 5.83" · Custom Resolution
- **4 ESP Boards** — ESP32dev, ESP32-S3, ESP32-C3, ESP8266
- **Entity Picker** — All HA entities live-searchable, grouped by domain
- **Slot System** — 1–16 slots, drag & drop, sizes Small/Medium/Large/Wide
- **Battery Status** — Color indicator (red/yellow/green), integrated in preview & YAML
- **Flash Button** — Send YAML directly to ESPHome add-on & compile
- **Fully Local** — no external server, no internet required after installation

## HACS Installation

### 1. Add Custom Repository

In HACS → **Custom Repositories** → enter URL:

```
https://github.com/michi-walchsi/esphome-epaper-konfigurator
```

Category: **Integration**

### 2. Install Integration

HACS → Integrations → **ESPHome ePaper Konfigurator** → Install

### 3. Restart HA

### 4. Add Integration

**Settings → Devices & Services → Add Integration → ESPHome ePaper Konfigurator**

### 5. Done ✅

The configurator automatically appears in the sidebar with the 🖥 icon.

---

## Manual Installation

```bash
git clone https://github.com/michi-walchsi/esphome-epaper-konfigurator
cd esphome-epaper-konfigurator
npm install
npm run build
cp -r custom_components/esphome_epaper_konfigurator /config/custom_components/
```

Then add the integration via UI (step 4 above).

---

## Supported Displays

| Display | Resolution | ESPHome Model |
|---------|------------|---------------|
| Waveshare 7.5" V2 | 800×480 | `7.50inv2` |
| Waveshare 4.2" | 400×300 | `4.20` |
| Waveshare 2.9" | 296×128 | `2.90` |
| Waveshare 1.54" | 200×200 | `1.54` |
| LILYGO T5 4.7" | 960×540 | `lilygo_t5_47` |
| Good Display 5.83" | 648×480 | `5.83` |
| Custom Resolution | any | configurable |

## License

MIT — © 2025 michi-walchsi

## Features

- **7 display models** + custom resolution (Waveshare 7.5" V2, 4.2", 2.9", 1.54" · LILYGO T5 4.7" · Good Display 5.83")
- **Flexible slot system** — 1–16 slots, drag & drop reordering, sizes Small/Medium/Large/Wide
- **Grid configuration** — 2, 3, 4 or 5 columns
- **Entity picker modal** — search all HA entities live, grouped by domain
- **Home Assistant connection** — demo mode or direct HA connection (Long-Lived Token)
- **Live preview** — shows the display at the correct aspect ratio with real values
- **Battery status** — configurable entity, color indicator, integrated in preview and YAML
- **YAML export** — complete ESPHome YAML with copy & download
- **HACS Lovelace Card** — embeddable directly in Home Assistant

## Quick Start

```bash
cd esphome-konfigurator
npm install
npm start
```

App opens at `http://localhost:5173`

## HACS Lovelace Card Installation

### Step 1 — Copy the card file

```bash
npm run build
cp dist/esphome-epaper-card.js /config/www/
```

### Step 2 — Register resource in HA

**Settings → Dashboards → Resources → + Add**

| Field | Value |
|-------|-------|
| URL | `/local/esphome-epaper-card.js` |
| Type | JavaScript Module |

### Step 3 — Configure Lovelace dashboard

```yaml
type: custom:esphome-epaper-card
url: http://localhost:5173   # URL where the React app is running
height: 750
title: ESPHome Configurator
```

When the app runs in the same network as HA, the card automatically receives all HA entities — no token needed.

## Home Assistant Connection

### Demo Mode
Example entities from various domains for testing.

### Direct HA Connection
Go to **Configuration → Home Assistant Connection → Home Assistant**, enter URL + Long-Lived Access Token, click **Connect**.

### HACS Mode (automatic)
When embedded as a HACS card, all HA entities are automatically passed to the app — no token required.

## Battery Status

Enter an entity ID (e.g. `sensor.epaper_battery`) — shown in the live preview and included in the generated YAML.
0–20% → red · 20–50% → yellow · 50–100% → green

## Supported Displays

| Display | Resolution | ESPHome Model |
|---------|------------|---------------|
| Waveshare 7.5" V2 | 800×480 | `7.50inv2` |
| Waveshare 4.2" | 400×300 | `4.20` |
| Waveshare 2.9" | 296×128 | `2.90` |
| Waveshare 1.54" | 200×200 | `1.54` |
| LILYGO T5 4.7" | 960×540 | `lilygo_t5_47` |
| Good Display 5.83" | 648×480 | `5.83` |
| Custom resolution | any | configurable |

## License

MIT
