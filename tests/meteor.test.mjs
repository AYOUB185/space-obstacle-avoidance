/**
 * Tests unitaires pour la classe Meteor (météore de la ceinture d'astéroïdes, Niveau 3).
 * Meteor étend Vehicle et utilise un comportement de steering "wander" borné.
 *
 * Exécuter : node --test 6-ObstacleAvoidance/tests/meteor.test.mjs
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Script } from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const base = join(__dirname, '..');

// ─── Générateur pseudo-aléatoire déterministe (mulberry32) ───────────────
function makeRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
globalThis.floor   = Math.floor;
globalThis.sin     = Math.sin;
globalThis.cos     = Math.cos;
globalThis.map     = (v, a, b, c, d) => c + (d - c) * ((v - a) / (b - a));
globalThis.constrain = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
globalThis.min     = Math.min;
globalThis.max     = Math.max;
globalThis.TWO_PI  = Math.PI * 2;
globalThis.PI      = Math.PI;
globalThis.HALF_PI = Math.PI / 2;
globalThis.width   = 1200;
globalThis.height  = 800;
globalThis.color   = (r, g, b, a) => ({ r, g, b, a: a || 255 });
globalThis.red = c => c.r || 0; globalThis.green = c => c.g || 0; globalThis.blue = c => c.b || 0;

// Aléatoire déterministe injectable
globalThis.random = (a, b) => {
  const r = globalThis.__rand();
  if (a === undefined && b === undefined) return r;
  if (b === undefined) return r * a;
  return a + r * (b - a);
};

const noop = () => {};
globalThis.push = noop; globalThis.pop = noop; globalThis.fill = noop;
globalThis.noFill = noop; globalThis.stroke = noop; globalThis.noStroke = noop;
globalThis.strokeWeight = noop; globalThis.circle = noop; globalThis.line = noop;
globalThis.translate = noop; globalThis.rotate = noop; globalThis.beginShape = noop;
globalThis.endShape = noop; globalThis.vertex = noop; globalThis.CLOSE = 'close';
globalThis.triangle = noop; globalThis.rect = noop; globalThis.ellipse = noop;

function loadScript(file) {
  const code = readFileSync(join(base, file), 'utf-8');
  const script = new Script(code, { filename: file });
  script.runInThisContext();
}

globalThis.__rand = makeRandom(12345);
loadScript('vehicle.js');
loadScript('meteor.js');

describe('Meteor (sous-classe de Vehicle, Niveau 3)', () => {
  let meteor;

  beforeEach(() => {
    globalThis.__rand = makeRandom(12345); // reproductibilité
    meteor = new Meteor(400, 400);
  });

  it('Meteor doit être une sous-classe de Vehicle', () => {
    assert.ok(meteor instanceof Vehicle, 'Meteor doit hériter de Vehicle');
    assert.strictEqual(typeof meteor.applyForce, 'function');
    assert.strictEqual(typeof meteor.update, 'function');
  });

  it('le rayon et les limites sont dans les plages attendues', () => {
    assert.ok(meteor.r >= 10 && meteor.r <= 26, 'rayon entre 10 et 26');
    assert.ok(meteor.maxSpeed >= 1.5 && meteor.maxSpeed <= 3.5, 'maxSpeed plage');
    assert.ok(meteor.maxForce >= 0.05 && meteor.maxForce <= 0.15, 'maxForce plage');
  });

  it('wander() renvoie une force bornée par maxForce', () => {
    let force = meteor.wander();
    assert.ok(force instanceof MockVector, 'doit renvoyer un vecteur');
    assert.ok(Number.isFinite(force.x) && Number.isFinite(force.y), 'force finie');
    assert.ok(force.mag() <= meteor.maxForce + 1e-9, 'force bornée par maxForce');
  });

  it('wander() renvoie une force nulle si le météore est immobile et sans biais', () => {
    // vitesse nulle : le désir pointe selon l'angle de wander, la force reste bornée et finie
    meteor.vel = new MockVector(0, 0);
    let force = meteor.wander();
    assert.ok(Number.isFinite(force.x) && Number.isFinite(force.y), 'pas de NaN');
    assert.ok(force.mag() <= meteor.maxForce + 1e-9, 'force bornée');
  });

  it('wander() fait varier l\'angle de façon continue (jitter borné)', () => {
    let before = meteor.wanderAngle;
    meteor.wander();
    let delta = Math.abs(meteor.wanderAngle - before);
    assert.ok(delta <= meteor.wanderJitter + 1e-9,
      'la variation angulaire ne doit pas dépasser wanderJitter (pas de tirage brutal)');
  });

  it('updateMeteor() déplace le météore sans dépasser maxSpeed', () => {
    let startX = meteor.pos.x;
    let startY = meteor.pos.y;
    meteor.updateMeteor();
    let moved = (meteor.pos.x !== startX || meteor.pos.y !== startY);
    assert.ok(moved, 'le météore doit bouger');
    assert.ok(meteor.vel.mag() <= meteor.maxSpeed + 1e-9, 'vitesse bornée par maxSpeed');
  });

  it('updateMeteor() ré-apparaît de l\'autre côté après le bord droit', () => {
    meteor.pos.set(width + meteor.r + 10, 400);
    meteor.vel = new MockVector(2, 0);
    meteor.updateMeteor();
    assert.ok(meteor.pos.x < 0, 'doit réapparaître à gauche (pos.x négatif)');
  });

  it('updateMeteor() ré-apparaît en haut après le bord bas', () => {
    meteor.pos.set(400, height + meteor.r + 10);
    meteor.vel = new MockVector(0, 2);
    meteor.updateMeteor();
    assert.ok(meteor.pos.y < 0, 'doit réapparaître en haut (pos.y négatif)');
  });

  it('checkCollisionWith() détecte la collision avec le vaisseau', () => {
    let ship = { pos: new MockVector(meteor.pos.x + 5, meteor.pos.y), r_pourDessin: 20 };
    assert.strictEqual(meteor.checkCollisionWith(ship), true, 'collision à faible distance');
  });

  it('checkCollisionWith() ne détecte rien si le vaisseau est loin', () => {
    let ship = { pos: new MockVector(meteor.pos.x + 500, meteor.pos.y), r_pourDessin: 20 };
    assert.strictEqual(meteor.checkCollisionWith(ship), false, 'pas de collision à distance');
  });

  it('checkCollisionWith() renvoie false sans vaisseau', () => {
    assert.strictEqual(meteor.checkCollisionWith(null), false);
    assert.strictEqual(meteor.checkCollisionWith(undefined), false);
  });

  it('show() doit s\'exécuter sans erreur', () => {
    assert.doesNotThrow(() => meteor.show());
  });
});
