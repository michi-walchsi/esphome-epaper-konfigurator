export const DOMAIN_META = {
  sensor:         { icon: '📡', label: 'Sensoren',           color: '#58a6ff' },
  binary_sensor:  { icon: '💡', label: 'Binäre Sensoren',    color: '#d29922' },
  switch:         { icon: '⚡', label: 'Schalter',            color: '#3fb950' },
  light:          { icon: '🔆', label: 'Lichter',             color: '#f8d33a' },
  climate:        { icon: '🌡', label: 'Klimaanlage',         color: '#ff9800' },
  input_number:   { icon: '🔢', label: 'Eingabe (Zahl)',      color: '#a371f7' },
  input_boolean:  { icon: '☑',  label: 'Eingabe (An/Aus)',    color: '#79c0ff' },
  input_text:     { icon: '✏',  label: 'Eingabe (Text)',      color: '#79c0ff' },
  number:         { icon: '🔢', label: 'Zahlen',              color: '#a371f7' },
  weather:        { icon: '⛅', label: 'Wetter',              color: '#58a6ff' },
  sun:            { icon: '☀',  label: 'Sonne',               color: '#f8d33a' },
  media_player:   { icon: '🎵', label: 'Mediaplayer',         color: '#a371f7' },
  cover:          { icon: '🪟', label: 'Rolläden',            color: '#d29922' },
  fan:            { icon: '💨', label: 'Lüfter',              color: '#79c0ff' },
  lock:           { icon: '🔒', label: 'Schlösser',           color: '#f85149' },
  camera:         { icon: '📷', label: 'Kameras',             color: '#8b949e' },
  person:         { icon: '👤', label: 'Personen',            color: '#3fb950' },
  device_tracker: { icon: '📱', label: 'Geräte',              color: '#58a6ff' },
  automation:     { icon: '⚙',  label: 'Automationen',        color: '#8b949e' },
  scene:          { icon: '🎬', label: 'Szenen',              color: '#8b949e' },
};

