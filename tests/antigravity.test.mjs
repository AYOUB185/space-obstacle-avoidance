import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const folderDir = path.resolve(__dirname, '..');

class Vector {
  constructor(x = 0, y = 0) {
    this.x = Number(x) || 0;
    this.y = Number(y) || 0;
  }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy() { return new Vector(this.x, this.y); }
  add(x, y) {
    if (x instanceof Vector) { this.x += x.x; this.y += x.y; }
    else { this.x += (x || 0); this.y += (y || 0); }
    return this;
  }
  sub(x, y) {
    if (x instanceof Vector) { this.x -= x.x; this.y -= x.y; }
    else { this.x -= (x || 0); this.y -= (y || 0); }
    return this;
  }
  mult(n) { this.x *= n; this.y *= n; return this; }
  div(n) { this.x /= n; this.y /= n; return this; }
  magSq() { return this.x * this.x + this.y * this.y; }
  mag() { return Math.hypot(this.x, this.y); }
  heading() { return Math.atan2(this.y, this.x); }
  normalize() {
    const m = this.mag();
    if (m !== 0) this.div(m);
    return this;
  }
  setMag(len) { return this.normalize().mult(len); }
  limit(max) {
    if (this.magSq() > max * max) this.setMag(max);
    return this;
  }
  dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
  dot(v) { return this.x * v.x + this.y * v.y; }
  static add(v1, v2) { return new Vector(v1.x + v2.x, v1.y + v2.y); }
  static sub(v1, v2) { return new Vector(v1.x - v2.x, v1.y - v2.y); }
  static dist(v1, v2) { return Math.hypot(v1.x - v2.x, v1.y - v2.y); }
}

function loadEnv() {
  const context = {
    p5: { Vector },
    createVector: (x, y) => new Vector(x, y),
    TWO_PI: Math.PI * 2,
    PI: Math.PI,
    width: 1200,
    height: 800,
    random: (a, b) => {
      if (a === undefined && b === undefined) return Math.random();
      if (b === undefined) return Math.random() * a;
      return a + Math.random() * (b - a);
    },
    sin: Math.sin,
    cos: Math.cos,
    min: Math.min,
    max: Math.max,
    map: (val, inMin, inMax, outMin, outMax) => {
      return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
    },
    push: () => {},
    pop: () => {},
    translate: () => {},
    rotate: () => {},
    stroke: () => {},
    strokeWeight: () => {},
    fill: () => {},
    noFill: () => {},
    noStroke: () => {},
    circle: () => {},
    ellipse: () => {},
    rect: () => {},
    line: () => {},
    beginShape: () => {},
    endShape: () => {},
    vertex: () => {},
    color: (r, g, b, a) => ({ r, g, b, a }),
    red: (c) => (c && c.r !== undefined ? c.r : 255),
    green: (c) => (c && c.g !== undefined ? c.g : 255),
    blue: (c) => (c && c.b !== undefined ? c.b : 255),
    CLOSE: 'close',
  };

  vm.createContext(context);

  const vehicleCode = fs.readFileSync(path.join(folderDir, 'vehicle.js'), 'utf8');
  const obstacleCode = fs.readFileSync(path.join(folderDir, 'obstacle.js'), 'utf8');
  const antigravityCode = fs.readFileSync(path.join(folderDir, 'antigravity.js'), 'utf8');

  vm.runInContext(vehicleCode, context);
  vm.runInContext(obstacleCode, context);
  vm.runInContext(antigravityCode, context);

  return vm.runInContext('({ Vehicle, Obstacle, AntiGravityDebris, ShockwaveRing })', context);
}

test('AntiGravityDebris hérite bien de Vehicle', () => {
  const { Vehicle, AntiGravityDebris } = loadEnv();
  const d = new AntiGravityDebris(200, 200);
  assert.ok(d instanceof Vehicle, 'AntiGravityDebris doit être une sous-classe de Vehicle');
});

test('applyAntiGravity : propulse les entités vers l extérieur et vers le haut', () => {
  const { AntiGravityDebris } = loadEnv();
  const d = new AntiGravityDebris(400, 400);
  const center = new Vector(400, 450); // Épicentre sous le débris

  d.applyAntiGravity(center, 300, 1.0);
  d.update();

  assert.ok(d.vel.y < 0, 'La force d ascension anti-gravité propulse l entité vers le haut');
});

test('ShockwaveRing : grandit et dissipe son énergie', () => {
  const { ShockwaveRing } = loadEnv();
  const sw = new ShockwaveRing(300, 300, 100);
  assert.equal(sw.isDead(), false);
  while (!sw.isDead()) {
    sw.update();
  }
  assert.equal(sw.isDead(), true, 'L onde de choc disparaît après avoir atteint son rayon maximal');
});
