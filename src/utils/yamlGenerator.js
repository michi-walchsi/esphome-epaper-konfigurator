import { layoutSlots, getMaxRows } from './displays';

const INTERVAL_FACTOR = { s: 1, min: 60, h: 3600 };

function getIntervalSecs(config) {
  if (config.updateIntervalValue != null) {
    const factor = INTERVAL_FACTOR[config.updateIntervalUnit] ?? 1;
    return Math.max(1, Math.round(config.updateIntervalValue * factor));
  }
  return config.updateInterval ?? 60;
}

// Escape for YAML double-quoted scalar: backslash and double-quote only.
function yamlEsc(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Escape for C++ printf format string inside a YAML double-quoted scalar.
function yamlEscPrintf(s) {
  return yamlEsc(s).replace(/%/g, '%%');
}

function safePin(pin) {
  return /^[A-Za-z0-9_:]{1,20}$/.test(pin) ? pin : 'GPIO0';
}

function safeEntityId(id) {
  return /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(id) ? id : '';
}

function safeFloat(val) {
  const f = parseFloat(val);
  return (!isNaN(f) && f > 0 && f <= 10) ? f.toFixed(1) : '2.0';
}

function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

// Glyph set — contains " and \ which MUST be escaped before use in YAML double-quoted strings.
const GLYPHS = yamlEsc(
  ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~öäüÖÄÜß°%`
);

export function generateYaml(config, slots) {
  const {
    display, board, title, deviceName, displayName,
    spiPins, deepSleep, gridCols,
    batteryEntityId, wifiSsid, wifiPassword,
    batteryPresent, batteryPin, voltageMultiplier,
  } = config;

  const intervalSecs = getIntervalSecs(config);
  const isESP32      = board.platform === 'esp32';
  const isLilygo     = display.platform === 'lilygo_t5_47';
  const layout       = layoutSlots(slots, gridCols);
  const maxRows      = getMaxRows(layout);
  const hasLocalBatt = Boolean(batteryPresent && batteryPin);
  const hasHaBatt    = !batteryPresent && Boolean(batteryEntityId);
  const hasBatt      = hasLocalBatt || hasHaBatt;
  const hasDeepSleep = (deepSleep ?? 0) > 0;

  // ── Sensor section ──────────────────────────────────────────────────────────
  const sensorSlots = slots.filter(s => safeEntityId(s.entityId));
  const sensorItems = sensorSlots.map((slot, i) => [
    `  - platform: homeassistant`,
    `    id: sensor_${i + 1}`,
    `    entity_id: ${safeEntityId(slot.entityId)}`,
    `    on_value:`,
    `      then:`,
    `        - component.update: epaper_display`,
  ].join('\n'));

  if (hasLocalBatt) {
    const mult = safeFloat(voltageMultiplier);
    sensorItems.push([
      `  - platform: adc`,
      `    pin: ${safePin(batteryPin)}`,
      `    name: "Batterie"`,
      `    id: battery_level`,
      `    attenuation: 11db`,
      `    unit_of_measurement: "%"`,
      `    device_class: battery`,
      `    accuracy_decimals: 0`,
      `    update_interval: ${intervalSecs}s`,
      `    filters:`,
      `      - multiply: ${mult}`,
      `      - lambda: |-`,
      `          float pct = (x - 3.2f) / (4.2f - 3.2f) * 100.0f;`,
      `          if (pct > 100.0f) pct = 100.0f;`,
      `          if (pct < 0.0f) pct = 0.0f;`,
      `          return pct;`,
      `    on_value:`,
      `      then:`,
      `        - component.update: epaper_display`,
    ].join('\n'));
  } else if (hasHaBatt) {
    sensorItems.push([
      `  - platform: homeassistant`,
      `    id: battery_level`,
      `    entity_id: ${safeEntityId(batteryEntityId)}`,
      `    on_value:`,
      `      then:`,
      `        - component.update: epaper_display`,
    ].join('\n'));
  }

  // ── Board, SPI, font sizes ──────────────────────────────────────────────────
  const boardBlock = isESP32
    ? `esp32:\n  board: ${board.id}\n  framework:\n    type: arduino`
    : `esp8266:\n  board: ${board.id}`;

  const spiBlock = isLilygo
    ? null
    : `spi:\n  clk_pin: ${safePin(spiPins.clk)}\n  mosi_pin: ${safePin(spiPins.mosi)}`;

  const fs = {
    title:  clamp(Math.floor(display.height * 0.065), 16, 36),
    header: clamp(Math.floor(display.height * 0.055), 14, 32),
    value:  clamp(Math.floor(display.height * 0.095), 22, 60),
    small:  clamp(Math.floor(display.height * 0.032), 10, 20),
  };

  // ── WiFi ────────────────────────────────────────────────────────────────────
  const wifiCredentials = wifiSsid
    ? `  ssid: "${yamlEsc(wifiSsid)}"\n  password: "${yamlEsc(wifiPassword || '')}"`
    : `  ssid: !secret wifi_ssid\n  password: !secret wifi_password`;

  // ── Lambda (C++ code for display rendering) ─────────────────────────────────
  const lambdaLines = buildLambda(config, layout, maxRows, hasBatt).split('\n');

  // ── Display block — id, rotation, lambda INSIDE the list item (4-space indent) ──
  const displayItemLines = isLilygo
    ? [
        `  - platform: lilygo_t5_47`,
        `    full_update_every: 1`,
        `    update_interval: ${intervalSecs}s`,
      ]
    : [
        `  - platform: waveshare_epaper`,
        `    model: ${display.model}`,
        `    cs_pin: ${safePin(spiPins.cs)}`,
        `    dc_pin: ${safePin(spiPins.dc)}`,
        `    reset_pin: ${safePin(spiPins.rst)}`,
        `    busy_pin: ${safePin(spiPins.busy)}`,
        `    update_interval: ${intervalSecs}s`,
      ];

  // Append id, rotation, and lambda as part of the same list item
  displayItemLines.push(
    `    id: epaper_display`,
    `    rotation: "0°"`,
    `    lambda: |-`,
    ...lambdaLines,
  );

  // ── Assemble top-level sections ─────────────────────────────────────────────
  const sections = [];

  sections.push([
    `# ESPHome Konfiguration`,
    `# Generiert von ESPHome e-Paper Konfigurator`,
    `# ${new Date().toLocaleDateString('de-AT')} ${new Date().toLocaleTimeString('de-AT')}`,
  ].join('\n'));

  sections.push([
    `esphome:`,
    `  name: ${deviceName}`,
    `  friendly_name: "${yamlEsc(displayName)}"`,
    `  on_boot:`,
    `    - priority: 200`,
    `      then:`,
    `        - component.update: epaper_display`,
  ].join('\n'));

  sections.push(boardBlock);

  sections.push(`logger:`);

  sections.push([
    `api:`,
    `  encryption:`,
    `    key: !secret api_key`,
  ].join('\n'));

  sections.push([
    `ota:`,
    `  - platform: esphome`,
    `    password: !secret ota_password`,
  ].join('\n'));

  if (hasDeepSleep) {
    sections.push([
      `safe_mode:`,
      `  reboot_timeout: 10min`,
      `  num_attempts: 5`,
    ].join('\n'));
  }

  sections.push([
    `wifi:`,
    wifiCredentials,
    `  ap:`,
    `    ssid: "${yamlEsc(displayName)} Fallback"`,
    `    password: !secret ap_password`,
  ].join('\n'));

  sections.push(`captive_portal:`);

  sections.push([
    `time:`,
    `  - platform: homeassistant`,
    `    id: ha_time`,
    `    timezone: Europe/Vienna`,
  ].join('\n'));

  sections.push([
    `font:`,
    `  - file: "gfonts://Roboto@700"`,
    `    id: font_title`,
    `    size: ${fs.title}`,
    `    glyphs: "${GLYPHS}"`,
    `  - file: "gfonts://Roboto"`,
    `    id: font_header`,
    `    size: ${fs.header}`,
    `    glyphs: "${GLYPHS}"`,
    `  - file: "gfonts://Roboto@700"`,
    `    id: font_value`,
    `    size: ${fs.value}`,
    `    glyphs: "${GLYPHS}"`,
    `  - file: "gfonts://Roboto"`,
    `    id: font_small`,
    `    size: ${fs.small}`,
    `    glyphs: "${GLYPHS}"`,
  ].join('\n'));

  if (spiBlock) sections.push(spiBlock);

  if (sensorItems.length > 0) {
    sections.push(`sensor:\n${sensorItems.join('\n\n')}`);
  }

  sections.push(`display:\n${displayItemLines.join('\n')}`);

  if (hasDeepSleep) {
    sections.push([
      `deep_sleep:`,
      `  id: deep_sleep_1`,
      `  run_duration: 30s`,
      `  sleep_duration: ${deepSleep}min`,
      `  wakeup_pin:`,
      `    number: GPIO0`,
      `    inverted: true`,
    ].join('\n'));
  }

  return sections.join('\n\n') + '\n';
}

