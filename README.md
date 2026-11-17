# Cuadrado superviviente

Serve this directory with any static HTTP server. `index.html` loads ordered deferred scripts; no build or dependencies are required. Keep `src/` alongside the HTML when publishing.

Run regression tests with `npm test` (Node 18+).

## Organization

- `config.js`, `cards-data.js`, `entities.js`: tuning, card effects and body schemas.
- `state.js`, `input.js`, `abilities.js`: state, controls and active cards.
- `world.js`, `spatial.js`, `collision.js`: world generation and collision queries.
- `simulation.js`: ordered named update systems.
- `combat.js`, `enemies.js`, `boss.js`, `death.js`: combat and encounters.
- `renderer.js`, `hud.js`, `inventory.js`, `cards-ui.js`, `layout.js`: drawing and interactive layout.
- `effects.js`, `audio.js`: audiovisual effects.

Use `?seed=42` for reproducible simulation randomness. Matching seeds require matching inputs and delta-time sequences; this version does not record/replay browser inputs. Cosmetic randomness is separate.

Boss health is `1200 * 1.25^(encounter-1) * enemyHpMult`, rounded to an integer. Spatial grids reduce sparse-world candidate counts; dense clusters can still have quadratic interactions. Scripts retain shared lexical state for compatibility; this is not yet an isolated ES-module architecture. Entity schemas are currently a documented base body plus enemy/projectile types, not runtime validation of every entity. Additional tuning constants and card text generation remain opportunities for follow-up.
