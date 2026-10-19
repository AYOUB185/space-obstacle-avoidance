/**
 * Test fumigène (smoke test) du sketch complet de 6-ObstacleAvoidance.
 *
 * Objectif : charger TOUS les fichiers JS dans l'ordre de index.html (comme un
 * navigateur avec plusieurs balises <script>), puis exécuter setup() et plusieurs
 * frames de draw() ainsi que les gestionnaires clavier/souris. Cela reproduit le
 * comportement réel du navigateur et détecte notamment les erreurs d'ordre de
 * chargement (ex. une classe qui étend Vehicle avant que Vehicle ne soit défini).
 *
 * Exécuter : node --test 6-ObstacleAvoidance/tests/smoke.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Script } from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const base = join(__dirname, '..');

// ─── Mock p5.Vector ─────────────────────────────────────────────────────
class MockVector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy()      { return new MockVector(this.x, this.y); }
  add(v)      { this.x += v.x; this.y += v.y; return this; }
  sub(v)      { this.x -= v.x; this.y -= v.y; return this; }
  mult(s)     { this.x *= s; this.y *= s; return this; }
  div(s)      { this.x /= s; this.y /= s; return this; }
  mag()       { return Math.sqrt(this.x ** 2 + this.y ** 2); }
  magSq()     { return this.x ** 2 + this.y ** 2; }
  setMag(m)   { const mg = this.mag() || 1; return this.mult(m / mg); }
  normalize() { return this.setMag(1); }
  limit(max)  { if (this.mag() > max) this.setMag(max); return this; }
  heading()   { return Math.atan2(this.y, this.x); }
  set(x, y)   { this.x = x; this.y = y; return this; }
  dist(v)     { return Math.hypot(this.x - v.x, this.y - v.y); }
  dot(v)      { return this.x * v.x + this.y * v.y; }
  rotate(a)   { const c = Math.cos(a), s = Math.sin(a); const x = this.x; this.x = x * c - this.y * s; this.y = x * s + this.y * c; return this; }
  lerp(v, t)  { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; return this; }
  static sub(a, b)    { return new MockVector(a.x - b.x, a.y - b.y); }
  static add(a, b)    { return new MockVector(a.x + b.x, a.y + b.y); }
  static mult(v, s)   { return new MockVector(v.x * s, v.y * s); }
  static div(v, s)    { return new MockVector(v.x / s, v.y / s); }
  static dist(a, b)   { return Math.hypot(a.x - b.x, a.y - b.y); }
  static random2D()   { return new MockVector(1, 0); }
  static fromAngle(a) { return new MockVector(Math.cos(a), Math.sin(a)); }
}

// ─── monde p5 simulé ────────────────────────────────────────────────────
globalThis.p5 = { Vector: MockVector };
globalThis.createVector = (x, y) => new MockVector(x || 0, y || 0);
globalThis.random = (a, b) => {
  if (Array.isArray(a)) return a[Math.floor(Math.random() * a.length)];
  if (a === undefined) return Math.random();
  if (b === undefined) return Math.random() * a;
  return a + Math.random() * (b - a);
};
globalThis.randomSeed = () => {};
globalThis.noiseSeed = () => {};
globalThis.noise = (x = 0, y = 0) => {
  const v = Math.sin((x || 0) * 12.9898 + (y || 0) * 78.233) * 43758.5453;
  return v - Math.floor(v);
};
globalThis.map = (v, a, b, c, d) => (b === a ? c : c + (d - c) * ((v - a) / (b - a)));
globalThis.constrain = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
globalThis.lerp = (a, b, t) => a + (b - a) * t;
globalThis.dist = (x1, y1, x2, y2) =>
  (typeof x1 === 'object' && x1 !== null)
    ? Math.hypot(x1.x - y1.x, x1.y - y1.y)
    : Math.hypot(x2 - x1, y2 - y1);
globalThis.mag = (a, b) => (b === undefined
  ? Math.abs(typeof a === 'number' ? a : Math.hypot(a.x || 0, a.y || 0))
  : Math.hypot(a, b));
globalThis.color = (...args) => ({ __color: true, levels: [255, 255, 255, 255], args });
globalThis.red = (c) => (c && c.levels ? c.levels[0] : 255);
globalThis.green = (c) => (c && c.levels ? c.levels[1] : 255);
globalThis.blue = (c) => (c && c.levels ? c.levels[2] : 255);
globalThis.alpha = (c) => (c && c.levels ? c.levels[3] : 255);
globalThis.lerpColor = (a) => a;
globalThis.millis = () => globalThis.__millis || 0;
globalThis.frameRate = () => {};

Object.assign(globalThis, {
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  abs: Math.abs, min: Math.min, max: Math.max,
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  sqrt: Math.sqrt, pow: Math.pow, exp: Math.exp, log: Math.log,
  atan2: Math.atan2, sq: (n) => n * n,
  degrees: (r) => r * 180 / Math.PI, radians: (d) => d * Math.PI / 180,
});

globalThis.TWO_PI = Math.PI * 2;
globalThis.PI = Math.PI;
globalThis.HALF_PI = Math.PI / 2;
globalThis.QUARTER_PI = Math.PI / 4;
globalThis.CENTER = 'center'; globalThis.LEFT = 'left'; globalThis.RIGHT = 'right';
globalThis.TOP = 'top'; globalThis.BOTTOM = 'bottom';
globalThis.CORNER = 'corner'; globalThis.CORNERS = 'corners'; globalThis.RADIUS = 'radius';
globalThis.RADIANS = 'radians'; globalThis.DEGREES = 'degrees';
globalThis.CLOSE = 'close'; globalThis.OPEN = 'open';
globalThis.CHORD = 'chord'; globalThis.PIE = 'pie';
globalThis.PROJECT = 'project'; globalThis.ROUND = 'round';
globalThis.SQUARE = 'square'; globalThis.MITER = 'miter'; globalThis.BEVEL = 'bevel';
// styles de texte / curseur / alignement
globalThis.NORMAL = 'normal'; globalThis.ITALIC = 'italic';
globalThis.BOLD = 'bold'; globalThis.BOLDITALIC = 'bold italic';
globalThis.ARROW = 'default'; globalThis.CROSS = 'crosshair';
globalThis.HAND = 'pointer'; globalThis.MOVE = 'move'; globalThis.WAIT = 'wait';
globalThis.TEXT = 'text'; globalThis.BASELINE = 'alphabetic';
globalThis.CENTER = 'center'; globalThis.LEFT = 'left'; globalThis.RIGHT = 'right';
globalThis.TOP = 'top'; globalThis.BOTTOM = 'bottom';

// valeurs d'état lues par le sketch
globalThis.width = 1024; globalThis.height = 768;
globalThis.windowWidth = 1024; globalThis.windowHeight = 768;
globalThis.frameCount = 0; globalThis.deltaTime = 16.66;
globalThis.mouseX = 0; globalThis.mouseY = 0; globalThis.pmouseX = 0; globalThis.pmouseY = 0;
globalThis.key = ''; globalThis.keyCode = 0;
globalThis.mouseIsPressed = false;
globalThis.touches = [];

const DRAW_NOOPS = [
  'createCanvas', 'resizeCanvas', 'background', 'clear',
  'push', 'pop', 'translate', 'rotate', 'scale', 'resetMatrix',
  'fill', 'noFill', 'stroke', 'noStroke', 'strokeWeight', 'strokeCap', 'strokeJoin',
  'circle', 'ellipse', 'rect', 'square', 'line', 'arc', 'bezier', 'curve', 'point',
  'triangle', 'quad', 'polygon',
  'beginShape', 'endShape', 'vertex', 'curveVertex', 'bezierVertex',
  'text', 'textSize', 'textAlign', 'textFont', 'textWidth', 'textStyle', 'textLeading',
  'rectMode', 'ellipseMode', 'angleMode', 'colorMode', 'blendMode',
  'image', 'tint', 'noTint', 'loadImage', 'loadFont', 'createVideo',
  'rotateX', 'rotateY', 'shininess', 'sphere', 'box', 'plane',
  'erase', 'noErase', 'pixelDensity', 'curveTightness', 'noLoop', 'loop', 'redraw',
];
for (const fn of DRAW_NOOPS) globalThis[fn] = () => {};

// ─── chargement dans l'ordre de index.html ──────────────────────────────
const ORDER = [
  'vehicle.js', 'obstacle.js', 'antigravity.js', 'projectile.js', 'explosion.js',
  'token.js', 'followerShip.js', 'wormhole.js', 'meteor.js', 'spaceShip.js',
  'stars.js', 'explosionGalaxy.js', 'ionDrone.js', 'alienLeader.js',
  'alienInterceptor.js', 'proximityMine.js', 'binarySingularity.js', 'cutscene.js',
  'sketch.js',
];

function loadScript(file) {
  const code = readFileSync(join(base, file), 'utf-8');
  new Script(code, { filename: file }).runInThisContext();
}

test('le sketch complet se charge, s\'initialise et tourne sans erreur', () => {
  for (const file of ORDER) {
    assert.doesNotThrow(
      () => loadScript(file),
      `chargement de ${file} (ordre des balises <script>)`
    );
  }

  // Vérifie que les entités héritent bien de Vehicle (chargeable dans l'ordre index.html)
  assert.ok(Obstacle.prototype instanceof Vehicle, 'Obstacle doit étendre Vehicle');
  assert.ok(SpaceShip.prototype instanceof Vehicle, 'SpaceShip doit étendre Vehicle');
  assert.ok(FollowerShip.prototype instanceof Vehicle, 'FollowerShip doit étendre Vehicle');
  assert.ok(Meteor.prototype instanceof Vehicle, 'Meteor doit étendre Vehicle');
  assert.ok(Wormhole.prototype instanceof Vehicle, 'Wormhole doit étendre Vehicle');

  assert.doesNotThrow(() => setup(), 'setup()');
  assert.ok(pursuer1, 'le vaisseau joueur doit exister après setup()');
  assert.ok(obstacles.length > 0, 'des obstacles doivent être créés');

  for (let i = 0; i < 30; i++) {
    globalThis.frameCount = i;
    globalThis.__millis = i * 16;
    assert.doesNotThrow(() => draw(), `draw() frame ${i}`);
  }

  for (const k of [' ', 'b', 'j', 'w', 'c', 'p', 'r', 't', 'v', 'd', 'x']) {
    globalThis.key = k;
    globalThis.keyCode = k.charCodeAt(0);
    assert.doesNotThrow(() => keyPressed(), `keyPressed('${k}')`);
  }

  globalThis.mouseX = 300; globalThis.mouseY = 300;
  assert.doesNotThrow(() => mousePressed(), 'mousePressed()');
  assert.doesNotThrow(() => windowResized(), 'windowResized()');
});
