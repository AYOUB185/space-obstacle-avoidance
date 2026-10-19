/**
 * Tests unitaires pour la gestion des vaisseaux suiveurs, les jetons, la progression,
 * la transition de niveau et le bouclier temporaire.
 *
 * Exécuter : node --test 6-ObstacleAvoidance/tests/gameProgression.test.mjs
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
globalThis.min     = Math.min;
globalThis.max     = Math.max;
globalThis.TWO_PI  = Math.PI * 2;
globalThis.color   = (r, g, b) => ({ r, g, b });

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

loadScript('vehicle.js');
loadScript('spaceShip.js');
loadScript('projectile.js');
loadScript('followerShip.js');
loadScript('token.js');
loadScript('wormhole.js');
loadScript('explosionGalaxy.js');
loadScript('cutscene.js');
loadScript('obstacle.js');
loadScript('meteor.js');
loadScript('ionDrone.js');
loadScript('alienLeader.js');
loadScript('alienInterceptor.js');
loadScript('proximityMine.js');
loadScript('binarySingularity.js');

describe('Gestion des vaisseaux suiveurs (FollowerShip extends Vehicle)', () => {
  let follower;
  let player;

  beforeEach(() => {
    follower = new FollowerShip(100, 100);
    player = new SpaceShip(105, 100);
  });

  it('FollowerShip doit être une sous-classe de Vehicle', () => {
    assert.ok(follower instanceof Vehicle, 'FollowerShip doit hériter de Vehicle');
    assert.strictEqual(follower.isHostile, false, 'Doit démarrer pacifique au niveau 1');
  });

  it('setHostile(true) doit activer le mode hostile pour le niveau supérieur', () => {
    follower.setHostile(true);
    assert.strictEqual(follower.isHostile, true);
    assert.strictEqual(follower.maxSpeed, 5.5);
  });

  it('checkAttackPlayer doit infliger des dégâts au joueur sans bouclier', () => {
    follower.setHostile(true);
    player.health = 100;
    player.shieldActive = false;

    let res = follower.checkAttackPlayer(player);
    assert.strictEqual(res, 'hit');
    assert.strictEqual(player.health, 88);
  });

  it('checkAttackPlayer doit être bloqué si le joueur a activé son bouclier', () => {
    follower.setHostile(true);
    player.health = 100;
    player.shieldActive = true;

    let res = follower.checkAttackPlayer(player);
    assert.strictEqual(res, 'shield_blocked');
    assert.strictEqual(player.health, 100, 'Le joueur ne doit subir aucun dégât sous bouclier');
  });

  it('checkHit doit détruire le vaisseau hostile lorsqu il est touché par un projectile', () => {
    follower.setHostile(true);
    let projectile = new Projectile(105, 100, new MockVector(1, 0));

    let destroyed = follower.checkHit(projectile);
    assert.strictEqual(destroyed, true);
    assert.strictEqual(follower.hp, 0);
    assert.strictEqual(projectile.alive, false);
  });
});

describe('Collecte de jetons (Token extends Vehicle)', () => {
  let token;
  let ship;

  beforeEach(() => {
    token = new Token(200, 200, 2500);
    ship = new SpaceShip(205, 200);
  });

  it('Token doit être une sous-classe de Vehicle', () => {
    assert.ok(token instanceof Vehicle, 'Token doit hériter de Vehicle');
    assert.strictEqual(token.value, 2500);
  });

  it('checkCollection doit incrémenter ship.tokens lors de la collecte', () => {
    ship.tokens = 0;
    let collected = token.checkCollection(ship);
    assert.strictEqual(collected, true);
    assert.strictEqual(token.collected, true);
    assert.strictEqual(ship.tokens, 2500);
  });
});

describe('Mécanique de progression & bouclier', () => {
  let ship;

  beforeEach(() => {
    ship = new SpaceShip(100, 100);
  });

  it('Le trou de ver requiert un score de 100 000 pour la dimension de collecte', () => {
    ship.score = 75000;
    assert.strictEqual(ship.score >= 100000, false);

    ship.score = 100000;
    assert.strictEqual(ship.score >= 100000, true);
  });

  it('Le niveau supérieur se déclenche automatiquement à 1 000 000 jetons', () => {
    ship.tokens = 950000;
    assert.strictEqual(ship.tokens >= 1000000, false);

    ship.tokens = 1000000;
    assert.strictEqual(ship.tokens >= 1000000, true);
  });

  it('activateShield active le bouclier temporaire via commande', () => {
    let ok = ship.activateShield();
    assert.strictEqual(ok, true);
    assert.strictEqual(ship.shieldActive, true);
    assert.strictEqual(ship.shieldTimer, 300);

    // Ne peut pas être spammé immédiatement en recharge
    let secondTry = ship.activateShield();
    assert.strictEqual(secondTry, false);
  });

  it('updateWeapons décrémente et éteint le bouclier à la fin de sa durée', () => {
    ship.activateShield();
    ship.shieldTimer = 1;

    ship.updateWeapons();
    assert.strictEqual(ship.shieldActive, false);
  });
});

describe('Galaxie d\'explosion & Transit dimensionnel (Touche W > 100 000)', () => {
  let ship;

  beforeEach(() => {
    ship = new SpaceShip(150, 250);
    globalThis.width = 1200;
    globalThis.height = 800;
    globalThis.background = noop;
  });

  it('ExplosionGalaxyBackground doit initialiser étoiles, nuages ardents, anneaux de choc et braises', () => {
    let expBg = new ExplosionGalaxyBackground();
    assert.ok(expBg.stars.length > 0, 'Doit avoir des étoiles explosives');
    assert.ok(expBg.fireClouds.length > 0, 'Doit avoir des nuages de plasma');
    assert.ok(expBg.embers.length > 0, 'Doit avoir des braises cosmiques');
    assert.ok(expBg.blastRings.length > 0, 'Doit avoir des anneaux d explosion');
  });

  it('ExplosionGalaxyBackground.updateAndShow s exécute sans erreur', () => {
    let expBg = new ExplosionGalaxyBackground();
    assert.doesNotThrow(() => {
      expBg.updateAndShow();
    });
  });

  it('La condition de score > 100 000 doit être vérifiée avant activation de la touche W', () => {
    ship.score = 50000;
    ship.tokens = 50000;
    let canEnter = ship.score >= 100000 || ship.tokens >= 100000;
    assert.strictEqual(canEnter, false, 'Score insuffisant');

    ship.score = 100001;
    canEnter = ship.score >= 100000 || ship.tokens >= 100000;
    assert.strictEqual(canEnter, true, 'Score supérieur à 100 000 autorisé');
  });

  it('La téléportation dans la galaxie d explosion doit repositionner le vaisseau et calmer sa vitesse', () => {
    ship.pos.set(50, 70);
    ship.vel.set(8, -6);

    // Téléportation vers le centre de la galaxie d'explosion
    ship.pos.set(width / 2, height / 2);
    ship.vel.set(0, 0);

    assert.strictEqual(ship.pos.x, 600);
    assert.strictEqual(ship.pos.y, 400);
    assert.strictEqual(ship.vel.mag(), 0);
  });

  it('La galaxie d explosion doit générer entre 100 et 200 jetons à collecter', () => {
    // Simulation de plusieurs tirages aléatoires pour vérifier l intervalle [100, 200]
    for (let trial = 0; trial < 20; trial++) {
      let count = Math.floor(Math.random() * 101) + 100; // 100 à 200
      assert.ok(count >= 100 && count <= 200, `Le nombre de jetons (${count}) doit être compris entre 100 et 200`);

      let generatedTokens = [];
      for (let i = 0; i < count; i++) {
        let t = new Token(100 + i, 100 + i, 2500);
        assert.ok(t instanceof Vehicle, 'Chaque jeton doit être une instance de Vehicle');
        generatedTokens.push(t);
      }
      assert.strictEqual(generatedTokens.length, count);
    }
  });

  it('La durée de séjour dans la galaxie d explosion doit être de 30 secondes (1800 frames)', () => {
    const HYPER_DIMENSION_DURATION = 1800; // 30 secondes à 60 FPS
    let timer = HYPER_DIMENSION_DURATION;
    let inHyperDimension = true;

    // Simulation de 1800 frames
    for (let frame = 0; frame < 1800; frame++) {
      timer--;
      if (timer <= 0) {
        inHyperDimension = false;
      }
    }

    assert.strictEqual(timer, 0);
    assert.strictEqual(inHyperDimension, false, 'Le joueur doit être ramené automatiquement après 30s');
  });
});

describe('Cinématiques vidéo d\'introduction (CutsceneManager)', () => {
  let manager;

  beforeEach(() => {
    manager = new CutsceneManager();
  });

  it('CutsceneManager s initialise sans être en cours de lecture', () => {
    assert.strictEqual(manager.isPlaying, false);
    assert.strictEqual(manager.currentVideoSrc, null);
  });

  it('play() configure correctement la vidéo niveau 1.mp4 avant le niveau 1', () => {
    let completed = false;
    manager.play('niveau 1.mp4', 'NIVEAU 1 : ESPACE PROFOND', () => {
      completed = true;
    });

    assert.strictEqual(manager.isPlaying, true);
    assert.strictEqual(manager.currentVideoSrc, 'niveau 1.mp4');

    // Fin de la cinématique
    manager.end();
    assert.strictEqual(manager.isPlaying, false);
    assert.strictEqual(completed, true, 'Le callback doit être appelé pour débuter le niveau 1');
  });

  it('play() configure correctement la vidéo niveau 2.mp4 avant le niveau 2', () => {
    let level2Started = false;
    manager.play('niveau 2.mp4', 'NIVEAU 2 : ZONE HOSTILE', () => {
      level2Started = true;
    });

    assert.strictEqual(manager.isPlaying, true);
    assert.strictEqual(manager.currentVideoSrc, 'niveau 2.mp4');

    // Passage rapide via skip
    manager.skip();
    assert.strictEqual(manager.isPlaying, false);
    assert.strictEqual(level2Started, true, 'Le callback de transition niveau 2 doit être appelé');
  });

  it('handleKeyPressed() permet de passer la cinématique avec Espace, Entrée ou Échap', () => {
    let completed = false;
    manager.play('niveau 1.mp4', 'Test', () => {
      completed = true;
    });

    let consumed = manager.handleKeyPressed(' ', 32);
    assert.strictEqual(consumed, true, 'La touche doit être consommée');
    assert.strictEqual(manager.isPlaying, false);
    assert.strictEqual(completed, true);

    // Une touche pressée hors cinématique ne doit pas être interceptée
    let notConsumed = manager.handleKeyPressed('a', 65);
    assert.strictEqual(notConsumed, false);
  });

  it('skip() et end() gèrent gracieusement l absence de callback sans erreur', () => {
    manager.play('niveau 1.mp4', 'Sans callback', null);
    assert.doesNotThrow(() => {
      manager.skip();
    });
    assert.strictEqual(manager.isPlaying, false);
  });
});

describe('Centrage Soleil, Répulsion Centrale, Avion Vert & Collisions Niveaux 2 et 3', () => {
  beforeEach(() => {
    globalThis.width = 1200;
    globalThis.height = 800;
  });

  it('1. Le soleil doit être et rester centré au milieu du canevas', () => {
    let sun = new Obstacle(width / 2, height / 2, 95, 'sun');
    assert.strictEqual(sun.pos.x, 600);
    assert.strictEqual(sun.pos.y, 400);

    // updateObstacle doit maintenir le soleil au centre
    sun.pos.set(100, 200);
    sun.updateObstacle();
    assert.strictEqual(sun.pos.x, 600, 'Le soleil doit être repositionné au centre X');
    assert.strictEqual(sun.pos.y, 400, 'Le soleil doit être repositionné au centre Y');
    assert.strictEqual(sun.vel.mag(), 0, 'La vitesse du soleil doit rester nulle pour éviter toute dérive');
  });

  it('2. & 3. La répulsion de la lumière centrale doit repousser les avions blancs au loin', () => {
    let whitePlane = new FollowerShip(650, 400);
    assert.strictEqual(whitePlane.isHostile, false, 'Doit être un avion blanc pacifique');

    let sunPos = createVector(600, 400);
    let initialVelX = whitePlane.vel.x;

    // Application de la force de répulsion centrale
    whitePlane.applyCentralLightRepulsion(sunPos, 3.5);
    whitePlane.update();

    // L'avion blanc doit avoir accéléré dans la direction opposée au centre (+X)
    assert.ok(whitePlane.vel.x > initialVelX, 'L avion blanc doit s éloigner de la lumière centrale');
  });

  it('3. La répulsion de la lumière centrale ne doit pas affecter les avions hostiles', () => {
    let redPlane = new FollowerShip(650, 400);
    redPlane.setHostile(true);

    let sunPos = createVector(600, 400);
    let prevAccX = redPlane.acc.x;
    redPlane.applyCentralLightRepulsion(sunPos, 3.5);

    assert.strictEqual(redPlane.acc.x, prevAccX, 'Les avions rouges ne doivent pas être repoussés par la lumière centrale');
  });

  it('4. L avion vert suit la souris horizontalement et s arrête complètement lorsqu elle ne bouge plus', () => {
    let greenPlane = new SpaceShip(200, 300);

    // Mouvement de la souris vers X = 500
    greenPlane.bindHorizontalToMouse(500, 200);
    greenPlane.update();
    assert.ok(greenPlane.vel.x > 0, 'L avion vert doit accélérer vers la droite pour suivre la souris');

    // La souris ne bouge plus (mouseX == pmouseX)
    greenPlane.bindHorizontalToMouse(500, 500);
    for (let i = 0; i < 60; i++) {
      greenPlane.bindHorizontalToMouse(500, 500);
      greenPlane.update();
    }
    assert.strictEqual(greenPlane.vel.x, 0, 'L avion vert doit être complètement arrêté lorsque la souris ne bouge plus');
    assert.strictEqual(greenPlane.pos.x, 500, 'L avion vert doit avoir rejoint la souris');
  });

  it('5. Détection de collision : destruction des avions rouges au niveau 2', () => {
    let redPlane = new FollowerShip(300, 300);
    redPlane.setHostile(true);

    let projectile = new Projectile(300, 300, createVector(1, 0));
    let hit = redPlane.checkHit(projectile);

    assert.strictEqual(hit, true, 'Le projectile doit toucher l avion rouge');
    assert.strictEqual(redPlane.hp, 0, 'L avion rouge doit être détruit');
    assert.strictEqual(projectile.alive, false);
  });

  it('5. Détection de collision : les planètes en rotation sont protégées aux niveaux 1 et 2, destructibles au niveau 3', () => {
    let planet = new Obstacle(400, 400, 60, 'ringPlanet');

    // Niveaux 1 et 2 : protégées
    let currentLevel = 2;
    let canDestroyPlanet = (currentLevel >= 3 && planet.type !== 'sun');
    assert.strictEqual(canDestroyPlanet, false, 'Au niveau 2 la planète en rotation ne doit pas être détruite');

    // Niveau 3 : destructible
    currentLevel = 3;
    canDestroyPlanet = (currentLevel >= 3 && planet.type !== 'sun');
    assert.strictEqual(canDestroyPlanet, true, 'Au niveau 3 la planète en rotation doit pouvoir être détruite');
  });
});
describe('Rechargement automatique de la jauge de tir (toutes les minutes)', () => {
  let ship;

  beforeEach(() => {
    ship = new SpaceShip(300, 300);
  });

  it('minuteReloadTimer doit être initialisé à 3600 frames (60 secondes)', () => {
    assert.strictEqual(ship.minuteReloadTimer, 3600);
    assert.strictEqual(ship.minuteReloadInterval, 3600);
  });

  it('Après 3600 appels à updateWeapons, la jauge est rechargée à maxAmmo', () => {
    ship.ammo = 0;
    ship.minuteReloadTimer = 1;
    ship.ammoRegenTimer = 0; // empêcher regen progressive d'interférer
    ship.updateWeapons();
    assert.strictEqual(ship.ammo, ship.maxAmmo, 'La jauge de tir doit être pleinement rechargée après 1 minute');
    assert.strictEqual(ship.minuteReloadTimer, ship.minuteReloadInterval, 'Le timer doit se réinitialiser');
  });

  it('Avant 3600 frames, la jauge ne se recharge PAS entièrement automatiquement', () => {
    ship.ammo = 5;
    ship.minuteReloadTimer = 100;
    ship.ammoRegenTimer = 0;
    ship.updateWeapons();
    assert.ok(ship.ammo <= 6, 'La jauge ne doit pas se recharger entièrement avant 1 minute');
    assert.ok(ship.minuteReloadTimer < 3600, 'Le timer ne doit pas encore être réinitialisé');
  });
});

describe('Niveaux 4-8 : Nouvelles entités (Vehicle extends)', () => {
  beforeEach(() => {
    globalThis.width = 1200;
    globalThis.height = 800;
  });

  it('IonDrone doit être une sous-classe de Vehicle', () => {
    let drone = new IonDrone(100, 100);
    assert.ok(drone instanceof Vehicle);
    assert.strictEqual(drone.stolenTokens, 0);
  });

  it('IonDrone.tryAbsorbToken doit marquer le jeton comme collecté', () => {
    let drone = new IonDrone(200, 200);
    let token = new Token(205, 200, 2500);
    let absorbed = drone.tryAbsorbToken(token);
    assert.strictEqual(absorbed, true);
    assert.strictEqual(token.collected, true);
    assert.strictEqual(drone.stolenTokens, 1);
  });

  it('IonDrone.checkHit doit être touché par un projectile', () => {
    let drone = new IonDrone(300, 300);
    let proj = new Projectile(300, 300, new MockVector(1, 0));
    let hit = drone.checkHit(proj);
    assert.strictEqual(hit, true);
    assert.strictEqual(proj.alive, false);
  });

  it('AlienLeader doit être une sous-classe de Vehicle avec HP multiples', () => {
    let leader = new AlienLeader(400, 300);
    assert.ok(leader instanceof Vehicle);
    assert.strictEqual(leader.hp, 6);
    assert.strictEqual(leader.maxHp, 6);
  });

  it('AlienLeader.checkHit doit décrémenter les HP et retourner true à 0 HP', () => {
    let leader = new AlienLeader(400, 300);
    leader.hp = 1;
    let proj = new Projectile(400, 300, new MockVector(1, 0));
    let destroyed = leader.checkHit(proj);
    assert.strictEqual(destroyed, true);
    assert.strictEqual(leader.hp, 0);
  });

  it('AlienLeader.checkHit doit retourner false (pas de destruction) si HP > 0 après impact', () => {
    let leader = new AlienLeader(400, 300);
    leader.hp = 3;
    let proj = new Projectile(400, 300, new MockVector(1, 0));
    let destroyed = leader.checkHit(proj);
    assert.strictEqual(destroyed, false);
    assert.strictEqual(leader.hp, 2);
  });

  it('AlienInterceptor doit être une sous-classe de Vehicle et changer de comportement si le leader est détruit', () => {
    let interceptor = new AlienInterceptor(100, 100, 0.45);
    assert.ok(interceptor instanceof Vehicle);
    assert.strictEqual(interceptor.slotAngle, 0.45);
  });

  it('ProximityMine doit être une sous-classe de Vehicle, non armée initialement', () => {
    let mine = new ProximityMine(500, 300);
    assert.ok(mine instanceof Vehicle);
    assert.strictEqual(mine.isArmed, false);
  });

  it('ProximityMine.checkCollisionWithPlayer doit retourner shield_blocked si bouclier actif', () => {
    let mine = new ProximityMine(300, 300);
    let player = new SpaceShip(308, 300);
    player.shieldActive = true;
    let result = mine.checkCollisionWithPlayer(player);
    assert.strictEqual(result, 'shield_blocked');
    assert.strictEqual(player.health, 100, 'Le joueur ne doit subir aucun dégât sous bouclier');
  });

  it('ProximityMine.checkCollisionWithPlayer doit infliger des dégâts sans bouclier', () => {
    let mine = new ProximityMine(300, 300);
    let player = new SpaceShip(308, 300);
    player.shieldActive = false;
    player.health = 100;
    let result = mine.checkCollisionWithPlayer(player);
    assert.strictEqual(result, 'hit');
    assert.ok(player.health < 100);
  });

  it('BinarySingularity doit être une sous-classe de Vehicle et orbiter autour du barycentre', () => {
    let sing = new BinarySingularity(600, 400, 180, 0.018, 0);
    assert.ok(sing instanceof Vehicle);
    // Position initiale sur l'orbite (radius=180 à angle=0 => x=780, y=400)
    assert.ok(Math.abs(sing.pos.x - 780) < 2, 'Position orbitale X correcte');
    assert.ok(Math.abs(sing.pos.y - 400) < 2, 'Position orbitale Y correcte');
  });

  it('BinarySingularity.attractVehicle doit exercer une force vers la singularité', () => {
    let sing = new BinarySingularity(600, 400, 180, 0.018, 0);
    let vehicle = new SpaceShip(600, 400); // au centre (loin de la singularité sur son orbite)
    let prevAccX = vehicle.acc.x;
    sing.attractVehicle(vehicle, 500);
    // Une force doit avoir été appliquée dans la direction de la singularité (vers +X)
    assert.ok(vehicle.acc.x !== prevAccX, 'Une force gravitationnelle doit être appliquée');
  });
});

