class Obstacle extends Vehicle {
  constructor(x, y, r, type = null) {
    super(x, y);
    this.r = r;
    this.type = type || random(['sun', 'terrestrial', 'icePlanet', 'ringPlanet']);
    this.rotation = random(TWO_PI);
    this.rotSpeed = random(-0.005, 0.005);
    this.pulse = random(TWO_PI);

    // Paramètres de mouvement selon le type (Le soleil reste centré au milieu du canevas)
    this.maxSpeed = 0;
    this.maxForce = 0;
    this.vel = createVector(0, 0);

    // Paramètres wander
    this.wanderAngle = random(TWO_PI);
    this.wanderRadius = 20;
    this.wanderDistance = 40;
    this.wanderJitter = 0.025;

    // Palettes cosmiques
    if (this.type === 'sun') {
      // Soleil ardent incandescent
      this.baseColor = color(255, 180, 0);
      this.coronaColor = color(255, 100, 0, 70);
      this.outerGlow = color(255, 230, 80, 40);
      this.hasRings = false;
      this.flares = [];
      for (let i = 0; i < 16; i++) {
        this.flares.push({
          angle: (TWO_PI / 16) * i,
          len: random(10, 28),
          speed: random(0.04, 0.09)
        });
      }
    } else if (this.type === 'icePlanet') {
      this.baseColor = color(60, 180, 240); // Neptune cyan / bleu glacier
      this.bandColor = color(30, 110, 190);
      this.glowColor = color(0, 220, 255, 55);
      this.hasRings = random() > 0.5;
    } else if (this.type === 'ringPlanet') {
      this.baseColor = color(190, 160, 220); // Planète pourpre cosmique
      this.bandColor = color(120, 90, 170);
      this.glowColor = color(200, 140, 255, 60);
      this.hasRings = true;
    } else {
      this.baseColor = color(60, 170, 90); // Terre / Jungle
      this.bandColor = color(40, 100, 150);
      this.glowColor = color(80, 220, 140, 50);
      this.hasRings = false;
    }

    if (this.hasRings) {
      this.ringBackCol = color(170, 140, 200, 130);
      this.ringFrontCol = color(190, 160, 220, 200);
    }
  }