export const DEMO_ENTITIES = [
  // ── Sensoren ──
  { entity_id: 'sensor.temperature_living_room',  state: '21.5',  attributes: { friendly_name: 'Temperatur Wohnzimmer',      unit_of_measurement: '°C',    device_class: 'temperature'      } },
  { entity_id: 'sensor.temperature_bedroom',      state: '19.2',  attributes: { friendly_name: 'Temperatur Schlafzimmer',    unit_of_measurement: '°C',    device_class: 'temperature'      } },
  { entity_id: 'sensor.temperature_outdoor',      state: '12.8',  attributes: { friendly_name: 'Außentemperatur',            unit_of_measurement: '°C',    device_class: 'temperature'      } },
  { entity_id: 'sensor.humidity_living_room',     state: '55',    attributes: { friendly_name: 'Luftfeuchtigkeit Wohnzimmer', unit_of_measurement: '%',     device_class: 'humidity'         } },
  { entity_id: 'sensor.humidity_bedroom',         state: '61',    attributes: { friendly_name: 'Luftfeuchtigkeit Schlafzimmer', unit_of_measurement: '%',   device_class: 'humidity'         } },
  { entity_id: 'sensor.co2_living_room',          state: '412',   attributes: { friendly_name: 'CO₂ Wohnzimmer',             unit_of_measurement: 'ppm',   device_class: 'carbon_dioxide'   } },
  { entity_id: 'sensor.pm25',                     state: '8',     attributes: { friendly_name: 'Feinstaub PM2.5',            unit_of_measurement: 'µg/m³', device_class: 'pm25'             } },
  { entity_id: 'sensor.illuminance',              state: '342',   attributes: { friendly_name: 'Helligkeit',                 unit_of_measurement: 'lx',    device_class: 'illuminance'      } },
  { entity_id: 'sensor.pressure',                 state: '1013',  attributes: { friendly_name: 'Luftdruck',                  unit_of_measurement: 'hPa',   device_class: 'atmospheric_pressure' } },
  { entity_id: 'sensor.energy_daily',             state: '4.23',  attributes: { friendly_name: 'Tagesverbrauch',             unit_of_measurement: 'kWh',   device_class: 'energy'           } },
  { entity_id: 'sensor.power_current',            state: '342',   attributes: { friendly_name: 'Aktueller Verbrauch',        unit_of_measurement: 'W',     device_class: 'power'            } },
  { entity_id: 'sensor.solar_power',              state: '1240',  attributes: { friendly_name: 'Solarleistung',              unit_of_measurement: 'W',     device_class: 'power'            } },
  { entity_id: 'sensor.epaper_battery',           state: '78',    attributes: { friendly_name: 'E-Paper Batterie',           unit_of_measurement: '%',     device_class: 'battery'          } },
  { entity_id: 'sensor.phone_battery',            state: '45',    attributes: { friendly_name: 'Handy Akku',                 unit_of_measurement: '%',     device_class: 'battery'          } },
  { entity_id: 'sensor.water_daily',              state: '87',    attributes: { friendly_name: 'Wasserverbrauch heute',      unit_of_measurement: 'L',     device_class: 'water'            } },
  { entity_id: 'sensor.wind_speed',               state: '12.5',  attributes: { friendly_name: 'Windgeschwindigkeit',        unit_of_measurement: 'km/h'                                    } },
  { entity_id: 'sensor.rain_today',               state: '3.2',   attributes: { friendly_name: 'Regen heute',               unit_of_measurement: 'mm'                                      } },
  { entity_id: 'sensor.soil_moisture',            state: '62',    attributes: { friendly_name: 'Bodenfeuchtigkeit',          unit_of_measurement: '%'                                       } },
  { entity_id: 'sensor.wifi_signal',              state: '-67',   attributes: { friendly_name: 'WLAN Signal',               unit_of_measurement: 'dBm',   device_class: 'signal_strength'  } },
  // ── Binäre Sensoren ──
  { entity_id: 'binary_sensor.door_front',        state: 'off',   attributes: { friendly_name: 'Haustür',                   device_class: 'door'           } },
  { entity_id: 'binary_sensor.door_back',         state: 'off',   attributes: { friendly_name: 'Hintertür',                 device_class: 'door'           } },
  { entity_id: 'binary_sensor.window_living',     state: 'off',   attributes: { friendly_name: 'Fenster Wohnzimmer',        device_class: 'window'         } },
  { entity_id: 'binary_sensor.motion_living',     state: 'off',   attributes: { friendly_name: 'Bewegung Wohnzimmer',       device_class: 'motion'         } },
  { entity_id: 'binary_sensor.smoke_detector',    state: 'off',   attributes: { friendly_name: 'Rauchmelder',               device_class: 'smoke'          } },
  { entity_id: 'binary_sensor.presence_home',     state: 'on',    attributes: { friendly_name: 'Anwesenheit',               device_class: 'presence'       } },
  // ── Schalter ──
  { entity_id: 'switch.living_room_lamp',         state: 'on',    attributes: { friendly_name: 'Wohnzimmer Lampe'           } },
  { entity_id: 'switch.coffee_machine',           state: 'off',   attributes: { friendly_name: 'Kaffeemaschine'             } },
  { entity_id: 'switch.dishwasher',               state: 'off',   attributes: { friendly_name: 'Spülmaschine'               } },
  // ── Lichter ──
  { entity_id: 'light.living_room',              state: 'on',    attributes: { friendly_name: 'Wohnzimmer',                brightness: 200                } },
  { entity_id: 'light.bedroom',                  state: 'off',   attributes: { friendly_name: 'Schlafzimmer'               } },
  { entity_id: 'light.kitchen',                  state: 'on',    attributes: { friendly_name: 'Küche',                     brightness: 255                } },
  // ── Klima ──
  { entity_id: 'climate.living_room',            state: 'heat',  attributes: { friendly_name: 'Heizung Wohnzimmer',        current_temperature: 21.5, temperature: 22 } },
  { entity_id: 'climate.bedroom',                state: 'auto',  attributes: { friendly_name: 'Heizung Schlafzimmer',      current_temperature: 19.2, temperature: 20 } },
  // ── Eingaben ──
  { entity_id: 'input_number.target_temp',       state: '22',    attributes: { friendly_name: 'Zieltemperatur',            unit_of_measurement: '°C', min: 15, max: 30 } },
  { entity_id: 'input_number.alarm_hour',        state: '7',     attributes: { friendly_name: 'Weckzeit Stunde',           min: 0, max: 23            } },
  { entity_id: 'input_boolean.vacation_mode',    state: 'off',   attributes: { friendly_name: 'Urlaubsmodus'               } },
  { entity_id: 'input_boolean.guest_mode',       state: 'off',   attributes: { friendly_name: 'Gastmodus'                  } },
  // ── Wetter ──
  { entity_id: 'weather.home',                   state: 'sunny', attributes: { friendly_name: 'Heimwetter',                temperature: 19, humidity: 45 } },
  // ── Mediaplayer ──
  { entity_id: 'media_player.living_room_tv',    state: 'on',    attributes: { friendly_name: 'Wohnzimmer TV',             media_title: 'Netflix'         } },
  { entity_id: 'media_player.bedroom_speaker',   state: 'idle',  attributes: { friendly_name: 'Schlafzimmer Lautsprecher' } },
  // ── Rolläden ──
  { entity_id: 'cover.living_room_blinds',       state: 'open',  attributes: { friendly_name: 'Rolläden Wohnzimmer',      current_position: 100          } },
  // ── Personen ──
  { entity_id: 'person.max',                     state: 'home',     attributes: { friendly_name: 'Max'  } },
  { entity_id: 'person.anna',                    state: 'not_home', attributes: { friendly_name: 'Anna' } },
];

