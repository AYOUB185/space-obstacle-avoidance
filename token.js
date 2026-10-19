class Token extends Vehicle {
  /**
   * Jeton spatial sous-classe de Vehicle.
   * Flotte dans l'espace vide et est magnétiquement attiré vers le joueur.
   * @param {number} x - Position initiale X
   * @param {number} y - Position initiale Y
   * @param {number} value - Valeur en jetons
   */
  constructor(x, y, value = 2500) {
    super(x, y);
    this.r = 14;
    this.r_pourDessin = 12;
    this.value = value;
    this.maxSpeed = 6;
    this.maxForce = 0.4;
    this.pulse = random(0, TWO_PI);
    this.rotation = random(0, TWO_PI);
    this.collected = false;

    // Dérive douce
    this.vel = p5.Vector.random2D().mult(random(0.3, 1.2));
  }

  /**
   * Attraction magnétique douce vers le vaisseau lorsqu'il s'approche.
   * @param {SpaceShip} ship 
   * @param {number} magnetRadius 
   */
  attractTo(ship, magnetRadius = 180) {
    if (!ship || !ship.pos || this.collected) return;
    let d = p5.Vector.dist(this.pos, ship.pos);
    if (d < magnetRadius && d > 2) {
      let seekForce = this.seek(ship.pos);
      let strength = map(d, 0, magnetRadius, this.maxForce * 2.2, 0.05);
      seekForce.setMag(strength);
      this.applyForce(seekForce);
    }
  }

  /**
   * Vérifie la collecte par le joueur.
   * @param {SpaceShip} ship 
   * @returns {boolean} True si collecté à cette frame
   */
  checkCollection(ship) {
    if (this.collected || !ship || !ship.pos) return false;
    let d = p5.Vector.dist(this.pos, ship.pos);
    let collectionRadius = this.r + (ship.r_pourDessin || 20);

    if (d < collectionRadius) {
      this.collected = true;
      if (ship.tokens !== undefined) {
        ship.tokens += this.value;
      }
      if (ship.score !== undefined) {
        ship.score += 50;
      }
      return true;
    }
    return false;
  }

  show() {
    if (this.collected) return;

    this.pulse += 0.08;
    this.rotation += 0.04;
    let scale = 1 + sin(this.pulse) * 0.15;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rotation);

    // Halo lumineux doré
    noFill();
    stroke(255, 215, 0, 80 + sin(this.pulse * 2) * 50);
    strokeWeight(2.5);
    circle(0, 0, this.r * 2.2 * scale);

    // Corps de la pièce hexagonale
    fill(255, 220, 40, 230);
    stroke(255, 255, 255, 240);
    strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < 6; i++) {
      let angle = (TWO_PI / 6) * i;
      let rx = cos(angle) * (this.r_pourDessin * scale);
      let ry = sin(angle) * (this.r_pourDessin * scale);
      vertex(rx, ry);
    }
    endShape(CLOSE);

    // Symbole gravé au centre
    stroke(200, 160, 0);
    strokeWeight(1);
    line(-3, -5, 3, -5);
    line(0, -5, 0, 5);
    line(-3, 5, 3, 5);

    // Éclat blanc
    noStroke();
    fill(255, 255, 255, 255);
    circle(3, -3, 3);

    pop();
  }
}
