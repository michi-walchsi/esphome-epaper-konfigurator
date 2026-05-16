# E-Paper-Maker

Visueller Konfigurator für ESPHome e-Paper Displays — direkt in der Home Assistant Seitenleiste.

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

## Features

- **Geräte-Tab** — Übersicht aller konfigurierten e-Paper Geräte
- **Konfigurator-Tab** — Visueller Editor mit Live-Vorschau im richtigen Seitenverhältnis
- **YAML-Tab** — Fertiges ESPHome YAML mit Syntax-Highlighting, Kopieren & Download
- **7 Display-Modelle** — Waveshare 7.5" V2, 4.2", 2.9", 1.54" · LILYGO T5 4.7" · Good Display 5.83" · Eigene Auflösung
- **4 ESP Boards** — ESP32dev, ESP32-S3, ESP32-C3, ESP8266
- **Entity-Picker** — Alle HA-Entitäten live durchsuchbar, nach Domain gruppiert
- **Slot-System** — 1–16 Slots, Drag & Drop, Größen Small/Medium/Large/Wide
- **Batterie-Status** — Farbindikator (rot/gelb/grün), in Vorschau & YAML integriert
- **Flash-Button** — YAML direkt an ESPHome Add-on schicken & kompilieren
- **Lokaler Betrieb** — kein externer Server, kein Internet nötig

## HACS Installation

### 1. Custom Repository hinzufügen

In HACS → **Custom Repositories** → URL eingeben:

```
https://github.com/michi-walchsi/esphome-epaper-konfigurator
```

Kategorie: **Integration**

### 2. Integration installieren

HACS → Integrationen → **E-Paper-Maker** → Installieren

### 3. HA neu starten

### 4. Integration hinzufügen

**Einstellungen → Geräte & Dienste → Integration hinzufügen → E-Paper-Maker**

### 5. Fertig ✅

Der E-Paper-Maker erscheint automatisch in der Seitenleiste mit dem Chip-Symbol.

---

## Manuelle Installation

```bash
# Repository klonen
git clone https://github.com/michi-walchsi/esphome-epaper-konfigurator

# Node.js Abhängigkeiten installieren
cd esphome-epaper-konfigurator
npm install

# Panel bauen
npm run build

# custom_components nach HA config kopieren
cp -r custom_components/esphome_epaper_konfigurator /config/custom_components/
```

Dann Integration über UI hinzufügen (Schritt 4 oben).

---

## Verwendung

### Geräte-Tab
- Übersicht aller gespeicherten e-Paper Konfigurationen
- ESPHome Add-on URL konfigurieren (Standard: `http://homeassistant.local:6052`)
- **Neues Gerät** → wechselt in den Konfigurator-Tab

### Konfigurator-Tab

**Links:**
- Display-Modell & ESP Board wählen
- SPI Pin-Belegung konfigurieren
- Timing: Deep Sleep & Update-Intervall
- Batterie Entity aus HA wählen (optional)
- WiFi-Daten eingeben (optional, sonst `!secret`)
- **Konfiguration speichern** → wird in der Geräteliste gespeichert
- **Auf Gerät installieren** → YAML an ESPHome schicken & flashen

**Rechts oben:** Live e-Paper Vorschau mit echten HA-Werten

**Rechts unten:** Slot Editor
- Drag & Drop zum Umsortieren
- Entity-Picker: Klick auf ⊞ → Modal mit allen HA-Entitäten
- Größen: Small (1×1), Medium (2×1), Large (2×2), Wide (3×1)

### YAML-Tab
- Fertiges ESPHome YAML in Echtzeit generiert
- Syntax-Highlighting
- Kopieren & Download als `.yaml`

---

## Unterstützte Displays

| Display | Auflösung | ESPHome Model |
|---------|-----------|---------------|
| Waveshare 7.5" V2 | 800×480 | `7.50inv2` |
| Waveshare 4.2" | 400×300 | `4.20` |
| Waveshare 2.9" | 296×128 | `2.90` |
| Waveshare 1.54" | 200×200 | `1.54` |
| LILYGO T5 4.7" | 960×540 | `lilygo_t5_47` |
| Good Display 5.83" | 648×480 | `5.83` |
| Eigene Auflösung | beliebig | konfigurierbar |

---

## Entwicklung

```bash
npm install
npm run dev    # Dev-Server auf http://localhost:5173
npm run build  # Panel bauen → custom_components/.../www/panel.js
```

## Lizenz

MIT — © 2025 michi-walchsi
