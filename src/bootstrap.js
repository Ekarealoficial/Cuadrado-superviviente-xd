'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

