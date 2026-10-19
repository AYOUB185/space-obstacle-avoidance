class IonDrone extends Vehicle {
  /**
   * Drone sentinelle ionique (Niveau 4).
   * Poursuit les jetons dans l'espace pour les absorber avant le joueur,
   * fuit le joueur si son bouclier est actif, et relâche les jetons volés lorsqu'il est détruit.
   * @param {number} x - Position initiale X
   * @param {number} y - Position initiale Y
   */
  constructor(x, y) {
    super(x, y);
    this.r_pourDessin = 16;
    this.r = 28;
    this.maxSpeed = 4.8;
    this.maxForce = 0.35;

    this.hp = 1;
    this.stolenTokens = 0;
    this.pulse = random(TWO_PI);
    this.coreColor = color(0, 230, 255);
    this.glowColor = color(180, 0, 255);
  }

  /**
   * Poursuit le jeton le plus proche ou fuit le bouclier du joueur.
   * @param {Token[]} tokenList 
   * @param {SpaceShip} player 
   * @param {Obstacle[]} obstacles 
   * @param {IonDrone[]} swarm 
   */
  applyBehaviors(tokenList, player, obstacles, swarm) {
    if (obstacles && obstacles.length > 0) {
      let avoidForce = this.avoid(obstacles);
      avoidForce.mult(1.8);
      this.applyForce(avoidForce);
    }

    if (swarm && swarm.length > 1) {
      let sep = this.separate(swarm);
      sep.mult(1.4);
      this.applyForce(sep);
    }

    // Si le joueur a son bouclier actif et est proche, le drone fuit
    if (player && player.shieldActive && player.pos) {
      let dPlayer = p5.Vector.dist(this.pos, player.pos);
      if (dPlayer < 220) {
        let fleeForce = this.flee(player.pos);
        fleeForce.mult(1.6);
        this.applyForce(fleeForce);
        return;
      }
    }

    // Recherche et poursuite du jeton le plus proche
    let closestToken = null;
    let closestDist = Infinity;
    if (tokenList && tokenList.length > 0) {
      for (let t of tokenList) {
        if (!t.collected) {
          let d = p5.Vector.dist(this.pos, t.pos);
          if (d < closestDist) {
            closestDist = d;
            closestToken = t;
          }
        }
      }
    }

    if (closestToken) {
      let seekForce = this.seek(closestToken.pos);
      seekForce.mult(1.0);
      this.applyForce(seekForce);
    } else if (player && player.pos) {
      // Si aucun jeton, s'approche prudemment du joueur
      let seekForce = this.seek(player.pos);
      seekForce.mult(0.4);
      this.applyForce(seekForce);
    }
  }

  /**
   * Tente d'absorber un jeton si le drone le touche.
   * @param {Token} token 
   * @returns {boolean} True si absorbé
   */
  tryAbsorbToken(token) {
    if (!token || token.collected) return false;
    let d = p5.Vector.dist(this.pos, token.pos);
    if (d < this.r_pourDessin + token.r) {
      token.collected = true;
      this.stolenTokens++;
      return true;
    }
    return false;
  }

  /**
   * Vérifie la collision avec un projectile plasma du joueur.
   * @param {Projectile} projectile 
   * @returns {boolean} True si touché et détruit
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
    this.pulse += 0.08;
    let glow = sin(this.pulse) * 6;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    // Halo d'énergie ionique
    noStroke();
    fill(180, 0, 255, 45);
    circle(0, 0, (this.r_pourDessin * 2.8) + glow);

    fill(0, 230, 255, 90);
    circle(0, 0, (this.r_pourDessin * 1.8) + glow * 0.5);

    // Fuselage du drone (losange aérodynamique)
    fill(20, 25, 45);
    stroke(0, 230, 255);
    strokeWeight(1.5);
    beginShape();
    vertex(this.r_pourDessin * 1.4, 0);
    vertex(0, -this.r_pourDessin * 0.8);
    vertex(-this.r_pourDessin * 1.0, 0);
    vertex(0, this.r_pourDessin * 0.8);
    endShape(CLOSE);

    // Cœur énergétique pulsant
    fill(0, 255, 240);
    noStroke();
    circle(0, 0, 7 + sin(this.pulse * 2) * 2);

    // Indicateur de jetons volés (petites perles en orbite)
    if (this.stolenTokens > 0) {
      fill(255, 215, 0, 220);
      let beadCount = Math.min(this.stolenTokens, 5);
      for (let i = 0; i < beadCount; i++) {
        let a = (TWO_PI / beadCount) * i + this.pulse;
        let rad = this.r_pourDessin * 1.3;
        circle(cos(a) * rad, sin(a) * rad, 4);
      }
    }

    pop();
  }
}
