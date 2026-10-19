let pursuer1;
let target;
let obstacles = [];
let vehicules = [];
let followers = [];
let debrisList = [];
let shockwaves = [];
let projectiles = [];
let tokens = [];
let explosions = [];
let wormholes = [];
let cosmicBg;
let explosionGalaxyBg;

// Force de répulsion de la lumière centrale (activée par la barre d'espace)
let centralLightRepulsionActive = false;
let centralLightPulse = 0;

// État Anti-Gravité
let antiGravityActive = false;
let antiGravityCenter;
let antiGravityRadius = 450;
let shockwaveTimer = 0;

// Tir automatique
let autoFire = false;

// Niveaux et progression
let currentLevel = 1;
let level2Timer = 0;
const LEVEL_2_FOG_DURATION = 3600; // 60 secondes à 60 FPS (3600 frames)

// 1. Apparition des jetons : 60 nouveaux jetons apparaissent toutes les 10 secondes (600 frames)
const MAX_TOKENS = 250;
let tokenRespawnTimer = 0;
const TOKEN_RESPAWN_INTERVAL = 600; // 10 secondes (600 frames à 60 FPS)
const TOKENS_PER_SPAWN = 60;

// 2. Mécanique du trou de ver : transit vers la galaxie d'explosion pendant 30 secondes (100 à 200 jetons)
let inHyperDimension = false;
let hyperDimensionTimer = 0;
const HYPER_DIMENSION_DURATION = 1800; // 30 secondes (1800 frames à 60 FPS)
let savedPreDimensionObstacles = [];
let savedPreDimensionWormholes = [];
let savedPreDimensionTokens = [];

// Niveau 3 : Ceinture d'astéroïdes (météores mobiles à esquiver)
let meteors = [];
let meteorSpawnTimer = 0;
const LEVEL_3_TOKEN_REQUIREMENT = 2000000; // 2 000 000 de jetons pour entrer dans la ceinture
const MAX_METEORS = 40;
const METEOR_SPAWN_INTERVAL = 40; // frames entre deux vagues
const METEORS_PER_SPAWN = 5;

// Niveau 4 : Drones Ioniques voleurs de jetons
let ionDrones = [];
const LEVEL_4_TOKEN_REQUIREMENT = 3500000;
const ION_DRONE_COUNT = 6;

// Niveau 5 : Flotte alien (leader following)
let alienLeader = null;
let alienInterceptors = [];
const LEVEL_5_TOKEN_REQUIREMENT = 5500000;
const INTERCEPTOR_COUNT = 5;

// Niveau 6 : Champ de mines à détection sonar
let mines = [];
const LEVEL_6_TOKEN_REQUIREMENT = 8000000;
const MINE_COUNT = 14;

// Niveau 7 : Singularités binaires gravitationnelles
let singularities = [];
const LEVEL_7_TOKEN_REQUIREMENT = 11000000;

// Niveau 8 : Nexus Chaotique (boss multi-phases)
let nexusPhase = 0; // 0=inactif, 1=orbital, 2=swarm, 3=collapse
let nexusBossHP = 20;
const NEXUS_MAX_HP = 20;
let nexusTimer = 0;
const LEVEL_8_TOKEN_REQUIREMENT = 16000000;

// Bannières d'alerte UI
let bannerText = "";
let bannerTimer = 0;
let bannerColor = [0, 240, 255];

function showBanner(text, col = [0, 240, 255], duration = 180) {
  bannerText = text;
  bannerColor = col;
  bannerTimer = duration;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  cosmicBg = new CosmicBackground(80);
  explosionGalaxyBg = new ExplosionGalaxyBackground();
  antiGravityCenter = createVector(width / 2, height / 2);

  // Vaisseau spatial du joueur
  pursuer1 = new SpaceShip(width / 2, height / 2 + 100);
  vehicules.push(pursuer1);

  // Obstacles cosmiques
  initPlanets();

  // 1. Vaisseaux suiveurs en nombre très réduit au début (3 vaisseaux au niveau 1)
  spawnFollowers(3);

  // Débris / astéroïdes
  spawnDebris(6);

  // 2. Collecte de jetons : départ à 60 jetons dans l'espace vide
  addTokens(TOKENS_PER_SPAWN);

  // 3. Vidéo d'introduction : lecture de 'niveau 1.mp4' avant le premier niveau
  // Optimisation FPS : frameRate cible 60 FPS
  frameRate(60);
  if (typeof cutsceneManager !== 'undefined') {
    cutsceneManager.play('niveau 1.mp4', 'NIVEAU 1 : EN ROUTE VERS L\'ESPACE PROFOND', () => {
      showBanner("🚀 NIVEAU 1 : ESPACE PROFOND — COLLECTEZ LES JETONS !", [0, 240, 255], 240);
    });
  } else {
    showBanner("NIVEAU 1 : ESPACE PROFOND — COLLECTEZ LES JETONS", [0, 240, 255], 240);
  }
}

function initPlanets() {
  obstacles = [];
  obstacles.push(new Obstacle(width / 2, height / 2, 95, "sun"));
  obstacles.push(new Obstacle(width * 0.22, height * 0.32, 55, "ringPlanet"));
  obstacles.push(new Obstacle(width * 0.78, height * 0.68, 65, "icePlanet"));
}

/**
 * Génère des vaisseaux suiveurs.
 * @param {number} count 
 */
function spawnFollowers(count) {
  for (let i = 0; i < count; i++) {
    let f = new FollowerShip(random(width), random(height));
    if (currentLevel === 2 || currentLevel === 3) {
      f.setHostile(true);
    }
    followers.push(f);
    vehicules.push(f);
  }
}

/**
 * Ajoute de nouveaux jetons sans dépasser MAX_TOKENS.
 * @param {number} count 
 */
function addTokens(count) {
  let needed = min(count, MAX_TOKENS - tokens.length);
  for (let i = 0; i < needed; i++) {
    let x = random(60, width - 60);
    let y = random(60, height - 60);
    tokens.push(new Token(x, y, 2500));
  }
}

function spawnDebris(count) {
  for (let i = 0; i < count; i++) {
    debrisList.push(new AntiGravityDebris(random(width), random(height)));
  }
}

/**
 * Fait apparaître une paire de trous de ver liés dans l'espace.
 */
function spawnWormholePair(x1, y1, x2, y2) {
  let holeA = new Wormhole(x1, y1, 44, 'cyan');
  let holeB = new Wormhole(x2, y2, 44, 'magenta');
  holeA.link(holeB);
  wormholes.push(holeA, holeB);
}

/**
 * Fait apparaître une vague de météores à la périphérie du canvas.
 * @param {number} count - Nombre de météores souhaités (borné par MAX_METEORS)
 */
function spawnMeteors(count) {
  for (let i = 0; i < count; i++) {
    if (meteors.length >= MAX_METEORS) return;

    // Apparition sur un bord aléatoire de l'écran
    let edge = floor(random(4));
    let x, y;
    if (edge === 0) {
      x = random(width); y = -30;
    } else if (edge === 1) {
      x = width + 30; y = random(height);
    } else if (edge === 2) {
      x = random(width); y = height + 30;
    } else {
      x = -30; y = random(height);
    }
    meteors.push(new Meteor(x, y));
  }
}