  // Comportement "wander" pour donner un déplacement lent et continu
  wander() {
    if (this.maxForce <= 0 || this.maxSpeed <= 0) {
      return createVector(0, 0);
    }
    this.wanderAngle += random(-this.wanderJitter, this.wanderJitter);

    let circleCenter = this.vel.copy();
    if (circleCenter.mag() < 0.0001) {
      circleCenter = createVector(1, 0);
    }
    circleCenter.setMag(this.wanderDistance);

    let displacement = createVector(cos(this.wanderAngle), sin(this.wanderAngle));
    displacement.setMag(this.wanderRadius);

    let desired = p5.Vector.add(circleCenter, displacement);
    desired.setMag(this.maxSpeed);

    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  updateObstacle() {
    if (this.type === 'sun') {
      let cx = typeof width !== 'undefined' ? width / 2 : this.pos.x;
      let cy = typeof height !== 'undefined' ? height / 2 : this.pos.y;
      this.pos.set(cx, cy);
      this.vel.set(0, 0);
      this.acc.set(0, 0);
      this.pulse += 0.05;
      this.rotation += 0.003;
    } else {
      this.rotation += this.rotSpeed;
      this.pulse += 0.04;
    }
  }

  show() {
    let pulseFactor = sin(this.pulse) * 4;
    push();
    translate(this.pos.x, this.pos.y);

    if (this.type === 'sun') {
      this.renderSun(pulseFactor);
    } else {
      this.renderPlanet(pulseFactor);
    }

    pop();
  }

  renderSun(pulseFactor) {
    // 1. Rayonnement stellaire extérieur (Halo de chaleur immense)
    noStroke();
    fill(255, 140, 0, 25);
    circle(0, 0, (this.r + pulseFactor) * 2.8);

    fill(255, 200, 30, 50);
    circle(0, 0, (this.r + pulseFactor) * 2.4);

    fill(255, 100, 20, 80);
    circle(0, 0, (this.r + pulseFactor) * 2.1);

    // 2. Éruptions solaires et protubérances dansantes
    push();
    rotate(this.rotation * 1.5);
    stroke(255, 120, 20, 180);
    strokeWeight(3.5);
    for (let f of this.flares) {
      let flen = f.len + sin(this.pulse * 2 + f.angle * 4) * 8;
      let x1 = cos(f.angle) * this.r;
      let y1 = sin(f.angle) * this.r;
      let x2 = cos(f.angle) * (this.r + flen);
      let y2 = sin(f.angle) * (this.r + flen);
      line(x1, y1, x2, y2);

      // Boucle de flamme courbée
      noFill();
      stroke(255, 220, 50, 160);
      strokeWeight(2);
      let midA = f.angle + 0.15;
      bezier(x1, y1, x1 * 1.1, y1 * 1.1, x2, y2, cos(midA) * this.r, sin(midA) * this.r);
    }
    pop();

    // 3. Cœur incandescent du Soleil (dégradé de fusion)
    noStroke();
    fill(255, 100, 0); // Couronne extérieure orange/rouge
    circle(0, 0, this.r * 2);

    fill(255, 180, 0); // Zone radioactive dorée
    circle(0, 0, this.r * 1.85);

    fill(255, 240, 100); // Noyau en fusion blanc/jaune étincelant
    circle(0, 0, this.r * 1.4);

    fill(255, 255, 230); // Épicentre de plasma pur
    circle(0, 0, this.r * 0.85);

    // Taches solaires actives
    push();
    rotate(this.rotation);
    fill(210, 70, 0, 190);
    circle(this.r * 0.35, -this.r * 0.25, this.r * 0.18);
    circle(this.r * 0.45, -this.r * 0.18, this.r * 0.12);
    circle(-this.r * 0.3, this.r * 0.35, this.r * 0.16);
    pop();
  }

  renderPlanet(pulseFactor) {
    // 1. Halo atmosphérique lumineux
    noStroke();
    fill(this.glowColor);
    circle(0, 0, (this.r + pulseFactor) * 2.3);

    // 2. Demi-anneau arrière
    if (this.hasRings) {
      push();
      rotate(-PI / 6);
      noFill();
      stroke(this.ringBackCol);
      strokeWeight(this.r * 0.25);
      arc(0, 0, this.r * 3.2, this.r * 1.2, PI, TWO_PI);
      pop();
    }

    // 3. Corps sphérique de la planète
    noStroke();
    fill(this.baseColor);
    circle(0, 0, this.r * 2);

    // 4. Bandes atmosphériques et texture cosmique
    push();
    rotate(this.rotation);
    stroke(this.bandColor);
    strokeWeight(this.r * 0.22);
    noFill();
    arc(0, 0, this.r * 1.8, this.r * 1.4, -HALF_PI, HALF_PI);

    stroke(red(this.bandColor) * 0.8, green(this.bandColor) * 0.8, blue(this.bandColor) * 0.8, 180);
    strokeWeight(this.r * 0.12);
    arc(0, 0, this.r * 1.3, this.r * 0.9, -HALF_PI, HALF_PI);

    // Cratère
    noStroke();
    fill(this.bandColor);
    circle(this.r * 0.35, -this.r * 0.2, this.r * 0.35);
    pop();

    // 5. Ombrage 3D planétaire
    push();
    fill(5, 10, 20, 110);
    noStroke();
    arc(0, 0, this.r * 2, this.r * 2, HALF_PI, -HALF_PI);
    pop();

    // 6. Demi-anneau avant
    if (this.hasRings) {
      push();
      rotate(-PI / 6);
      noFill();
      stroke(this.ringFrontCol);
      strokeWeight(this.r * 0.25);
      arc(0, 0, this.r * 3.2, this.r * 1.2, 0, PI);

      stroke(255, 255, 255, 150);
      strokeWeight(2);
      arc(0, 0, this.r * 3.4, this.r * 1.3, 0, PI);
      pop();
    }
  }
}