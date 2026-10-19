/**
 * CutsceneManager — Gestionnaire de cinématiques vidéo d'introduction
 * Charge et affiche les vidéos en plein écran (niveau 1.mp4, niveau 2.mp4),
 * gère l'autoplay navigateur, le passage rapide (skip) et assure une transition fluide.
 */
class CutsceneManager {
  constructor() {
    this.isPlaying = false;
    this.currentVideoSrc = null;
    this.currentTitle = "";
    this.onComplete = null;
    this.videoElement = null;
    this.container = null;
    this.overlay = null;
    this.titleElement = null;
    this.hintElement = null;
    this.playPromptBtn = null;
    this.progressBar = null;
    this._waitingForBody = false;
  }

  /**
   * Initialise les éléments DOM pour l'affichage plein écran.
   */
  initDOM() {
    if (typeof document === 'undefined') return;

    if (!document.body) {
      if (!this._waitingForBody) {
        this._waitingForBody = true;
        window.addEventListener('DOMContentLoaded', () => this.initDOM());
      }
      return;
    }

    if (document.getElementById('cutscene-container')) {
      this.container = document.getElementById('cutscene-container');
      this.videoElement = document.getElementById('cutscene-video');
      this.titleElement = document.getElementById('cutscene-title');
      this.hintElement = document.getElementById('cutscene-hint');
      this.playPromptBtn = document.getElementById('cutscene-play-btn');
      this.progressBar = document.getElementById('cutscene-progress-inner');
      return;
    }

    // Conteneur plein écran
    this.container = document.createElement('div');
    this.container.id = 'cutscene-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #000;
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    // Élément vidéo
    this.videoElement = document.createElement('video');
    this.videoElement.id = 'cutscene-video';
    this.videoElement.playsInline = true;
    this.videoElement.preload = 'auto';
    this.videoElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;

    // Overlay avec titre, barre de progression et indication pour passer
    this.overlay = document.createElement('div');
    this.overlay.id = 'cutscene-overlay';
    this.overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 24px;
      box-sizing: border-box;
      background: linear-gradient(180deg, rgba(5, 10, 20, 0.75) 0%, transparent 22%, transparent 78%, rgba(5, 10, 20, 0.85) 100%);
    `;

    // Titre de la cinématique
    this.titleElement = document.createElement('div');
    this.titleElement.id = 'cutscene-title';
    this.titleElement.style.cssText = `
      color: #00e5ff;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 2px;
      text-shadow: 0 0 12px rgba(0, 229, 255, 0.6);
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    // Barre de progression en bas
    const progressTrack = document.createElement('div');
    progressTrack.style.cssText = `
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 12px;
    `;
    this.progressBar = document.createElement('div');
    this.progressBar.id = 'cutscene-progress-inner';
    this.progressBar.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #00e5ff, #ff0077);
      transition: width 0.1s linear;
    `;
    progressTrack.appendChild(this.progressBar);

    // Bas d'overlay avec skip hint
    const bottomRow = document.createElement('div');
    bottomRow.style.cssText = `
      display: flex;
      flex-direction: column;
      width: 100%;
    `;

    this.hintElement = document.createElement('button');
    this.hintElement.id = 'cutscene-hint';
    this.hintElement.textContent = "Passer la cinématique ⏭️ [ESPACE / CLIC]";
    this.hintElement.style.cssText = `
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
      letter-spacing: 1px;
      background: rgba(10, 20, 35, 0.7);
      padding: 10px 20px;
      border-radius: 20px;
      border: 1px solid rgba(0, 229, 255, 0.4);
      align-self: flex-end;
      pointer-events: auto;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(0, 229, 255, 0.2);
      transition: all 0.2s ease;
    `;
    this.hintElement.onmouseenter = () => {
      this.hintElement.style.background = 'rgba(0, 229, 255, 0.25)';
      this.hintElement.style.borderColor = '#00e5ff';
      this.hintElement.style.color = '#fff';
    };
    this.hintElement.onmouseleave = () => {
      this.hintElement.style.background = 'rgba(10, 20, 35, 0.7)';
      this.hintElement.style.borderColor = 'rgba(0, 229, 255, 0.4)';
      this.hintElement.style.color = 'rgba(255, 255, 255, 0.9)';
    };
    this.hintElement.onclick = (e) => {
      e.stopPropagation();
      this.skip();
    };

    bottomRow.appendChild(progressTrack);
    bottomRow.appendChild(this.hintElement);

    this.overlay.appendChild(this.titleElement);
    this.overlay.appendChild(bottomRow);

    // Bouton de secours si autoplay avec son est bloqué par le navigateur
    this.playPromptBtn = document.createElement('button');
    this.playPromptBtn.id = 'cutscene-play-btn';
    this.playPromptBtn.innerHTML = "▶ LANCER LA MISSION (CLIC)";
    this.playPromptBtn.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 18px 36px;
      font-size: 18px;
      font-weight: bold;
      color: #00e5ff;
      background: rgba(10, 20, 35, 0.95);
      border: 2px solid #00e5ff;
      border-radius: 30px;
      cursor: pointer;
      box-shadow: 0 0 30px rgba(0, 229, 255, 0.6);
      pointer-events: auto;
      display: none;
      letter-spacing: 2px;
      transition: all 0.2s ease;
    `;
    this.playPromptBtn.onclick = (e) => {
      e.stopPropagation();
      this.playPromptBtn.style.display = 'none';
      if (this.videoElement) {
        this.videoElement.muted = false;
        this.videoElement.play().catch(() => {});
      }
    };

    // Clic n'importe où sur le conteneur passe la vidéo
    this.container.onclick = () => {
      this.skip();
    };

    this.container.appendChild(this.videoElement);
    this.container.appendChild(this.overlay);
    this.container.appendChild(this.playPromptBtn);

    document.body.appendChild(this.container);

    // Événements vidéo
    this.videoElement.onended = () => {
      this.end();
    };

    this.videoElement.ontimeupdate = () => {
      if (this.videoElement.duration && this.progressBar) {
        let pct = (this.videoElement.currentTime / this.videoElement.duration) * 100;
        this.progressBar.style.width = `${pct}%`;
      }
    };

    this.videoElement.onerror = (e) => {
      console.warn("Erreur de chargement vidéo, passage automatique :", e);
      this.end();
    };
  }

