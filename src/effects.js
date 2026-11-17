function spawnParticles(x, y, n, color, mul = 1) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rand(60, 340) * mul;
    const life = rand(0.25, 0.7);
    state.particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life, maxLife: life, size: rand(2,5), color });
  }
}
function addFloat(x, y, text, color) {
  state.floats.push({ x, y, text, color, life: 1.1, maxLife: 1.1, vy: -55 });
}

