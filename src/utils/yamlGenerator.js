import { SLOT_SIZES, layoutSlots, getMaxRows } from './displays';

export function generateYaml(config, slots) {
  const {
    display, board, title, deviceName, displayName,
    spiPins, deepSleep, updateInterval, gridCols,
    batteryEntityId, wifiSsid, wifiPassword,
  } = config;

  const isESP32  = board.platform === 'esp32';
  const isLilygo = display.platform === 'lilygo_t5_47';
  const layout   = layoutSlots(slots, gridCols);
  const maxRows  = getMaxRows(layout);
  const hasBatt  = Boolean(batteryEntityId);

  const sensorSlots = slots.filter(s => s.entityId);

  const sensorLines = sensorSlots.map((slot, i) =>
    `  - platform: homeassistant\n` +
    `    id: sensor_${i + 1}\n` +
    `    entity_id: ${slot.entityId}\n` +
    `    on_value:\n` +
    `      then:\n` +
    `        - component.update: epaper_display`
  );

  if (hasBatt) {
    sensorLines.push(
      `  - platform: homeassistant\n` +
      `    id: battery_level\n` +
      `    entity_id: ${batteryEntityId}\n` +
      `    on_value:\n` +
      `      then:\n` +
      `        - component.update: epaper_display`
    );
  }

  const sensorSection = sensorLines.length
    ? `sensor:\n${sensorLines.join('\n\n')}\n`
    : '';

  const displayBlock = isLilygo
    ? `  - platform: lilygo_t5_47\n    full_update_every: 1\n    update_interval: ${updateInterval}s`
    : `  - platform: waveshare_epaper\n    model: ${display.model}\n` +
      `    cs_pin: ${spiPins.cs}\n    dc_pin: ${spiPins.dc}\n` +
      `    reset_pin: ${spiPins.rst}\n    busy_pin: ${spiPins.busy}\n` +
      `    update_interval: ${updateInterval}s`;

  const spiSection  = isLilygo ? '' : `spi:\n  clk_pin: ${spiPins.clk}\n  mosi_pin: ${spiPins.mosi}\n\n`;
  const boardBlock  = isESP32
    ? `esp32:\n  board: ${board.id}\n  framework:\n    type: arduino`
    : `esp8266:\n  board: ${board.id}`;

  const fs = {
    title:  clamp(Math.floor(display.height * 0.065), 16, 36),
    header: clamp(Math.floor(display.height * 0.055), 14, 32),
    value:  clamp(Math.floor(display.height * 0.095), 22, 60),
    small:  clamp(Math.floor(display.height * 0.032), 10, 20),
  };

  const glyphs = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~öäüÖÄÜß°%`;
  const lambda = buildLambda(config, layout, maxRows, hasBatt);

  const wifiBlock = wifiSsid
    ? `  ssid: "${esc(wifiSsid)}"\n  password: "${esc(wifiPassword || '')}"`
    : `  ssid: !secret wifi_ssid\n  password: !secret wifi_password`;

  return `esphome:
  name: ${deviceName}
  friendly_name: ${displayName}
  on_boot:
    - priority: 200
      then:
        - component.update: epaper_display

${boardBlock}

logger:

api:
  encryption:
    key: !secret api_key

ota:
  - platform: esphome
    password: !secret ota_password

wifi:
${wifiBlock}
  ap:
    ssid: "${displayName} Fallback"
    password: "fallback123"

captive_portal:

time:
  - platform: homeassistant
    id: ha_time
    timezone: Europe/Vienna

font:
  - file: "gfonts://Roboto@700"
    id: font_title
    size: ${fs.title}
    glyphs: "${glyphs}"
  - file: "gfonts://Roboto"
    id: font_header
    size: ${fs.header}
    glyphs: "${glyphs}"
  - file: "gfonts://Roboto@700"
    id: font_value
    size: ${fs.value}
    glyphs: "${glyphs}"
  - file: "gfonts://Roboto"
    id: font_small
    size: ${fs.small}
    glyphs: "${glyphs}"

${spiSection}${sensorSection}
display:
${displayBlock}
  id: epaper_display
  rotation: 0°
  lambda: |-
${lambda}

deep_sleep:
  sleep_duration: ${deepSleep}min
  wakeup_pin:
    number: GPIO0
    inverted: true
`;
}

function buildLambda(config, layout, maxRows, hasBatt) {
  const { display, title, gridCols } = config;
  const w = display.width;
  const h = display.height;

  const headerH   = clamp(Math.round(h * 0.13), 30, 80);
  const cellW     = Math.floor(w / gridCols);
  const cellH     = Math.floor((h - headerH) / Math.max(maxRows, 1));
  const pad       = clamp(Math.round(cellW * 0.04), 4, 12);
  const mid       = Math.round(headerH / 2);
  const battRes   = hasBatt ? 56 : 0;
  const timeX     = w - pad - 4 - battRes;

  const lines = [];
  lines.push(`      it.fill(COLOR_OFF);`);
  lines.push(`      `);
  lines.push(`      // ── Header ────────────────────────────────`);
  lines.push(`      it.filled_rectangle(0, 0, ${w}, ${headerH});`);
  lines.push(`      it.printf(${pad + 4}, ${mid}, id(font_title), COLOR_OFF, TextAlign::CENTER_LEFT, "${esc(title)}");`);
  lines.push(`      it.strftime(${timeX}, ${mid}, id(font_small), COLOR_OFF, TextAlign::CENTER_RIGHT, "%H:%M  %d.%m.%Y", id(ha_time).now());`);

  if (hasBatt) {
    lines.push(`      `);
    lines.push(`      // ── Batterie ──`);
    lines.push(`      if (!std::isnan(id(battery_level).state)) {`);
    lines.push(`        char batt_buf[8];`);
    lines.push(`        snprintf(batt_buf, sizeof(batt_buf), "%d%%", (int)id(battery_level).state);`);
    lines.push(`        it.printf(${w - pad - 4}, ${mid}, id(font_small), COLOR_OFF, TextAlign::CENTER_RIGHT, batt_buf);`);
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

    lines.push(`      // ── ${esc(slot.title || 'Slot')} ──`);
    lines.push(`      it.rectangle(${x}, ${y}, ${sw}, ${sh});`);
    lines.push(`      it.printf(${cx}, ${y + pad + 2}, id(font_small), TextAlign::TOP_CENTER, "${esc(slot.title)}");`);

    if (slot.entityId) {
      sensorIdx++;
      const unit = slot.unit ? ` ${esc(slot.unit)}` : '';
      lines.push(`      if (!std::isnan(id(sensor_${sensorIdx}).state)) {`);
      lines.push(`        it.printf(${cx}, ${cy}, id(font_value), TextAlign::CENTER, "%.1f${unit}", id(sensor_${sensorIdx}).state);`);
      lines.push(`      } else {`);
      lines.push(`        it.printf(${cx}, ${cy}, id(font_header), TextAlign::CENTER, "—");`);
      lines.push(`      }`);
    }
    lines.push(`      `);
  }

  return lines.join('\n');
}

function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }
function esc(s) { return String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