export function getDomain(entityId) { return entityId.split('.')[0]; }

const BINARY_LABELS = {
  door:      { on: 'Offen',   off: 'Zu'      },
  window:    { on: 'Offen',   off: 'Zu'      },
  motion:    { on: 'Bewegung',off: 'Ruhig'   },
  smoke:     { on: 'Alarm',   off: 'OK'      },
  presence:  { on: 'Anwesend',off: 'Abwesend'},
  moisture:  { on: 'Nass',    off: 'Trocken' },
  lock:      { on: 'Offen',   off: 'Gesperrt'},
  plug:      { on: 'An',      off: 'Aus'     },
  power:     { on: 'An',      off: 'Aus'     },
  occupancy: { on: 'Belegt',  off: 'Frei'    },
  vibration: { on: 'Vibration',off: 'Ruhig'  },
};

const WEATHER_DE = {
  sunny:          'Sonnig',
  partlycloudy:   'Teils bewölkt',
  'partly-cloudy':'Teils bewölkt',
  cloudy:         'Bewölkt',
  rainy:          'Regen',
  pouring:        'Starkregen',
  snowy:          'Schnee',
  'snowy-rainy':  'Schneeregen',
  windy:          'Windig',
  'windy-variant':'Windig bewölkt',
  fog:            'Nebel',
  hail:           'Hagel',
  lightning:      'Gewitter',
  'lightning-rainy': 'Gewitterregen',
  exceptional:    'Außergewöhnlich',
};

const SUN_DE = {
  above_horizon: 'Über Horizont',
  below_horizon: 'Unter Horizont',
};

export function formatState(entity) {
  const domain = entity.entity_id.split('.')[0];
  const unit   = entity.attributes?.unit_of_measurement;
  const state  = entity.state;

  if (domain === 'binary_sensor') {
    const dc     = entity.attributes?.device_class;
    const labels = BINARY_LABELS[dc] ?? { on: 'An', off: 'Aus' };
    return state === 'on' ? labels.on : state === 'off' ? labels.off : state;
  }
  if (domain === 'weather') return WEATHER_DE[state] ?? state;
  if (domain === 'sun')     return SUN_DE[state] ?? state;
  if (domain === 'input_boolean') return state === 'on' ? 'An' : state === 'off' ? 'Aus' : state;

  return unit ? `${state} ${unit}` : state;
}
