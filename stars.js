class CosmicBackground {
  constructor(starCount = 90) {
    this.stars = [];
    this.comets = [];
    this.nebulaOrbs = [];
    this.initStars(starCount);
    this.initNebula();
  }

  initStars(count) {
    this.stars = [];
    const colorChoices = [
      [255, 255, 255],
      [200, 230, 255],
      [255, 230, 180],
      [180, 220, 255],
      [255, 190, 220]
    ];
    for (let i = 0; i < count; i++) {
      let rgb = random(colorChoices);
      this.stars.push({
        x: random(width),
        y: random(height),
        size: random(1, 2.8),
        twinkleSpeed: random(0.02, 0.08),
        twinklePhase: random(TWO_PI),
        r: rgb[0],
        g: rgb[1],
        b: rgb[2]
      });
    }
  }

  initNebula() {
    this.nebulaOrbs = [
      { x: width * 0.2, y: height * 0.3, r: 250, col: [20, 60, 140, 25] },
      { x: width * 0.8, y: height * 0.7, r: 300, col: [120, 40, 150, 20] },
      { x: width * 0.5, y: height * 0.5, r: 220, col: [0, 140, 180, 18] }
    ];
  }

  spawnComet() {
    let startX = random(width * 0.3, width);
    let startY = -20;
    this.comets.push({
      x: startX,
      y: startY,
      vx: random(-9, -5),
      vy: random(5, 9),
      len: random(40, 90),
      lifespan: 255,
      r: random(160, 230),
      g: random(220, 255),
      b: 255
    });
  }

  updateAndShow() {
    // 1. Nuages de nébuleuses cosmiques lointaines
    noStroke();
    for (let neb of this.nebulaOrbs) {
      fill(neb.col[0], neb.col[1], neb.col[2], neb.col[3]);
      circle(neb.x, neb.y, neb.r * 2);
    }

    // 2. Étoiles scintillantes sans conversion lourde de couleurs
    for (let s of this.stars) {
      s.twinklePhase += s.twinkleSpeed;
      let alpha = map(sin(s.twinklePhase), -1, 1, 90, 255);
      fill(s.r, s.g, s.b, alpha);
      circle(s.x, s.y, s.size);
    }

    // 3. Comètes périodiques traversant l'espace
    if (frameCount % 240 === 0 && random() > 0.5) {
      this.spawnComet();
    }

    for (let i = this.comets.length - 1; i >= 0; i--) {
      let c = this.comets[i];
      c.x += c.vx;
      c.y += c.vy;
      c.lifespan -= 4;

      strokeWeight(2);
      stroke(c.r, c.g, c.b, c.lifespan);
      line(c.x, c.y, c.x - c.vx * 4, c.y - c.vy * 4);

      noStroke();
      fill(255, 255, 255, c.lifespan);
      circle(c.x, c.y, 4);

      if (c.lifespan <= 0 || c.x < -100 || c.y > height + 100) {
        this.comets.splice(i, 1);
      }
    }
  }
}
