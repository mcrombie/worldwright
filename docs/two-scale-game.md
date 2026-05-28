# Two-Scale Game Design

A design sketch for using the Azhora hex map as the foundation for a two-layer strategy game. Not yet implemented.

---

## Concept

The map operates at two scales simultaneously:

- **Strategic layer** — regions are abstract nodes in a graph. Factions own regions, move armies between them, generate resources, and wage diplomacy. This is Clashvergence-compatible: each named region becomes one node.
- **Tactical layer** — when armies meet in a region, the game zooms into that region's hexes for a battle. Terrain, rivers, and settlements on those hexes determine the rules of engagement.

The hex data drives both layers. Hexes are never directly interacted with during strategic play, but they are the source of truth for region adjacency and terrain character.

---

## Strategic Layer

### What a region node contains

Derived from existing `RegionData` + new fields:

```ts
interface StratRegion extends RegionData {
  owner: string            // faction ID
  armies: ArmyStack[]      // units stationed here
  resources: ResourceSet   // income per turn
  fortLevel: number        // 0–3; affects defense bonus in tactical
  neighbors: string[]      // auto-derived from hex border adjacency
  terrainTags: Record<TerrainType, number>  // hex distribution
}
```

### What a faction contains

```ts
interface Faction {
  id: string
  name: string
  color: string
  treasury: number
  regions: string[]        // owned region IDs
  relationships: Record<string, DiplomaticStatus>
}
```

### Turn structure (sketch)

1. Income phase — each owned region yields resources based on terrain tags and settlements
2. Move/order phase — player assigns moves to army stacks (region-to-region along adjacency graph)
3. Resolution phase — simultaneous movement; conflicts trigger tactical battles
4. Upkeep phase — armies consume resources; unaffordable units disband

---

## Tactical Layer

### When it triggers

Two opposing army stacks attempt to occupy the same region at the end of a move phase.

### The board

The attacking faction's entry hexes are derived from the border shared with the region they invaded from. The defending faction deploys from the region's settlement hexes (if any) or the geographic center.

### Unit types (sketch)

| Unit | Movement | Terrain affinity |
|------|----------|-----------------|
| Infantry | 2 | Plains, Hills |
| Cavalry | 4 | Plains, Steppe |
| Archers | 2 | Forest, Hills |
| Siege | 1 | Any (needed for settlements) |
| Naval | — | Coastal, Ocean edges |

### Terrain effects

| Terrain | Effect |
|---------|--------|
| Mountain / High Mountain | +2 defense, movement costs 3 |
| Forest / Deep Forest | +1 defense, blocks cavalry bonus |
| Hills | +1 defense, movement costs 2 |
| Plains | No modifier |
| Wetland | Movement costs 3 |
| Desert | Supply penalty after 2 turns |
| River edge | Costs 1 extra MP to cross; +1 defense for defender on far bank |
| Settlement hex | +1 defense; siege required to reduce fortifications |

### Victory condition

Attacker wins by controlling the region's settlement hex (or center if none) after N rounds, or by eliminating the defender. Defender wins by holding until round N ends.

---

## How the Two Scales Connect

| Strategic concept | Derived from |
|---|---|
| Region adjacency | Hexes sharing a border with different region IDs |
| Region terrain character | Distribution of `TerrainType` across member hexes |
| Terrain tags for income | `terrainTags` counts from hex data |
| Battle board layout | The actual hex grid of the contested region |
| Entry hexes for attacker | Border hexes adjacent to attacking region |
| Settlement position | `hex.settlement` + `hex.settlementSize` on member hexes |
| Fortification strength | `fortLevel` on region (editable in InfoPanel) |

This means the map editor already produces the data the game needs. No extra authoring step is required — painting hexes and defining regions is sufficient to generate a playable strategic graph with tactical terrain.

---

## Export to Clashvergence

The same region graph can be serialized to a Clashvergence `maps.py` entry with a small export script:

```python
def to_clashvergence(map_data):
    nodes = {}
    for region_id, region in map_data['regions'].items():
        nodes[region_id] = {
            'name': region['name'],
            'owner': region.get('faction'),
            'climate': region.get('climate'),
            'neighbors': derive_neighbors(region_id, map_data),
            'terrain_tags': derive_terrain_tags(region_id, map_data),
            'resources': derive_resources(region_id, map_data),
        }
    return nodes
```

The bridge is clean because both systems use the same region-as-node abstraction.

---

## Data Model Changes Required

These additions are confined and non-breaking — they extend the existing types without touching the map editor.

1. Add `fortLevel?: number` to `RegionData` (editable in InfoPanel)
2. New `armies: ArmyStack[]` array on `MapData` (or a separate `gameState` object to keep map data pure)
3. New `factions: Record<string, FactionData>` on `MapData` (or `gameState`)
4. New `Tool` value `'unit'` for placing armies on the strategic map
5. New store actions: `moveArmy`, `resolveConflict`, `advanceTurn`

Keeping game state separate from map data (`gameState` alongside `map`) would let the same `.json` file serve both the map editor and the game without mixing concerns.

---

## UI/UX Flow

### Strategic view (default)
- Map renders with region fills colored by owning faction (override region color)
- Army stacks shown as counters on the region centroid
- Click region → InfoPanel shows strategic info (owner, armies, income)
- Drag army to adjacent region → queues move order
- End Turn button → resolves phase, triggers tactical battles if needed

### Tactical view (on conflict)
- Zoom in to contested region's hexes
- Standard hex grid with terrain rendering
- Units placed on hexes, moved with click-drag
- InfoPanel shows unit stats + terrain modifiers
- "Return to strategic" button after resolution

---

## Key Decisions Before Implementing

1. **Separation of concerns** — keep `gameState` separate from `MapData`, or embed armies/factions into the map file? Separate is cleaner but requires two file handles.
2. **Turn-based vs real-time** — the sketch assumes turn-based; real-time adds complexity but is possible on the hex grid.
3. **Tactical battle scope** — full hex tactics vs. a simpler combat roll modified by terrain? Full tactics is more interesting but significantly more code.
4. **Multiplayer** — local-only, hotseat, or networked? Electron + a simple WebSocket server could handle LAN play.
5. **Clashvergence compatibility** — decide upfront whether strategic layer should stay fully Clashvergence-compatible or diverge for richer features.
