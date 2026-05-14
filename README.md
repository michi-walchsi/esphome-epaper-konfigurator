# ESPHome e-Paper Konfigurator

Visueller Konfigurator für ESPHome e-Paper Displays — für **jedes** e-Paper Display, nicht nur Waveshare 7.5".

## Features

- **7 Display-Modelle** + eigene Auflösung (Waveshare 7.5" V2, 4.2", 2.9", 1.54" · LILYGO T5 4.7" · Good Display 5.83")
- **Flexibles Slot-System** — 1–16 Slots, Drag & Drop, Größen Small/Medium/Large/Wide
- **Grid-Konfiguration** — 2, 3, 4 oder 5 Spalten frei wählbar
- **Entity-Picker Modal** — alle HA-Entitäten live durchsuchbar, nach Domain gruppiert
- **Home Assistant Verbindung** — Demo-Modus oder direkte HA-Verbindung (Long-Lived Token)
- **Live-Vorschau** — zeigt das Display im richtigen Seitenverhältnis mit echten Werten
- **Batterie-Status** — konfigurierbare Entity, Farbindikator, in Vorschau und YAML integriert
- **YAML-Export** — fertiges ESPHome YAML mit Kopieren & Download
- **HACS Lovelace Card** — einbettbar direkt in Home Assistant

## Schnellstart

```bash
cd esphome-konfigurator
npm install
npm start
```

App öffnet sich unter `http://localhost:5173`

## HACS Lovelace Card Installation

### Schritt 1 — Card-Datei kopieren

```bash
npm run build
cp dist/esphome-epaper-card.js /config/www/
```

### Schritt 2 — Ressource in HA registrieren

**Einstellungen → Dashboards → Ressourcen → + Hinzufügen**

| Feld | Wert |
|------|------|
| URL | `/local/esphome-epaper-card.js` |
| Typ | JavaScript-Modul |

### Schritt 3 — Lovelace Dashboard konfigurieren

```yaml
type: custom:esphome-epaper-card
url: http://localhost:5173   # URL der laufenden React-App
height: 750
title: ESPHome Konfigurator
```

Wenn die App im selben Netzwerk wie HA läuft, erkennt die Card automatisch alle HA-Entitäten — kein Token nötig.

## Home Assistant Verbindung

### Demo-Modus
Beispiel-Entitäten aus verschiedenen Domains zum Testen.

### HA-Verbindung (direkt)
Tab **Konfiguration → Home Assistant Verbindung → Home Assistant** wählen, URL + Long-Lived Token eingeben, **Verbinden** klicken.

### HACS-Modus (automatisch)
Als HACS-Card eingebettet: alle HA-Entitäten werden automatisch übertragen — kein Token nötig.

## Batterie-Status

Entity ID eintragen (z.B. `sensor.epaper_battery`) — wird in der Live-Vorschau und im YAML eingebaut.
0–20 % → rot · 20–50 % → gelb · 50–100 % → grün

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

## Lizenz

MIT
