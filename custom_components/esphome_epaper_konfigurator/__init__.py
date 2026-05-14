import os
import logging

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.components.panel_custom import async_register_panel

DOMAIN = "esphome_epaper_konfigurator"
_LOGGER = logging.getLogger(__name__)

STATIC_PATH = "/esphome-epaper-panel"
PANEL_URL   = "esphome-epaper"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    www_path = os.path.join(os.path.dirname(__file__), "www")

    try:
        hass.http.register_static_path(STATIC_PATH, www_path, cache_headers=False)
    except RuntimeError:
        pass  # already registered on a previous setup

    await async_register_panel(
        hass,
        webcomponent_name="esphome-epaper-panel",
        frontend_url_path=PANEL_URL,
        module_url=f"{STATIC_PATH}/panel.js",
        sidebar_title="ESPHome Konfigurator",
        sidebar_icon="mdi:chip",
        require_admin=False,
    )

    _LOGGER.info("ESPHome ePaper Konfigurator Panel registriert")
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return True
