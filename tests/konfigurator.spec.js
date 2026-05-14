import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('App lädt mit korrektem Titel', async ({ page }) => {
  await expect(page.getByText('ESPHome e-Paper Konfigurator')).toBeVisible();
});

test('Demo-Modus Badge ist sichtbar', async ({ page }) => {
  await expect(page.getByText(/Demo-Modus/i)).toBeVisible();
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

test('Entity Picker öffnet sich und zeigt Entitäten an', async ({ page }) => {
  await page.getByRole('button', { name: 'Konfigurator' }).click();

  // Slot 1 öffnen, dann Entity-Picker im Slot-Body öffnen (nicht Battery-Picker)
  await page.getByRole('button', { name: /Temperatur/ }).first().click();
  await page.locator('.slot-body .entity-pick-btn').first().click();

  await expect(page.getByPlaceholder(/Entitäten durchsuchen/i)).toBeVisible();
  await expect(page.getByText('Sensoren', { exact: true })).toBeVisible();
});

test('Entity Picker: Suche und Auswahl setzt entityId', async ({ page }) => {
  await page.getByRole('button', { name: 'Konfigurator' }).click();

  // Slot 1 öffnen
  await page.getByRole('button', { name: /Temperatur/ }).first().click();

  // Entity Picker im Slot-Body öffnen (nicht Battery-Picker oben)
  await page.locator('.slot-body .entity-pick-btn').first().click();
  await expect(page.getByPlaceholder(/Entitäten durchsuchen/i)).toBeVisible();

  // Nach humidity suchen (entity_id enthält "humidity_living", kein Leerzeichen)
  await page.getByPlaceholder(/Entitäten durchsuchen/i).fill('humidity_living');

  // Treffer-Button klicken (button.picker-entity enthält die entity_id)
  const firstResult = page.locator('button.picker-entity', { hasText: 'sensor.humidity_living_room' }).first();
  await expect(firstResult).toBeVisible();
  await firstResult.click();

  // Picker geschlossen
  await expect(page.getByPlaceholder(/Entitäten durchsuchen/i)).not.toBeVisible();

  // entityId-Feld wurde gesetzt (input mit placeholder "sensor.temperature" zeigt neue ID)
  const entityInput = page.locator('.slot-body input[placeholder="sensor.temperature"]').first();
  await expect(entityInput).toHaveValue('sensor.humidity_living_room');
});

test('Entity Picker: Escape schließt den Picker', async ({ page }) => {
  await page.getByRole('button', { name: 'Konfigurator' }).click();
  await page.getByRole('button', { name: /Temperatur/ }).first().click();
  await page.locator('.slot-body .entity-pick-btn').first().click();
  await expect(page.getByPlaceholder(/Entitäten durchsuchen/i)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByPlaceholder(/Entitäten durchsuchen/i)).not.toBeVisible();
});

test('Neuen Slot hinzufügen', async ({ page }) => {
  await page.getByRole('button', { name: 'Konfigurator' }).click();
  const addBtn = page.locator('.add-slot-btn');
  await expect(addBtn).toBeVisible();
  await addBtn.click();
  // Slot-Header in der Liste prüfen (nicht Preview-Slot)
  await expect(page.locator('.slot-toggle-name', { hasText: 'Neuer Slot' }).first()).toBeVisible();
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

test('Neues Gerät Dialog öffnet sich', async ({ page }) => {
  await page.getByRole('button', { name: /Neues Gerät/i }).click();
  await expect(page.getByText('Neues Gerät anlegen')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('Geräte-Grid zeigt Demo-Geräte mit Slot-Anzahl', async ({ page }) => {
  await expect(page.getByText('Wohnzimmer Display')).toBeVisible();
  await expect(page.getByText('Schlafzimmer Sensor')).toBeVisible();
  // Mehrere Geräte zeigen Slot-Anzahl — first() verwenden
  await expect(page.getByText(/Slots:\s*\d/).first()).toBeVisible();
});

test('YAML enthält kein hardcodiertes Passwort wenn Felder leer', async ({ page }) => {
  await page.getByRole('button', { name: 'YAML' }).click();
  const code = await page.locator('.yaml-code').textContent();
  expect(code).not.toMatch(/password:\s*"[^!]/);
});
