class SpaceShip extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.r_pourDessin = 20;
    this.r = 45; // Rayon d'évitement
    this.maxSpeed = 12;
    this.maxForce = 1.2;
    this.enginePulse = 0;

    // Cap d'affichage stabilisé (évite la rotation sur place à faible vitesse)
    this.displayHeading = 0;

    // Système de tir
    this.cooldown = 0;          // Délai entre les tirs (en frames)
    this.cooldownMax = 12;    // ~0.2 secondes entre chaque tir
    this.ammo = 50;              // Munitions
    this.maxAmmo = 50;
    this.ammoRegenTimer = 0;
    this.minuteReloadInterval = 3600; // 60 secondes à 60 FPS
    this.minuteReloadTimer = 3600;    // Rechargement automatique toutes les minutes
    this.score = 0;

    // Santé et points de vie
    this.health = 100;
    this.maxHealth = 100;

    // Collecte de jetons
    this.tokens = 0;

    // Bouclier temporaire activable via touche clavier
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.shieldDuration = 300; // ~5 secondes d'invulnérabilité
    this.shieldCooldown = 0;
  }

  /**
   * Surcharge de applyBehaviors : réactivité vive et fluide sans retards
   * ni erreurs de ciblage ou oscillations. Évitement doux des obstacles.
   */
  applyBehaviors(target, obstacles) {
    let d = p5.Vector.dist(this.pos, target);
    let steerForce;
    if (d < 45) {
      // Transition douce pour un arrêt net et précis sur la cible
      steerForce = this.arrive(target);
    } else {
      steerForce = this.seek(target);
    }
    steerForce.mult(1.5);
    this.applyForce(steerForce);

    if (d < 3) {
      this.vel.mult(0.5);
    }

    if (obstacles && obstacles.length > 0) {
      let avoidForce = this.avoid(obstacles);
      avoidForce.mult(1.0);
      this.applyForce(avoidForce);
    }
  }

  /**
   * Lie le mouvement horizontal de l'avion vert à la position de la souris
   * de manière instantanée, fluide et sans latence.
   * @param {number} mouseXPos Position X actuelle de la souris
   * @param {number} prevMouseXPos Position X précédente de la souris
   */
  bindHorizontalToMouse(mouseXPos, prevMouseXPos) {
    let targetX = createVector(mouseXPos, this.pos.y);
    let desired = p5.Vector.sub(targetX, this.pos);
    let d = desired.mag();

    if (d > 15) {
      desired.setMag(this.maxSpeed);
      let steer = p5.Vector.sub(desired, this.vel);
      steer.limit(this.maxForce * 4);
      steer.y = 0; // Contrainte stricte au mouvement horizontal
      this.applyForce(steer);
    } else {
      this.vel.x = 0;
      this.pos.x = mouseXPos;
    }
  }

  /**
   * Active le bouclier temporaire via touche du clavier.
   * @returns {boolean} True si activé avec succès
   */
  activateShield() {
    if (this.shieldCooldown <= 0) {
      this.shieldActive = true;
      this.shieldTimer = this.shieldDuration;
      this.shieldCooldown = this.shieldDuration + 180; // ~3 secondes de recharge après extinction
      return true;
    }
    return false;
  }

  /**
   * Met à jour le cooldown de tir, le rechargement automatique toutes les minutes,
   * la régénération progressive et le bouclier.
   */
  updateWeapons() {
    if (this.cooldown > 0) this.cooldown--;

    // Rechargement automatique complet de la jauge toutes les minutes (60s / 3600 frames)
    this.minuteReloadTimer--;
    if (this.minuteReloadTimer <= 0) {
      this.minuteReloadTimer = this.minuteReloadInterval;
      this.ammo = this.maxAmmo;
      if (typeof showBanner === 'function') {
        showBanner("⚡ JAUGE DE TIR PLEINEMENT RECHARGÉE (RECHARGE MINUTE) !", [0, 255, 180], 120);
      }
    }

    // Régénération passive continue de munitions (1 toutes les 2 secondes)
    this.ammoRegenTimer++;
    if (this.ammoRegenTimer >= 120 && this.ammo < this.maxAmmo) {
      this.ammo = min(this.ammo + 1, this.maxAmmo);
      this.ammoRegenTimer = 0;
    }

    // Gestion du bouclier temporaire
    if (this.shieldTimer > 0) {
      this.shieldTimer--;
      if (this.shieldTimer <= 0) {
        this.shieldActive = false;
      }
    }
    if (this.shieldCooldown > 0) {
      this.shieldCooldown--;
    }
  }

  /**
   * Vérifie et résout la collision physique avec les planètes et le soleil.
   * Les obstacles sont des corps SOLIDES : le vaisseau ne peut pas les traverser.
   * - Rebond réaliste : la composante de vitesse vers la planète est inversée.
   * - Dégâts infligés si sans bouclier (sauf soleil).
   * - Au niveau 3+ : collision directe DÉTRUIT la planète (+ score).
   *
   * @param {Obstacle[]} obstacleList - La liste des obstacles actifs
   * @param {number} currentLevel     - Niveau actuel pour la logique de destruction
   * @returns {Object|null} { destroyed: Obstacle, damaged: boolean } ou null
   */
  checkPlanetCollision(obstacleList, currentLevel = 1) {
    if (!obstacleList || obstacleList.length === 0) return null;
    let result = null;

    for (let obs of obstacleList) {
      if (!obs || !obs.pos) continue;

      let diff = p5.Vector.sub(this.pos, obs.pos);
      let d = diff.mag();
      let minDist = this.r_pourDessin + obs.r;

      if (d < minDist && d > 0.001) {
        // ──── RÉSOLUTION DE PÉNÉTRATION ────
        // Repousse le vaisseau hors de la planète (obstacle solide)
        let overlap = minDist - d;
        let pushDir = diff.copy().normalize();
        this.pos.add(pushDir.copy().mult(overlap + 1.5));

        // ──── REBOND PHYSIQUE ────
        // Inverse la vitesse dans la direction de la normale de collision
        let normalDot = this.vel.dot(pushDir);
        if (normalDot < 0) {
          // Applique un rebond élastique (restitution 0.65)
          this.vel.add(pushDir.copy().mult(-normalDot * 1.65));
          this.vel.limit(this.maxSpeed);
        }

        // ──── LOGIQUE DE NIVEAU ────
        if (obs.type === 'sun') {
          // Le soleil est indestructible : rebond brutal + dégâts si sans bouclier
          if (!this.shieldActive) {
            this.health = Math.max(0, this.health - 10);
          }
          result = { type: 'sun_bounce', damaged: !this.shieldActive };
        } else if (currentLevel >= 3) {
          // Niveau 3+ : la planète est DÉTRUITE par la collision
          result = { type: 'planet_destroyed', obstacle: obs, damaged: false };
          // Le score et l'explosion sont gérés dans sketch.js
          return result;
        } else {
          // Niveaux 1–2 : planète solide, rebond + dégâts
          if (!this.shieldActive) {
            this.health = Math.max(0, this.health - 5);
          }
          result = { type: 'planet_bounce', obstacle: obs, damaged: !this.shieldActive };
        }
      }
    }
    return result;
  }

  /**
   * Tir d'un projectile plasma.
   * @param {Obstacle[]} obstacles Liste des obstacles pour cibler
   * @returns {Projectile|null} Le projectile lancé
   */
  fire(obstacles = []) {
    if (this.cooldown > 0 || this.ammo <= 0) return null;

    this.cooldown = this.cooldownMax;
    this.ammo--;
    this.ammoRegenTimer = 0;

    let direction = this.vel.copy();
    if (direction.mag() < 0.1) {
      direction = createVector(1, 0);
    }

    let closestTarget = null;
    let closestDist = Infinity;
    if (obstacles) {
      for (let obs of obstacles) {
        let d = p5.Vector.dist(this.pos, obs.pos);
        if (d < closestDist) {
          closestDist = d;
          closestTarget = obs;
        }
      }
    }

    let spawnPos = p5.Vector.add(this.pos, direction.copy().setMag(this.r_pourDessin * 1.5));
    return new Projectile(spawnPos.x, spawnPos.y, direction, closestTarget);
  }

  show() {
    this.enginePulse += 0.2;
    let speed = this.vel.mag();
    let flameLen = map(speed, 0, this.maxSpeed, 4, 18) + sin(this.enginePulse) * 4;

    push();
    translate(this.pos.x, this.pos.y);
    if (this.vel.mag() > 0.3) {
      this.displayHeading = this.vel.heading();
    }
    rotate(this.displayHeading);

    // 1. Flamme du réacteur arrière
    noStroke();
    fill(0, 200, 255, 180);
    triangle(
      -this.r_pourDessin * 0.9, -5,
      -this.r_pourDessin * 0.9 - flameLen * 1.8, 0,
      -this.r_pourDessin * 0.9, 5
    );

    fill(255, 255, 255, 230);
    triangle(
      -this.r_pourDessin * 0.9, -2.5,
      -this.r_pourDessin * 0.9 - flameLen * 1.0, 0,
      -this.r_pourDessin * 0.9, 2.5
    );

    // Flammes latérales
    fill(0, 180, 255, 140);
    let sideFlame = flameLen * 0.6;
    triangle(
      -this.r_pourDessin * 0.6, -this.r_pourDessin * 0.85,
      -this.r_pourDessin * 0.6 - sideFlame, -this.r_pourDessin * 0.8,
      -this.r_pourDessin * 0.6, -this.r_pourDessin * 0.75
    );
    triangle(
      -this.r_pourDessin * 0.6, this.r_pourDessin * 0.85,
      -this.r_pourDessin * 0.6 - sideFlame, this.r_pourDessin * 0.8,
      -this.r_pourDessin * 0.6, this.r_pourDessin * 0.75
    );

    // 2. Ailes & fuselage (Avion vert)
    stroke(15, 60, 30);
    strokeWeight(1.5);
    fill(45, 230, 95);

    beginShape();
    vertex(this.r_pourDessin * 1.3, 0);
    vertex(this.r_pourDessin * 0.2, -this.r_pourDessin * 0.35);
    vertex(-this.r_pourDessin * 0.7, -this.r_pourDessin * 0.9);
    vertex(-this.r_pourDessin * 0.4, -this.r_pourDessin * 0.2);
    vertex(-this.r_pourDessin * 0.9, 0);
    vertex(-this.r_pourDessin * 0.4, this.r_pourDessin * 0.2);
    vertex(-this.r_pourDessin * 0.7, this.r_pourDessin * 0.9);
    vertex(this.r_pourDessin * 0.2, this.r_pourDessin * 0.35);
    endShape(CLOSE);

    // 3. Verrière
    noStroke();
    fill(0, 240, 255, 220);
    beginShape();
    vertex(this.r_pourDessin * 0.8, 0);
    vertex(this.r_pourDessin * 0.1, -this.r_pourDessin * 0.22);
    vertex(-this.r_pourDessin * 0.2, 0);
    vertex(this.r_pourDessin * 0.1, this.r_pourDessin * 0.22);
    endShape(CLOSE);

    // Reflet blanc
    fill(255, 255, 255, 200);
    circle(this.r_pourDessin * 0.35, -this.r_pourDessin * 0.08, 3);

    // 4. Feux de position
    fill(255, 60, 60);
    circle(-this.r_pourDessin * 0.65, -this.r_pourDessin * 0.85, 4);
    fill(60, 255, 100);
    circle(-this.r_pourDessin * 0.65, this.r_pourDessin * 0.85, 4);

    // 5. Canon de tir
    if (this.cooldown <= 0 && this.ammo > 0) {
      fill(255, 255, 255, 200 + sin(this.enginePulse * 2) * 55);
      circle(this.r_pourDessin * 1.3, 0, 5);
    } else {
      fill(255, 80, 80, 120);
      circle(this.r_pourDessin * 1.3, 0, 3);
    }

    // 6. Bouclier temporaire d'énergie actif
    if (this.shieldActive) {
      let pulse = sin(this.enginePulse * 3);
      noFill();
      stroke(0, 240, 255, 190 + pulse * 60);
      strokeWeight(2.5);
      circle(0, 0, this.r_pourDessin * 3.4 + pulse * 3);

      stroke(0, 255, 180, 130 + pulse * 40);
      strokeWeight(1.5);
      beginShape();
      for (let i = 0; i < 6; i++) {
        let a = (TWO_PI / 6) * i + this.enginePulse * 0.4;
        let rad = this.r_pourDessin * 2.0;
        vertex(cos(a) * rad, sin(a) * rad);
      }
      endShape(CLOSE);
    }

    // Debug circle
    if (Vehicle.debug) {
      stroke(255, 255, 0, 150);
      strokeWeight(1);
      noFill();
      circle(0, 0, this.r * 2);
    }

    pop();
  }
}