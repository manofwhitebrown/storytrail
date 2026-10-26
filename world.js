// world.js - the sky, hills, trees and path that scroll past as you walk.

const STEP_DISTANCE = 60; // how many pixels the world moves per step

const World = {
  scroll: 0,  // how far the world has actually scrolled
  target: 0,  // how far it should scroll (grows by one step each tap)

  step() {
    this.target += STEP_DISTANCE;
  },

  // Slide smoothly toward the target instead of jumping
  update(dt) {
    this.scroll += (this.target - this.scroll) * Math.min(1, dt * 6);
  },

  draw(ctx, w, h) {
    const groundY = h * 0.72;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, "#1f2a4d");
    sky.addColorStop(1, "#8fb3c2");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Moon (fixed in the sky)
    ctx.fillStyle = "#f4efd8";
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.18, 26, 0, Math.PI * 2);
    ctx.fill();

    // Far hills move slowly, near hills move faster (parallax = depth)
    this.drawHills(ctx, w, groundY, 0.15, "#3b5a73", 70, 260, groundY - 90);
    this.drawHills(ctx, w, groundY, 0.35, "#2b4a52", 50, 170, groundY - 40);

    // Trees
    this.drawTrees(ctx, w, groundY, 0.7, 150);

    // Ground
    ctx.fillStyle = "#1d3330";
    ctx.fillRect(0, groundY, w, h - groundY);

    // Path
    const pathTop = groundY + 28;
    ctx.fillStyle = "#c9b88a";
    ctx.fillRect(0, pathTop, w, h - pathTop - 24);

    // Pebbles on the path move at full speed
    ctx.fillStyle = "#a89868";
    const spacing = 90;
    const first = Math.floor(this.scroll / spacing);
    for (let i = first; i < first + w / spacing + 2; i++) {
      const x = i * spacing - this.scroll;
      const y = pathTop + 14 + (hash(i) * (h - pathTop - 56));
      ctx.beginPath();
      ctx.ellipse(x, y, 6 + hash(i + 7) * 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawHills(ctx, w, baseY, speed, color, amp, period, topY) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= w; x += 8) {
      const y = topY + Math.sin((x + this.scroll * speed) / period * Math.PI * 2) * amp * 0.5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, baseY);
    ctx.closePath();
    ctx.fill();
  },

  drawTrees(ctx, w, groundY, speed, spacing) {
    const offset = this.scroll * speed;
    const first = Math.floor(offset / spacing);
    for (let i = first; i < first + w / spacing + 2; i++) {
      if (hash(i + 31) < 0.25) continue; // leave some gaps
      const x = i * spacing - offset + hash(i) * 40;
      const size = 40 + hash(i + 3) * 30;

      ctx.fillStyle = "#3a2e2a";
      ctx.fillRect(x - 3, groundY - size * 0.4, 6, size * 0.4 + 6);

      ctx.fillStyle = "#24493f";
      ctx.beginPath();
      ctx.moveTo(x, groundY - size * 1.4);
      ctx.lineTo(x + size * 0.45, groundY - size * 0.3);
      ctx.lineTo(x - size * 0.45, groundY - size * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  },
};

// Gives the same "random" number (0 to 1) for the same input every time,
// so trees and pebbles stay put instead of flickering as you scroll.
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
