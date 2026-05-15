import * as yaml from 'js-yaml';

/**
 * ESPHome URL validation — blocks non-HTTP(S) schemes to prevent open-redirect
 * or javascript: injection via the user-configurable URL field.
 */
export function validateEsphomeUrl(raw) {
  const url = (raw || 'http://homeassistant.local:6052').replace(/\/$/, '');
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Ungültige ESPHome URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('ESPHome URL muss http:// oder https:// verwenden');
  }
  return url;
}

// Patterns that may reveal secrets in ESPHome build logs
const REDACT = [
  /\bpassword\s*[:=]\s*\S+/gi,
  /ota_password\s*[:=]\s*\S+/gi,
  /\bssid\s*[:=]\s*"[^"]*"/gi,
  /\bkey\s*[:=]\s*[A-Za-z0-9+/=]{20,}/gi,
];

/**
 * Remove sensitive values from a single ESPHome log line before display.
 * Logs are shown in a <pre> (text node), so there is no XSS risk either way,
 * but we still redact to avoid exposing credentials to shoulder-surfers.
 */
export function sanitizeLogLine(line) {
  let out = String(line ?? '');
  for (const p of REDACT) {
    out = out.replace(p, m => {
      const sep = m.match(/[:=]/)?.[0] ?? ':';
      const key = m.split(/[:=]/)[0];
      return `${key}${sep}[REDACTED]`;
    });
  }
  return out;
}

// js-yaml schema extended with ESPHome's !secret tag
const SECRET_TYPE = new yaml.Type('!secret', {
  kind: 'scalar',
  resolve: () => true,
  construct: data => `__secret__${data}`,
});
const ESPHOME_SCHEMA = yaml.DEFAULT_SCHEMA.extend([SECRET_TYPE]);

/**
 * Validate generated YAML using js-yaml before sending to ESPHome.
 * Uses a custom schema that accepts ESPHome's !secret tags.
 */
export function validateYaml(yamlStr) {
  if (typeof yamlStr !== 'string' || !yamlStr.trim()) {
    return { valid: false, issues: ['YAML ist leer'] };
  }
  if (yamlStr.length > 100_000) {
    return { valid: false, issues: ['YAML zu groß (> 100 KB)'] };
  }
  // Reject null bytes and non-printable control chars (except TAB/LF/CR)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(yamlStr)) {
    return { valid: false, issues: ['Ungültige Steuerzeichen im YAML'] };
  }
  try {
    yaml.load(yamlStr, { schema: ESPHOME_SCHEMA });
  } catch (e) {
    return { valid: false, issues: [`YAML-Syntaxfehler: ${e.message}`] };
  }
  return { valid: true, issues: [] };
}
