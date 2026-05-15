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
 * Logs are shown in a <pre> (text node), so there is no XSS risk regardless,
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

/**
 * Basic sanity check on the generated YAML before it is sent to ESPHome.
 * The YAML itself is produced by our own generator, so this is a last-resort
 * guard against malformed state (e.g. corrupted user input slipping through).
 */
export function validateYaml(yaml) {
  const issues = [];
  if (typeof yaml !== 'string' || !yaml.trim()) issues.push('YAML ist leer');
  if (yaml.length > 100_000) issues.push('YAML zu groß (> 100 KB)');
  // Reject null bytes and non-printable control chars (except TAB/LF/CR)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(yaml)) issues.push('Ungültige Steuerzeichen im YAML');
  return { valid: issues.length === 0, issues };
}
