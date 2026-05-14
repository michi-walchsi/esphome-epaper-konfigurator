export const DISPLAYS = [
  { id: 'ws_750_v2', name: 'Waveshare 7.5" V2', width: 800, height: 480, model: '7.50inv2', platform: 'waveshare_epaper' },
  { id: 'ws_420',    name: 'Waveshare 4.2"',    width: 400, height: 300, model: '4.20',     platform: 'waveshare_epaper' },
  { id: 'ws_290',    name: 'Waveshare 2.9"',    width: 296, height: 128, model: '2.90',     platform: 'waveshare_epaper' },
  { id: 'ws_154',    name: 'Waveshare 1.54"',   width: 200, height: 200, model: '1.54',     platform: 'waveshare_epaper' },
  { id: 'lilygo_t5', name: 'LILYGO T5 4.7"',   width: 960, height: 540, model: 'lilygo',   platform: 'lilygo_t5_47'    },
  { id: 'gd_583',    name: 'Good Display 5.83"',width: 648, height: 480, model: '5.83',     platform: 'waveshare_epaper' },
  { id: 'custom',    name: 'Eigene Auflösung',  width: 800, height: 480, model: 'custom',   platform: 'waveshare_epaper', isCustom: true },
];

export const BOARDS = [
  { id: 'esp32dev',            name: 'ESP32dev',  platform: 'esp32'   },
  { id: 'esp32-s3-devkitc-1', name: 'ESP32-S3',  platform: 'esp32'   },
  { id: 'lolin_c3_mini',       name: 'ESP32-C3',  platform: 'esp32'   },
  { id: 'd1_mini',             name: 'ESP8266',   platform: 'esp8266' },
];

export const SLOT_SIZES = [
  { id: 'small',  label: 'Small (1×1)',  cols: 1, rows: 1 },
  { id: 'medium', label: 'Medium (2×1)', cols: 2, rows: 1 },
  { id: 'large',  label: 'Large (2×2)',  cols: 2, rows: 2 },
  { id: 'wide',   label: 'Wide (3×1)',   cols: 3, rows: 1 },
];

export function layoutSlots(slots, gridCols) {
  const layout = [];
  const rowEnd = Array(gridCols).fill(0);

  for (const slot of slots) {
    const size = SLOT_SIZES.find(s => s.id === slot.size) || SLOT_SIZES[0];

    let bestCol = 0;
    let bestRow = Infinity;

    for (let c = 0; c <= gridCols - size.cols; c++) {
      let startRow = 0;
      for (let dc = 0; dc < size.cols; dc++) startRow = Math.max(startRow, rowEnd[c + dc]);
      if (startRow < bestRow) { bestRow = startRow; bestCol = c; }
    }

    layout.push({ slot, size, col: bestCol, row: bestRow });
    for (let dc = 0; dc < size.cols; dc++) rowEnd[bestCol + dc] = bestRow + size.rows;
  }

  return layout;
}

export function getMaxRows(layout) {
  if (!layout.length) return 1;
  return Math.max(...layout.map(({ size, row }) => row + size.rows));
}
