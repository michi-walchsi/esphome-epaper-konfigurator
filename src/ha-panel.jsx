import { createRoot } from 'react-dom/client';
import indexCss from './index.css?raw';
import appCss from './App.css?raw';
import App from './App.jsx';

class EPaperMakerPanel extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._root = null;
  }

  connectedCallback() {
    this.style.cssText = 'display:block;height:100%;';

    const style = document.createElement('style');
    style.textContent = indexCss + '\n' + appCss;

    const container = document.createElement('div');
    container.style.cssText = 'height:100%;overflow:hidden;';

    this._shadow.appendChild(style);
    this._shadow.appendChild(container);

    this._root = createRoot(container);
    this._render();
  }

  disconnectedCallback() {
    this._root?.unmount();
    this._root = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._root) this._render();
  }

  get hass() { return this._hass; }

  _render() {
    if (!this._root) return;
    this._root.render(<App hass={this._hass} />);
  }
}

customElements.define('e-paper-maker-panel', EPaperMakerPanel);
