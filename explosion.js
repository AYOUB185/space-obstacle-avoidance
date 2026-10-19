/**
 * Explosion — effets visuels spectaculaires lorsqu'un projectile
 * touche une planète. Particules, anneaux de choc et débris lumineux.
 */
class Explosion {
  /**
   * @param {number} x - Position X de l'explosion
   * @param {number} y - Position Y de l'explosion
   * @param {number} size - Taille de base (basée sur le rayon de la planète)
   * @param {string} type - Type d'explosion : 'planet', 'sun', 'shield'
   */
  constructor(x, y, size, type = 'planet') {
    this.pos = createVector(x, y);
    this.size = size;
    this.type = type;
    this.age = 0;
    this.maxAge = 90; // ~1.5 secondes
    this.alive = true;

    // Particules de l'explosion
    this.particles = [];
    this.initParticles();

    // Anneaux de choc concentriques
    this.shockRings = [];
    this.shockRings.push({ radius: 0, maxRadius: size * 3, speed: 4, alpha: 255 });
    this.shockRings.push({ radius: 0, maxRadius: size * 5, speed: 2.5, alpha: 180 });

    // Flash initial
    this.flashAlpha = 255;
    this.flashSize = size * 2;
  }

  initParticles() {
    let count = 40 + floor(this.size * 0.5);

    for (let i = 0; i < count; i++) {
      let angle = random(TWO_PI);
      let speed = random(1.5, 8);
      let pSize = random(2, 7);

      // Couleurs selon le type d'explosion
      let col;
      if (this.type === 'sun') {
        // Explosion solaire : jaune/orange/rouge
        col = color(
          random(200, 255),
          random(80, 200),
          random(0, 50)
        );
      } else if (this.type === 'shield') {
        // Bouclier : bleu/cyan
        col = color(
          random(0, 60),
          random(180, 255),
          255
        );
      } else {
        // Planète : mélange multicolore de débris
        let palette = [
          color(255, random(100, 200), random(0, 80)),    // Orange
          color(random(60, 150), random(180, 255), 255),  // Cyan/bleu
          color(255, 255, random(150, 255)),               // Blanc/jaune
          color(random(150, 220), random(100, 180), 255),  // Violet/rose
        ];
        col = random(palette);
      }

      this.particles.push({
        x: this.pos.x,
        y: this.pos.y,
        vx: cos(angle) * speed,
        vy: sin(angle) * speed,
        size: pSize,
        alpha: 255,
        decay: random(2, 6),
        color: col,
        rotation: random(TWO_PI),
        rotSpeed: random(-0.2, 0.2),
        // Quelques particules sont des "étoiles" (points brillants)
        isStar: random() > 0.7
      });
    }
  }

  update() {
    if (!this.alive) return;

    this.age++;
    if (this.age > this.maxAge) {
      this.alive = false;
      return;
    }

    // Flash décroissant
    this.flashAlpha = max(0, this.flashAlpha - 12);
    this.flashSize += 3;

    // Mise à jour des particules
    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      // Friction et gravité légère
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.vy += 0.02; // Légère gravité
      p.alpha = max(0, p.alpha - p.decay);
      p.rotation += p.rotSpeed;
      p.size *= 0.995;
    }

    // Mise à jour des anneaux de choc
    for (let ring of this.shockRings) {
      ring.radius += ring.speed;
      ring.alpha = map(ring.radius, 0, ring.maxRadius, 255, 0);
      ring.alpha = max(0, ring.alpha);
    }
  }

  show() {
    if (!this.alive) return;

    push();

    // 1. Flash initial éblouissant
    if (this.flashAlpha > 5) {
      noStroke();
      fill(255, 255, 255, this.flashAlpha * 0.3);
      circle(this.pos.x, this.pos.y, this.flashSize * 2);

      fill(255, 255, 200, this.flashAlpha * 0.6);
      circle(this.pos.x, this.pos.y, this.flashSize);

      fill(255, 255, 255, this.flashAlpha);
      circle(this.pos.x, this.pos.y, this.flashSize * 0.4);
    }

    // 2. Anneaux de choc
    for (let ring of this.shockRings) {
      if (ring.alpha > 5) {
        noFill();
        if (this.type === 'sun') {
          stroke(255, 180, 0, ring.alpha);
        } else {
          stroke(0, 200, 255, ring.alpha);
        }
        strokeWeight(3);
        circle(this.pos.x, this.pos.y, ring.radius * 2);

        // Anneau interne plus lumineux
        strokeWeight(1.5);
        stroke(255, 255, 255, ring.alpha * 0.5);
        circle(this.pos.x, this.pos.y, ring.radius * 1.6);
      }
    }

    // 3. Particules
    for (let p of this.particles) {
      if (p.alpha < 2) continue;

      let c = p.color;
      noStroke();

      if (p.isStar) {
        // Étoile scintillante : croix brillante
        push();
        translate(p.x, p.y);
        rotate(p.rotation);
        fill(red(c), green(c), blue(c), p.alpha);
        rect(-p.size / 2, -1, p.size, 2);
        rect(-1, -p.size / 2, 2, p.size);
        pop();
      } else {
        // Particule standard : point avec halo
        fill(red(c), green(c), blue(c), p.alpha * 0.3);
        circle(p.x, p.y, p.size * 3);

        fill(red(c), green(c), blue(c), p.alpha);
        circle(p.x, p.y, p.size);
      }
    }

    // 4. Texte "DESTROYED!" qui s'efface
    if (this.age < 40 && this.type !== 'shield') {
      let txtAlpha = map(this.age, 0, 40, 255, 0);
      fill(255, 80, 80, txtAlpha);
      noStroke();
      textFont('monospace');
      textSize(14);
      textAlign(CENTER, CENTER);
      text('DESTROYED!', this.pos.x, this.pos.y - this.size - 20);
    }

    // 5. Texte "SHIELD!" pour le Soleil
    if (this.age < 40 && this.type === 'shield') {
      let txtAlpha = map(this.age, 0, 40, 255, 0);
      fill(255, 200, 0, txtAlpha);
      noStroke();
      textFont('monospace');
      textSize(14);
      textAlign(CENTER, CENTER);
      text('SHIELD!', this.pos.x, this.pos.y - this.size - 20);
    }

    pop();
  }

  isDead() {
    return !this.alive;
  }
}
