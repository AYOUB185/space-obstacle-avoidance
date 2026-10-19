class Wormhole extends Vehicle {
  /**
   * Trou spatial (Wormhole / Trou de ver) héritant de Vehicle.
   * Permet la téléportation instantanée d'un véhicule vers un autre trou dans l'espace.
   * @param {number} x - Position initiale X
   * @param {number} y - Position initiale Y
   * @param {number} r - Rayon du vortex (horizon des événements)
   * @param {string} theme - Thème visuel ('cyan', 'magenta', 'amber')
   */
  constructor(x, y, r = 38, theme = 'cyan') {
    super(x, y);
    this.r = r;
    this.theme = theme;
    this.maxSpeed = 0.5; // Dérive lente dans l'espace
    this.maxForce = 0.05;
    this.exitHole = null;
    this.rotationAngle = 0;
    this.pulse = 0;

    // Gestion du cooldown de téléportation par véhicule pour éviter les boucles infinies
    this.cooldowns = new Map();

    // Couleurs du vortex
    if (theme === 'magenta') {
      this.colorCore = [255, 50, 220];
      this.colorRing = [180, 0, 255];
    } else if (theme === 'amber') {
      this.colorCore = [255, 180, 30];
      this.colorRing = [255, 90, 0];
    } else {
      this.colorCore = [0, 240, 255];
      this.colorRing = [30, 100, 255];
    }
  }

  /**
   * Relie bidirectionnellement ce trou spatial à un autre trou de sortie.
   * @param {Wormhole} otherHole 
   */
  link(otherHole) {
    if (otherHole instanceof Wormhole && otherHole !== this) {
      this.exitHole = otherHole;
      otherHole.exitHole = this;
    }
  }

  /**
   * Définit un temps de recharge pour un véhicule spécifique.
   * @param {Vehicle} vehicle 
   * @param {number} frames 
   */
  setCooldown(vehicle, frames = 45) {
    this.cooldowns.set(vehicle, frames);
  }

  /**
   * Vérifie et met à jour les cooldowns.
   * @param {Vehicle} vehicle 
   * @returns {boolean} True si le véhicule est en recharge
   */
  isOnCooldown(vehicle) {
    let cd = this.cooldowns.get(vehicle) || 0;
    return cd > 0;
  }

  /**
   * Met à jour l'animation du vortex et les temps de recharge.
   */
  updateWormhole() {
    this.rotationAngle += 0.04;
    this.pulse += 0.05;

    // Décrémenter les cooldowns
    for (let [veh, cd] of this.cooldowns.entries()) {
      if (cd <= 1) {
        this.cooldowns.delete(veh);
      } else {
        this.cooldowns.set(veh, cd - 1);
      }
    }
  }

  /**
   * Calcule une force de succion gravitationnelle vers le centre du trou.
   * @param {Vehicle} vehicle 
   * @param {number} pullRadius - Distance d'attraction
   * @returns {p5.Vector|null} Force gravitationnelle appliquée
   */
  attract(vehicle, pullRadius = 160) {
    if (!vehicle || !vehicle.pos) return null;
    if (this.isOnCooldown(vehicle)) return null;

    let d = p5.Vector.dist(vehicle.pos, this.pos);
    if (d < pullRadius && d > 5) {
      // Force d'aspiration centrifuge
      let pull = p5.Vector.sub(this.pos, vehicle.pos);
      let strength = map(d, 0, pullRadius, vehicle.maxForce * 1.8, 0.02);
      pull.setMag(strength);

      // Composante de tourbillon tangentiel
      let swirl = createVector(-pull.y, pull.x).setMag(strength * 0.5);
      pull.add(swirl);

      vehicle.applyForce(pull);
      return pull;
    }
    return null;
  }

  /**
   * Tente de téléporter le véhicule vers le trou de sortie s'il atteint le centre.
   * @param {Vehicle} vehicle 
   * @returns {boolean} True si téléporté
   */
  tryTeleport(vehicle) {
    if (!vehicle || !vehicle.pos || !this.exitHole) return false;
    if (this.isOnCooldown(vehicle)) return false;

    let d = p5.Vector.dist(vehicle.pos, this.pos);
    // Horizon des événements : 65% du rayon du trou
    if (d < this.r * 0.65) {
      // 1. Déplacer vers la position du trou de sortie
      vehicle.pos.set(this.exitHole.pos.x, this.exitHole.pos.y);

      // 2. Éjecter le véhicule légèrement en avant de la sortie selon sa vitesse
      let exitDir = vehicle.vel && vehicle.vel.mag() > 0.1 ? 
        vehicle.vel.copy().normalize() : 
        p5.Vector.random2D();

      let ejectionOffset = p5.Vector.mult(exitDir, this.exitHole.r * 1.1);
      vehicle.pos.add(ejectionOffset);

      // Donner une légère impulsion de propulsion à la sortie
      if (vehicle.vel) {
        vehicle.vel.setMag(Math.min(vehicle.maxSpeed, Math.max(vehicle.vel.mag(), 4)));
      }

      // 3. Activer le cooldown sur les deux trous pour éviter une re-téléportation immédiate
      this.setCooldown(vehicle, 50);
      this.exitHole.setCooldown(vehicle, 50);

      return true;
    }

    return false;
  }

  /**
   * Rendu visuel d'un trou spatial avec vortex tourbillonnant, horizon des événements et anneau d'accrétion.
   */
  show() {
    push();
    translate(this.pos.x, this.pos.y);

    let [cr, cg, cb] = this.colorCore;
    let [rr, rg, rb] = this.colorRing;
    let pulseScale = 1 + sin(this.pulse) * 0.06;

    // 1. Halo extérieur diffus de distorsion spatiale
    noFill();
    for (let i = 3; i >= 1; i--) {
      stroke(rr, rg, rb, 25 / i);
      strokeWeight(5 * i);
      circle(0, 0, (this.r * 2.2 + i * 16) * pulseScale);
    }

    // 2. Disque d'accrétion tourbillonnant (lignes en spirale)
    rotate(this.rotationAngle);
    strokeWeight(1.8);
    let spirals = 6;
    for (let i = 0; i < spirals; i++) {
      let a = (TWO_PI / spirals) * i;
      stroke(cr, cg, cb, 140);
      let rOut = this.r * 1.25 * pulseScale;
      let x1 = cos(a) * (this.r * 0.4);
      let y1 = sin(a) * (this.r * 0.4);
      let x2 = cos(a + 0.8) * rOut;
      let y2 = sin(a + 0.8) * rOut;
      line(x1, y1, x2, y2);
    }

    // 3. Anneau lumineux de l'horizon
    stroke(cr, cg, cb, 230);
    strokeWeight(2.5);
    circle(0, 0, this.r * 1.4 * pulseScale);

    // 4. Centre obscur (le néant du trou noir/de ver)
    noStroke();
    fill(4, 6, 12, 245);
    circle(0, 0, this.r * 1.1);

    // 5. Point singulier au centre
    fill(cr, cg, cb, 200 + sin(this.pulse * 2) * 55);
    circle(0, 0, 5);

    // 6. Ligne pointillée ou indicateur de liaison si relié (en mode debug)
    if (Vehicle.debug && this.exitHole) {
      pop();
      push();
      stroke(cr, cg, cb, 70);
      strokeWeight(1);
      line(this.pos.x, this.pos.y, this.exitHole.pos.x, this.exitHole.pos.y);
      pop();
      return;
    }

    pop();
  }
}
