/**
 * ExplosionGalaxyBackground — Arrière-plan dynamique et spectaculaire d'une
 * galaxie en pleine explosion cosmique (supernova, onde de choc, braises ardentes,
 * nébuleuses de feu et plasma incandescent).
 */
class ExplosionGalaxyBackground {
  constructor() {
    this.corePulse = 0;
    this.embers = [];
    this.blastRings = [];
    this.fireClouds = [];
    this.stars = [];
    this.init();
  }

  init() {
    this.initStars(90);
    this.initFireClouds();
    this.initEmbers(75);
    this.initBlastRings();
  }

  initStars(count) {
    this.stars = [];
    const colors = [
      [255, 230, 180],
      [255, 160, 60],
      [255, 80, 40],
      [255, 255, 255],
      [255, 210, 100]
    ];
    for (let i = 0; i < count; i++) {
      let c = colors[floor(Math.random() * colors.length)];
      this.stars.push({
        x: Math.random() * (typeof width !== 'undefined' ? width : 1200),
        y: Math.random() * (typeof height !== 'undefined' ? height : 800),
        size: Math.random() * 2.8 + 1,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.08 + 0.03,
        r: c[0],
        g: c[1],
        b: c[2]
      });
    }
  }

  initFireClouds() {
    let w = typeof width !== 'undefined' ? width : 1200;
    let h = typeof height !== 'undefined' ? height : 800;
    this.fireClouds = [
      { x: w * 0.5, y: h * 0.5, r: 420, col: [255, 60, 10, 35], pulseSpeed: 0.02 },
      { x: w * 0.35, y: h * 0.45, r: 320, col: [240, 110, 20, 28], pulseSpeed: 0.025 },
      { x: w * 0.65, y: h * 0.55, r: 350, col: [220, 30, 50, 30], pulseSpeed: 0.018 },
      { x: w * 0.2, y: h * 0.8, r: 280, col: [180, 40, 90, 22], pulseSpeed: 0.015 },
      { x: w * 0.8, y: h * 0.25, r: 300, col: [255, 140, 0, 25], pulseSpeed: 0.022 }
    ];
  }

  initEmbers(count) {
    let w = typeof width !== 'undefined' ? width : 1200;
    let h = typeof height !== 'undefined' ? height : 800;
    this.embers = [];
    for (let i = 0; i < count; i++) {
      this.embers.push(this.createEmber(w, h));
    }
  }

  createEmber(w, h) {
    let angle = Math.random() * Math.PI * 2;
    let speed = Math.random() * 2.2 + 0.8;
    return {
      x: w * 0.5 + Math.cos(angle) * (Math.random() * 120),
      y: h * 0.5 + Math.sin(angle) * (Math.random() * 120),
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.6,
      vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.6,
      size: Math.random() * 4.5 + 2,
      alpha: Math.random() * 180 + 75,
      decay: Math.random() * 1.5 + 0.6,
      r: 255,
      g: Math.floor(Math.random() * 160 + 80),
      b: Math.floor(Math.random() * 50)
    };
  }

  initBlastRings() {
    this.blastRings = [
      { r: 80, speed: 2.8, alpha: 220, maxR: 900 },
      { r: 280, speed: 2.2, alpha: 160, maxR: 1100 },
      { r: 480, speed: 1.8, alpha: 100, maxR: 1300 }
    ];
  }

  updateAndShow() {
    let w = typeof width !== 'undefined' ? width : 1200;
    let h = typeof height !== 'undefined' ? height : 800;
    this.corePulse += 0.04;

    push();

    // 1. Teinte cosmique d'explosion (fond incandescent rouge-orangé / braise)
    background(24, 7, 7, 95);

    // 2. Nuages de plasma incandescent et nébuleuses explosives
    noStroke();
    for (let cloud of this.fireClouds) {
      let pulse = Math.sin(this.corePulse * cloud.pulseSpeed * 25) * 35;
      fill(cloud.col[0], cloud.col[1], cloud.col[2], cloud.col[3]);
      circle(cloud.x, cloud.y, (cloud.r + pulse) * 2);
    }

    // 3. Étoiles explosives scintillantes
    for (let s of this.stars) {
      s.phase += s.speed;
      let alpha = 120 + Math.sin(s.phase) * 135;
      fill(s.r, s.g, s.b, alpha);
      circle(s.x, s.y, s.size);
    }

    // 4. Noyau de la Supernova Galactique au centre
    let cx = w / 2;
    let cy = h / 2;
    let pulseScale = 1 + Math.sin(this.corePulse) * 0.12;

    // Halos concentriques de l'explosion centrale
    noStroke();
    fill(255, 50, 0, 28);
    circle(cx, cy, 550 * pulseScale);

    fill(255, 120, 10, 45);
    circle(cx, cy, 380 * pulseScale);

    fill(255, 190, 40, 70);
    circle(cx, cy, 220 * pulseScale);

    fill(255, 245, 160, 120);
    circle(cx, cy, 110 * pulseScale);

    fill(255, 255, 255, 210);
    circle(cx, cy, 45 * pulseScale);

    // 5. Anneaux de choc se propageant dans la galaxie
    noFill();
    for (let ring of this.blastRings) {
      ring.r += ring.speed;
      ring.alpha -= 0.35;
      if (ring.r > ring.maxR || ring.alpha <= 0) {
        ring.r = 30;
        ring.alpha = 230;
      }
      strokeWeight(Math.max(1, 3.5 * (1 - ring.r / ring.maxR)));
      stroke(255, 160, 40, ring.alpha);
      circle(cx, cy, ring.r * 2);

      // Deuxième onde fine
      strokeWeight(1);
      stroke(255, 80, 20, ring.alpha * 0.6);
      circle(cx, cy, ring.r * 1.95);
    }

    // 6. Braises cosmiques incandescentes
    noStroke();
    for (let i = this.embers.length - 1; i >= 0; i--) {
      let emb = this.embers[i];
      emb.x += emb.vx;
      emb.y += emb.vy;
      emb.alpha -= emb.decay;

      if (emb.alpha <= 0 || emb.x < -50 || emb.x > w + 50 || emb.y < -50 || emb.y > h + 50) {
        this.embers[i] = this.createEmber(w, h);
      } else {
        fill(emb.r, emb.g, emb.b, emb.alpha);
        circle(emb.x, emb.y, emb.size);
      }
    }

    pop();
  }
}
