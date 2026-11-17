# Cuadrado superviviente

Con Node 18 o posterior, ejecuta `npm start` y abre `http://localhost:3000`. Para jugar en la misma red, los demás jugadores abren la dirección IP del equipo que ejecuta el servidor y el mismo puerto. Para jugar por Internet, sirve este repositorio en un alojamiento Node accesible a todos los jugadores. El servidor acepta la variable de entorno `PORT`.

Singleplayer también funciona en GitHub Pages. Multijugador usa el servidor Node indicado en `src/runtime-config.js` para descubrir salas y simular las partidas. Las salas viven en memoria y se cierran al salir el último jugador o tras 20 segundos sin conexión de todos sus miembros.

## Activar multijugador desde GitHub Pages

1. En Render, crea un Blueprint y conecta este repositorio.
2. Render leerá `render.yaml` y creará el servicio `cuadradito-superviviente-ekareal`.
3. Espera a que `/health` responda correctamente. La página publicada en GitHub Pages ya apunta a la URL HTTPS de ese servicio.

Si Render asigna otro nombre o dominio, copia su URL pública en `src/runtime-config.js`. `ALLOWED_ORIGINS` limita el acceso web al GitHub Pages de este repositorio y al desarrollo local. En el plan gratuito, el servidor puede dormirse cuando no se usa. La primera conexión después de ese periodo tardará mientras Render lo reactiva y las salas se perderán si el proceso se reinicia.

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
