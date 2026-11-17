'use strict';
// El navegador usa este servidor cuando el juego se abre desde GitHub Pages.
// Debe coincidir con el nombre del servicio configurado en render.yaml.
window.MULTIPLAYER_SERVER_URL = ['localhost','127.0.0.1'].includes(location.hostname)
  ? ''
  : 'https://cuadradito-superviviente-ekareal.onrender.com';
