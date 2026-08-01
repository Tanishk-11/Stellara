# agent_service/astronomy.py

from skyfield.api import load, wgs84, Star
from datetime import datetime
from langchain.tools import tool

# --- 1. CONFIGURATION & DATA LOADING ---
import os

# 'de421.bsp' (15MB) contains positions of Earth, Sun, Moon, and Planets.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BSP_FILE = os.path.join(BASE_DIR, "de421.bsp")

try:
    if os.path.exists(BSP_FILE):
        planets_data = load(BSP_FILE)
    else:
        print(f"WARNING: {BSP_FILE} not found. Skyfield will attempt to download it.")
        planets_data = load('de421.bsp')
except Exception as e:
    print(f"CRITICAL: Error loading astronomy data: {e}")
    planets_data = None
ts = load.timescale()

# The "Anchor Stars" for your 8 constellations.
# These specific stars represent the center/brightest point of the group.
CONSTELLATION_ANCHORS = {
    "Orion": Star(ra_hours=5.919, dec_degrees=7.407),  # Betelgeuse
    "UrsaMajor": Star(ra_hours=11.062, dec_degrees=61.75),  # Dubhe (Big Dipper)
    "UrsaMinor": Star(ra_hours=1.911, dec_degrees=89.15),  # Polaris (North Star)
    "Scorpius": Star(ra_hours=16.48, dec_degrees=-26.43),  # Antares
    "Leo": Star(ra_hours=10.139, dec_degrees=11.967),  # Regulus
    "Cassiopeia": Star(ra_hours=0.675, dec_degrees=56.53),  # Schedar
    "Crux": Star(ra_hours=12.443, dec_degrees=-63.09),  # Acrux
    "CanisMajor": Star(ra_hours=6.75, dec_degrees=-16.71),  # Sirius
}

# The Solar System bodies we care about
PLANET_NAMES = {
    "Sun": "sun",
    "Moon": "moon",
    "Mars": "mars",
    "Venus": "venus",
    "Jupiter": "jupiter barycenter",
    "Saturn": "saturn barycenter",
}


# --- 2. THE CORE CALCULATOR ---
@tool
def get_sky_data(latitude: float, longitude: float):
    """
    Returns a complete snapshot of the sky for the Agent.
    Includes: Visible Planets, Sun/Moon, and Visible Constellations.
    """
    if planets_data is None:
        return {"error": "Astronomy Data (de421.bsp) not loaded."}

    t = ts.now()
    earth = planets_data["earth"]
    observer = earth + wgs84.latlon(latitude, longitude)

    sky_report = {"solar_system": {}, "constellations": {}}

    # --- PART A: CHECK SOLAR SYSTEM ---
    for friendly_name, kernel_name in PLANET_NAMES.items():
        body = planets_data[kernel_name]
        astrometric = observer.at(t).observe(body)
        alt, az, _ = astrometric.apparent().altaz()

        # Only report if it's above the horizon (> 0 degrees altitude)
        if alt.degrees > 0:
            sky_report["solar_system"][friendly_name] = {
                "visible": True,
                "altitude": round(alt.degrees, 1),
                "azimuth": round(az.degrees, 1),
                "direction": _get_compass_direction(az.degrees),
            }

    # --- PART B: CHECK CONSTELLATIONS ---
    for name, star_obj in CONSTELLATION_ANCHORS.items():
        astrometric = observer.at(t).observe(star_obj)
        alt, az, _ = astrometric.apparent().altaz()

        # We assume a constellation is "visible" if its main star is > 5 degrees up
        if alt.degrees > 5:
            sky_report["constellations"][name] = {
                "visible": True,
                "altitude": round(alt.degrees, 1),
                "azimuth": round(az.degrees, 1),
                "direction": _get_compass_direction(az.degrees),
            }

    return sky_report


# --- 3. HELPER FUNCTIONS ---
def _get_compass_direction(az):
    """Converts 0-360 degrees into N, NE, E, etc."""
    val = int((az / 22.5) + 0.5)
    arr = [
        "N",
        "NNE",
        "NE",
        "ENE",
        "E",
        "ESE",
        "SE",
        "SSE",
        "S",
        "SSW",
        "SW",
        "WSW",
        "W",
        "WNW",
        "NW",
        "NNW",
    ]
    return arr[(val % 16)]


# --- TEST BLOCK ---
if __name__ == "__main__":
    # Test with Ranchi Coordinates (BIT Mesra)
    print("🔭 Scanning Sky over Ranchi...")
    data = get_sky_data(23.4123, 85.4399)

    print("\n--- PLANETS ---")
    for p, info in data["solar_system"].items():
        print(f"{p}: {info['direction']} (Alt: {info['altitude']}°)")

    print("\n--- CONSTELLATIONS ---")
    for c, info in data["constellations"].items():
        print(f"{c}: {info['direction']} (Alt: {info['altitude']}°)")