/**
 * Active le niveau 3 : la ceinture d'astéroïdes.
 * Génère une première vague de météores mobiles que le vaisseau doit esquiver.
 */
function enterAsteroidBelt() {
  meteors = [];
  meteorSpawnTimer = 0;
  spawnMeteors(12);

  explosions.push(new Explosion(pursuer1.pos.x, pursuer1.pos.y, 120, 'planet'));
  shockwaves.push(new ShockwaveRing(width / 2, height / 2, 700));

  showBanner("☄️ NIVEAU 3 : CEINTURE D'ASTÉROÏDES — ÉVITEZ LES MÉTÉORES !", [220, 170, 90], 300);
}

/**
 * Lorsque la touche "W" est pressée avec un score supérieur à 100 000 :
 * Le vaisseau est téléporté dans une galaxie avec un arrière-plan d'explosion,
 * où 100 à 200 jetons peuvent être collectés.
 * Après 30 secondes, le joueur est automatiquement ramené.
 */
function enterHyperDimension() {
  if (inHyperDimension) return;
  inHyperDimension = true;
  hyperDimensionTimer = HYPER_DIMENSION_DURATION; // 30 secondes (1800 frames)

  // 1. Le vaisseau est téléporté au centre de la galaxie d'explosion
  pursuer1.pos.set(width / 2, height / 2);
  pursuer1.vel.set(0, 0);
  pursuer1.acc.set(0, 0);

  // 2. Sauvegarde de l'environnement normal
  savedPreDimensionObstacles = [...obstacles];
  savedPreDimensionWormholes = [...wormholes];
  savedPreDimensionTokens = [...tokens];

  // Dans la galaxie d'explosion, espace dégagé pour la collecte intensive
  obstacles = [];
  wormholes = [];

  // 3. Apparition de 100 à 200 jetons à collecter
  let tokenCount = floor(random(100, 201));
  tokens = [];
  for (let i = 0; i < tokenCount; i++) {
    let x = random(60, width - 60);
    let y = random(60, height - 60);
    tokens.push(new Token(x, y, 2500));
  }

  // Effet d'explosion et onde de choc cosmique à la téléportation
  explosions.push(new Explosion(pursuer1.pos.x, pursuer1.pos.y, 140, 'shield'));
  shockwaves.push(new ShockwaveRing(width / 2, height / 2, 700));

  showBanner(`💥 GALAXIE D'EXPLOSION ATTEINTE ! ${tokenCount} JETONS À COLLECTER (30s)`, [255, 120, 20], 240);
}

/**
 * Après 30 secondes, le joueur est automatiquement ramené.
 */
function exitHyperDimension() {
  if (!inHyperDimension) return;
  inHyperDimension = false;
  hyperDimensionTimer = 0;

  // 1. Restauration de l'espace normal
  obstacles = [...savedPreDimensionObstacles];
  wormholes = [...savedPreDimensionWormholes];

  // 2. Téléportation de retour sécurisée
  pursuer1.pos.set(width / 2, height / 2 + 120);
  pursuer1.vel.set(0, 0);

  // 3. S'il reste trop peu de jetons dans l'espace normal, en régénérer
  if (tokens.length < 20) {
    addTokens(TOKENS_PER_SPAWN);
  }

  explosions.push(new Explosion(pursuer1.pos.x, pursuer1.pos.y, 120, 'shield'));
  shockwaves.push(new ShockwaveRing(width / 2, height / 2, 600));
  showBanner("🌌 RETOUR DE LA GALAXIE D'EXPLOSION DANS L'ESPACE NORMAL !", [0, 240, 255], 200);
}

/**
 * Passage automatique au niveau supérieur.
 * Nettoyage systématique des entités pour maintenir les performances FPS.
 */
function levelUp() {
  if (currentLevel === 1) {
    if (typeof cutsceneManager !== 'undefined') {
      cutsceneManager.play('niveau 2.mp4', 'NIVEAU 2 : ZONE D\'HOSTILITÉ ET BRUME COSMIQUE', () => {
        applyLevel2Transition();
      });
    } else {
      applyLevel2Transition();
    }
  } else if (currentLevel === 2) {
    currentLevel = 3;
    _cleanupLevel();
    enterAsteroidBelt();
  } else if (currentLevel === 3) {
    currentLevel = 4;
    _cleanupLevel();
    enterIonDroneLevel();
  } else if (currentLevel === 4) {
    currentLevel = 5;
    _cleanupLevel();
    enterAlienFleetLevel();
  } else if (currentLevel === 5) {
    currentLevel = 6;
    _cleanupLevel();
    enterMinefieldLevel();
  } else if (currentLevel === 6) {
    currentLevel = 7;
    _cleanupLevel();
    enterBinaryGravityLevel();
  } else if (currentLevel === 7) {
    currentLevel = 8;
    _cleanupLevel();
    enterNexusBoss();
  } else if (currentLevel === 8) {
    showBanner("🏆 FÉLICITATIONS ! VOUS AVEZ CONQUIS LE COSMOS ! Tous les niveaux complétés.", [255, 215, 0], 600);
  }
}

/** Nettoie les entités du niveau précédent pour éviter les fuites mémoire et les baisses de FPS. */
function _cleanupLevel() {
  meteors = [];
  ionDrones = [];
  alienLeader = null;
  alienInterceptors = [];
  mines = [];
  singularities = [];
  nexusPhase = 0;
  explosions = [];
  shockwaves = [];
  projectiles = [];
  tokenRespawnTimer = 0;
}

/** Niveau 4 : Drones ioniques voleurs de jetons */
function enterIonDroneLevel() {
  for (let i = 0; i < ION_DRONE_COUNT; i++) {
    let edge = floor(random(4));
    let x = edge === 0 ? random(width) : edge === 1 ? width + 20 : edge === 2 ? random(width) : -20;
    let y = edge === 0 ? -20 : edge === 1 ? random(height) : edge === 2 ? height + 20 : random(height);
    ionDrones.push(new IonDrone(x, y));
  }
  addTokens(80);
  showBanner("🤖 NIVEAU 4 : DRONES IONIQUES — PROTÉGEZ VOS JETONS DES VOLEURS !", [0, 200, 255], 300);
}

/** Niveau 5 : Flotte Alien en formation (Leader Following) */
function enterAlienFleetLevel() {
  alienLeader = new AlienLeader(width * 0.7, height * 0.3);
  for (let i = 0; i < INTERCEPTOR_COUNT; i++) {
    let slotAngle = (i % 2 === 0 ? 1 : -1) * ((floor(i / 2) + 1) * 0.45);
    alienInterceptors.push(new AlienInterceptor(
      alienLeader.pos.x + random(-60, 60),
      alienLeader.pos.y + random(-60, 60),
      slotAngle
    ));
  }
  addTokens(100);
  showBanner("👾 NIVEAU 5 : FLOTTE ALIEN — DÉTRUISEZ L'AMIRAL POUR DISPERSER L'ESCADRE !", [255, 60, 160], 300);
}

