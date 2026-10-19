/**
 * Tests unitaires pour la classe Wormhole (Trou spatial) sous-classe de Vehicle.
 *
 * Exécuter : node --test 6-ObstacleAvoidance/tests/wormhole.test.mjs
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
globalThis.random  = (a, b) => b !== undefined ? a : (Array.isArray(a) ? a[0] : Math.random());
globalThis.floor   = Math.floor;
globalThis.sin     = Math.sin;
globalThis.cos     = Math.cos;
globalThis.map     = (v, a, b, c, d) => c + (d - c) * ((v - a) / (b - a));
globalThis.constrain = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
globalThis.TWO_PI  = Math.PI * 2;
globalThis.HALF_PI = Math.PI / 2;
globalThis.PI      = Math.PI;

const noop = () => {};
globalThis.push = noop; globalThis.pop = noop; globalThis.fill = noop;
globalThis.noFill = noop; globalThis.stroke = noop; globalThis.noStroke = noop;
globalThis.strokeWeight = noop; globalThis.circle = noop; globalThis.line = noop;
globalThis.translate = noop; globalThis.rotate = noop;

const { Script } = await import('node:vm');
const base = join(__dirname, '..');

function loadScript(file) {
  const code = readFileSync(join(base, file), 'utf-8');
  const script = new Script(code, { filename: file });
  script.runInThisContext();
}

loadScript('vehicle.js');
loadScript('wormhole.js');

describe('Wormhole (Sous-classe de Vehicle)', () => {
  let holeA;
  let holeB;
  let ship;

  beforeEach(() => {
    holeA = new Wormhole(100, 100, 40, 'cyan');
    holeB = new Wormhole(800, 600, 40, 'magenta');
    ship = new Vehicle(100, 100);
  });

  it('Wormhole doit être une sous-classe de Vehicle', () => {
    assert.ok(holeA instanceof Vehicle, 'Wormhole doit hériter de Vehicle');
    assert.strictEqual(typeof holeA.update, 'function');
    assert.strictEqual(typeof holeA.applyForce, 'function');
  });

  it('link() doit relier bidirectionnellement deux trous', () => {
    holeA.link(holeB);
    assert.strictEqual(holeA.exitHole, holeB);
    assert.strictEqual(holeB.exitHole, holeA);
  });

  it('attract() doit exercer une force gravitationnelle quand le véhicule est à portée', () => {
    holeA.pos.set(200, 200);
    ship.pos.set(250, 200); // à distance 50 (< 160)

    let pull = holeA.attract(ship, 160);
    assert.ok(pull !== null, 'Une force doit être retournée');
    assert.ok(pull.mag() > 0, 'La force d attraction doit être non nulle');
  });

  it('attract() ne doit rien faire si le véhicule est trop loin', () => {
    holeA.pos.set(200, 200);
    ship.pos.set(600, 600); // très loin

    let pull = holeA.attract(ship, 160);
    assert.strictEqual(pull, null);
  });

  it('tryTeleport() doit téléporter le véhicule vers le trou de sortie', () => {
    holeA.link(holeB);
    // Placer le véhicule tout près du centre de holeA
    ship.pos.set(105, 100); // d = 5 (< 40 * 0.65 = 26)
    ship.vel = new MockVector(2, 0);

    let teleported = holeA.tryTeleport(ship);
    assert.strictEqual(teleported, true, 'Le véhicule doit être téléporté');

    // La position doit être proche de holeB (avec offset d éjection)
    let distToExit = p5.Vector.dist(ship.pos, holeB.pos);
    assert.ok(distToExit < holeB.r * 1.5, 'Le véhicule doit être à proximité du trou de sortie');
    assert.ok(distToExit > 10, 'Le véhicule doit être légèrement décalé du centre de sortie pour éviter l oscillation');
  });

  it('tryTeleport() ne doit pas téléporter si le véhicule est hors de l horizon', () => {
    holeA.link(holeB);
    ship.pos.set(150, 100); // d = 50 (> 26)

    let teleported = holeA.tryTeleport(ship);
    assert.strictEqual(teleported, false);
    assert.strictEqual(ship.pos.x, 150);
  });

  it('Le cooldown doit empêcher une re-téléportation immédiate', () => {
    holeA.link(holeB);
    ship.pos.set(102, 100);

    // 1ère téléportation
    let t1 = holeA.tryTeleport(ship);
    assert.strictEqual(t1, true);

    // Tester une téléportation immédiate depuis holeB
    let t2 = holeB.tryTeleport(ship);
    assert.strictEqual(t2, false, 'Le cooldown doit bloquer la re-téléportation instantanée');
  });

  it('updateWormhole() doit décrémenter et expirer le cooldown', () => {
    holeA.setCooldown(ship, 2);
    assert.strictEqual(holeA.isOnCooldown(ship), true);

    holeA.updateWormhole(); // cd passe à 1
    assert.strictEqual(holeA.isOnCooldown(ship), true);

    holeA.updateWormhole(); // cd expire
    assert.strictEqual(holeA.isOnCooldown(ship), false);
  });

  it('show() doit s exécuter sans erreur', () => {
    assert.doesNotThrow(() => {
      holeA.show();
    });
  });
});
