class AntiGravityDebris extends Vehicle {
  constructor(x, y, r = null) {
    super(x, y);
    this.r = r || random(6, 18);
    this.r_pourDessin = this.r;
    this.maxSpeed = random(6, 14);
    this.maxForce = random(0.3, 0.8);
    this.color = color(random(180, 220), random(220, 255), 255, random(180, 255));
    this.rot = random(TWO_PI);
    this.rotSpeed = random(-0.1, 0.1);
    this.trail = [];
    this.maxTrail = 10;
  }

  applyAntiGravity(epicenter, forceRadius, strength = 1.0) {
    let d = p5.Vector.dist(this.pos, epicenter);
    if (d < forceRadius) {
      // Force de répulsion depuis le centre
      let repulse = p5.Vector.sub(this.pos, epicenter);
      let mag = map(d, 0, forceRadius, this.maxSpeed * 1.5, 1);
      repulse.setMag(mag);
      let steer = p5.Vector.sub(repulse, this.vel);
      steer.limit(this.maxForce * 1.5);
      this.applyForce(steer.mult(strength));

      // Force d'élévation anti-gravitationnelle (vers le haut)
      let lift = createVector(random(-0.5, 0.5), -map(d, 0, forceRadius, 2.5, 0.5));
      lift.limit(this.maxForce);
      this.applyForce(lift.mult(strength));
    }
  }

  update() {
    this.trail.push(this.pos.copy());
    if (this.trail.length > this.maxTrail) this.trail.shift();

    this.rot += this.rotSpeed;
    super.update();
    this.edges();
  }

  show() {
    // Traînée lumineuse rapide et fluide
    if (this.trail.length > 1) {
      noFill();
      stroke(0, 200, 255, 80);
      strokeWeight(2);
      beginShape();
      for (let i = 0; i < this.trail.length; i++) {
        vertex(this.trail[i].x, this.trail[i].y);
      }
      endShape();
    }

    // Débris / astéroïde lumineux
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rot);

    noStroke();
    fill(0, 220, 255, 60);
    circle(0, 0, this.r * 2.4);

    fill(this.color);
    stroke(255);
    strokeWeight(1.5);
    beginShape();
    let sides = 6;
    for (let i = 0; i < sides; i++) {
      let angle = (TWO_PI / sides) * i;
      let rad = this.r * (0.8 + sin(angle * 3) * 0.2);
      vertex(cos(angle) * rad, sin(angle) * rad);
    }
    endShape(CLOSE);
    pop();
  }
}

class ShockwaveRing {
  constructor(x, y, maxR = 400) {
    this.x = x;
    this.y = y;
    this.r = 10;
    this.maxR = maxR;
    this.lifespan = 255;
    this.speed = 8;
  }

  update() {
    this.r += this.speed;
    this.lifespan = map(this.r, 10, this.maxR, 255, 0);
  }

  isDead() {
    return this.r >= this.maxR || this.lifespan <= 0;
  }

  show() {
    push();
    noFill();
    stroke(0, 230, 255, this.lifespan * 0.8);
    strokeWeight(3);
    circle(this.x, this.y, this.r * 2);

    stroke(255, 255, 255, this.lifespan * 0.5);
    strokeWeight(1.5);
    circle(this.x, this.y, this.r * 2 - 8);
    pop();
  }
}