/** Niveau 6 : Champ de mines à détection sonar */
function enterMinefieldLevel() {
  for (let i = 0; i < MINE_COUNT; i++) {
    mines.push(new ProximityMine(
      random(80, width - 80),
      random(80, height - 80)
    ));
  }
  addTokens(120);
  showBanner("💣 NIVEAU 6 : CHAMP DE MINES — DÉTRUISEZ LES MINES POUR SURVIVRE !", [255, 140, 0], 300);
}

/** Niveau 7 : Singularités gravitationnelles binaires */
function enterBinaryGravityLevel() {
  let cx = width / 2, cy = height / 2;
  singularities.push(new BinarySingularity(cx, cy, 180, 0.018, 0));
  singularities.push(new BinarySingularity(cx, cy, 180, 0.018, Math.PI));
  addTokens(140);
  showBanner("🌀 NIVEAU 7 : SINGULARITÉS BINAIRES — UTILISEZ LA GRAVITÉ POUR VOUS PROPULSER !", [120, 0, 255], 300);
}

/** Niveau 8 : Boss Nexus Chaotique (multi-phases) */
function enterNexusBoss() {
  nexusPhase = 1;
  nexusBossHP = NEXUS_MAX_HP;
  nexusTimer = 0;
  // Phase 1 : orbitales gravitationnelles rapides
  let cx = width / 2, cy = height / 2;
  singularities = [
    new BinarySingularity(cx, cy, 230, 0.03, 0),
    new BinarySingularity(cx, cy, 230, 0.03, Math.PI * 2 / 3),
    new BinarySingularity(cx, cy, 230, 0.03, Math.PI * 4 / 3)
  ];
  // Phase 1 : essaim hostile de drones
  for (let i = 0; i < 4; i++) {
    ionDrones.push(new IonDrone(random(width), random(height)));
  }
  addTokens(200);
  showBanner("💀 BOSS NIVEAU 8 : NEXUS CHAOTIQUE — PHASE 1/3 : SINGULARITÉS ORBITALES !", [255, 20, 80], 360);
}

/**
 * Applique les changements de gameplay du Niveau 2 dès la fin de la vidéo.
 */
function applyLevel2Transition() {
  currentLevel = 2;
  level2Timer = 0;

  // Tous les vaisseaux suiveurs deviennent hostiles et capables de frapper le joueur
  followers.forEach(f => f.setHostile(true));

  // Renforts de vaisseaux suiveurs hostiles
  spawnFollowers(3);

  // Onde d'énergie spectaculaire
  explosions.push(new Explosion(pursuer1.pos.x, pursuer1.pos.y, 120, 'shield'));
  shockwaves.push(new ShockwaveRing(width / 2, height / 2, 600));

  showBanner("🚨 NIVEAU 2 ATTEINT ! VAISSEAUX HOSTILES & BRUME ÉPAISSE DÉPLOYÉE !", [255, 60, 60], 300);
}

