'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mobileDevice=!!(window.navigator?.maxTouchPoints && (window.matchMedia?.('(pointer: coarse)').matches || window.navigator.userAgentData?.mobile));
let rotatedPlay=false;
const touchMove={x:0,y:0};
let W = 0, H = 0;
function resize() { W = canvas.width = rotatedPlay?window.innerHeight:window.innerWidth; H = canvas.height = rotatedPlay?window.innerWidth:window.innerHeight; }
window.addEventListener('resize', resize);
resize();

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

