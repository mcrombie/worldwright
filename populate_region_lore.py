"""
Reads lore/geography/regions/*.md files and populates matching region lore
in map/resources/examples/azhora.wwmap.

Each lore file's YAML frontmatter is stripped; the remaining markdown is stored
as the 'lore' field on each matching region in the map.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
LORE_DIR = ROOT / "lore" / "geography" / "regions"
MAP_FILE = ROOT / "map" / "resources" / "examples" / "azhora.wwmap"

# Maps lore filename stem → list of region IDs in the map
LORE_TO_REGIONS: dict[str, list[str]] = {
    "acorwood":          ["East Acordwood", "West Acorwood", "South Acordwood", "North Acorwood"],
    "alezhor":           ["Alezhor"],
    "amod":              ["Amod"],
    "ascarth":           ["Northern Ascarth", "Southern Ascarth"],
    "azhor_stones":      ["Azhor Stones"],
    "babon":             ["Babon"],
    "caricas":           ["Caricas"],
    "celder":            ["North Celder", "South Celder"],
    "cold_stones":       ["Cold Stones"],
    "drent":             ["Drent"],
    "eer":               ["Eer"],
    "elagos":            ["Elagos"],
    "endevor":           ["North Endevor", "South Endevor", "East Endevor", "West Endevor"],
    "feradom":           ["Feradom"],
    "gala":              ["Gala"],
    "ganun":             ["North Ganun", "South Ganun", "East Ganun", "West Ganun"],
    "ibenale":           ["North Ibenal", "South Ibenal"],
    "ibenwood":          ["North Ibenwood", "South Ibenwood", "East Ibenwood", "West Ibenwood", "Central Ibenwood"],
    "izol":              ["East Izol", "West Izol"],
    "legemum":           ["Legemum"],
    "lond":              ["North Lond", "South Lond", "East Lond", "West Lond", "Central Lond"],
    "lotharn":           ["East Lotharn Mountains", "West Lotharn Mountains"],
    "mithala":           ["North Mithala", "South Mithala", "East Mithala", "West Mithala"],
    "moroshe_desert":    ["North Meroshe Desert", "South Meroshe Desert", "Central Meroshe Desert", "West Meroshe Desert"],
    "moros":             ["Moros Plain"],
    "narcosh":           ["Narcosh"],
    "nethereum":         ["Nethereum", "Nether Desert"],
    "nonoth":            ["North Nonoth", "South Nonoth"],
    "oremindi":          [
        "East Oremindi Mountains", "West Oremindi Mountains",
        "North Oreminidi Mountains", "South Oremindi Mountains",
        "Lesser Oremindi Mountains",
    ],
    "orgmala":           ["Orgmala"],
    "orsa":              ["North Orsa", "South Orsa"],
    "ovesos":            ["Ovesos"],
    "pyros":             ["East Pyros", "West Pyros"],
    "riesov":            ["North Riesov", "South Riesov"],
    "selemis":           ["Selemi"],
    "telemonia":         ["Telemonia"],
    "thalmagar":         ["Cape Thalmagar"],
    "trogo":             ["Trogo"],
    "witherst":          ["East Witherst", "West Witherst"],
    "yunethre":          ["Yunethre"],
}


def strip_frontmatter(text: str) -> str:
    """Remove YAML frontmatter (--- ... ---) from markdown text."""
    stripped = text.strip()
    if stripped.startswith("---"):
        end = stripped.find("\n---", 3)
        if end != -1:
            return stripped[end + 4:].strip()
    return stripped


def main() -> None:
    print(f"Loading map: {MAP_FILE}")
    with open(MAP_FILE, encoding="utf-8") as f:
        data = json.load(f)

    regions: dict = data.get("regions", {})
    updated = 0
    skipped_files = []

    for stem, region_ids in LORE_TO_REGIONS.items():
        lore_path = LORE_DIR / f"{stem}.md"
        if not lore_path.exists():
            print(f"  [MISSING] {lore_path.name}")
            skipped_files.append(stem)
            continue

        raw = lore_path.read_text(encoding="utf-8")
        lore_text = strip_frontmatter(raw)

        for rid in region_ids:
            if rid not in regions:
                print(f"  [NO REGION] {rid!r} (from {stem}.md)")
                continue
            regions[rid]["lore"] = lore_text
            print(f"  [OK] {rid!r} <- {stem}.md")
            updated += 1

    data["regions"] = regions

    print(f"\nWriting map ({updated} regions updated)...")
    with open(MAP_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    print("Done.")


if __name__ == "__main__":
    main()