function draw() {
  // Suspension du gameplay pendant la lecture d'une vidéo d'introduction
  if (typeof cutsceneManager !== 'undefined' && cutsceneManager.isPlaying) {
    background(0);
    return;
  }

  // Arrière-plan : Galaxie d'explosion ardente OU espace cosmique profond normal
  if (inHyperDimension) {
    if (explosionGalaxyBg) {
      explosionGalaxyBg.updateAndShow();
    } else {
      background(28, 8, 8, 90);
    }
  } else {
    background(6, 10, 18, 85);
    if (cosmicBg) {
      cosmicBg.updateAndShow();
    }
  }

  target = createVector(mouseX, mouseY);

  // Épicentre d'anti-gravité
  if (!mouseIsPressed) {
    antiGravityCenter.set(width / 2, height / 2);
  } else {
    antiGravityCenter.set(mouseX, mouseY);
  }

  // 1. Anti-gravité & ondes de choc
  if (antiGravityActive) {
    shockwaveTimer++;
    if (shockwaveTimer % 20 === 0) {
      shockwaves.push(new ShockwaveRing(antiGravityCenter.x, antiGravityCenter.y, antiGravityRadius));
    }
    drawDistortionEpicenter();
  }

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    shockwaves[i].update();
    shockwaves[i].show();
    if (shockwaves[i].isDead()) {
      shockwaves.splice(i, 1);
    }
  }

  // 1.5 Lumière centrale répulsive (Soleil au centre du canevas)
  let sun = obstacles.find(o => o.type === 'sun');
  let sunPos = sun ? sun.pos : createVector(width / 2, height / 2);

  if (centralLightRepulsionActive) {
    drawCentralLightRepulsionVisuals(sunPos.x, sunPos.y);

    // Force de répulsion de la lumière centrale : les avions blancs s'éloignent
    followers.forEach(f => {
      if (!f.isHostile) {
        f.applyCentralLightRepulsion(sunPos, 3.5);
      }
    });
  }

  // 2. Obstacles (planètes et Soleil centré au milieu du canevas)
  obstacles.forEach(o => {
    o.updateObstacle();
    o.show();
  });

  // 2.5 Ceinture d'astéroïdes (Niveau 3) : météores mobiles à esquiver
  // (suspendue pendant le transit dans la galaxie d'explosion)
  if (!inHyperDimension) {
    if (currentLevel === 3) {
      meteorSpawnTimer++;
      if (meteorSpawnTimer >= METEOR_SPAWN_INTERVAL) {
        meteorSpawnTimer = 0;
        spawnMeteors(METEORS_PER_SPAWN);
      }
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      let m = meteors[i];
      m.updateMeteor();
      m.show();

      // Collision météore / vaisseau joueur : dégâts + destruction du météore
      if (m.checkCollisionWith(pursuer1)) {
        explosions.push(new Explosion(m.pos.x, m.pos.y, m.r * 1.2, 'planet'));
        pursuer1.health = max(0, pursuer1.health - 8);
        showBanner(`☄️ IMPACT MÉTÉORE ! SANTÉ : ${pursuer1.health}%`, [255, 100, 40], 60);
        meteors.splice(i, 1);
      }
    }
  }

  // ═══ NIVEAU 4 : DRONES IONIQUES voleurs de jetons ════════════════════
  if (currentLevel === 4 && !inHyperDimension) {
    // Vérifier si tous les drones ont été détruits pour régénérer la vague
    if (ionDrones.length === 0) {
      // Si le joueur a assez de jetons, passage au niveau 5 ; sinon nouvelle vague
      if (pursuer1.tokens >= LEVEL_4_TOKEN_REQUIREMENT) {
        levelUp();
        return;
      }
      enterIonDroneLevel();
    }
    for (let i = ionDrones.length - 1; i >= 0; i--) {
      let d = ionDrones[i];
      d.applyBehaviors(tokens, pursuer1, avoidanceObstacles, ionDrones);

      // Le drone absorbe un jeton s'il le touche
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (d.tryAbsorbToken(tokens[j])) {
          tokens.splice(j, 1);
          break;
        }
      }
      d.update();
      d.show();
    }
  }

  // ═══ NIVEAU 5 : FLOTTE ALIEN en formation (Leader Following) ═══════
  if (currentLevel === 5 && !inHyperDimension) {
    if (alienLeader && alienLeader.hp > 0) {
      alienLeader.applyBehaviors(avoidanceObstacles);
      alienLeader.update();
      alienLeader.show();
    } else if (alienLeader && alienLeader.hp <= 0 && alienInterceptors.length === 0) {
      // Flotte détruite : passage niveau suivant
      levelUp();
    }

    for (let i = alienInterceptors.length - 1; i >= 0; i--) {
      let ai = alienInterceptors[i];
      ai.applyBehaviors(alienLeader, alienInterceptors, pursuer1, avoidanceObstacles);

      // Collision intercepteur / joueur
      if (p5.Vector.dist(ai.pos, pursuer1.pos) < ai.r_pourDessin + pursuer1.r_pourDessin) {
        if (pursuer1.shieldActive) {
          ai.hp = 0;
        } else {
          pursuer1.health = max(0, pursuer1.health - 10);
          showBanner(`⚠️ IMPACT INTERCEPTEUR ! SANTÉ : ${pursuer1.health}%`, [255, 60, 150], 60);
        }
        if (ai.hp <= 0) {
          explosions.push(new Explosion(ai.pos.x, ai.pos.y, 35, 'planet'));
          alienInterceptors.splice(i, 1);
        }
        continue;
      }
      ai.update();
      ai.show();
    }
  }

  // ═══ NIVEAU 6 : CHAMP DE MINES sonar ════════════════════════════════
  if (currentLevel === 6 && !inHyperDimension) {
    for (let i = mines.length - 1; i >= 0; i--) {
      let mine = mines[i];
      mine.applyBehaviors(pursuer1, avoidanceObstacles, mines);
      mine.update();
      mine.show();

      let mineResult = mine.checkCollisionWithPlayer(pursuer1);
      if (mineResult === 'shield_blocked') {
        explosions.push(new Explosion(mine.pos.x, mine.pos.y, mine.blastRadius * 0.6, 'shield'));
        mines.splice(i, 1);
      } else if (mineResult === 'hit') {
        explosions.push(new Explosion(mine.pos.x, mine.pos.y, mine.blastRadius, 'planet'));
        shockwaves.push(new ShockwaveRing(mine.pos.x, mine.pos.y, mine.blastRadius * 2.5));
        mines.splice(i, 1);
        showBanner(`💥 MINE EXPLOSÉE ! SANTÉ : ${pursuer1.health}%`, [255, 130, 0], 80);
      }
    }
  }

  // ═══ NIVEAU 7 : SINGULARITÉS BINAIRES gravitationnelles ═════════════
  if ((currentLevel === 7 || currentLevel === 8) && !inHyperDimension) {
    for (let s of singularities) {
      s.updateOrbit();
      s.show();
      // Attraction gravitationnelle sur le joueur
      s.attractVehicle(pursuer1);
      // Attraction sur les météores le cas échéant
      for (let f of followers) s.attractVehicle(f);

      if (s.checkEventHorizon(pursuer1) && !pursuer1.shieldActive) {
        showBanner(`🌀 CONTACT HORIZON DES ÉVÉNEMENTS ! SANTÉ : ${pursuer1.health}%`, [140, 0, 255], 60);
      }
    }
  }

  // ═══ NIVEAU 8 : BOSS NEXUS CHAOTIQUE (multi-phases) ═════════════════
  if (currentLevel === 8 && !inHyperDimension) {
    nexusTimer++;
    // Phase 2 : après 15s en phase 1, ajout de l'escadre alien
    if (nexusPhase === 1 && nexusTimer === 900) {
      nexusPhase = 2;
      enterAlienFleetLevel();
      showBanner("💀 BOSS NEXUS — PHASE 2/3 : ESCADRE ALIEN DÉPLOYÉE !", [255, 20, 80], 240);
    }
    // Phase 3 : après 30s en phase 2 ou flotte détruite, collapse gravitationnel
    if (nexusPhase === 2 && nexusTimer >= 2700 && alienInterceptors.length === 0) {
      nexusPhase = 3;
      singularities.forEach(s => { s.orbitSpeed *= 2.2; s.gravityStrength *= 1.5; });
      showBanner("💀 BOSS NEXUS — PHASE 3/3 : EFFONDREMENT GRAVITATIONNEL TOTAL !", [255, 0, 0], 300);
    }
  }

  // 3. Débris et astéroïdes spatiaux
  debrisList.forEach(d => {
    if (antiGravityActive) {
      d.applyAntiGravity(antiGravityCenter, antiGravityRadius, 1.2);
    }
    d.update();
    d.show();
  });

  // 4. Trous spatiaux (Wormholes)
  wormholes.forEach(w => {
    w.updateWormhole();
    w.show();
  });

  // 5. Gestion de la collecte des jetons (60 nouveaux jetons toutes les 10 secondes dans l'espace normal)
  if (!inHyperDimension) {
    tokenRespawnTimer++;
    if (tokenRespawnTimer >= TOKEN_RESPAWN_INTERVAL) {
      tokenRespawnTimer = 0;
      addTokens(TOKENS_PER_SPAWN); // 60 nouveaux jetons ajoutés toutes les 10 secondes
      showBanner("✨ 60 NOUVEAUX JETONS APPARUS DANS L'ESPACE !", [255, 215, 0], 120);
    }
  }

  for (let i = tokens.length - 1; i >= 0; i--) {
    let t = tokens[i];
    t.attractTo(pursuer1, 180);
    t.update();
    t.show();

    if (t.checkCollection(pursuer1)) {
      explosions.push(new Explosion(t.pos.x, t.pos.y, 25, 'shield'));
      tokens.splice(i, 1);

      // 4. Passage automatique au niveau supérieur
      if (pursuer1.tokens >= 1000000 && currentLevel === 1) {
        levelUp();
      } else if (pursuer1.tokens >= LEVEL_3_TOKEN_REQUIREMENT && currentLevel === 2) {
        levelUp();
      }
    }
  }

  // 6. Projectiles plasma
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];
    p.update();
    p.show();

    // Téléportation à travers les trous de ver
    for (let w of wormholes) {
      if (w.tryTeleport(p)) {
        explosions.push(new Explosion(w.pos.x, w.pos.y, w.r * 0.7, 'shield'));
        if (w.exitHole) {
          explosions.push(new Explosion(w.exitHole.pos.x, w.exitHole.pos.y, w.exitHole.r * 0.7, 'shield'));
        }
      }
    }

    // Impact sur les planètes
    let hit = p.checkCollision(obstacles);
    if (hit) {
      if (hit.type === 'sun') {
        explosions.push(new Explosion(p.pos.x, p.pos.y, hit.r * 0.4, 'shield'));
        pursuer1.score += 25;
      } else {
        // Planète détruite par les tirs à tout niveau
        explosions.push(new Explosion(hit.pos.x, hit.pos.y, hit.r * 1.5, 'planet'));
        shockwaves.push(new ShockwaveRing(hit.pos.x, hit.pos.y, hit.r * 3));
        let idx = obstacles.indexOf(hit);
        if (idx > -1) obstacles.splice(idx, 1);
        pursuer1.score += 500;
        showBanner("🪐 PLANÈTE DÉTRUITE ! (+500 PTS)", [255, 120, 50], 180);
      }
      projectiles.splice(i, 1);
      continue;
    }

    // Impact sur les météores de la ceinture (Niveau 3)
    if (!hit && !inHyperDimension) {
      let hitMeteor = false;
      for (let k = meteors.length - 1; k >= 0; k--) {
        let m = meteors[k];
        if (p5.Vector.dist(p.pos, m.pos) < m.r + p.r) {
          p.alive = false;
          explosions.push(new Explosion(m.pos.x, m.pos.y, m.r * 1.1, 'planet'));
          pursuer1.score += 40;
          meteors.splice(k, 1);
          hitMeteor = true;
          break;
        }
      }
      if (hitMeteor) {
        projectiles.splice(i, 1);
        continue;
      }
    }

    // Détection de collision : destruction des avions rouges au niveau 2+
    if (currentLevel >= 2) {
      for (let j = followers.length - 1; j >= 0; j--) {
        let f = followers[j];
        if (f.isHostile && f.checkHit(p)) {
          explosions.push(new Explosion(f.pos.x, f.pos.y, 45, 'planet'));
          pursuer1.score += 150;
          let vIdx = vehicules.indexOf(f);
          if (vIdx > -1) vehicules.splice(vIdx, 1);
          followers.splice(j, 1);
          showBanner("💥 AVION ROUGE DÉTRUIT ! (+150 PTS)", [255, 80, 40], 90);
          break;
        }
      }
    }

    // Niveau 4 : projectile vs drones ioniques
    if (currentLevel >= 4) {
      for (let j = ionDrones.length - 1; j >= 0; j--) {
        if (ionDrones[j].checkHit(p)) {
          explosions.push(new Explosion(ionDrones[j].pos.x, ionDrones[j].pos.y, 40, 'shield'));
          pursuer1.score += 200;
          showBanner("🤖 DRONE IONIQUE NEUTRALISÉ ! (+200 PTS)", [0, 200, 255], 80);
          ionDrones.splice(j, 1);
          break;
        }
      }
    }

    // Niveau 5 : projectile vs vaisseau amiral alien
    if (currentLevel >= 5 && alienLeader && alienLeader.hp > 0) {
      let destroyed = alienLeader.checkHit(p);
      if (destroyed !== false) {
        if (destroyed === true) {
          explosions.push(new Explosion(alienLeader.pos.x, alienLeader.pos.y, 90, 'planet'));
          shockwaves.push(new ShockwaveRing(alienLeader.pos.x, alienLeader.pos.y, 600));
          pursuer1.score += 1500;
          alienLeader.hp = 0;
          showBanner("👾 VAISSEAU AMIRAL DÉTRUIT ! ESCADRE EN DÉROUTE ! (+1500 PTS)", [255, 60, 160], 200);
        } else {
          explosions.push(new Explosion(alienLeader.pos.x, alienLeader.pos.y, 40, 'shield'));
          pursuer1.score += 120;
          showBanner(`👾 AMIRAL TOUCHÉ ! ${alienLeader.hp}/${alienLeader.maxHp} HP RESTANTS (+120 PTS)`, [255, 100, 180], 90);
        }
        break;
      }
    }

    // Niveau 5 : projectile vs intercepteurs aliens
    if (currentLevel >= 5) {
      for (let j = alienInterceptors.length - 1; j >= 0; j--) {
        if (alienInterceptors[j].checkHit(p)) {
          explosions.push(new Explosion(alienInterceptors[j].pos.x, alienInterceptors[j].pos.y, 30, 'planet'));
          pursuer1.score += 250;
          showBanner("🎯 INTERCEPTEUR ABATTU ! (+250 PTS)", [255, 80, 200], 80);
          alienInterceptors.splice(j, 1);
          break;
        }
      }
    }

    // Niveau 6 : projectile vs mines de proximité
    if (currentLevel >= 6) {
      for (let j = mines.length - 1; j >= 0; j--) {
        if (mines[j].checkHit(p)) {
          // Réaction en chaîne : détonne les mines voisines
          let minePos = createVector(mines[j].pos.x, mines[j].pos.y);
          explosions.push(new Explosion(minePos.x, minePos.y, mines[j].blastRadius, 'planet'));
          shockwaves.push(new ShockwaveRing(minePos.x, minePos.y, mines[j].blastRadius * 3));
          pursuer1.score += 180;
          mines.splice(j, 1);
          showBanner("💣 MINE NEUTRALISÉE ! (+180 PTS)", [255, 140, 0], 80);
          // Réaction en chaîne : fait exploser les mines voisines dans le blast radius
          for (let k = mines.length - 1; k >= 0; k--) {
            if (p5.Vector.dist(minePos, mines[k].pos) < 130) {
              explosions.push(new Explosion(mines[k].pos.x, mines[k].pos.y, mines[k].blastRadius * 0.8, 'planet'));
              mines.splice(k, 1);
              pursuer1.score += 80;
            }
          }
          break;
        }
      }
    }

    if (p.isDead()) {
      projectiles.splice(i, 1);
    }
  }

  // 7. Explosions et étincelles
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].update();
    explosions[i].show();
    if (explosions[i].isDead()) {
      explosions.splice(i, 1);
    }
  }

  // 8. Réticule holographique
  drawReticle(target.x, target.y);

  // 9. Auto-fire
  if (autoFire && frameCount % 12 === 0) {
    fireProjectile();
  }

  // 10. Gestion du vaisseau spatial (Avion vert)
  // En niveau 3, les météores sont traités comme des obstacles à éviter
  let avoidanceObstacles = (currentLevel === 3 && meteors.length > 0 && !inHyperDimension)
    ? obstacles.concat(meteors)
    : obstacles;

  // Lier le mouvement horizontal de l'avion vert à la position de la souris
  pursuer1.bindHorizontalToMouse(mouseX, pmouseX);
  pursuer1.updateWeapons();
  pursuer1.applyBehaviors(target, avoidanceObstacles);
  pursuer1.update();

  // Collisions physiques avec les planètes / le soleil : obstacles SOLIDES.
  // Le vaisseau ne peut pas les traverser ; rebond + dégâts, et destruction
  // des planètes (niveau 3+) ou protection (niveaux 1-2).
  let planetHit = pursuer1.checkPlanetCollision(obstacles, currentLevel);
  if (planetHit) {
    if (planetHit.type === 'sun_bounce') {
      explosions.push(new Explosion(pursuer1.pos.x, pursuer1.pos.y, pursuer1.r_pourDessin * 0.6, 'shield'));
      pursuer1.score += 25;
    } else if (planetHit.type === 'planet_destroyed') {
      let obs = planetHit.obstacle;
      explosions.push(new Explosion(obs.pos.x, obs.pos.y, obs.r * 1.5, 'planet'));
      shockwaves.push(new ShockwaveRing(obs.pos.x, obs.pos.y, obs.r * 3));
      let idx = obstacles.indexOf(obs);
      if (idx > -1) obstacles.splice(idx, 1);
      pursuer1.score += 500;
      showBanner("🪐 PLANÈTE DÉTRUITE PAR IMPACT ! (+500 PTS)", [255, 120, 50], 180);
    } else if (planetHit.type === 'planet_bounce') {
      let obs = planetHit.obstacle;
      explosions.push(new Explosion(pursuer1.pos.x, pursuer1.pos.y, obs.r * 0.5, 'shield'));
      pursuer1.score += 50;
      showBanner("🛡️ PLANÈTE PROTÉGÉE (DESTRUCTIBLE AU NIVEAU 3) !", [100, 200, 255], 90);
    }
  }

  pursuer1.show();

  // 11. Gestion des vaisseaux suiveurs (FollowerShip)
  for (let i = followers.length - 1; i >= 0; i--) {
    let f = followers[i];

    // Téléportation par trous de ver
    for (let w of wormholes) {
      w.attract(f);
      if (w.tryTeleport(f)) {
        explosions.push(new Explosion(w.pos.x, w.pos.y, w.r * 1.1, 'shield'));
        if (w.exitHole) {
          explosions.push(new Explosion(w.exitHole.pos.x, w.exitHole.pos.y, w.exitHole.r * 1.1, 'shield'));
        }
      }
    }

    // Suivi et comportement
    f.applyBehaviors(target, avoidanceObstacles, followers, pursuer1);
    f.update();
    f.show();

    // Au niveau 2 et supérieur : détection de collision avec les avions rouges
    if (currentLevel >= 2 && f.isHostile) {
      let attackResult = f.checkAttackPlayer(pursuer1);
      if (attackResult === 'shield_blocked') {
        explosions.push(new Explosion(pursuer1.pos.x, pursuer1.pos.y, 40, 'shield'));
        // Destruction de l'avion rouge repoussé par le bouclier
        f.hp = 0;
        explosions.push(new Explosion(f.pos.x, f.pos.y, 45, 'planet'));
        pursuer1.score += 150;
        let vIdx = vehicules.indexOf(f);
        if (vIdx > -1) vehicules.splice(vIdx, 1);
        followers.splice(i, 1);
        showBanner("🛡️ AVION ROUGE PULVÉRISÉ PAR LE BOUCLIER ! (+150 PTS)", [0, 255, 200], 90);
        continue;
      } else if (attackResult === 'hit') {
        f.hp = 0;
        explosions.push(new Explosion(f.pos.x, f.pos.y, 50, 'planet'));
        let vIdx = vehicules.indexOf(f);
        if (vIdx > -1) vehicules.splice(vIdx, 1);
        followers.splice(i, 1);
        showBanner(`⚠️ IMPACT AVEC UN AVION ROUGE ! SANTÉ : ${pursuer1.health}%`, [255, 60, 60], 60);
        continue;
      }
    }
  }

  // 12. Brume épaisse dès les 60 premières secondes du niveau 2
  if (currentLevel === 2 && level2Timer < LEVEL_2_FOG_DURATION) {
    level2Timer++;
    drawThickMistFogOfWar();
  }

  // 12.1 Vérification des conditions de passage aux niveaux 4-8
  if (!inHyperDimension) {
    if (pursuer1.tokens >= LEVEL_4_TOKEN_REQUIREMENT && currentLevel === 3) levelUp();
    else if (pursuer1.tokens >= LEVEL_4_TOKEN_REQUIREMENT && currentLevel === 4) levelUp();
    else if (pursuer1.tokens >= LEVEL_6_TOKEN_REQUIREMENT && currentLevel === 5) levelUp();
    else if (pursuer1.tokens >= LEVEL_7_TOKEN_REQUIREMENT && currentLevel === 6) levelUp();
    else if (pursuer1.tokens >= LEVEL_8_TOKEN_REQUIREMENT && currentLevel === 7) levelUp();
  }

  // 12.5 Compte à rebours de l'Autre Dimension (30 secondes de collecte intensive)
  if (inHyperDimension) {
    hyperDimensionTimer--;
    if (hyperDimensionTimer <= 0) {
      exitHyperDimension();
    }
  }

  // 13. Interface HUD & télémétrie
  drawSpaceHUD();

  // 14. Bannière d'alerte
  if (bannerTimer > 0) {
    bannerTimer--;
    drawBannerNotification();
  }
}

