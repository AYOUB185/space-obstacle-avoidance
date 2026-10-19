class Meteor extends Vehicle {
  /**
   * Météore / astéroïde de la ceinture (Niveau 3).
   * Dérive dans l'espace en utilisant un comportement de steering "wander"
   * (variation directionnelle continue plutôt qu'un tirage aléatoire brutal).
   * Il représente un obstacle mobile que le vaisseau joueur doit éviter.
   * @param {number} x - Position initiale X
   * @param {number} y - Position initiale Y
   * @param {number|null} r - Rayon du météore (aléatoire si null)
   */
  constructor(x, y, r = null) {
    super(x, y);
    this.r = r || random(10, 26);
    this.r_pourDessin = this.r;
    this.maxSpeed = random(1.5, 3.5);
    this.maxForce = random(0.05, 0.15);

    // Palette rocheuse
    this.baseColor = color(random(120, 170), random(110, 150), random(100, 140));
    this.craterColor = color(random(70, 100), random(65, 95), random(60, 90));

    // Rotation et pulsation visuelles
    this.rot = random(TWO_PI);
    this.rotSpeed = random(-0.03, 0.03);
    this.pulse = random(TWO_PI);

    // Paramètres du comportement wander (cercle projeté devant le mobile)
    this.wanderAngle = random(TWO_PI);
    this.wanderRadius = 40;    // rayon du cercle de wander
    this.wanderDistance = 60;  // distance du cercle devant le mobile
    this.wanderJitter = 0.35;  // amplitude de variation angulaire par frame

    // Dérive initiale
    this.vel = p5.Vector.random2D().mult(random(0.5, this.maxSpeed));
  }

  /**
   * Comportement "wander" de Reynolds : renvoie une force de pilotage bornée.
   * La direction change progressivement (jitter appliqué à wanderAngle),
   * ce qui évite les changements de cap brutaux.
   * @returns {p5.Vector} force d'errance bornée par maxForce
   */
  wander() {
    // Fait varier l'angle de façon continue
    this.wanderAngle += random(-this.wanderJitter, this.wanderJitter);

    // Centre du cercle de wander projeté devant le mobile
    let circleCenter = this.vel.copy();
    if (circleCenter.mag() < 0.0001) {
      circleCenter = createVector(1, 0);
    }
    circleCenter.setMag(this.wanderDistance);

    // Déplacement sur le cercle selon l'angle courant
    let displacement = createVector(cos(this.wanderAngle), sin(this.wanderAngle));
    displacement.setMag(this.wanderRadius);

    // Vitesse désirée = centre + déplacement
    let desired = p5.Vector.add(circleCenter, displacement);
    desired.setMag(this.maxSpeed);

    // Force = vitesse désirée - vitesse actuelle, bornée par maxForce
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  /**
   * Applique le wander, met à jour la locomotion héritée puis ré-entre
   * dans le cadre si le météore sort de l'écran.
   */
  updateMeteor() {
    let force = this.wander();
    this.applyForce(force);

    this.rot += this.rotSpeed;
    this.pulse += 0.05;

    // Locomotion héritée de Vehicle
    this.update();

    // Réapparition de l'autre côté de l'écran
    this.edges();
  }

  /**
   * Vérifie la collision avec le vaisseau joueur.
   * @param {SpaceShip} ship
   * @returns {boolean} True si le météore touche le vaisseau
   */
  checkCollisionWith(ship) {
    if (!ship || !ship.pos) return false;
    let d = p5.Vector.dist(this.pos, ship.pos);
    let shipR = ship.r_pourDessin || 20;
    return d < this.r + shipR;
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);

    // Halo poussiéreux
    noStroke();
    fill(200, 170, 120, 25);
    circle(0, 0, (this.r * 2.6) + sin(this.pulse) * 3);

    rotate(this.rot);

    // Corps rocheux irrégulier
    fill(this.baseColor);
    stroke(90, 75, 60);
    strokeWeight(1.5);
    beginShape();
    let sides = 8;
    for (let i = 0; i < sides; i++) {
      let angle = (TWO_PI / sides) * i;
      let rad = this.r * (0.78 + sin(angle * 3 + this.pulse) * 0.18);
      vertex(cos(angle) * rad, sin(angle) * rad);
    }
    endShape(CLOSE);

    // Cratères
    noStroke();
    fill(this.craterColor);
    circle(this.r * 0.3, -this.r * 0.25, this.r * 0.35);
    circle(-this.r * 0.3, this.r * 0.2, this.r * 0.28);
    circle(this.r * 0.05, this.r * 0.4, this.r * 0.18);

    pop();
  }
}
