# Acto I · Informe del lanzamiento 1.0.0

## Disparos, daño y reconexión

| Gravedad | Problema observado | Cambio y comprobación |
| --- | --- | --- |
| Crítica | Una bala rápida podía cruzarse con un enemigo en movimiento entre dos actualizaciones sin registrar el impacto. | La simulación calcula el primer contacto en el movimiento relativo de ambos cuerpos. Consulta el historial reciente de posición y descarta discontinuidades de teletransporte. Hay regresiones para cruces, roces y un objetivo compartido entre dos tiradores. |
| Alta | El proyectil anticipado y el confirmado podían desaparecer en instantes distintos. La respuesta visual dependía de cuándo llegaba la instantánea completa. | El cliente relaciona dueño, salva, lote y trayectoria. Dibuja un contacto provisional. El servidor confirma punto de impacto, daño y continuación o fin del disparo por WebSocket. Las instantáneas recientes permiten recuperarlo también por HTTP. Una confirmación repetida produce un solo indicador. |
| Alta | Un reintento podía perder una acción o aplicar una selección a la siguiente oferta. | Las acciones viajan con número de secuencia hasta su confirmación. Las selecciones incluyen la oferta a la que pertenecen. La misma pestaña puede recuperar su participante tras una interrupción breve. |
| Alta | Una simulación costosa podía demorar las actualizaciones de otras salas. | Cada sala calcula el combate y serializa sus mensajes en un hilo propio. Se omiten instantáneas obsoletas para lectores lentos. El proceso principal controla capacidad, sesiones y conexiones. |
| Media | La compresión de daño de una bala podía contar la distancia posterior al punto donde chocó. | La bala deja de acumular distancia en el primer contacto. La regresión comprueba un impacto a 136 píxeles dentro de un paso que habría superado el umbral de 150. |

El servidor decide el daño, las recompensas y los cambios de inventario. El cliente puede anticipar destellos y corregir un proyectil si un enemigo se aparta. La latencia física sigue afectando a la llegada del daño confirmado.

## Contenido y configuración

- Las siete cartas normales son **Refracción cinética**, **Compresión balística**, **Acumulador de energía**, **Saturación de combate**, **Retorno balístico**, **Pulso de esquiva** e **Impulso de supervivencia**.
- Las especiales son **Cortina de anulación** (42 s), **Cañón omega** (48 s), **Red de resonancia** (50 s) y **Marea estelar** (60 s). Usan las cinco ranuras existentes. Los arcos y el pulso desgastan los proyectiles según su resistencia.
- **Desafío diario** usa la fecha UTC, un campo lógico común y pasos de simulación fijos para diez minutos de puntuación. **Duelo de jefes** guarda marcas por jefe y dificultad, ponderando tiempo y daño recibido hasta el final de la pelea. **Persecución infinita** empieza con cuatro Dash, genera un corredor y ofrece una carta cada 900 píxeles. Los récords se guardan en el navegador.
- Singleplayer admite semilla, amenaza, frecuencia de jefes y cartas iniciales. Las salas pueden esperar al anfitrión y controlar la entrada tardía. El servidor valida las reglas de la sala y transfiere el inicio al siguiente participante si el creador sale. Extras permite configurar jefes, cartas, oleadas, duración y modificadores según corresponda a cada modalidad.
- **Bot Play** permite elegir Normal, Avanzado o Experto y mostrar las rutas evaluadas. Compara trayectorias con cambios de dirección, usa las habilidades disponibles y pondera las cartas según la construcción del jugador.
- El tablón muestra el Acto más reciente. La selección de Actos y el indicador **Novedades** usan el historial local. Se añadieron guía, pausa local, audio, ajustes de efectos, estadísticas y créditos. En línea, abrir un menú personal permite que la sala siga jugando.

## Verificación

Las regresiones de Node cubren las cinco latencias simuladas de 30, 60, 120, 200 y 350 ms con 2, 4, 8 y 12 participantes, la propiedad de disparos, reintentos, selecciones de cartas y PvP. Las pruebas de Chromium recorren menús en 1280 × 800, 390 × 844 y 844 × 390. Dos navegadores comparten una sala privada, prueban el inicio por anfitrión, ven disparos remotos, interrumpen la conectividad y comprueban la confirmación del inventario.

Medición local de una sala con 600 proyectiles hostiles iniciales y 24 enemigos. El percentil 95 indica el tiempo dentro del cual terminaron el 95 % de las actualizaciones medidas.

| Participantes | Mediana por actualización | Percentil 95 |
| --- | --- | --- |
| 2 | 2,25 ms | 3,83 ms |
| 4 | 3,79 ms | 4,66 ms |
| 8 | 6,89 ms | 7,53 ms |
| 12 | 10,18 ms | 16,06 ms |

Con doce participantes la instantánea de muestra ocupó 160 397 bytes antes de compresión. La memoria residente del proceso de prueba alcanzó 100 MiB. Una escena de tres jefes con 600 balas iniciales alcanzó aproximadamente 60 FPS en Chromium de escritorio y en su vista móvil horizontal. Dispositivo, red, configuración de Render y patrón de ataque influyen en estos resultados.

## Alcance de las comprobaciones

Se utilizó emulación táctil en Chromium. Queda pendiente verificar el rendimiento, el audio y la pantalla completa en teléfonos físicos, en particular Safari de iOS. Las pruebas de carga se ejecutan localmente. Un reinicio de Render elimina las salas en memoria. La elección de una licencia corresponde al titular. El README contiene los comandos de instalación y reproducción de las pruebas.

## Archivos

- **Sala y protocolo** — `server.cjs`, `room-worker.cjs`, `room-engine.cjs`, `room-tick.js`, `src/impact-view.js`, `src/presentation.js`.
- **Juego y bot** — `src/act-cards.js`, `src/act-modes.js`, `src/boss-rush-bot.js` y sus integraciones con simulación, colisiones, jefes, cartas, audio, cámara, controles y dibujo en `src/`.
- **Interfaz y publicación** — `src/launch-options.js`, `src/launch-ui.js`, `src/menu.js`, `index.html`, `menu.css`, `favicon.svg`, `portada.png`, `README.md` y los manifiestos de npm.
- **Pruebas y medidas** — `tests/game.cjs`, `tests/lobby.cjs`, `tests/rooms.cjs`, `tests/browser/menus.cjs`, `tests/browser/room.cjs` y `tools/room-benchmark.cjs`.
