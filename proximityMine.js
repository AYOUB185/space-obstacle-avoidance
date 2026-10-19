class ProximityMine extends Vehicle {
  /**
   * Mine spatiale à détection sonar de proximité (Niveau 6).
   * En veille, elle dérive lentement dans l'espace.
   * Lorsqu'une cible entre dans son rayon de détection sonar,
   * la mine s'arme et utilise le steering seek pour foncer et exploser au contact.
   * Peut être détruite par tir plasma pour déclencher des réactions en chaîne.
   * @param {number} x - Position initiale X
   * @param {number} y - Position initiale Y
   */
  constructor(x, y) {
    super(x, y);
    this.r_pourDessin = 18;
    this.r = 28;
    this.maxSpeed = 5.8;
    this.maxForce = 0.42;

    this.isArmed = false;
    this.detectionRadius = 200;
    this.blastRadius = 100;
    this.pulse = random(TWO_PI);
    this.hp = 1;

    // Dérive flottante initiale
    this.vel = p5.Vector.random2D().mult(0.6);
  }

  /**
   * Analyse la proximité du joueur pour s'armer et foncer dessus.
   * @param {SpaceShip} player 
   * @param {Obstacle[]} obstacles 
   * @param {ProximityMine[]} minefield 
   */
  applyBehaviors(player, obstacles, minefield) {
    if (obstacles && obstacles.length > 0) {
      let avoidForce = this.avoid(obstacles);
      avoidForce.mult(1.5);
      this.applyForce(avoidForce);
    }

    if (minefield && minefield.length > 1) {
      let sep = this.separate(minefield);
      sep.mult(1.2);
      this.applyForce(sep);
    }

    if (!player || !player.pos) return;

    let d = p5.Vector.dist(this.pos, player.pos);
    if (d < this.detectionRadius) {
      // Détection sonar : la mine s'arme et traque le joueur agressivement
      this.isArmed = true;
      let chargeForce = this.seek(player.pos);
      chargeForce.mult(1.3);
      this.applyForce(chargeForce);
    } else {
      this.isArmed = false;
      // Dérive d'amortissement
      this.vel.mult(0.97);
    }
  }

  /**
   * Vérifie la collision explosive avec le joueur.
   * @param {SpaceShip} player 
   * @returns {string|null} 'hit', 'shield_blocked', ou null
   */
  checkCollisionWithPlayer(player) {
    if (!player || !player.pos) return null;
    let d = p5.Vector.dist(this.pos, player.pos);
    if (d < this.r_pourDessin + player.r_pourDessin) {
      if (player.shieldActive) {
        return 'shield_blocked';
      }
      player.health = Math.max(0, player.health - 16);
      return 'hit';
    }
    return null;
  }

  /**
   * Vérifie si touchée par un projectile plasma.
   * @param {Projectile} projectile 
   * @returns {boolean} True si détonée
   */
  checkHit(projectile) {
    if (!projectile || projectile.isDead()) return false;
    let d = p5.Vector.dist(this.pos, projectile.pos);
    if (d < this.r_pourDessin + projectile.r) {
      this.hp--;
      projectile.alive = false;
      return true;
    }
    return false;
  }

  show() {
    this.pulse += this.isArmed ? 0.25 : 0.06;
    let pulseWave = sin(this.pulse);

    push();
    translate(this.pos.x, this.pos.y);

    // Cercles de détection sonar
    noFill();
    if (this.isArmed) {
      stroke(255, 50, 50, 140 + pulseWave * 80);
      strokeWeight(2);
      circle(0, 0, (this.r_pourDessin * 3.2) + pulseWave * 8);

      stroke(255, 120, 0, 90);
      strokeWeight(1);
      circle(0, 0, this.r_pourDessin * 4.4);
    } else {
      stroke(0, 200, 255, 40 + pulseWave * 20);
      strokeWeight(1);
      circle(0, 0, this.r_pourDessin * 2.5);
    }

    // Pointes métalliques de la mine (forme octogonale hérissée)
    let spikes = 8;
    fill(40, 42, 50);
    stroke(this.isArmed ? color(255, 60, 60) : color(80, 140, 180));
    strokeWeight(1.5);

    for (let i = 0; i < spikes; i++) {
      let a = (TWO_PI / spikes) * i + (this.isArmed ? this.pulse * 0.1 : 0);
      let r1 = this.r_pourDessin * 0.8;
      let r2 = this.r_pourDessin * 1.35;
      line(cos(a) * r1, sin(a) * r1, cos(a) * r2, sin(a) * r2);
    }

    // Coque centrale
    fill(25, 28, 35);
    circle(0, 0, this.r_pourDessin * 1.6);

    // Cœur explosif pulsant
    noStroke();
    if (this.isArmed) {
      fill(255, 40, 40, 240);
      circle(0, 0, 10 + pulseWave * 4);
    } else {
      fill(0, 220, 255, 180);
      circle(0, 0, 6 + pulseWave * 2);
    }

    pop();
  }
}
