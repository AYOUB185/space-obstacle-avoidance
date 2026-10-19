/**
 * Tests de non-régression pour Vehicle.avoid() et Vehicle.separate().
 *
 * 1. avoid() ne doit pas planter quand il n'y a aucun obstacle
 *    (scénario de la galaxie d'explosion : obstacles = [] pendant 30s).
 * 2. separate() doit utiliser maxSpeed / vel (et non les typo maxspeed / velocity),
 *    sans produire de force NaN.
 *
 * Exécuter : node --test 6-ObstacleAvoidance/tests/avoidance.test.mjs
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Script } from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const base = join(__dirname, '..');

// ─── Mocks p5.js ────────────────────────────────────────────────────────
class MockVector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy()          { return new MockVector(this.x, this.y); }
  add(v)          { this.x += v.x; this.y += v.y; return this; }
  sub(v)          { this.x -= v.x; this.y -= v.y; return this; }
  mult(s)         { this.x *= s; this.y *= s; return this; }
  div(s)          { this.x /= s; this.y /= s; return this; }
  mag()           { return Math.sqrt(this.x ** 2 + this.y ** 2); }
  magSq()         { return this.x ** 2 + this.y ** 2; }
  setMag(m)       { let mg = this.mag() || 1; this.mult(m / mg); return this; }
  normalize()     { return this.setMag(1); }
  limit(max)      { if (this.mag() > max) this.setMag(max); return this; }
  heading()       { return Math.atan2(this.y, this.x); }
  set(x, y)       { this.x = x; this.y = y; return this; }
  dist(v)         { return Math.hypot(this.x - v.x, this.y - v.y); }
  dot(v)          { return this.x * v.x + this.y * v.y; }

  static sub(a, b) { return new MockVector(a.x - b.x, a.y - b.y); }
  static add(a, b) { return new MockVector(a.x + b.x, a.y + b.y); }
  static mult(v, s){ return new MockVector(v.x * s, v.y * s); }
  static dist(a, b){ return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2); }
  static random2D(){ return new MockVector(1, 0); }
}

globalThis.createVector = (x, y) => new MockVector(x, y);
globalThis.p5 = { Vector: MockVector };
globalThis.random   = (a, b) => b !== undefined ? a : (Array.isArray(a) ? a[0] : Math.random());
globalThis.floor    = Math.floor;
globalThis.sin      = Math.sin;
globalThis.cos      = Math.cos;
globalThis.map      = (v, a, b, c, d) => c + (d - c) * ((v - a) / (b - a));
globalThis.constrain = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
globalThis.min      = Math.min;
globalThis.max      = Math.max;
globalThis.TWO_PI   = Math.PI * 2;
globalThis.color    = (r, g, b) => ({ r, g, b });

const noop = () => {};
globalThis.push = noop; globalThis.pop = noop; globalThis.fill = noop;
globalThis.noFill = noop; globalThis.stroke = noop; globalThis.noStroke = noop;
globalThis.strokeWeight = noop; globalThis.circle = noop; globalThis.line = noop;
globalThis.translate = noop; globalThis.rotate = noop; globalThis.beginShape = noop;
globalThis.endShape = noop; globalThis.vertex = noop; globalThis.CLOSE = 'close';
globalThis.triangle = noop;

function loadScript(file) {
  const code = readFileSync(join(base, file), 'utf-8');
  const script = new Script(code, { filename: file });
  script.runInThisContext();
}

before(() => {
  loadScript('vehicle.js');
  loadScript('spaceShip.js');
});

describe('Vehicle.avoid — aucun obstacle (galaxie d\'explosion)', () => {
  it('avoid([]) renvoie un vecteur nul sans lever d\'exception', () => {
    let ship = new SpaceShip(100, 100);
    let force = ship.avoid([]);
    assert.ok(force instanceof MockVector, 'doit renvoyer un vecteur');
    assert.strictEqual(force.x, 0);
    assert.strictEqual(force.y, 0);
  });

  it('avoid(undefined) renvoie un vecteur nul sans lever d\'exception', () => {
    let ship = new SpaceShip(100, 100);
    let force = ship.avoid(undefined);
    assert.strictEqual(force.x, 0);
    assert.strictEqual(force.y, 0);
  });

  it('avoid([]) ne dépend pas du global vehicules (retour anticipé)', () => {
    let ship = new SpaceShip(100, 100);
    globalThis.vehicules = undefined;
    assert.doesNotThrow(() => ship.avoid([]));
    globalThis.vehicules = [];
  });

  it('applyBehaviors avec obstacles vide ne lève pas (scénario touche W)', () => {
    let ship = new SpaceShip(100, 100);
    assert.doesNotThrow(() => ship.applyBehaviors(createVector(500, 500), []));
  });

  it('avoid limite la force à maxForce quand un obstacle est droit devant', () => {
    let ship = new SpaceShip(100, 100);
    globalThis.vehicules = [ship];
    ship.vel = createVector(ship.maxSpeed, 0); // avance vers la droite
    // Obstacle proche et aligné sur la trajectoire
    let obstacle = { pos: new MockVector(140, 100), r: 20 };
    let force = ship.avoid([obstacle]);
    assert.ok(Number.isFinite(force.x) && Number.isFinite(force.y), 'force finie');
    assert.ok(force.mag() > 0, 'doit produire une force d\'évitement');
    assert.ok(force.mag() <= ship.maxForce + 1e-9, 'force bornée par maxForce');
  });

  it('avoid renvoie un vecteur nul si l\'obstacle est loin devant', () => {
    let ship = new SpaceShip(100, 100);
    globalThis.vehicules = [ship];
    ship.vel = createVector(ship.maxSpeed, 0);
    let obstacle = { pos: new MockVector(2000, 100), r: 20 };
    let force = ship.avoid([obstacle]);
    assert.strictEqual(force.x, 0);
    assert.strictEqual(force.y, 0);
  });
});

describe('Vehicle.separate — utilise maxSpeed / vel (pas de NaN)', () => {
  it('separate avec un voisin proche renvoie une force finie bornée par maxForce', () => {
    let ship = new SpaceShip(100, 100);
    let voisin = new SpaceShip(108, 100); // dans le rayon r
    assert.ok(voisin.pos.dist(ship.pos) < ship.r, 'le voisin doit être dans r');

    let force = ship.separate([voisin]);
    assert.ok(Number.isFinite(force.x) && Number.isFinite(force.y),
      'la force de séparation ne doit pas être NaN (typo maxspeed/velocity)');
    assert.ok(force.mag() <= ship.maxForce + 1e-9, 'force bornée par maxForce');
  });

  it('separate s\'ignore lui-même et renvoie un vecteur nul sans voisin', () => {
    let ship = new SpaceShip(100, 100);
    let force = ship.separate([ship]);
    assert.strictEqual(force.x, 0);
    assert.strictEqual(force.y, 0);
  });
});