  /**
   * Lance la lecture plein écran d'une vidéo de niveau.
   * @param {string} src - Chemin de la vidéo ('niveau 1.mp4' ou 'niveau 2.mp4')
   * @param {string} title - Titre affiché sur l'overlay
   * @param {Function} onComplete - Callback appelé à la fin de la vidéo
   */
  play(src, title = "BRIEFING DE MISSION", onComplete = null) {
    this.isPlaying = true;
    this.currentVideoSrc = src;
    this.currentTitle = title;
    this.onComplete = onComplete;

    if (typeof document === 'undefined') {
      // Environnement sans DOM (ex: tests Node.js)
      return;
    }

    if (!document.body) {
      window.addEventListener('DOMContentLoaded', () => this.play(src, title, onComplete));
      return;
    }

    if (!this.container || !document.body.contains(this.container)) {
      this.initDOM();
    }

    if (this.titleElement) {
      this.titleElement.innerHTML = `🎬 ${title}`;
    }

    if (this.progressBar) {
      this.progressBar.style.width = '0%';
    }

    if (this.playPromptBtn) {
      this.playPromptBtn.style.display = 'none';
    }

    this.container.style.display = 'flex';
    this.videoElement.src = encodeURI(src);
    this.videoElement.currentTime = 0;
    this.videoElement.volume = 1.0;
    this.videoElement.muted = false;

    // Tentative de lecture avec son complet
    const startPlayback = () => {
      if (!this.videoElement) return;
      this.videoElement.muted = false;
      this.videoElement.volume = 1.0;
      let p = this.videoElement.play();
      if (p !== undefined) {
        p.catch((err) => {
          console.warn("Autoplay audio initial restreint par le navigateur, attente d'interaction :", err);
          // Si bloqué, démarrer en sourdine temporaire et afficher le bouton pour débloquer le son au premier clic
          this.videoElement.muted = true;
          this.videoElement.play().catch(() => {});
          if (this.playPromptBtn) {
            this.playPromptBtn.style.display = 'block';
            this.playPromptBtn.innerHTML = "🔊 CLIQUEZ POUR ACTIVER LE SON & LANCER LA MISSION";
          }
        });
      }
    };

    // Débloque l'audio dès la première interaction utilisateur
    const unlockSound = () => {
      if (this.videoElement) {
        this.videoElement.muted = false;
        this.videoElement.volume = 1.0;
        this.videoElement.play().catch(() => {});
      }
      if (this.playPromptBtn) {
        this.playPromptBtn.style.display = 'none';
      }
    };
    window.addEventListener('click', unlockSound, { once: true });
    window.addEventListener('keydown', unlockSound, { once: true });
    window.addEventListener('pointerdown', unlockSound, { once: true });

    startPlayback();
  }

  /**
   * Passe immédiatement la cinématique.
   */
  skip() {
    if (!this.isPlaying) return;
    this.end();
  }

  /**
   * Termine la cinématique et déclenche la transition fluide vers le gameplay.
   */
  end() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.videoElement) {
      try {
        this.videoElement.pause();
        this.videoElement.src = "";
      } catch (e) {}
    }

    if (this.container) {
      this.container.style.display = 'none';
    }

    if (this.playPromptBtn) {
      this.playPromptBtn.style.display = 'none';
    }

    let cb = this.onComplete;
    this.onComplete = null;
    if (typeof cb === 'function') {
      cb();
    }
  }

  /**
   * Intercepte les touches clavier pour passer la vidéo si une cinématique est en cours.
   * @param {string} key 
   * @param {number} keyCode 
   * @returns {boolean} True si la touche a été consommée par la cinématique
   */
  handleKeyPressed(key, keyCode) {
    if (!this.isPlaying) return false;
    // Espace (32), Entrée (13), Échap (27), ou touches s/S/w/W
    if (key === ' ' || key === 'Enter' || key === 'Escape' || key === 's' || key === 'S' || keyCode === 32 || keyCode === 13 || keyCode === 27) {
      this.skip();
      return true;
    }
    return false;
  }
}

// Instance globale prête à l'emploi
var cutsceneManager = new CutsceneManager();
