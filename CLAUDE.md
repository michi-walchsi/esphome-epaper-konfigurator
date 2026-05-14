# ESPHome e-Paper Konfigurator — Claude Referenz

## Projekt-Übersicht
React 19 + Vite 8 SPA, gebaut als HACS Custom Panel für Home Assistant.
Generiert ESPHome YAML-Konfigurationen für e-Paper Displays.

**GitHub:** https://github.com/michi-walchsi/esphome-epaper-konfigurator  
**Aktuell:** v1.5.0 (master)  
**Nutzer:** Michael Walchshofer (michi-walchsi)

---

## Wichtige Regeln

- **KEIN "Co-Authored-By: Claude"** in Commits — niemals
- Commits immer auf `master` pushen
- Version in `package.json` UND `manifest.json` gleichzeitig erhöhen
- Nach jeder Versionserhöhung: `npm run build` → `panel.js` wird neu generiert

---

## Architektur

```
src/
  App.jsx              # Root-Komponente, hass-Prop, Entities-State
  ha-panel.jsx         # Web Component für HA (Shadow DOM, set hass setter)
  main.jsx             # Nur für Dev-Server (npm run dev)
  utils/
    entities.js        # DOMAIN_META, DEMO_ENTITIES, formatState()
    yamlGenerator.js   # YAML-Generierung, escPrintf() für % in Strings
    displays.js        # DISPLAYS, BOARDS, SLOT_SIZES, layoutSlots()
  components/
    ConfiguratorTab.jsx
    DevicesTab.jsx
    EntityPicker.jsx   # ALLOWED_DOMAINS — 15 Domains seit v1.4.0
    FlashButton.jsx
    LivePreview.jsx
    SlotEditor.jsx
    YamlTab.jsx
    Icons.jsx

custom_components/esphome_epaper_konfigurator/
  __init__.py          # HA Panel-Registrierung, Cache-Busting via ?v=VERSION
  manifest.json        # version: "1.5.0"
  www/panel.js         # Build-Output (nie manuell bearbeiten)
```

---

## Kritische technische Details

### Shadow DOM (WICHTIGSTE REGEL)
HA rendert das Panel in einem Shadow DOM (Tiefe 3).  
**CSS-Variablen MÜSSEN auf `.app {}` definiert sein — NIEMALS auf `:root {}`.**  
`:root` ist im Shadow DOM unsichtbar. Alle `--bg-X`, `--border`, `--accent` etc. sind in `.app {}` in `App.css`.

### Cache-Busting
`__init__.py` liest die Version aus `manifest.json` und hängt sie an die module_url:  
`panel.js?v=1.5.0` → Browser lädt neue Version bei jedem Update automatisch.  
HA muss nach HACS-Update **neu gestartet** werden damit die neue URL registriert wird.

### hass-Prop Flow
```
HA → set hass(hass) [ha-panel.jsx] → root.render(<App hass={hass} />) → useEffect → setEntities(hass.states)
```
In HA-Panel-Modus: `entities` = alle echten HA-Entitäten aus `hass.states`.  
In Dev-Modus (`npm run dev`): `entities` = `DEMO_ENTITIES` aus entities.js.

### Entity Picker
Zeigt 15 Domains: `sensor`, `binary_sensor`, `input_number`, `number`, `input_boolean`, `input_text`, `weather`, `sun`, `switch`, `light`, `climate`, `cover`, `fan`, `media_player`, `person`, `device_tracker`

---

## Häufige Probleme & Lösungen

| Problem | Ursache | Lösung |
|---------|---------|--------|
| Panel zeigt alte Version nach Update | Browser-Cache des ES-Moduls | HA neustarten (neue `?v=X` URL wird registriert) |
| Inputs/Borders unsichtbar in HA | CSS `:root {}` nicht in Shadow DOM | Variablen auf `.app {}` definieren |
| `--divider-color` unsichtbar | HA setzt es auf rgba(255,255,255,0.12) | Hardcoded `rgba(255,255,255,0.18)` verwenden |
| Live-Vorschau zeigt "--" | Entity-ID existiert nicht in HA | Via Entity Picker echte Entity auswählen |
| "unavailable" im Preview | Sensor offline | v1.4.0+: zeigt "--" statt "unavailable °C" |
| ESPHome "Fehler" | URL falsch (Standard: :6052) | Korrekte ESPHome Add-on URL eintragen |

---

## Entwicklung

```bash
npm run dev      # Dev-Server auf :5173 (DEMO_ENTITIES, kein HA)
npm run build    # Baut panel.js nach custom_components/.../www/
npx playwright test --reporter=line   # 16 Tests
```

### Versions-Release Checkliste
1. Code-Änderungen implementieren
2. `APP_VERSION` in `src/App.jsx` erhöhen
3. `version` in `package.json` erhöhen  
4. `version` in `manifest.json` erhöhen
5. `npm run build`
6. `npx playwright test`
7. `git add ... && git commit && git push`
8. User: HACS Update → HA Neustart → Browser laden

---

## Bekannte HA-Umgebung des Users

- **HA-Entitäten:** ~308 total, ~225 in ALLOWED_DOMAINS
- **Echte Sensoren:** Zigbee-Geräte (IDs wie `0xb48931fffe21b74a_...`, `0xf044d3fffe10c0b4_...`)
  - Schlafzimmer Temperatur/Luft Sensor (`sensor.0xb48931fffe21b74a_temperati...`) — 21.1 °C
  - Wohnzimmer Temperatur/Luft Sensoren (`sensor.0xf044d3fffe10c0b4_...`)
- **ESPHome URL:** Standard `:6052` zeigt "Fehler" — korrekte URL muss User einstellen
- **localStorage:** Demo-Geräte wurden in v1.5.0 automatisch entfernt

---

## Playwright Tests (16 Tests, alle grün)

Tests in `tests/konfigurator.spec.js`.  
Wichtige Regeln für Tests:
- Battery-Picker ist VOR Slot-Pickern im DOM → `.slot-body .entity-pick-btn` verwenden
- Slots starten leer → in Tests erst `+ Slot` klicken, dann öffnen
- In Dev-Modus laufen Tests gegen `DEMO_ENTITIES` (nicht gegen echte HA)
