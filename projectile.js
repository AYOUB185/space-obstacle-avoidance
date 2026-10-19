/**
 * Projectile — un missile/torpille à plasma guidé par steering behavior "seek".
 * Étend Vehicle pour bénéficier de applyForce, update et la locomotion héritée.
 * Le projectile se dirige vers la planète la plus proche et explose à l'impact.
 */
class Projectile extends Vehicle {
  /**
   * @param {number} x - Position X de départ (position du vaisseau)
   * @param {number} y - Position Y de départ (position du vaisseau)
   * @param {p5.Vector} direction - Direction initiale du tir (heading du vaisseau)
   * @param {Obstacle|null} target - Cible à poursuivre (planète la plus proche), ou null
   */
  constructor(x, y, direction, target = null) {
    super(x, y);
    this.r_pourDessin = 6;
    this.r = 8;
    this.maxSpeed = 14;
    this.maxForce = 0.8;

    // Vitesse initiale dans la direction du tir
    this.vel = direction.copy().setMag(this.maxSpeed);

    // Cible à poursuivre (planète)
    this.target = target;

    // Durée de vie en frames (auto-destruction après ~3 secondes)
    this.lifespan = 180;
    this.age = 0;
    this.alive = true;

    // Traînée plasma
    this.trail = [];
    this.trailMaxLen = 12;

    // Paramètres visuels
    this.glowPulse = random(TWO_PI);
    this.projectileType = random(['plasma', 'laser', 'torpedo']);
  }

  /**
   * Met à jour le projectile : applique le seek vers la cible,
   * met à jour la position et vérifie la durée de vie.
   */
  updateProjectile() {
    if (!this.alive) return;

    this.age++;
    this.glowPulse += 0.3;

    if (this.age > this.lifespan) {
      this.alive = false;
      return;
    }

    // Steering : seek vers la cible si elle existe encore
    if (this.target) {
      let seekForce = this.seek(this.target.pos);
      seekForce.mult(1.5);
      this.applyForce(seekForce);
    }

    // Stocker la position pour la traînée
    this.trail.push(this.pos.copy());
    if (this.trail.length > this.trailMaxLen) {
      this.trail.shift();
    }

    // Locomotion héritée
    this.update();
  }

  /**
   * Vérifie la collision avec les obstacles/planètes.
   * @param {Obstacle[]} obstacles - Liste des obstacles
   * @returns {Obstacle|null} L'obstacle touché, ou null
   */
  checkCollision(obstacles) {
    if (!this.alive) return null;

    for (let obs of obstacles) {
      let d = p5.Vector.dist(this.pos, obs.pos);
      if (d < obs.r + this.r) {
        this.alive = false;
        return obs;
      }
    }
    return null;
  }

  /**
   * Affiche le projectile avec effets visuels néon et plasma.
   */
  show() {
    if (!this.alive) return;

    push();

    // 1. Traînée plasma lumineuse
    this.drawProjectileTrail();

    // 2. Corps du projectile
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    let fadeAlpha = map(this.age, this.lifespan * 0.7, this.lifespan, 255, 50);
    fadeAlpha = constrain(fadeAlpha, 50, 255);

    if (this.projectileType === 'plasma') {
      this.drawPlasma(fadeAlpha);
    } else if (this.projectileType === 'laser') {
      this.drawLaser(fadeAlpha);
    } else {
      this.drawTorpedo(fadeAlpha);
    }

    pop();
  }

  drawPlasma(alpha) {
    let glowSize = 18 + sin(this.glowPulse) * 4;

    // Halo extérieur
    noStroke();
    fill(0, 200, 255, alpha * 0.2);
    circle(0, 0, glowSize * 2);

    // Corps plasma cyan
    fill(0, 220, 255, alpha * 0.8);
    circle(0, 0, glowSize * 0.8);

    // Noyau blanc incandescent
    fill(255, 255, 255, alpha);
    circle(0, 0, glowSize * 0.35);
  }

  drawLaser(alpha) {
    // Rayon laser rouge/orange
    noStroke();
    fill(255, 60, 20, alpha * 0.3);
    ellipse(0, 0, 28, 8);

    fill(255, 120, 40, alpha * 0.7);
    ellipse(0, 0, 20, 5);

    fill(255, 255, 200, alpha);
    ellipse(0, 0, 12, 3);
  }

  drawTorpedo(alpha) {
    let pulse = sin(this.glowPulse) * 3;

    // Halo vert
    noStroke();
    fill(0, 255, 100, alpha * 0.15);
    circle(0, 0, 22 + pulse);

    // Corps de la torpille
    fill(60, 255, 120, alpha * 0.8);
    beginShape();
    vertex(this.r_pourDessin * 1.5, 0);
    vertex(-this.r_pourDessin * 0.5, -this.r_pourDessin * 0.5);
    vertex(-this.r_pourDessin * 0.8, 0);
    vertex(-this.r_pourDessin * 0.5, this.r_pourDessin * 0.5);
    endShape(CLOSE);

    // Noyau
    fill(255, 255, 255, alpha);
    circle(this.r_pourDessin * 0.3, 0, 4);

    // Flamme arrière
    fill(0, 255, 120, alpha * 0.6);
    triangle(
      -this.r_pourDessin * 0.8, -2,
      -this.r_pourDessin * 1.5 - pulse, 0,
      -this.r_pourDessin * 0.8, 2
    );
  }

  drawProjectileTrail() {
    if (this.trail.length < 2) return;

    noFill();
    for (let i = 1; i < this.trail.length; i++) {
      let alpha = map(i, 0, this.trail.length, 10, 180);

      if (this.projectileType === 'plasma') {
        stroke(0, 200, 255, alpha);
      } else if (this.projectileType === 'laser') {
        stroke(255, 100, 30, alpha);
      } else {
        stroke(0, 255, 120, alpha);
      }

      strokeWeight(map(i, 0, this.trail.length, 0.5, 3));
      line(
        this.trail[i - 1].x, this.trail[i - 1].y,
        this.trail[i].x, this.trail[i].y
      );
    }
  }

  isDead() {
    return !this.alive;
  }
}