/**
 * Dessine une brume épaisse réduisant la visibilité dès les 60 premières secondes du niveau 2.
 */
function drawThickMistFogOfWar() {
  push();
  let ctx = drawingContext;
  let shipX = pursuer1.pos.x;
  let shipY = pursuer1.pos.y;
  let lightRadius = 220;

  // Dégradé radial simulant un faisceau de vision perçant la brume
  let grad = ctx.createRadialGradient(shipX, shipY, 40, shipX, shipY, lightRadius);
  grad.addColorStop(0, 'rgba(12, 18, 28, 0)');
  grad.addColorStop(0.65, 'rgba(15, 25, 38, 0.55)');
  grad.addColorStop(1, 'rgba(10, 16, 26, 0.96)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Phares directionnels projetés vers l'avant du vaisseau
  if (pursuer1.vel && pursuer1.vel.mag() > 0.1) {
    let heading = pursuer1.vel.heading();
    ctx.save();
    ctx.translate(shipX, shipY);
    ctx.rotate(heading);

    let coneGrad = ctx.createRadialGradient(0, 0, 10, 180, 0, 300);
    coneGrad.addColorStop(0, 'rgba(0, 240, 255, 0.28)');
    coneGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = coneGrad;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 300, -0.4, 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  pop();
}

function fireProjectile() {
  let proj = pursuer1.fire(obstacles);
  if (proj) {
    projectiles.push(proj);
  }
}

function drawDistortionEpicenter() {
  push();
  noFill();
  stroke(0, 220, 255, 120);
  strokeWeight(1.5);
  circle(antiGravityCenter.x, antiGravityCenter.y, antiGravityRadius * 2);

  let pulse = sin(frameCount * 0.1) * 8;
  stroke(180, 240, 255, 200);
  strokeWeight(2);
  circle(antiGravityCenter.x, antiGravityCenter.y, 40 + pulse);

  stroke(0, 180, 255, 80);
  line(antiGravityCenter.x - 30, antiGravityCenter.y, antiGravityCenter.x + 30, antiGravityCenter.y);
  line(antiGravityCenter.x, antiGravityCenter.y - 30, antiGravityCenter.x, antiGravityCenter.y + 30);
  pop();
}

function drawReticle(x, y) {
  push();
  noFill();
  stroke(0, 230, 255, 160);
  strokeWeight(1.5);

  let rot = frameCount * 0.03;
  translate(x, y);
  rotate(rot);

  rectMode(CENTER);
  rect(0, 0, 16, 16);

  stroke(255, 255, 255, 220);
  line(-14, 0, -4, 0);
  line(4, 0, 14, 0);
  line(0, -14, 0, -4);
  line(0, 4, 0, 14);

  fill(0, 240, 255, 200);
  noStroke();
  circle(0, 0, 3);
  pop();
}

function drawBannerNotification() {
  push();
  let alpha = map(bannerTimer, 0, 45, 0, 240);
  alpha = constrain(alpha, 0, 240);

  fill(8, 16, 28, alpha);
  stroke(bannerColor[0], bannerColor[1], bannerColor[2], alpha);
  strokeWeight(2);
  rectMode(CENTER);
  rect(width / 2, 70, 720, 46, 8);

  noStroke();
  fill(bannerColor[0], bannerColor[1], bannerColor[2], alpha + 15);
  textFont('monospace');
  textSize(13);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(bannerText, width / 2, 70);
  pop();
}

function drawSpaceHUD() {
  push();
  let panelW = 340;
  let panelH = 310;

  fill(8, 16, 32, 220);
  stroke(0, 180, 255, 100);
  strokeWeight(1.5);
  rect(15, 15, panelW, panelH, 10);

  // En-tête
  noStroke();
  fill(0, 220, 255);
  textFont('monospace');
  textSize(13);
  textStyle(BOLD);

  let levelStr = "NIVEAU 1 : SECTEUR INITIAL";
  if (currentLevel === 2) {
    levelStr = "NIVEAU 2 : ESPACE HOSTILE";
    fill(255, 80, 80);
  } else if (currentLevel === 3) {
    levelStr = "NIVEAU 3 : CEINTURE D'ASTÉROÏDES";
    fill(255, 170, 60);
  } else if (currentLevel === 4) {
    levelStr = "NIVEAU 4 : DRONES IONIQUES";
    fill(0, 200, 255);
  } else if (currentLevel === 5) {
    levelStr = "NIVEAU 5 : FLOTTE ALIEN";
    fill(255, 60, 160);
  } else if (currentLevel === 6) {
    levelStr = "NIVEAU 6 : CHAMP DE MINES";
    fill(255, 130, 0);
  } else if (currentLevel === 7) {
    levelStr = "NIVEAU 7 : SINGULARITÉS BINAIRES";
    fill(150, 0, 255);
  } else if (currentLevel === 8) {
    levelStr = nexusPhase === 0 ? "NIVEAU 8 : NEXUS CHAOTIQUE" : `BOSS NEXUS — PHASE ${nexusPhase}/3`;
    fill(255, 20, 60);
  }
  text(`🚀 ${levelStr}`, 26, 38);

  stroke(0, 180, 255, 50);
  strokeWeight(1);
  line(26, 46, panelW + 4, 46);

  // Données
  noStroke();
  textSize(11);
  textStyle(NORMAL);
  let y = 64;

  // 1. Jetons
  fill(160, 200, 230);
  text("Jetons collectés :", 26, y);
  fill(pursuer1.tokens >= 1000000 ? color(50, 255, 140) : color(255, 215, 0));
  textStyle(BOLD);
  text(`${pursuer1.tokens.toLocaleString()} / 1 000 000`, 170, y);

  // 2. Santé
  y += 20;
  textStyle(NORMAL);
  fill(160, 200, 230);
  text("Intégrité Vaisseau :", 26, y);
  fill(pursuer1.health > 40 ? color(0, 255, 140) : color(255, 60, 60));
  textStyle(BOLD);
  text(`${pursuer1.health} / 100 HP`, 170, y);

  // 3. Bouclier temporaire [B]
  y += 20;
  textStyle(NORMAL);
  fill(160, 200, 230);
  text("Bouclier [B] :", 26, y);
  if (pursuer1.shieldActive) {
    fill(0, 255, 200);
    textStyle(BOLD);
    text(`ACTIF (${(pursuer1.shieldTimer / 60).toFixed(1)}s)`, 170, y);
  } else if (pursuer1.shieldCooldown > 0) {
    fill(255, 140, 40);
    textStyle(BOLD);
    text(`RECHARGE (${(pursuer1.shieldCooldown / 60).toFixed(1)}s)`, 170, y);
  } else {
    fill(0, 255, 120);
    textStyle(BOLD);
    text("PRÊT [TOUCHE B]", 170, y);
  }

  // 4. Trou de ver / Galaxie d'explosion
  y += 20;
  textStyle(NORMAL);
  fill(160, 200, 230);
  if (inHyperDimension) {
    text("Galaxie Explosion :", 26, y);
    fill(255, 120, 40);
    textStyle(BOLD);
    text(`RETOUR DANS ${Math.ceil(hyperDimensionTimer / 60)}s (${tokens.length} JETONS)`, 170, y);
  } else {
    text("Trou de ver [W] :", 26, y);
    if (pursuer1.score >= 100000 || pursuer1.tokens >= 100000) {
      fill(0, 240, 255);
      textStyle(BOLD);
      text("PRÊT (Touche W)", 170, y);
    } else {
      fill(180, 120, 120);
      textStyle(BOLD);
      text("VERROUILLÉ (Score > 100k)", 170, y);
    }
  }

  // 5. Vaisseaux suiveurs
  y += 20;
  textStyle(NORMAL);
  fill(160, 200, 230);
  text("Vaisseaux suiveurs :", 26, y);
  if (currentLevel >= 2) {
    fill(255, 80, 80);
    textStyle(BOLD);
    text(`${followers.length} (HOSTILES)`, 170, y);
  } else {
    fill(160, 220, 255);
    textStyle(BOLD);
    text(`${followers.length} (Pacifiques)`, 170, y);
  }

  // 6. Jetons dans l'espace
  y += 20;
  textStyle(NORMAL);
  fill(160, 200, 230);
  text("Jetons en orbite :", 26, y);
  fill(255, 215, 0);
  textStyle(BOLD);
  text(`${tokens.length} / ${MAX_TOKENS} (+60 / 10s)`, 170, y);

  // 6.5 Ceinture d'astéroïdes (Niveau 3)
  if (currentLevel === 3) {
    y += 20;
    textStyle(NORMAL);
    fill(210, 180, 130);
    text("Météores :", 26, y);
    fill(255, 160, 60);
    textStyle(BOLD);
    text(`${meteors.length} / ${MAX_METEORS}`, 170, y);
  }

  // Niveaux 4-8 : info contextuelle
  if (currentLevel === 4) {
    y += 20; textStyle(NORMAL); fill(0, 180, 255);
    text("Drones ioniques :", 26, y); fill(0, 220, 255); textStyle(BOLD);
    text(`${ionDrones.length} (Tuez-les ! +200 PTS)`, 170, y);
  } else if (currentLevel === 5) {
    y += 20; textStyle(NORMAL); fill(255, 80, 160);
    text("Amiral alien HP :", 26, y); fill(255, 120, 190); textStyle(BOLD);
    text(alienLeader ? `${alienLeader.hp}/${alienLeader.maxHp} — Escadre: ${alienInterceptors.length}` : "Détruit !", 170, y);
  } else if (currentLevel === 6) {
    y += 20; textStyle(NORMAL); fill(255, 140, 30);
    text("Mines actives :", 26, y); fill(255, 170, 60); textStyle(BOLD);
    text(`${mines.length} (Chaîne +réaction)`, 170, y);
  } else if (currentLevel === 7) {
    y += 20; textStyle(NORMAL); fill(150, 0, 255);
    text("Singularités :", 26, y); fill(180, 60, 255); textStyle(BOLD);
    text(`${singularities.length} (Fronde gravitationnelle!)`, 170, y);
  } else if (currentLevel === 8) {
    y += 20; textStyle(NORMAL); fill(255, 30, 60);
    text("Nexus Phase :", 26, y); fill(255, 80, 100); textStyle(BOLD);
    text(`${nexusPhase}/3 | HP Boss: ${nexusBossHP}/${NEXUS_MAX_HP}`, 170, y);
  }

  // 7. Brume (si niveau 2 dans les 60s)
  if (currentLevel === 2 && level2Timer < LEVEL_2_FOG_DURATION) {
    y += 20;
    textStyle(NORMAL);
    fill(255, 140, 40);
    text("Brume épaisse :", 26, y);
    fill(255, 80, 80);
    textStyle(BOLD);
    text(`${Math.ceil((LEVEL_2_FOG_DURATION - level2Timer) / 60)}s RESTANTES`, 170, y);
  }

  // 8. FPS & Score
  y += 20;
  fill(160, 200, 230);
  textStyle(NORMAL);
  text("Score & FPS :", 26, y);
  fill(255, 255, 255);
  textStyle(BOLD);
  text(`${pursuer1.score.toLocaleString()} PTS | ${Math.round(frameRate())} FPS`, 170, y);

  // Raccourcis
  y += 24;
  fill(0, 200, 255, 190);
  textSize(9.5);
  textStyle(NORMAL);
  text("[CLIC] Tirer  [B] Bouclier  [W] Autre Dimension (>100k)  [T] Tir auto", 26, y);
  y += 15;
  text("[ESPACE] Répulsion Lumière  [J] +50k Score/Jetons  [D] Debug  [R] Reset Planètes", 26, y);
  pop();
}

function mousePressed() {
  if (typeof cutsceneManager !== 'undefined' && cutsceneManager.isPlaying) {
    cutsceneManager.skip();
    return;
  }
  if (mouseX >= 15 && mouseX <= 355 && mouseY >= 15 && mouseY <= 325) {
    toggleAntiGravity();
    return;
  }
  fireProjectile();
}

function toggleAntiGravity() {
  antiGravityActive = !antiGravityActive;
  if (antiGravityActive) {
    shockwaves.push(new ShockwaveRing(antiGravityCenter.x, antiGravityCenter.y, antiGravityRadius));
  }
}

/**
 * Action déclenchée par la barre d'espace :
 * Active/désactive la force de répulsion de la lumière centrale pour éloigner les avions blancs.
 */
function toggleCentralLightRepulsion() {
  centralLightRepulsionActive = !centralLightRepulsionActive;
  let sun = obstacles.find(o => o.type === 'sun');
  let cx = sun ? sun.pos.x : width / 2;
  let cy = sun ? sun.pos.y : height / 2;

  if (centralLightRepulsionActive) {
    shockwaves.push(new ShockwaveRing(cx, cy, 650));
    showBanner("☀️ LUMIÈRE CENTRALE RÉPULSIVE ACTIVÉE ! (AVIONS BLANCS REPOUSSÉS) [ESPACE]", [255, 230, 80], 180);
  } else {
    showBanner("🌑 LUMIÈRE CENTRALE RÉPULSIVE DÉSACTIVÉE [ESPACE]", [160, 200, 240], 120);
  }
}

function drawCentralLightRepulsionVisuals(cx, cy) {
  centralLightPulse += 0.08;
  push();
  noFill();

  // Faisceaux radiaux et ondes de lumière répulsive
  stroke(255, 225, 80, 80 + sin(centralLightPulse * 3) * 40);
  strokeWeight(3);
  let pulseR = 130 + sin(centralLightPulse) * 25;
  circle(cx, cy, pulseR * 2);

  stroke(255, 170, 40, 60);
  strokeWeight(2);
  circle(cx, cy, (pulseR + 60) * 2);

  stroke(255, 255, 210, 100);
  strokeWeight(1.5);
  for (let i = 0; i < 16; i++) {
    let angle = (TWO_PI / 16) * i + centralLightPulse * 0.4;
    let r1 = 95;
    let r2 = pulseR + 90;
    line(cx + cos(angle) * r1, cy + sin(angle) * r1, cx + cos(angle) * r2, cy + sin(angle) * r2);
  }

  pop();
}

function keyPressed() {
  if (typeof cutsceneManager !== 'undefined' && cutsceneManager.handleKeyPressed(key, keyCode)) {
    return;
  }
  if (key === ' ') {
    // Action déclenchée avec la barre d'espace : activation de la force de répulsion de la lumière centrale
    toggleCentralLightRepulsion();
  } else if (key === 'b' || key === 'B') {
    // 5. Activation du bouclier temporaire via touche du clavier
    let ok = pursuer1.activateShield();
    if (ok) {
      explosions.push(new Explosion(pursuer1.pos.x, pursuer1.pos.y, pursuer1.r_pourDessin * 2.5, 'shield'));
      showBanner("🛡️ BOUCLIER DE PROTECTION TEMPORAIRE ACTIVÉ !", [0, 255, 200]);
    } else {
      showBanner("⏳ BOUCLIER EN RECHARGE...", [255, 140, 40]);
    }
  } else if (key === 'w' || key === 'W') {
    // Si le score est supérieur à 100 000, téléportation dans une galaxie avec un arrière-plan d'explosion (100 à 200 jetons, 30s)
    let targetScore = 100000;
    if (pursuer1.score >= targetScore || pursuer1.tokens >= targetScore) {
      enterHyperDimension();
    } else {
      showBanner(`⚠️ TROU DE VER VERROUILLÉ : SCORE SUPÉRIEUR À 100 000 REQUIS ! (Score: ${pursuer1.score.toLocaleString()})`, [255, 80, 80], 200);
    }
  } else if (key === 'j' || key === 'J') {
    // Raccourci de test : permet d'ajouter +50 000 score & jetons
    pursuer1.score += 50000;
    pursuer1.tokens += 50000;
    showBanner(`💰 +50 000 SCORE & JETONS ! (Score: ${pursuer1.score.toLocaleString()} | Jetons: ${pursuer1.tokens.toLocaleString()})`, [255, 220, 40]);
    if (pursuer1.tokens >= 1000000 && currentLevel === 1) {
      levelUp();
    } else if (pursuer1.tokens >= LEVEL_3_TOKEN_REQUIREMENT && currentLevel === 2) {
      levelUp();
    }
  } else if (key === 't' || key === 'T') {
    autoFire = !autoFire;
  } else if (key === 'v' || key === 'V') {
    spawnFollowers(1);
  } else if (key === 'd' || key === 'D') {
    Vehicle.debug = !Vehicle.debug;
  } else if (key === 'c' || key === 'C') {
    followers = [];
    vehicules = [pursuer1];
    spawnFollowers(3);

  } else if (key === 'p' || key === 'P') {
    let types = ['terrestrial', 'icePlanet', 'ringPlanet'];
    obstacles.push(new Obstacle(
      random(100, width - 100),
      random(100, height - 100),
      random(35, 70),
      random(types)
    ));
  } else if (key === 'r' || key === 'R') {
    initPlanets();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  let sun = obstacles.find(o => o.type === 'sun');
  if (sun) {
    sun.pos.set(width / 2, height / 2);
  }
  if (cosmicBg) {
    cosmicBg.initStars(80);
    cosmicBg.initNebula();
  }
  if (explosionGalaxyBg) {
    explosionGalaxyBg.init();
  }
}