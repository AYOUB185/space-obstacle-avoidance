class BinarySingularity extends Vehicle {
  /**
   * Singularité gravitationnelle binaire (Niveau 7).
   * Orbite autour d'un barycentre commun et exerce une attraction gravitationnelle
   * newtonienne sur les véhicules, permettant des manœuvres de fronde gravitationnelle (slingshot).
   * @param {number} orbitCenterX - Centre de l'orbite X
   * @param {number} orbitCenterY - Centre de l'orbite Y
   * @param {number} orbitRadius - Rayon orbital
   * @param {number} orbitSpeed - Vitesse angulaire
   * @param {number} initialAngle - Angle initial
   */
  constructor(orbitCenterX, orbitCenterY, orbitRadius = 160, orbitSpeed = 0.02, initialAngle = 0) {
    let initialX = orbitCenterX + Math.cos(initialAngle) * orbitRadius;
    let initialY = orbitCenterY + Math.sin(initialAngle) * orbitRadius;
    super(initialX, initialY);

    this.r_pourDessin = 22;
    this.r = 32;
    this.maxSpeed = 3.5;
    this.maxForce = 0.2;

    this.centerX = orbitCenterX;
    this.centerY = orbitCenterY;
    this.orbitRadius = orbitRadius;
    this.orbitSpeed = orbitSpeed;
    this.angle = initialAngle;
    this.gravityStrength = 420;
    this.pulse = 0;
  }

  /**
   * Met à jour la position orbitale de la singularité.
   */
  updateOrbit() {
    this.angle += this.orbitSpeed;
    let targetX = this.centerX + Math.cos(this.angle) * this.orbitRadius;
    let targetY = this.centerY + Math.sin(this.angle) * this.orbitRadius;

    // Utilise le steering arrive pour suivre son orbite gravitationnelle
    let targetPos = createVector(targetX, targetY);
    let steer = this.arrive(targetPos);
    this.applyForce(steer);
    this.update();
  }

  /**
   * Exerce une force gravitationnelle d'attraction sur un véhicule.
   * @param {Vehicle} vehicle 
   * @param {number} maxDist - Distance maximale d'influence
   */
  attractVehicle(vehicle, maxDist = 320) {
    if (!vehicle || !vehicle.pos) return;
    let force = p5.Vector.sub(this.pos, vehicle.pos);
    let d = force.mag();

    if (d > this.r && d < maxDist) {
      // Force inversement proportionnelle à la distance
      let strength = (this.gravityStrength) / (d * 0.85);
      strength = constrain(strength, 0, 3.5);
      force.setMag(strength);
      vehicle.applyForce(force);
    }
  }

  /**
   * Vérifie si le joueur pénètre l'horizon des événements de la singularité.
   * @param {SpaceShip} player 
   * @returns {boolean} True si impact critique
   */
  checkEventHorizon(player) {
    if (!player || !player.pos) return false;
    let d = p5.Vector.dist(this.pos, player.pos);
    if (d < this.r_pourDessin + player.r_pourDessin * 0.6) {
      if (!player.shieldActive) {
        player.health = Math.max(0, player.health - 20);
      }
      return true;
    }
    return false;
  }

  show() {
    this.pulse += 0.08;

    push();
    translate(this.pos.x, this.pos.y);

    // Disque d'accrétion tourbillonnant
    noFill();
    for (let i = 0; i < 3; i++) {
      let r = this.r_pourDessin * (1.8 + i * 0.7) + sin(this.pulse + i) * 3;
      stroke(160, 40, 255, 90 - i * 25);
      strokeWeight(2);
      circle(0, 0, r * 2);
    }

    // Horizon des événements (trou noir impénétrable)
    fill(5, 5, 10);
    stroke(0, 240, 255, 200);
    strokeWeight(1.8);
    circle(0, 0, this.r_pourDessin * 2);

    // Singularité centrale
    fill(255, 255, 255, 240);
    noStroke();
    circle(0, 0, 6 + sin(this.pulse * 2) * 2);

    pop();
  }
}
