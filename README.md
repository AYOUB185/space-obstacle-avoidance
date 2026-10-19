# 🚀 Space Obstacle Avoidance

Jeu vidéo interactif réalisé en JavaScript avec **p5.js**, mettant en œuvre des comportements de **Steering Behaviors**, notamment l'évitement d'obstacles (**Obstacle Avoidance**).

Le joueur contrôle un vaisseau spatial évoluant dans une galaxie remplie de planètes, d'astéroïdes, de vaisseaux ennemis et de phénomènes cosmiques. Le but est de collecter des jetons, survivre aux différents dangers et progresser à travers plusieurs niveaux de difficulté croissante.

---

## 🎮 Démonstration

### Jouer en ligne :
👉 *Lien GitHub Pages du projet* : [https://ayoub185.github.io/space-obstacle-avoidance/](https://ayoub185.github.io/space-obstacle-avoidance/)

### Vidéos de démonstration :
- `niveau 1.mp4` — introduction du niveau 1
- `niveau 2.mp4` — introduction du niveau 2

---

## 🕹️ Jouer

Le jeu fonctionne directement dans un navigateur moderne.  
Au lancement, une cinématique introduit le premier niveau. Elle peut être passée avec une interaction utilisateur.

### Contrôles

| Touche / Action | Fonction |
| :--- | :--- |
| **🖱️ Clic gauche** | Tirer un projectile |
| **B** | Activer le bouclier temporaire |
| **W** | Entrer dans la dimension spéciale si le score ou les jetons sont suffisants |
| **T** | Activer / désactiver le tir automatique |
| **Espace** | Activer / désactiver la répulsion de la lumière centrale |
| **J** | Ajouter 50 000 points et 50 000 jetons (fonction de test) |
| **V** | Ajouter un vaisseau suiveur |
| **D** | Activer / désactiver le mode debug |
| **C** | Réinitialiser les vaisseaux suiveurs |
| **P** | Ajouter une planète |
| **R** | Réinitialiser les planètes |
| **Espace / Entrée / Échap** | Passer une cinématique |

> *Certaines commandes, comme J, V, C, D et P, sont principalement destinées au développement et aux tests.*

---

## 🌌 Principe du jeu

Le joueur pilote un vaisseau spatial dans un environnement dynamique.  
L'objectif principal est de :
- Collecter les jetons présents dans la galaxie ;
- Éviter les planètes et autres obstacles ;
- Détruire les ennemis à l'aide de projectiles ;
- Utiliser le bouclier au bon moment ;
- Exploiter les mécaniques d'anti-gravité ;
- Progresser à travers les différents niveaux ;
- Survivre aux phénomènes cosmiques et aux ennemis de plus en plus nombreux.

Le jeu commence dans un espace relativement calme puis introduit progressivement de nouvelles menaces.

---

## 🧠 Steering Behaviors

Le projet repose sur le modèle de **Steering Behaviors de Craig W. Reynolds**.  
Chaque véhicule possède notamment :
- une position ;
- une vitesse ;
- une accélération ;
- une vitesse maximale ;
- une force maximale de pilotage.

Le principe général consiste à calculer une force de pilotage sans modifier directement la position du véhicule.  
Le comportement peut être résumé ainsi :

```text
direction = cible - position
vitesseDésirée = direction normalisée × vitesseMax
steering = vitesseDésirée - vitesseActuelle
steering limitée à forceMax
```

La force obtenue est ensuite appliquée au véhicule avec `applyForce()`.  
Cette séparation permet de distinguer :
1. **le comportement** — déterminer la direction souhaitée ;
2. **le pilotage** — calculer la force nécessaire ;
3. **la locomotion** — appliquer accélération, vitesse et position.

---

## 🎯 Obstacle Avoidance

Le comportement principal étudié dans ce projet est **l'évitement d'obstacles**.  
Le vaisseau ne vérifie pas uniquement sa position actuelle. Il projette également sa trajectoire dans la direction de son déplacement.

Deux vecteurs de prédiction sont utilisés :
- `ahead` — projection plus longue ;
- `ahead2` — projection plus courte.

Le système recherche ensuite l'obstacle le plus proche. Si celui-ci se trouve dans la zone de détection du vaisseau, une force de répulsion est calculée.

```text
trajectoire prévue
      ↓
──────────────> 🚀   ● obstacle
```

La force d'évitement est orientée depuis l'obstacle vers le point de la trajectoire le plus proche. Elle est ensuite limitée par `maxForce` :

```javascript
let force = p5.Vector.sub(pointLePlusProche, obstacleLePlusProche.pos);
force.setMag(this.maxForce / 2);
```

Le comportement est appliqué dans `Vehicle.applyBehaviors()` avec différentes pondérations :

```javascript
seekForce.mult(0.2);
avoidForce.mult(3);
separateForce.mult(0.2);
boudariesForce.mult(3);
```

L'évitement reçoit donc une importance beaucoup plus grande que le comportement de recherche de cible.

---

## 🛰️ Architecture du véhicule

La classe principale du système est :

```text
Vehicle
│
├── SpaceShip
├── FollowerShip
├── Token
├── AntiGravityDebris
└── autres entités mobiles
```

`Vehicle` centralise notamment :
- la position ;
- la vitesse ;
- l'accélération ;
- `seek` / `arrive` ;
- l'évitement ;
- les forces de pilotage ;
- la mise à jour du mouvement ;
- certaines fonctions de debug.

Cette architecture permet aux différentes entités du jeu de partager une même logique de mouvement.

---

## 🌠 Les mécaniques du jeu

### ☀️ Obstacles et planètes
Plusieurs types de planètes sont présents dans l'espace :
- Soleil central ;
- planète à anneaux ;
- planète glacée ;
- planètes supplémentaires générées pendant le jeu.

Les obstacles sont considérés comme des corps solides. Lorsqu'un vaisseau entre en collision avec une planète, une résolution de collision est effectuée :
- correction de la pénétration ;
- calcul de la normale de collision ;
- rebond ;
- dégâts éventuels ;
- destruction de la planète à partir de certains niveaux.

*Le Soleil est indestructible.*

### 🪙 Collecte de jetons
Le joueur doit collecter des jetons pour augmenter sa progression.  
Au lancement, une première série de 60 jetons est générée. Le jeu peut ensuite régénérer des jetons périodiquement, avec une limite de **250 jetons maximum**.  
Chaque jeton est lui-même une entité basée sur `Vehicle`.

### 🔫 Système de tir
Le vaisseau possède un système d'armes comprenant :
- des projectiles plasma ;
- une quantité de munitions ;
- un cooldown ;
- une régénération progressive ;
- un rechargement complet périodique ;
- un système de tir automatique.

Le clic de souris permet de tirer. La touche **T** active ou désactive le tir automatique.

### 🛡️ Bouclier
Le joueur dispose également d'un bouclier temporaire activable avec la touche **B**.  
Le bouclier protège le vaisseau contre certaines attaques et collisions. Il possède :
- une durée limitée ;
- un temps de recharge ;
- des effets visuels lors de son activation.

### 🌀 Anti-gravité
Le jeu possède une mécanique d'anti-gravité. Lorsqu'elle est activée, une force de répulsion est appliquée autour d'un épicentre :
- force de répulsion ;
- ondes de choc ;
- débris lumineux ;
- trajectoires modifiées.

Les débris utilisent également le système de `Vehicle` et sont soumis à des forces physiques.

### ☀️ Répulsion de la lumière centrale
La touche **Espace** permet d'activer ou désactiver la répulsion produite par la lumière centrale. Cette force repousse notamment les vaisseaux blancs autour du Soleil. Des effets visuels supplémentaires indiquent l'état de cette mécanique.

### 🌀 Trou de ver et galaxie d'explosion
Lorsqu'un score ou un nombre de jetons d'au moins **100 000** est atteint, la touche **W** permet d'accéder à une dimension spéciale.  
Le joueur est alors téléporté dans une galaxie d'explosion :
- les obstacles normaux sont retirés ;
- entre 100 et 200 jetons sont générés ;
- une animation cosmique spéciale est affichée ;
- le joueur dispose de 30 secondes pour collecter les jetons.

À la fin du temps imparti, le vaisseau revient automatiquement dans l'espace normal.

---

## 👾 Progression des niveaux

Le jeu comporte plusieurs niveaux avec des mécaniques différentes :

| Niveau | Mécanique principale | Seuil |
| :---: | :--- | :--- |
| **1** | Espace profond, collecte de jetons | Départ |
| **2** | Vaisseaux hostiles + brume | 1 000 000 jetons |
| **3** | Ceinture d'astéroïdes | 2 000 000 jetons |
| **4** | Drones ioniques voleurs de jetons | 3 500 000 jetons |
| **5** | Flotte alien et intercepteurs | 5 500 000 jetons |
| **6** | Champ de mines | 8 000 000 jetons |
| **7** | Singularités gravitationnelles binaires | 11 000 000 jetons |
| **8** | Nexus chaotique / boss multi-phases | 16 000 000 jetons |

La difficulté augmente progressivement en introduisant de nouveaux comportements et de nouvelles menaces.

### ☄️ Niveau 3 — Ceinture d'astéroïdes
Introduit des météores mobiles (jusqu'à 40 simultanément). Ils apparaissent depuis les bords de l'écran et traversent l'espace de jeu. Le joueur doit combiner déplacement, évitement d'obstacles, tir et gestion du bouclier.

### 👽 Niveau 4 — Drones Ioniques
Les drones ioniques représentent une nouvelle menace : ils interagissent avec les jetons et rendent leur collecte plus difficile.

### 🚀 Niveau 5 — Flotte alien
Une flotte alien est introduite avec :
- un vaisseau leader ;
- plusieurs intercepteurs ;
- des comportements de suivi (*Leader Following*) ;
- des attaques contre le joueur.

### 💣 Niveau 6 — Champ de mines
Introduit des mines à détection sonar. Le joueur doit traverser une zone dangereuse tout en anticipant les menaces.

### 🪐 Niveau 7 — Singularités binaires
Introduit des forces gravitationnelles supplémentaires perturbant les trajectoires du vaisseau.

### 👹 Niveau 8 — Nexus chaotique
Le dernier niveau introduit un boss : le **Nexus** (20 HP, 3 phases) :
- *Phase 1* — Orbital
- *Phase 2* — Swarm
- *Phase 3* — Collapse

---

## 🎬 Cinématiques

Le projet contient deux vidéos utilisées comme cinématiques :
- `niveau 1.mp4`
- `niveau 2.mp4`

Le `CutsceneManager` permet :
- de lancer une vidéo ;
- d'afficher son titre ;
- de bloquer temporairement le gameplay ;
- de passer la cinématique (Touche Espace / Entrée / Échap) ;
- de déclencher une action à la fin de la vidéo.

---

## 📁 Architecture du projet

| Fichier | Responsabilité |
| :--- | :--- |
| `index.html` | Chargement de p5.js et des différents modules |
| `sketch.js` | Boucle principale, niveaux, progression et interactions |
| `vehicle.js` | Classe `Vehicle`, steering behaviors et obstacle avoidance |
| `spaceShip.js` | Vaisseau contrôlé par le joueur |
| `obstacle.js` | Obstacles et planètes |
| `projectile.js` | Projectiles et système de tir |
| `followerShip.js` | Vaisseaux suiveurs / ennemis |
| `token.js` | Jetons à collecter |
| `antigravity.js` | Débris et mécanique anti-gravité |
| `wormhole.js` | Trous de ver |
| `meteor.js` | Météores du niveau 3 |
| `ionDrone.js` | Drones du niveau 4 |
| `alienLeader.js` | Leader de la flotte alien |
| `alienInterceptor.js` | Intercepteurs aliens |
| `proximityMine.js` | Mines du niveau 6 |
| `binarySingularity.js` | Singularités gravitationnelles |
| `explosion.js` | Explosions |
| `explosionGalaxy.js` | Arrière-plan de la galaxie spéciale |
| `stars.js` | Fond spatial et étoiles |
| `cutscene.js` | Gestion des cinématiques |
| `style.css` | Styles de la page |
| `libraries/` | Bibliothèques p5.js |
| `assets/` | Ressources graphiques |
| `tests/` | Tests automatisés |

---

## 🧪 Tests

Le projet possède une suite de tests basée sur le **Node.js Test Runner**.  
Les tests couvrent notamment :
- l'héritage des différentes entités depuis `Vehicle` ;
- l'évitement d'obstacles ;
- les déplacements et collisions ;
- les projectiles et le système de tir ;
- la collecte des jetons ;
- la progression des niveaux ;
- le bouclier, les trous de ver et la galaxie d'explosion ;
- les météores, les mines et les singularités ;
- le fonctionnement général du jeu.

Pour lancer les tests :
```bash
node --test tests/*.test.mjs
```

---

## 💻 Exécution locale

### Prérequis
- Git
- Un navigateur moderne
- Python 3 (ou Live Server)
- Node.js pour exécuter les tests

### Cloner le projet
```bash
git clone https://github.com/AYOUB185/space-obstacle-avoidance.git
cd space-obstacle-avoidance
```

### Lancer le jeu
Comme le projet utilise des ressources locales et des vidéos, il est préférable de démarrer un serveur HTTP local.

Avec Python :
```bash
python -m http.server 8000
```
*(Sous Windows, si `python` n'est pas disponible : `py -m http.server 8000`)*

Puis ouvrir dans votre navigateur :
[http://localhost:8000](http://localhost:8000)

---

## 🧰 Technologies

- **JavaScript (ES6+)**
- **p5.js** & **p5.sound**
- **HTML5** & **CSS3**
- **Web Audio / Navigateur**
- **Node.js Test Runner**
- **Git / GitHub**

---

## 📚 Concepts étudiés

Ce projet met principalement en pratique :
- Steering Behaviors (Reynolds)
- Seek & Arrive
- Predictive Obstacle Avoidance
- Forces de pilotage et prédiction de trajectoire
- Séparation entre comportement et locomotion
- Détection et résolution de collisions
- Gestion d'états et progression de niveaux
- Systèmes de particules et animations
- Interactions clavier / souris
- Tests automatisés

---

## 🧠 Points importants de l'implémentation

Le comportement `avoid()` utilise une prédiction de trajectoire basée sur la vitesse du véhicule.  
Deux points sont testés devant le vaisseau :
- `ahead = velocity × 30`
- `ahead2 = velocity × 15`

Le système compare ensuite les distances entre ces points, le vaisseau et l'obstacle le plus proche afin de déterminer s'il existe un risque de collision. Si un danger est détecté, une force de répulsion est calculée et appliquée au véhicule.

Cette approche permet au vaisseau de commencer à changer de trajectoire avant d'entrer en collision avec l'obstacle.

---

## 📸 Captures d'écran

```text
docs/
├── gameplay.png
├── level-1.png
├── level-3.png
└── boss.png
```

Pour les intégrer au README :
```markdown
![Gameplay](docs/gameplay.png)
```

---

## 📜 Référence

Craig W. Reynolds, *Steering Behaviors For Autonomous Characters*, GDC 1999.  
[https://www.red3d.com/cwr/steer/](https://www.red3d.com/cwr/steer/)

---

## ⭐ Objectif du projet

L'objectif de ce projet est de transformer l'étude de l'**Obstacle Avoidance** et des **Steering Behaviors** en une expérience de jeu complète.  
Au lieu de simplement montrer un véhicule évitant quelques obstacles, le comportement est intégré dans un environnement évolutif comprenant des ennemis, des projectiles, des niveaux, des ressources à collecter, des phénomènes gravitationnels et un boss final.

---

### 👨💻 Auteur

`Votre Nom`

