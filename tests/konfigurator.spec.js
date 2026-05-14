import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('App lädt mit korrektem Titel', async ({ page }) => {
  await expect(page.getByText('ESPHome e-Paper Konfigurator')).toBeVisible();
});

test('Versionsnummer ist sichtbar', async ({ page }) => {
  await expect(page.getByText(/v1\.\d+\.\d+/)).toBeVisible();
});

test('Dev-Modus Badge ist sichtbar', async ({ page }) => {
  await expect(page.getByText(/Dev-Modus/i).first()).toBeVisible();
});

test('Tab-Navigation: Geräte → Konfigurator → YAML', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Geräte' })).toBeVisible();

  await page.getByRole('button', { name: 'Konfigurator' }).click();
  await expect(page.getByText('Dashboard-Titel')).toBeVisible();

  await page.getByRole('button', { name: 'YAML' }).click();
  await expect(page.locator('.yaml-code')).toBeVisible();
});

test('YAML enthält !secret und keinen Klartext-Passwort-Fallback', async ({ page }) => {
  await page.getByRole('button', { name: 'YAML' }).click();
  const code = await page.locator('.yaml-code').textContent();
  expect(code).toContain('!secret wifi_ssid');
  expect(code).toContain('!secret wifi_password');
  expect(code).toContain('!secret api_key');
  expect(code).toContain('!secret ota_password');
});

test('Geräte-Tab: Leer-Zustand zeigt "Neues Gerät" Button', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Neues Gerät/i })).toBeVisible();
});

test('Neues Gerät Dialog öffnet sich', async ({ page }) => {
  await page.getByRole('button', { name: /Neues Gerät/i }).click();
  await expect(page.getByText('Neues Gerät anlegen')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('Neues Gerät anlegen öffnet Konfigurator', async ({ page }) => {
  await page.getByRole('button', { name: /Neues Gerät/i }).click();
  await page.getByPlaceholder('mein-display').fill('test-display');
  await page.getByRole('button', { name: /Konfigurator öffnen/i }).click();
  await expect(page.getByText('Dashboard-Titel')).toBeVisible();
});

test('Neuen Slot hinzufügen', async ({ page }) => {
  await page.getByRole('button', { name: 'Konfigurator' }).click();
  const addBtn = page.locator('.add-slot-btn');
  await expect(addBtn).toBeVisible();
  await addBtn.click();
  await expect(page.locator('.slot-toggle-name', { hasText: 'Neuer Slot' }).first()).toBeVisible();
});

test('Entity Picker öffnet sich und zeigt Entitäten an', async ({ page }) => {
  await page.getByRole('button', { name: 'Konfigurator' }).click();

  // Slot anlegen und öffnen
  await page.locator('.add-slot-btn').click();
  await page.locator('.slot-toggle-name', { hasText: 'Neuer Slot' }).first().click();

  // Entity-Picker im Slot-Body öffnen
  await page.locator('.slot-body .entity-pick-btn').first().click();

  await expect(page.getByPlaceholder(/Entitäten durchsuchen/i)).toBeVisible();
  await expect(page.getByText('Sensoren', { exact: true })).toBeVisible();
});

test('Entity Picker: Suche und Auswahl setzt entityId', async ({ page }) => {
  await page.getByRole('button', { name: 'Konfigurator' }).click();

  // Slot anlegen und öffnen
  await page.locator('.add-slot-btn').click();
  await page.locator('.slot-toggle-name', { hasText: 'Neuer Slot' }).first().click();

  // Entity-Picker öffnen
  await page.locator('.slot-body .entity-pick-btn').first().click();
  await expect(page.getByPlaceholder(/Entitäten durchsuchen/i)).toBeVisible();

  // Nach humidity suchen
  await page.getByPlaceholder(/Entitäten durchsuchen/i).fill('humidity_living');

  const firstResult = page.locator('button.picker-entity', { hasText: 'sensor.humidity_living_room' }).first();
  await expect(firstResult).toBeVisible();
  await firstResult.click();

  // Picker geschlossen
  await expect(page.getByPlaceholder(/Entitäten durchsuchen/i)).not.toBeVisible();

  // entityId-Feld wurde gesetzt
  const entityInput = page.locator('.slot-body input[placeholder="sensor.temperature"]').first();
  await expect(entityInput).toHaveValue('sensor.humidity_living_room');
});

test('Entity Picker: Escape schließt den Picker', async ({ page }) => {
  await page.getByRole('button', { name: 'Konfigurator' }).click();

  // Slot anlegen und öffnen
  await page.locator('.add-slot-btn').click();
  await page.locator('.slot-toggle-name', { hasText: 'Neuer Slot' }).first().click();

  await page.locator('.slot-body .entity-pick-btn').first().click();
  await expect(page.getByPlaceholder(/Entitäten durchsuchen/i)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByPlaceholder(/Entitäten durchsuchen/i)).not.toBeVisible();
});

test('Flash Button Simulation: Demo-Zyklus abschließen', async ({ page }) => {
  await page.getByRole('button', { name: 'Konfigurator' }).click();

  const flashBtn = page.getByRole('button', { name: /Auf Gerät installieren/i });
  await expect(flashBtn).toBeVisible();
  await flashBtn.click();

  await expect(page.getByText(/Speichere YAML|Kompiliere|Flashe/i)).toBeVisible();
  await expect(page.getByText(/Erfolgreich installiert/i)).toBeVisible({ timeout: 12_000 });
});

test('YAML Download-Button ist vorhanden', async ({ page }) => {
  await page.getByRole('button', { name: 'YAML' }).click();
  await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
});

test('YAML enthält kein hardcodiertes Passwort wenn Felder leer', async ({ page }) => {
  await page.getByRole('button', { name: 'YAML' }).click();
  const code = await page.locator('.yaml-code').textContent();
  expect(code).not.toMatch(/password:\s*"[^!]/);
});

test('Gerät speichern erscheint in Geräte-Liste', async ({ page }) => {
  // Neues Gerät anlegen
  await page.getByRole('button', { name: /Neues Gerät/i }).click();
  await page.getByPlaceholder('mein-display').fill('mein-test-display');
  await page.getByRole('button', { name: /Konfigurator öffnen/i }).click();

  // Konfiguration speichern
  await page.getByRole('button', { name: /Konfiguration speichern/i }).click();

  // Im Geräte-Tab prüfen
  await page.getByRole('button', { name: 'Geräte' }).click();
  await expect(page.getByText('mein test display')).toBeVisible();
});
