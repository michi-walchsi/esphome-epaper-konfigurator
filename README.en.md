# E-Paper-Maker

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

HACS → Integrations → **E-Paper-Maker** → Install

### 3. Restart HA

### 4. Add Integration

**Settings → Devices & Services → Add Integration → E-Paper-Maker**

### 5. Done ✅

E-Paper-Maker automatically appears in the sidebar with the chip icon.

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

## Development

```bash
npm install
npm run dev    # Dev server at http://localhost:5173
npm run build  # Build panel → custom_components/.../www/panel.js
```

## License

MIT — © 2025 michi-walchsi
