class AlienInterceptor extends Vehicle {
  /**
   * Chasseur intercepteur alien (Ailier - Niveau 5).
   * Implémente le comportement "Leader Following" de Craig Reynolds :
   * suit le vaisseau amiral alien en formation avec décalage, séparation et évitement.
   * @param {number} x - Position initiale X
   * @param {number} y - Position initiale Y
   * @param {number} slotAngle - Angle de décalage dans la formation
   */
  constructor(x, y, slotAngle = 0) {
    super(x, y);
    this.r_pourDessin = 14;
    this.r = 26;
    this.maxSpeed = 5.2;
    this.maxForce = 0.38;

    this.slotAngle = slotAngle;
    this.hp = 1;
    this.pulse = random(TWO_PI);
  }

  /**
   * Comportement Leader Following & Séparation d'escadre.
   * @param {AlienLeader} leader 
   * @param {AlienInterceptor[]} squadron 
   * @param {SpaceShip} player 
   * @param {Obstacle[]} obstacles 
   */
  applyBehaviors(leader, squadron, player, obstacles) {
    if (obstacles && obstacles.length > 0) {
      let avoidForce = this.avoid(obstacles);
      avoidForce.mult(1.8);
      this.applyForce(avoidForce);
    }

    if (squadron && squadron.length > 1) {
      let sep = this.separate(squadron);
      sep.mult(1.5);
      this.applyForce(sep);
    }

    if (leader && leader.hp > 0) {
      // Calcul du point de formation derrière le leader (Leader Following Reynolds)
      let behind = leader.getBehindPosition(65);
      // Décalage latéral pour la formation en V
      let offset = createVector(cos(this.slotAngle) * 45, sin(this.slotAngle) * 45);
      let targetPoint = p5.Vector.add(behind, offset);

      let followForce = this.arrive(targetPoint);
      followForce.mult(1.2);
      this.applyForce(followForce);

      // Si le joueur est très proche, harcèle le joueur
      if (player && player.pos) {
        let d = p5.Vector.dist(this.pos, player.pos);
        if (d < 160) {
          let strikeForce = this.seek(player.pos);
          strikeForce.mult(0.6);
          this.applyForce(strikeForce);
        }
      }
    } else {
      // Si le leader a été détruit, dispersion de panique (flee)
      if (player && player.pos) {
        let panic = this.flee(player.pos);
        panic.mult(1.2);
        this.applyForce(panic);
      }
    }
  }

  /**
   * Vérifie la collision avec un projectile plasma du joueur.
   * @param {Projectile} projectile 
   * @returns {boolean} True si détruit
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
    this.pulse += 0.1;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    // Réacteur violet
    noStroke();
    fill(255, 60, 180, 180);
    triangle(-this.r_pourDessin * 0.7, -3, -this.r_pourDessin * 1.5, 0, -this.r_pourDessin * 0.7, 3);

    // Fuselage ailier (flèche agressive)
    fill(45, 18, 42);
    stroke(255, 70, 150);
    strokeWeight(1.4);

    beginShape();
    vertex(this.r_pourDessin * 1.3, 0);
    vertex(-this.r_pourDessin * 0.6, -this.r_pourDessin * 0.7);
    vertex(-this.r_pourDessin * 0.3, 0);
    vertex(-this.r_pourDessin * 0.6, this.r_pourDessin * 0.7);
    endShape(CLOSE);

    // Yeux de guidage holographique
    fill(0, 240, 255);
    noStroke();
    circle(this.r_pourDessin * 0.3, -this.r_pourDessin * 0.2, 3);
    circle(this.r_pourDessin * 0.3, this.r_pourDessin * 0.2, 3);

    pop();
  }
}
