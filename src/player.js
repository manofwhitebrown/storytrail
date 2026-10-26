// player.js - the little traveler. Stays in place while the world scrolls.

const Player = {
  x: 220,
  stepAnim: 0, // 1 right after a step, fades to 0

  step() {
    this.stepAnim = 1;
  },

  update(dt) {
    this.stepAnim = Math.max(0, this.stepAnim - dt * 2.5);
  },

  draw(ctx, h) {
    const groundY = h * 0.72 + 70;
    const t = 1 - this.stepAnim;              // 0 -> 1 during a step
    const hop = Math.sin(t * Math.PI) * 12 * this.stepAnim;
    const swing = Math.sin(t * Math.PI * 2) * 8 * this.stepAnim;
    const y = groundY - hop;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(this.x, groundY + 4, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = "#2a2233";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(this.x - 6, y - 14); ctx.lineTo(this.x - 6 + swing, y);
    ctx.moveTo(this.x + 6, y - 14); ctx.lineTo(this.x + 6 - swing, y);
    ctx.stroke();

    // Body (a coat)
    ctx.fillStyle = "#5f8f8b";
    roundRect(ctx, this.x - 14, y - 46, 28, 36, 8);

    // Scarf
    ctx.fillStyle = "#f2d675";
    roundRect(ctx, this.x - 14, y - 48, 28, 7, 3);

    // Head
    ctx.fillStyle = "#f1d5b5";
    ctx.beginPath();
    ctx.arc(this.x, y - 60, 11, 0, Math.PI * 2);
    ctx.fill();

    // Hat
    ctx.fillStyle = "#3b4a6b";
    roundRect(ctx, this.x - 13, y - 74, 26, 8, 4);
  },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}
