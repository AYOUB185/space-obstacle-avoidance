class FollowerShip extends Vehicle {
  /**
   * Vaisseau suiveur sous-classe de Vehicle.
   * Au niveau 1 : pacifique, en nombre réduit, suit la cible et évite les obstacles.
   * Au niveau 2 : hostile, destructible par les tirs du joueur, capable de frapper le joueur.
   * @param {number} x - Position X
   * @param {number} y - Position Y
   */
  constructor(x, y) {
    super(x, y);
    this.r_pourDessin = 14;
    this.r = 30; // Rayon de perception/évitement
    this.maxSpeed = random(3.5, 6);
    this.maxForce = random(0.2, 0.4);

    // Propriétés de combat et d'hostilité (Niveau supérieur)
    this.isHostile = false;
    this.hp = 1;
    this.hitCooldown = 0;
    // Avions blancs au niveau 1
    this.colorTheme = color(255, 255, 255);
  }

  /**
   * Force de répulsion de la lumière centrale pour que les avions blancs s'éloignent lorsqu'elle est activée.
   * @param {p5.Vector} centerPos - Position de la lumière centrale (Soleil)
   * @param {number} strength - Force de répulsion
   */
  applyCentralLightRepulsion(centerPos, strength = 3.2) {
    if (!centerPos || this.isHostile) return;
    let repelForce = this.flee(centerPos);
    repelForce.mult(strength);
    this.applyForce(repelForce);
  }

  /**
   * Active le mode hostile (Avions rouges au niveau 2 et supérieur).
   */
  setHostile(hostile = true) {
    this.isHostile = hostile;
    if (this.isHostile) {
      this.maxSpeed = 5.5;
      this.maxForce = 0.45;
      // Avions rouges au niveau 2
      this.colorTheme = color(255, 40, 40);
    } else {
      this.colorTheme = color(255, 255, 255);
    }
  }

  /**
   * Tente de frapper le joueur si hostile et à portée.
   * @param {SpaceShip} player 
   * @returns {string|null} 'hit', 'shield_blocked', ou null
   */
  checkAttackPlayer(player) {
    if (!this.isHostile || !player || !player.pos) return null;
    if (this.hitCooldown > 0) {
      this.hitCooldown--;
      return null;
    }

    let d = p5.Vector.dist(this.pos, player.pos);
    let attackDist = this.r_pourDessin + player.r_pourDessin;

    if (d < attackDist) {
      this.hitCooldown = 60; // 1 seconde de répit entre deux frappes

      // Si le bouclier est actif, la frappe est repoussée !
      if (player.shieldActive) {
        let repel = p5.Vector.sub(this.pos, player.pos).setMag(8);
        this.applyForce(repel);
        return 'shield_blocked';
      }

      // Sinon, inflige des dégâts au joueur
      player.health = Math.max(0, player.health - 12);
      let knockback = p5.Vector.sub(player.pos, this.pos).setMag(4);
      player.applyForce(knockback);
      return 'hit';
    }

    return null;
  }

  /**
   * Vérifie si touché par un projectile plasma du joueur.
   * @param {Projectile} projectile 
   * @returns {boolean} True si détruit
   */
  checkHit(projectile) {
    if (!this.isHostile || !projectile || projectile.isDead()) return false;

    let d = p5.Vector.dist(this.pos, projectile.pos);
    if (d < this.r_pourDessin + projectile.r) {
      this.hp--;
      projectile.alive = false;
      return true;
    }
    return false;
  }

  /**
   * Surcharge du comportement selon le niveau (pacifique ou traque agressive).
   * @param {p5.Vector} target 
   * @param {Obstacle[]} obstacles 
   * @param {Vehicle[]} swarm 
   * @param {SpaceShip} player 
   */
  applyBehaviors(target, obstacles, swarm, player) {
    if (obstacles && obstacles.length > 0) {
      let avoidForce = this.avoid(obstacles);
      avoidForce.mult(2.5);
      this.applyForce(avoidForce);
    }

    let separateForce = this.separate(swarm);
    separateForce.mult(1.5);
    this.applyForce(separateForce);

    if (this.isHostile && player && player.pos) {
      // Traque le joueur pour le frapper
      let huntForce = this.seek(player.pos);
      huntForce.mult(0.9);
      this.applyForce(huntForce);
    } else {
      // Suit la cible douce
      let seekForce = this.seek(target);
      seekForce.mult(0.5);
      this.applyForce(seekForce);
    }
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    noStroke();
    // Flamme du réacteur
    if (this.isHostile) {
      fill(255, 80, 20, 180);
    } else {
      fill(0, 200, 255, 180);
    }
    triangle(-this.r_pourDessin * 0.8, -3, -this.r_pourDessin * 1.5, 0, -this.r_pourDessin * 0.8, 3);

    // Fuselage du vaisseau suiveur
    fill(this.colorTheme);
    stroke(20, 30, 50);
    strokeWeight(1.2);
    beginShape();
    vertex(this.r_pourDessin * 1.2, 0);
    vertex(-this.r_pourDessin * 0.7, -this.r_pourDessin * 0.6);
    vertex(-this.r_pourDessin * 0.4, 0);
    vertex(-this.r_pourDessin * 0.7, this.r_pourDessin * 0.6);
    endShape(CLOSE);

    // Cockpit
    noStroke();
    if (this.isHostile) {
      fill(255, 230, 50);
    } else {
      fill(255, 255, 255, 220);
    }
    circle(this.r_pourDessin * 0.2, 0, 4);

    pop();
  }
}
