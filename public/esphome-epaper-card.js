/**
 * ESPHome e-Paper Konfigurator — HACS Lovelace Card
 *
 * Lovelace card configuration:
 *   type: custom:esphome-epaper-card
 *   url: http://localhost:5173      # URL where the React app is running
 *   height: 700                     # optional, default 700px
 *   title: ESPHome Konfigurator     # optional card title
 */
(function () {
  'use strict';

  class EsphomeEpaperCard extends HTMLElement {
    constructor() {
      super();
      this._hass = null;
      this._config = null;
      this._iframe = null;
      this._iframeReady = false;
      this._pendingStates = null;
    }

    /** Called by Lovelace when hass object updates */
    set hass(hass) {
      this._hass = hass;
      this._sendStates();
    }

    /** Send hass states to the React app inside the iframe */
    _sendStates() {
      if (!this._iframe || !this._hass) return;
      const payload = { type: 'hass-states', states: this._hass.states };

      if (this._iframeReady) {
        try {
          this._iframe.contentWindow.postMessage(payload, '*');
        } catch (_) {}
      } else {
        // buffer until iframe is ready
        this._pendingStates = payload;
      }
    }

    /** Called by Lovelace with the card config from YAML */
    setConfig(config) {
      if (!config.url) {
        throw new Error(
          '[esphome-epaper-card] "url" ist erforderlich.\n' +
          'Beispiel: url: http://localhost:5173'
        );
      }
      this._config = config;
      this._render();
    }

    _render() {
      if (!this._config) return;
      const { url, height = 700, title = 'ESPHome e-Paper Konfigurator' } = this._config;

      this.innerHTML = '';

      // Use ha-card for consistent Lovelace styling
      const card = document.createElement('ha-card');
      if (title) card.setAttribute('header', title);

      const style = document.createElement('style');
      style.textContent = `
        :host { display: block; }
        ha-card { overflow: hidden; }
        iframe  { display: block; width: 100%; height: ${height}px; border: none; }
      `;

      this._iframe = document.createElement('iframe');
      this._iframe.src = url;
      this._iframe.allow = 'clipboard-write';
      this._iframe.setAttribute('sandbox',
        'allow-scripts allow-same-origin allow-forms allow-downloads allow-popups');

      // Listen for the iframe to signal readiness
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'esphome-card-ready') {
          this._iframeReady = true;
          if (this._pendingStates) {
            try {
              this._iframe.contentWindow.postMessage(this._pendingStates, '*');
            } catch (_) {}
            this._pendingStates = null;
          }
        }
      });

      card.appendChild(style);
      card.appendChild(this._iframe);
      this.appendChild(card);
    }

    /** Called by Lovelace to determine card height in grid units */
    getCardSize() {
      return Math.ceil((this._config?.height ?? 700) / 50);
    }

    /** Provide a default stub config for the visual editor */
    static getStubConfig() {
      return {
        url: 'http://localhost:5173',
        height: 700,
        title: 'ESPHome e-Paper Konfigurator',
      };
    }
  }

  customElements.define('esphome-epaper-card', EsphomeEpaperCard);

  // Register with HA's custom card registry for the card picker UI
  window.customCards = window.customCards || [];
  window.customCards.push({
    type:             'esphome-epaper-card',
    name:             'ESPHome e-Paper Konfigurator',
    description:      'Visueller Konfigurator für ESPHome e-Paper Displays. Lädt alle HA-Entitäten automatisch.',
    preview:          false,
    documentationURL: 'https://github.com/your-username/esphome-epaper-konfigurator',
  });

  console.info(
    '%c ESPHome e-Paper Card %c geladen ',
    'background:#1f3550;color:#58a6ff;padding:2px 4px;border-radius:3px 0 0 3px;font-weight:700',
    'background:#161b22;color:#e6edf3;padding:2px 4px;border-radius:0 3px 3px 0',
  );
})();