function buildLambda(config, layout, maxRows, hasBatt) {
  const { display, title, gridCols } = config;
  const w = display.width;
  const h = display.height;

  const headerH = clamp(Math.round(h * 0.13), 30, 80);
  const cellW   = Math.floor(w / gridCols);
  const cellH   = Math.floor((h - headerH) / Math.max(maxRows, 1));
  const pad     = clamp(Math.round(Math.min(cellW, cellH) * 0.05), 4, 14);
  const mid     = Math.round(headerH / 2);
  const battRes = hasBatt ? Math.floor(w * 0.12) : 0;
  const timeX   = w - pad - battRes;

  const lines = [];
  lines.push(`      it.fill(COLOR_OFF);`);
  lines.push(`      `);
  lines.push(`      // ── Header ──────────────────────────────────`);
  lines.push(`      it.filled_rectangle(0, 0, ${w}, ${headerH});`);
  lines.push(`      it.printf(${pad + 4}, ${mid}, id(font_title), COLOR_OFF, TextAlign::CENTER_LEFT, "${yamlEscPrintf(title)}");`);
  lines.push(`      it.strftime(${timeX}, ${mid}, id(font_small), COLOR_OFF, TextAlign::CENTER_RIGHT, "%H:%M  %d.%m.%Y", id(ha_time).now());`);

  if (hasBatt) {
    lines.push(`      `);
    lines.push(`      // ── Batterie ──────────────────────────────`);
    lines.push(`      if (!std::isnan(id(battery_level).state)) {`);
    lines.push(`        char batt_buf[8];`);
    lines.push(`        snprintf(batt_buf, sizeof(batt_buf), "%d%%", (int)id(battery_level).state);`);
    lines.push(`        it.printf(${w - pad}, ${mid}, id(font_small), COLOR_OFF, TextAlign::CENTER_RIGHT, batt_buf);`);
    lines.push(`      }`);
  }

  lines.push(`      `);

  let sensorIdx = 0;
  for (const { slot, size, col, row } of layout) {
    const x  = col * cellW + pad;
    const y  = headerH + row * cellH + pad;
    const sw = size.cols * cellW - pad * 2;
    const sh = size.rows * cellH - pad * 2;
    const cx = x + Math.round(sw / 2);
    const cy = y + Math.round(sh / 2);

    const slotArea  = sw * sh;
    const totalArea = w * h;
    const valueFont = slotArea > totalArea * 0.15 ? 'font_value'
                    : slotArea > totalArea * 0.06  ? 'font_header'
                    : 'font_small';

    lines.push(`      // ── Slot: ${yamlEsc(slot.title || `Slot ${sensorIdx + 1}`)} ──`);
    lines.push(`      it.rectangle(${x}, ${y}, ${sw}, ${sh});`);
    lines.push(`      it.printf(${cx}, ${y + pad + 2}, id(font_small), TextAlign::TOP_CENTER, "${yamlEscPrintf(slot.title)}");`);

    if (slot.entityId) {
      sensorIdx++;
      const unit = slot.unit ? ` ${yamlEscPrintf(slot.unit)}` : '';
      lines.push(`      if (!std::isnan(id(sensor_${sensorIdx}).state)) {`);
      lines.push(`        it.printf(${cx}, ${cy + pad}, id(${valueFont}), TextAlign::CENTER, "%.1f${unit}", id(sensor_${sensorIdx}).state);`);
      lines.push(`      } else {`);
      lines.push(`        it.printf(${cx}, ${cy + pad}, id(font_header), TextAlign::CENTER, "—");`);
      lines.push(`      }`);
    }
    lines.push(`      `);
  }

  return lines.join('\n');
}
