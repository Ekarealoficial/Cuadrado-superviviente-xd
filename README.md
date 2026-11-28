# Cuadrado Superviviente XD

Roguelike geométrico para escritorio y móvil. El último cuadrado libre se enfrenta a la Nación Círculo con cartas acumulables, cinco ranuras de habilidades y dieciséis jefes. El tablón del menú reúne las novedades de cada Acto.

[Jugar en GitHub Pages](https://ekarealoficial.github.io/Cuadrado-superviviente-xd/)

## Instalación

Usa Node.js 22 y npm. Ejecuta `npm ci` y `npm start` en la raíz del repositorio. Abre `http://localhost:3000`. El servidor acepta `PORT` para cambiar el puerto. Para probar desde otro dispositivo de la red, abre la IP del equipo e incluye su origen en `ALLOWED_ORIGINS` para WebSocket.

La simulación de las modalidades locales se ejecuta en el navegador. En GitHub Pages, `src/runtime-config.js` señala al servidor público de salas. El Blueprint de Render está en `render.yaml`.

## Controles

| Acción | Teclado y ratón | Móvil |
| --- | --- | --- |
| Moverse | WASD o flechas | Joystick izquierdo |
| Apuntar y disparar | Puntero y botón principal sostenido | Joystick derecho |
| Disparar el láser cargado | Soltar el botón | Soltar el joystick derecho |
| Usar una especial | 1–5 | Tocar la ranura |
| Elegir una carta | Clic o 1–3 | Tocar la carta |
| Equipar habilidades | E, elegir carta y ranura | Inventario |
| Pausa, guía, audio y efectos | P o Menú | Menú |
| Zoom | Automático según el combate | Botones − y + |

En multijugador el mundo continúa mientras consultas los menús. Dash y Distorsión utilizan tu dirección de apuntado. Las balas grandes resisten más impactos de cancelación. El botón de pantalla completa en móvil ofrece una vista horizontal cuando el navegador lo permite.

## Modalidades y marcas locales

- **Singleplayer.** Configura el ritmo de dificultad, XP, color, familias de enemigos, jefes, frecuencia de encuentros, amenaza inicial y semilla. Elegir cartas de salida personaliza la partida.
- **Multijugador.** Crea una sala pública o privada para 2–12 participantes. El creador puede empezar directamente o abrir una sala de espera, permitir entrada tardía y activar PvP. Si el anfitrión sale o caduca su sesión, el primer participante que queda hereda el control de inicio. El servidor valida la configuración y calcula el combate.
- **Sandbox.** Prueba cartas, compara daño con el muñeco de entrenamiento y ensaya fases y combinaciones de ataques. En PC, U abre los enemigos e I las cartas. En móvil hay botones de laboratorio.
- **Boss Rush.** Primero se agotan los jefes individuales, después las duplas y luego grupos mayores. Los accesibles son más probables al principio. Cada jefe entrega cuatro reliquias. Cada reliquia permite elegir una carta entre tres. Bot Play ofrece tres niveles y la opción de mostrar las rutas evaluadas.
- **Asedio Infinito.** Supera oleadas, élites cada cinco y un encuentro de jefes cada diez. Puedes elegir la oleada de inicio y las familias de enemigos.
- **Contrarreloj.** Puntúa durante 5, 10 o 15 minutos. Los cuatro encuentros se programan en los quintos de la duración elegida.
- **Caos Geométrico.** Elige el conjunto de modificadores, su frecuencia y duración. Puedes habilitar una segunda regla compatible después de tres minutos.
- **Desafío diario.** La fecha UTC determina la semilla, los enemigos, cuatro jefes y tres modificadores. Dura diez minutos. La simulación utiliza pasos de 1/60 s y el mismo campo lógico en los distintos dispositivos.
- **Duelo de jefes.** Selecciona un jefe, dificultad y semilla. Las medallas consideran el tiempo y el daño recibido. El mejor intento por jefe y dificultad se ordena por segundos de combate más diez segundos por cada medio corazón de daño.
- **Persecución infinita.** Corre delante de la muralla, atraviesa las puertas y aprovecha cuatro cartas de Dash. Cada 900 píxeles de avance obtienes una elección de carta. La distancia determina la presión del corredor.

Estadísticas, récords, preferencias y último Acto leído se guardan por navegador. Si el almacenamiento está bloqueado, la partida sigue funcionando y esos datos pueden perderse al salir. La semilla reproduce la aleatoriedad de la simulación con las mismas entradas y pasos. La fecha del desafío cambia a medianoche UTC.

## Salas y despliegue

El navegador anticipa movimiento, disparos y contactos. Cada participante recibe el daño, las recompensas y las elecciones desde el servidor. Un contacto confirmado puede corregir la posición de la bala anticipada. La red sigue condicionando cuándo se conoce la vida real del objetivo.

Cada sala ejecuta su simulación y serializa sus instantáneas en un hilo de Node independiente. `MAX_ROOMS` ajusta la capacidad simultánea, con ocho salas de forma predeterminada. `ALLOWED_ORIGINS` admite una lista separada por comas. `GET /health` devuelve versión y cantidad de salas. WebSocket es el transporte principal. El respaldo HTTP reintenta las acciones pendientes y las confirma por número.

La partida admite interrupciones breves en la misma pestaña. Una sesión caduca tras unos 20 segundos sin actividad. Cerrar la última sesión, reiniciar Render o desplegar otra versión borra las salas en memoria. El plan gratuito puede suspenderse por inactividad. La primera conexión puede tardar mientras arranca. Para publicar un Acto, despliega la misma revisión del cliente en Pages y del servidor en Render, verifica `/health` y prueba crear y unirse a una sala desde Pages.

## Verificación

- `npm test` ejecuta las regresiones de simulación, jefes, cartas, sincronización, salas y modalidades.
- `npm run benchmark` mide una simulación local con 2, 4, 8 y 12 participantes, 600 balas hostiles iniciales y 24 enemigos. Muestra tiempo de actualización, tamaño de instantánea y memoria RSS del proceso. La medida gzip orienta sobre compresibilidad y no mide el tráfico real de WebSocket.
- Para las pruebas de navegador, ejecuta `npx playwright install chromium`, mantén `npm start` abierto y ejecuta `npm run test:browser`. Se puede usar un Chromium instalado mediante `CHROMIUM_PATH`. Las pruebas recorren modos en escritorio y dos vistas táctiles y conectan dos navegadores a una sala privada.

## Organización y créditos

La lógica compartida vive en `src/`. `room-engine.cjs` carga la simulación en Node, `room-tick.js` organiza participantes y propiedad de proyectiles, `room-worker.cjs` aísla las salas y `server.cjs` sirve HTTP y WebSocket. Para ampliar el tablón, añade una entrada al final del arreglo `ACTS` en `src/launch-ui.js` con número, versión, fecha, descripción y cambios.

Proyecto de Ekarealoficial. El dibujo utiliza Canvas 2D y formas geométricas. El audio se sintetiza con Web Audio. Gracias a quienes prueban las peleas y comunican fallos.

## Licencia

La elección de licencia del proyecto queda pendiente del titular del repositorio. Al decidirla, añade el texto correspondiente en `LICENSE` y registra por separado las licencias y atribuciones de cualquier recurso de terceros.
