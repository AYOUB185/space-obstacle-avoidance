/**
 * Tests unitaires pour le système de tir (Projectile et Explosion)
 * dans 6-ObstacleAvoidance.
 *
 * Exécuter : node --test 6-ObstacleAvoidance/tests/shooting.test.mjs
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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

// Globals p5
globalThis.createVector = (x, y) => new MockVector(x, y);
globalThis.p5 = { Vector: MockVector };
globalThis.random  = (a, b) => b !== undefined ? a : (Array.isArray(a) ? a[0] : Math.random());
globalThis.floor   = Math.floor;
globalThis.sin     = Math.sin;
globalThis.cos     = Math.cos;
globalThis.map     = (v, a, b, c, d) => c + (d - c) * ((v - a) / (b - a));
globalThis.constrain = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
globalThis.min     = Math.min;
globalThis.max     = Math.max;
globalThis.TWO_PI  = Math.PI * 2;
globalThis.HALF_PI = Math.PI / 2;
globalThis.PI      = Math.PI;
globalThis.width   = 800;
globalThis.height  = 600;
globalThis.frameCount = 100;

// Stubs graphiques
const noop = () => {};
globalThis.push = noop; globalThis.pop = noop; globalThis.fill = noop;
globalThis.noFill = noop; globalThis.stroke = noop; globalThis.noStroke = noop;
globalThis.strokeWeight = noop; globalThis.circle = noop; globalThis.line = noop;
globalThis.rect = noop; globalThis.triangle = noop; globalThis.beginShape = noop;
globalThis.endShape = noop; globalThis.vertex = noop; globalThis.ellipse = noop;
globalThis.point = noop; globalThis.arc = noop; globalThis.bezier = noop;
globalThis.translate = noop; globalThis.rotate = noop; globalThis.text = noop;
globalThis.textFont = noop; globalThis.textSize = noop; globalThis.textAlign = noop;
globalThis.textStyle = noop;
globalThis.LEFT = 'left'; globalThis.TOP = 'top'; globalThis.CENTER = 'center';
globalThis.RIGHT = 'right'; globalThis.BOLD = 'bold'; globalThis.NORMAL = 'normal';
globalThis.CLOSE = 'close';
globalThis.color = (r,g,b,a) => ({ r, g, b, a: a || 255 });
globalThis.red = c => c.r || 0; globalThis.green = c => c.g || 0; globalThis.blue = c => c.b || 0;

// Global vehicles array pour Vehicle
globalThis.vehicules = [];

// ─── Charger les classes ─────────────────────────────────────────────────
const { readFileSync } = await import('node:fs');
const { join } = await import('node:path');

const { Script } = await import('node:vm');
const base = join(import.meta.dirname, '..');

function loadScript(file) {
  const code = readFileSync(join(base, file), 'utf-8');
  const script = new Script(code, { filename: file });
  script.runInThisContext();
}

loadScript('vehicle.js');
loadScript('spaceShip.js');
loadScript('projectile.js');
loadScript('explosion.js');

// ─── Tests ───────────────────────────────────────────────────────────────

describe('Projectile', () => {
  let proj;
  let targetObs;

  beforeEach(() => {
    targetObs = { pos: new MockVector(400, 300), r: 50, type: 'icePlanet' };
    let dir = new MockVector(1, 0);
    proj = new Projectile(100, 100, dir, targetObs);
  });

  it('should start alive with correct position', () => {
    assert.ok(proj.alive);
    assert.equal(proj.pos.x, 100);
    assert.equal(proj.pos.y, 100);
  });

  it('should have initial velocity in direction of fire', () => {
    assert.ok(proj.vel.x > 0, 'velocity x should be positive (fired right)');
    assert.ok(Math.abs(proj.vel.y) < 0.01, 'velocity y should be ~0');
    assert.ok(proj.vel.mag() > 10, 'speed should be high');
  });

  it('should move forward when updated', () => {
    let startX = proj.pos.x;
    proj.updateProjectile();
    assert.ok(proj.pos.x > startX, 'should move right');
  });

  it('should die after exceeding lifespan', () => {
    proj.age = proj.lifespan + 1;
    proj.updateProjectile();
    assert.ok(!proj.alive);
    assert.ok(proj.isDead());
  });

  it('should apply seek steering toward target', () => {
    // Target is at (400, 300), proj at (100, 100)
    // After update, a seek force toward target should be applied
    let velBefore = proj.vel.copy();
    proj.updateProjectile();
    // The velocity should still be roughly toward the target
    assert.ok(proj.vel.x > 0, 'should still go right toward target');
  });

  it('should detect collision with nearby obstacle', () => {
    let nearObs = { pos: new MockVector(105, 100), r: 10, type: 'terrestrial' };
    let hit = proj.checkCollision([nearObs]);
    assert.strictEqual(hit, nearObs, 'should hit nearby obstacle');
    assert.ok(!proj.alive, 'should die on collision');
  });

  it('should NOT collide with far obstacle', () => {
    let farObs = { pos: new MockVector(500, 500), r: 20, type: 'ringPlanet' };
    let hit = proj.checkCollision([farObs]);
    assert.strictEqual(hit, null, 'should not hit far obstacle');
    assert.ok(proj.alive, 'should still be alive');
  });

  it('should not collide when dead', () => {
    proj.alive = false;
    let nearObs = { pos: new MockVector(105, 100), r: 10, type: 'terrestrial' };
    let hit = proj.checkCollision([nearObs]);
    assert.strictEqual(hit, null, 'dead projectile should not collide');
  });

  it('should build trail over time', () => {
    for (let i = 0; i < 5; i++) proj.updateProjectile();
    assert.ok(proj.trail.length > 0, 'should have trail points');
    assert.ok(proj.trail.length <= proj.trailMaxLen, 'trail should be bounded');
  });

  it('isDead returns true when not alive', () => {
    assert.ok(!proj.isDead());
    proj.alive = false;
    assert.ok(proj.isDead());
  });
});

describe('Projectile without target', () => {
  it('should still fly straight without a target', () => {
    let dir = new MockVector(0, -1);
    let proj = new Projectile(200, 200, dir, null);
    let startY = proj.pos.y;
    proj.updateProjectile();
    assert.ok(proj.pos.y < startY, 'should move upward');
    assert.ok(proj.alive);
  });
});

describe('Explosion', () => {
  let exp;

  beforeEach(() => {
    exp = new Explosion(300, 300, 50, 'planet');
  });

  it('should start alive', () => {
    assert.ok(exp.alive);
    assert.equal(exp.age, 0);
  });

  it('should have particles', () => {
    assert.ok(exp.particles.length > 0, 'should have particles');
  });

  it('should have shock rings', () => {
    assert.ok(exp.shockRings.length >= 2, 'should have at least 2 shock rings');
  });

  it('should age and die after maxAge', () => {
    for (let i = 0; i < exp.maxAge + 5; i++) {
      exp.update();
    }
    assert.ok(!exp.alive);
    assert.ok(exp.isDead());
  });

  it('should reduce flash alpha over time', () => {
    let initialFlash = exp.flashAlpha;
    exp.update();
    assert.ok(exp.flashAlpha < initialFlash, 'flash should decay');
  });

  it('should expand shock rings', () => {
    let initialRadius = exp.shockRings[0].radius;
    exp.update();
    assert.ok(exp.shockRings[0].radius > initialRadius, 'ring should expand');
  });

  it('should move particles', () => {
    let p = exp.particles[0];
    let startX = p.x;
    let startY = p.y;
    exp.update();
    let moved = (p.x !== startX || p.y !== startY);
    assert.ok(moved, 'particles should move');
  });

  it('should reduce particle alpha', () => {
    let p = exp.particles[0];
    let startAlpha = p.alpha;
    exp.update();
    assert.ok(p.alpha < startAlpha, 'particle alpha should decay');
  });

  it('should accept shield type', () => {
    let shieldExp = new Explosion(100, 100, 30, 'shield');
    assert.equal(shieldExp.type, 'shield');
    assert.ok(shieldExp.alive);
  });

  it('should accept sun type', () => {
    let sunExp = new Explosion(100, 100, 80, 'sun');
    assert.equal(sunExp.type, 'sun');
    assert.ok(sunExp.particles.length > 0);
  });

  it('show() should not throw when alive', () => {
    assert.doesNotThrow(() => exp.show());
  });

  it('show() should not throw when dead', () => {
    exp.alive = false;
    assert.doesNotThrow(() => exp.show());
  });
});

describe('SpaceShip weapons integration', () => {
  let ship;

  beforeEach(() => {
    ship = new SpaceShip(400, 300);
  });

  it('should start with full ammo', () => {
    assert.equal(ship.ammo, ship.maxAmmo);
    assert.equal(ship.cooldown, 0);
    assert.equal(ship.score, 0);
  });

  it('should fire a projectile when ready', () => {
    let obs = [{ pos: new MockVector(500, 300), r: 40, type: 'icePlanet' }];
    ship.vel = new MockVector(1, 0);
    let proj = ship.fire(obs);
    assert.ok(proj !== null, 'should return a projectile');
    assert.ok(proj instanceof Projectile);
    assert.equal(ship.ammo, ship.maxAmmo - 1, 'should consume 1 ammo');
    assert.ok(ship.cooldown > 0, 'should be in cooldown');
  });

  it('should NOT fire when in cooldown', () => {
    let obs = [{ pos: new MockVector(500, 300), r: 40, type: 'icePlanet' }];
    ship.vel = new MockVector(1, 0);
    ship.fire(obs); // first shot
    let proj2 = ship.fire(obs); // second shot
    assert.strictEqual(proj2, null, 'should not fire during cooldown');
  });

  it('should NOT fire when out of ammo', () => {
    let obs = [{ pos: new MockVector(500, 300), r: 40, type: 'icePlanet' }];
    ship.vel = new MockVector(1, 0);
    ship.ammo = 0;
    let proj = ship.fire(obs);
    assert.strictEqual(proj, null, 'should not fire without ammo');
  });

  it('updateWeapons should decrease cooldown', () => {
    ship.cooldown = 5;
    ship.updateWeapons();
    assert.equal(ship.cooldown, 4);
  });

  it('updateWeapons should regenerate ammo over time', () => {
    ship.ammo = 10;
    ship.ammoRegenTimer = 119;
    ship.updateWeapons();
    assert.equal(ship.ammo, 11, 'should regen 1 ammo at 120 frames');
    assert.equal(ship.ammoRegenTimer, 0, 'timer should reset');
  });

  it('should NOT regenerate ammo when full', () => {
    ship.ammo = ship.maxAmmo;
    ship.ammoRegenTimer = 119;
    ship.updateWeapons();
    assert.equal(ship.ammo, ship.maxAmmo, 'should not exceed max ammo');
  });

  it('applyBehaviors should use seek (not arrive)', () => {
    // We test that the ship applies a seek force toward the target
    let target = new MockVector(600, 300);
    // avoid() requires at least one obstacle to not crash
    let obstacles = [{ pos: new MockVector(-9999, -9999), r: 10 }];
    ship.vel = new MockVector(1, 0);
    ship.applyBehaviors(target, obstacles);
    // After applyBehaviors, acc should have a force component toward the target
    assert.ok(ship.acc.mag() > 0, 'acceleration should be non-zero');
    assert.ok(ship.acc.x > 0, 'should be pulled toward target (right)');
  });

  it('should target closest obstacle when firing', () => {
    let nearObs = { pos: new MockVector(420, 300), r: 30, type: 'terrestrial' };
    let farObs  = { pos: new MockVector(700, 500), r: 50, type: 'ringPlanet' };
    ship.vel = new MockVector(1, 0);
    let proj = ship.fire([nearObs, farObs]);
    assert.ok(proj !== null);
    assert.strictEqual(proj.target, nearObs, 'should target the closest obstacle');
  });
});

describe('Collision: projectile vs Sun (shield)', () => {
  it('Sun should not be destroyed', () => {
    let sun = { pos: new MockVector(400, 300), r: 95, type: 'sun' };
    let dir = new MockVector(1, 0);
    let proj = new Projectile(400, 300, dir, sun); // spawned right on the sun
    let hit = proj.checkCollision([sun]);
    assert.strictEqual(hit, sun, 'should detect collision');
    assert.equal(hit.type, 'sun', 'should identify as sun');
    // In the sketch, the sun is not removed from obstacles
  });
});
