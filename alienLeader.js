class AlienLeader extends Vehicle {
  /**
   * Vaisseau Amiral Alien (Leader de la nuée - Niveau 5).
   * Patrouille majestueusement dans le secteur spatial avec un comportement de wander.
   * Sert de point d'ancrage pour les ailiers intercepteurs qui le suivent en formation.
   * @param {number} x - Position initiale X
   * @param {number} y - Position initiale Y
   */
  constructor(x, y) {
    super(x, y);
    this.r_pourDessin = 34;
    this.r = 60;
    this.maxSpeed = 2.8;
    this.maxForce = 0.12;

    this.hp = 6;
    this.maxHp = 6;
    this.pulse = random(TWO_PI);

    // Paramètres wander pour patrouille fluide
    this.wanderAngle = random(TWO_PI);
    this.wanderRadius = 45;
    this.wanderDistance = 75;
    this.wanderJitter = 0.25;

    this.vel = p5.Vector.random2D().mult(1.5);
  }

  /**
   * Calcule le point d'ancrage situé derrière le leader pour la formation en V.
   * @param {number} distBehind - Distance derrière le leader
   * @returns {p5.Vector} Position derrière le leader
   */
  getBehindPosition(distBehind = 70) {
    let tv = this.vel.copy();
    if (tv.mag() < 0.1) tv = createVector(1, 0);
    tv.setMag(distBehind);
    return p5.Vector.sub(this.pos, tv);
  }

  /**
   * Comportement wander de patrouille avec évitement d'obstacles.
   * @param {Obstacle[]} obstacles 
   */
  applyBehaviors(obstacles) {
    this.wanderAngle += random(-this.wanderJitter, this.wanderJitter);
    let circleCenter = this.vel.copy();
    if (circleCenter.mag() < 0.1) circleCenter = createVector(1, 0);
    circleCenter.setMag(this.wanderDistance);

    let displacement = createVector(cos(this.wanderAngle), sin(this.wanderAngle)).setMag(this.wanderRadius);
    let desired = p5.Vector.add(circleCenter, displacement).setMag(this.maxSpeed);

    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    this.applyForce(steer);

    if (obstacles && obstacles.length > 0) {
      let avoidForce = this.avoid(obstacles);
      avoidForce.mult(2.0);
      this.applyForce(avoidForce);
    }
  }

  /**
   * Vérifie la collision avec un projectile plasma du joueur.
   * @param {Projectile} projectile 
   * @returns {boolean} True si le leader est vaincu
   */
  checkHit(projectile) {
    if (!projectile || projectile.isDead()) return false;
    let d = p5.Vector.dist(this.pos, projectile.pos);
    if (d < this.r_pourDessin + projectile.r) {
      this.hp--;
      projectile.alive = false;
      return this.hp <= 0;
    }
    return false;
  }

  show() {
    this.pulse += 0.05;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    // Halo d'énergie de commandement
    noStroke();
    fill(255, 30, 110, 35);
    circle(0, 0, (this.r_pourDessin * 2.6) + sin(this.pulse) * 4);

    // Fuselage lourd alien (vaisseau en trident blindé)
    fill(35, 15, 35);
    stroke(255, 50, 120);
    strokeWeight(2);

    beginShape();
    vertex(this.r_pourDessin * 1.5, 0);
    vertex(this.r_pourDessin * 0.4, -this.r_pourDessin * 0.7);
    vertex(-this.r_pourDessin * 0.8, -this.r_pourDessin * 1.1);
    vertex(-this.r_pourDessin * 0.5, -this.r_pourDessin * 0.3);
    vertex(-this.r_pourDessin * 1.1, 0);
    vertex(-this.r_pourDessin * 0.5, this.r_pourDessin * 0.3);
    vertex(-this.r_pourDessin * 0.8, this.r_pourDessin * 1.1);
    vertex(this.r_pourDessin * 0.4, this.r_pourDessin * 0.7);
    endShape(CLOSE);

    // Cockpit et générateurs d'hyperpropulsion
    noStroke();
    fill(255, 60, 130);
    circle(this.r_pourDessin * 0.2, 0, 14);
    fill(255, 230, 240);
    circle(this.r_pourDessin * 0.3, 0, 6);

    // Jauge de points de vie au-dessus du vaisseau
    rotate(-this.vel.heading());
    stroke(0, 0, 0, 150);
    strokeWeight(1);
    fill(40, 10, 20, 200);
    rectMode(CENTER);
    rect(0, -this.r_pourDessin * 1.4, 46, 6, 2);

    let lifeRatio = Math.max(0, this.hp / this.maxHp);
    fill(255, 40, 100);
    noStroke();
    rectMode(CORNER);
    rect(-22, -this.r_pourDessin * 1.4 - 2.5, 44 * lifeRatio, 5, 2);

    pop();
  }
}
