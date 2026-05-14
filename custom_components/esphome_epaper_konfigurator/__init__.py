import os
import json
import logging

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.panel_custom import async_register_panel

DOMAIN = "esphome_epaper_konfigurator"
_LOGGER = logging.getLogger(__name__)

STATIC_PATH = "/esphome-epaper-panel"
PANEL_URL   = "esphome-epaper"


def _manifest_version() -> str:
    try:
        manifest = os.path.join(os.path.dirname(__file__), "manifest.json")
        with open(manifest, encoding="utf-8") as f:
            return json.load(f).get("version", "0")
    except Exception:
        return "0"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    www_path = os.path.join(os.path.dirname(__file__), "www")
    version  = _manifest_version()

    try:
        await hass.http.async_register_static_paths([
            StaticPathConfig(STATIC_PATH, www_path, cache_headers=False)
        ])
    except RuntimeError:
        pass  # already registered on a previous setup

    try:
        await async_register_panel(
            hass,
            webcomponent_name="esphome-epaper-panel",
            frontend_url_path=PANEL_URL,
            module_url=f"{STATIC_PATH}/panel.js?v={version}",
            sidebar_title="ESPHome Konfigurator",
            sidebar_icon="mdi:chip",
            require_admin=False,
        )
    except ValueError:
        pass  # panel already registered from a previous setup

    _LOGGER.info("ESPHome ePaper Konfigurator Panel v%s registriert", version)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return True
