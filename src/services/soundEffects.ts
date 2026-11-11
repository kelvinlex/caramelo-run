// Web Audio API custom sound generator & audio manager - Clean & Professional Mix
class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  // Custom Audio Elements
  private menuAudio: HTMLAudioElement | null = null;
  private isMenuMusicPlaying = false;
  private ambientAudio: HTMLAudioElement | null = null;
  private motorcycleAudio: HTMLAudioElement | null = null;
  private rainAudio: HTMLAudioElement | null = null;
  private barkAudioPool: HTMLAudioElement[] = [];
  private crashAudioPool: HTMLAudioElement[] = [];
  private carHornAudio: HTMLAudioElement | null = null;
  private truckHornAudio: HTMLAudioElement | null = null;
  private lastHonkTime = 0;
  private lastBarkTime = 0;
  private lastGrowlTime = 0;
  private lastCrashTime = 0;
  private isAudioLoaded = false;
  private isEngineRunning = false;

  // Nós Web Audio do motor dinâmico da motocicleta + vento de velocidade
  private engineOscMain: OscillatorNode | null = null;
  private engineOscSub: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private windNoiseSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private currentEngineGear = 1;
  private lastGearShiftTime = 0;
  private smoothedSpeedKmh = 0;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public warmUpWebAudio() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Triangle oscillator (tyre stumble chirp) - silent pre-warm
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(480, now);
      gain1.gain.setValueAtTime(0.00001, now);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.04);

      // Sine oscillator (splash / water geyser) - silent pre-warm
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(340, now);
      gain2.gain.setValueAtTime(0.00001, now);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.04);
    } catch {}
  }

  public initCustomSounds() {
    if (typeof window === 'undefined' || this.isAudioLoaded) return;
    try {
      // 🎵 Música de fundo do Menu Principal
      this.menuAudio = new Audio('/sounds/menu_bgm.mp3');
      this.menuAudio.loop = true;
      this.menuAudio.volume = 0.50;

      this.ambientAudio = new Audio('/sounds/vila_bgm_1.mp3');
      this.ambientAudio.loop = true;
      this.ambientAudio.volume = 0.40;

      // Authentic Brazilian Honda CG 160 Engine Loop (Single Audio Source)
      this.motorcycleAudio = new Audio('/sounds/SOM DA MOTO.wav');
      this.motorcycleAudio.loop = true;
      this.motorcycleAudio.volume = 0.50;

      // 🌧️ Som Real de Chuva e Tempestade
      this.rainAudio = new Audio('/sounds/chuva.mp3');
      this.rainAudio.loop = true;
      this.rainAudio.volume = 0;

      // Pre-instantiate a pool of bark audio elements for instant, click-free playback
      for (let i = 0; i < 3; i++) {
        const b = new Audio('/sounds/CACHOROR.mp3');
        b.volume = 0.85;
        this.barkAudioPool.push(b);
      }

      this.carHornAudio = new Audio('/sounds/car_honk.mp3');
      this.carHornAudio.volume = 0.65;

      this.truckHornAudio = new Audio('/sounds/truck_horn.mp3');
      this.truckHornAudio.volume = 0.80;

      this.isAudioLoaded = true;
    } catch {}
  }

  public playVehicleHonk(isTruck = false, distanceVolume = 0.35) {
    if (!this.enabled || this.activeMapId === 'inferno') return;
    this.initCustomSounds();
    const now = Date.now();
    if (now - this.lastHonkTime < 4000) return; // Limita para no máximo 1 buzina a cada 4 segundos
    this.lastHonkTime = now;

    const audio = isTruck ? this.truckHornAudio : this.carHornAudio;
    if (audio) {
      audio.volume = Math.max(0.08, Math.min(0.35, distanceVolume));
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }

  // 🎵 PLAYLIST DO MENU — Músicas leves, relaxantes, modernas e agradáveis
  private menuPlaylist: string[] = [
    '/sounds/menu/maksymmalko-game-gaming-minecraft-background-music-379533.mp3', // Relaxante, lofi, moderna
    '/sounds/menu/brutaldesign-pixel-art-481480.mp3',
    '/sounds/menu/maksymmalko-game-gaming-background-music-385611.mp3',
  ];
  private currentMenuTrackIdx = 0;
  private currentMenuAudio: HTMLAudioElement | null = null;
  private isMenuPlaying = false;
  private menuFadeInterval: any = null;

  // 🎮 CONTROLE DINÂMICO E ALEATÓRIO DA MÚSICA DA GAMEPLAY (FAVELA, PRAIA E INFERNO)
  private activeMapId: 'favela' | 'praia' | 'inferno' = 'favela';
  private beachPlaylist: string[] = [
    '/assets/music/praia/sol_do_rio.mp3',
    '/assets/music/praia/praia_theme_2.mp3',
  ];
  private infernoPlaylist: string[] = [
    '/sounds/inferno_bgm_1.mp3',
    '/sounds/inferno_bgm_2.mp3',
    '/sounds/inferno_bgm_3.mp3',
  ];
  private favelaPlaylist: string[] = [
    '/sounds/vila_bgm_1.mp3',
  ];
  private currentBeachTrackIdx = -1;
  private currentInfernoTrackIdx = -1;
  private currentFavelaTrackIdx = -1;
  private beachAudioElements: HTMLAudioElement[] = [];
  private infernoAudioElements: HTMLAudioElement[] = [];
  private favelaAudioElements: HTMLAudioElement[] = [];
  private activeBeachAudio: HTMLAudioElement | null = null;
  private activeInfernoAudio: HTMLAudioElement | null = null;
  private activeFavelaAudio: HTMLAudioElement | null = null;
  private seagullAudioPool: HTMLAudioElement[] = [];
  private seagullInterval: any = null;
  private seagullIdx = 0;
  private gameplayAudioFadeInterval: any = null;
  private currentGameplayVolume = 0.10; // Inicia em volume suave e macio
  private baseGameplayVolume = 0.26;
  private isGameplayMusicActive = false;

  private pickNonRepeatingIndex(length: number, prevIdx: number): number {
    if (length <= 1) return 0;
    let next = Math.floor(Math.random() * length);
    if (next === prevIdx) {
      next = (prevIdx + 1 + Math.floor(Math.random() * (length - 1))) % length;
    }
    return next;
  }

  public setActiveMap(mapId: 'favela' | 'praia' | 'inferno') {
    const prev = this.activeMapId;
    this.activeMapId = mapId;
    if (prev !== mapId && this.isGameplayMusicActive) {
      this.startMusic(false);
    }
  }

  private ensureBeachSoundsLoaded() {
    if (typeof window === 'undefined') return;
    if (this.beachAudioElements.length === 0) {
      this.beachAudioElements = this.beachPlaylist.map((url, idx) => {
        const a = new Audio(url);
        a.preload = 'auto';
        a.loop = false;
        a.volume = 0;
        a.onended = () => {
          if (this.isGameplayMusicActive && this.activeMapId === 'praia') {
            this.currentBeachTrackIdx = this.pickNonRepeatingIndex(this.beachAudioElements.length, idx);
            this.playCurrentBeachTrack(true);
          }
        };
        return a;
      });
    }
    if (this.infernoAudioElements.length === 0) {
      this.infernoAudioElements = this.infernoPlaylist.map((url) => {
        const a = new Audio(url);
        a.preload = 'auto';
        a.loop = false;
        a.volume = 0;
        a.onended = () => {
          if (this.isGameplayMusicActive && this.activeMapId === 'inferno') {
            this.playCurrentInfernoTrack(true);
          }
        };
        return a;
      });
    }
    if (this.favelaAudioElements.length === 0) {
      this.favelaAudioElements = this.favelaPlaylist.map((url, idx) => {
        const a = new Audio(url);
        a.preload = 'auto';
        a.loop = this.favelaPlaylist.length === 1;
        a.volume = 0;
        a.onended = () => {
          if (this.isGameplayMusicActive && this.activeMapId === 'favela') {
            this.currentFavelaTrackIdx = this.pickNonRepeatingIndex(this.favelaAudioElements.length, idx);
            this.playCurrentFavelaTrack(true);
          }
        };
        return a;
      });
    }
    if (this.seagullAudioPool.length === 0) {
      const urls = [
        '/assets/music/praia/seagulls_1.mp3',
        '/assets/music/praia/seagulls_2.mp3',
      ];
      this.seagullAudioPool = urls.map((u) => {
        const s = new Audio(u);
        s.preload = 'auto';
        s.volume = 0.11;
        return s;
      });
    }
  }

  private getActiveGameplayAudio(): HTMLAudioElement | null {
    if (this.activeMapId === 'praia') {
      return this.activeBeachAudio;
    }
    if (this.activeMapId === 'inferno') {
      return this.activeInfernoAudio;
    }
    return this.activeFavelaAudio ?? this.ambientAudio;
  }

  private pauseAllGameplayTracksExcept(keep: HTMLAudioElement | null) {
    const all = [
      this.ambientAudio,
      this.activeBeachAudio,
      this.activeInfernoAudio,
      this.activeFavelaAudio,
      ...this.beachAudioElements,
      ...this.infernoAudioElements,
      ...this.favelaAudioElements,
    ];
    for (const a of all) {
      if (a && a !== keep && !a.paused) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
      }
    }
  }

  private playCurrentInfernoTrack(crossfade = false) {
    this.ensureBeachSoundsLoaded();
    if (this.infernoAudioElements.length === 0) return;
    // Sempre troca sequencialmente entre as 3 músicas do Extremo ao sair e entrar ou ao terminar uma faixa
    this.currentInfernoTrackIdx = (this.currentInfernoTrackIdx + 1) % this.infernoAudioElements.length;
    const nextAudio = this.infernoAudioElements[this.currentInfernoTrackIdx];
    this.pauseAllGameplayTracksExcept(nextAudio);
    this.activeInfernoAudio = nextAudio;
    nextAudio.currentTime = 0;
    nextAudio.volume = 0.03;
    nextAudio.play().catch(() => {});
    this.fadeGameplayVolume(0.34, crossfade ? 1.2 : 0.9);
  }

  private playCurrentFavelaTrack(crossfade = false) {
    this.ensureBeachSoundsLoaded();
    if (this.favelaAudioElements.length === 0) return;
    if (this.currentFavelaTrackIdx < 0 || !crossfade) {
      this.currentFavelaTrackIdx = this.pickNonRepeatingIndex(
        this.favelaAudioElements.length,
        this.currentFavelaTrackIdx
      );
    }
    const nextAudio = this.favelaAudioElements[this.currentFavelaTrackIdx % this.favelaAudioElements.length];
    this.pauseAllGameplayTracksExcept(nextAudio);
    this.activeFavelaAudio = nextAudio;
    nextAudio.currentTime = 0;
    nextAudio.volume = 0.03;
    nextAudio.play().catch(() => {});
    this.fadeGameplayVolume(this.baseGameplayVolume, crossfade ? 1.2 : 0.85);
  }

  private playCurrentBeachTrack(crossfade = false) {
    this.ensureBeachSoundsLoaded();
    if (this.beachAudioElements.length === 0) return;
    if (this.currentBeachTrackIdx < 0 || !crossfade) {
      this.currentBeachTrackIdx = this.pickNonRepeatingIndex(
        this.beachAudioElements.length,
        this.currentBeachTrackIdx
      );
    }

    const nextAudio = this.beachAudioElements[this.currentBeachTrackIdx % this.beachAudioElements.length];
    this.pauseAllGameplayTracksExcept(nextAudio);

    this.activeBeachAudio = nextAudio;
    nextAudio.currentTime = 0;
    nextAudio.volume = 0.02;
    nextAudio.play().catch(() => {});
    this.fadeGameplayVolume(this.baseGameplayVolume, crossfade ? 1.2 : 0.9);
  }

  private startBeachSeagullAmbience() {
    this.stopBeachSeagullAmbience();
    this.ensureBeachSoundsLoaded();
    this.seagullInterval = setInterval(() => {
      if (!this.enabled || !this.isGameplayMusicActive || this.activeMapId !== 'praia') return;
      if (this.seagullAudioPool.length === 0) return;
      const clip = this.seagullAudioPool[this.seagullIdx % this.seagullAudioPool.length];
      this.seagullIdx++;
      if (clip && clip.paused) {
        clip.volume = Math.min(0.12, this.currentGameplayVolume * 0.45);
        clip.currentTime = 0;
        clip.play().catch(() => {});
      }
    }, 19000);
  }

  private stopBeachSeagullAmbience() {
    if (this.seagullInterval) {
      clearInterval(this.seagullInterval);
      this.seagullInterval = null;
    }
    for (const s of this.seagullAudioPool) {
      if (!s.paused) {
        try {
          s.pause();
          s.currentTime = 0;
        } catch {}
      }
    }
  }

  public startMenuMusic(fadeIn = true, resetToInitial = false) {
    if (!this.enabled) return;
    if (resetToInitial) {
      this.currentMenuTrackIdx = 0;
    }
    if (this.isMenuPlaying && this.currentMenuAudio && !this.currentMenuAudio.paused && !resetToInitial) {
      return;
    }
    this.isMenuPlaying = true;
    this.playMenuTrack(this.currentMenuTrackIdx, fadeIn);
  }

  private playMenuTrack(index: number, fadeIn = false) {
    if (!this.isMenuPlaying) return;
    try {
      if (this.menuFadeInterval) {
        clearInterval(this.menuFadeInterval);
        this.menuFadeInterval = null;
      }
      if (this.currentMenuAudio) {
        try {
          this.currentMenuAudio.pause();
        } catch {}
        this.currentMenuAudio.onended = null;
        this.currentMenuAudio = null;
      }
      const url = this.menuPlaylist[index % this.menuPlaylist.length];
      const audio = new Audio(url);
      const targetVol = 0.14;
      audio.volume = fadeIn ? 0.01 : targetVol;
      audio.onended = () => {
        if (this.isMenuPlaying) {
          // Transição contínua para a próxima faixa sem corte brusco
          this.currentMenuTrackIdx = (this.currentMenuTrackIdx + 1) % this.menuPlaylist.length;
          this.playMenuTrack(this.currentMenuTrackIdx, false);
        }
      };
      audio.play().then(() => {
        this.currentMenuAudio = audio;
        if (fadeIn) {
          let v = audio.volume;
          this.menuFadeInterval = setInterval(() => {
            if (!this.isMenuPlaying || this.currentMenuAudio !== audio) {
              clearInterval(this.menuFadeInterval);
              this.menuFadeInterval = null;
              return;
            }
            v = Math.min(targetVol, v + 0.012);
            audio.volume = v;
            if (v >= targetVol) {
              clearInterval(this.menuFadeInterval);
              this.menuFadeInterval = null;
            }
          }, 40);
        }
      }).catch(() => {});
    } catch (_) {}
  }

  /**
   * Alterna a trilha sonora no Menu Principal quando o Modo Extremo é ativado ou desativado:
   * - Ao ativar o Modo Extremo: faz fade-out da música do menu e entra com a música do Extremo.
   * - Ao desativar o Modo Extremo: faz fade-out suave da música do Extremo e entra com fade-in na música inicial do menu!
   */
  public setMenuExtremeMode(isExtreme: boolean) {
    if (!this.enabled) return;
    if (isExtreme) {
      this.stopMenuMusic();
      this.activeMapId = 'inferno';
      this.isGameplayMusicActive = true;
      const alreadyPlayingInferno =
        this.activeInfernoAudio && !this.activeInfernoAudio.paused && this.activeInfernoAudio.volume > 0.02;
      if (!alreadyPlayingInferno) {
        this.playCurrentInfernoTrack(false);
      }
    } else {
      this.activeMapId = 'favela';
      this.fadeOutAllGameplayTracksAndStartMenu(true);
    }
  }

  public fadeOutAllGameplayTracksAndStartMenu(resetToInitialMenuTrack = false) {
    this.isGameplayMusicActive = false;
    this.stopProceduralBikeEngine();
    this.stopBeachSeagullAmbience();
    if (this.gameplayAudioFadeInterval) {
      clearInterval(this.gameplayAudioFadeInterval);
      this.gameplayAudioFadeInterval = null;
    }

    const playingTracks = [
      this.ambientAudio,
      this.activeBeachAudio,
      this.activeInfernoAudio,
      this.activeFavelaAudio,
      ...this.beachAudioElements,
      ...this.infernoAudioElements,
      ...this.favelaAudioElements,
    ].filter((a, idx, arr): a is HTMLAudioElement => !!a && !a.paused && arr.indexOf(a) === idx);

    if (playingTracks.length > 0) {
      const startVols = playingTracks.map((a) => a.volume);
      let step = 0;
      const totalSteps = 18; // ~630ms de fade-out suave
      this.gameplayAudioFadeInterval = setInterval(() => {
        step++;
        const ratio = Math.max(0, 1 - step / totalSteps);
        playingTracks.forEach((a, i) => {
          try {
            a.volume = Math.max(0, startVols[i] * ratio);
          } catch {}
        });
        if (step >= totalSteps) {
          if (this.gameplayAudioFadeInterval) {
            clearInterval(this.gameplayAudioFadeInterval);
            this.gameplayAudioFadeInterval = null;
          }
          playingTracks.forEach((a) => {
            try {
              a.pause();
              a.currentTime = 0;
            } catch {}
          });
          this.startMenuMusic(true, resetToInitialMenuTrack);
        }
      }, 35);
    } else {
      this.startMenuMusic(true, resetToInitialMenuTrack);
    }
  }

  public stopMenuMusic() {
    this.isMenuPlaying = false;
    if (this.menuFadeInterval) {
      clearInterval(this.menuFadeInterval);
      this.menuFadeInterval = null;
    }
    if (this.currentMenuAudio) {
      const a = this.currentMenuAudio;
      let vol = a.volume;
      this.menuFadeInterval = setInterval(() => {
        vol = Math.max(0, vol - 0.03);
        a.volume = vol;
        if (vol <= 0) {
          clearInterval(this.menuFadeInterval);
          this.menuFadeInterval = null;
          try { a.pause(); } catch (_) {}
        }
      }, 35);
    }
  }

  public startMusic(startLowVolume: boolean = true) {
    this.stopMenuMusic();
    if (!this.enabled) return;
    this.isGameplayMusicActive = true;
    this.initCtx();
    this.warmUpWebAudio();
    this.initCustomSounds();
    this.startProceduralBikeEngine();

    if (this.activeMapId === 'praia') {
      this.playCurrentBeachTrack(false);
      this.startBeachSeagullAmbience();
      return;
    }

    this.stopBeachSeagullAmbience();

    if (this.activeMapId === 'inferno') {
      this.playCurrentInfernoTrack(false);
      return;
    }

    this.playCurrentFavelaTrack(!startLowVolume);
  }

  // 🚀 Acelera/eleva dinamicamente a intensidade da música (ex: ao desviar de jato de água)
  public boostGameplayMusicIntensity(targetVol = 0.30, durationSec = 1.6) {
    const audio = this.getActiveGameplayAudio();
    if (!this.enabled || !audio) return;
    this.fadeGameplayVolume(targetVol, durationSec);
  }

  // ⏸️ Pausa da gameplay: Apenas reduz suavemente o volume SEM parar ou trocar a música
  public setGameplayPausedVolume(isPaused: boolean) {
    const audio = this.getActiveGameplayAudio();
    if (!this.enabled || !audio) return;
    const target = isPaused ? 0.06 : this.baseGameplayVolume;
    this.fadeGameplayVolume(target, 0.4);
  }

  // 🏁 Fim de jogo / Game Over: Música continua tocando bem baixa e com clima abafado cinematográfico
  public setGameOverMuffledVolume() {
    this.stopProceduralBikeEngine();
    this.stopBeachSeagullAmbience();
    if (this.rainAudio) {
      this.rainAudio.pause();
    }
    const audio = this.getActiveGameplayAudio();
    if (!this.enabled || !audio) return;
    // Volume bem baixo (~0.07) estilo rádio distante/abafado
    this.fadeGameplayVolume(0.07, 0.8);
  }

  public fadeGameplayVolume(targetVol: number, durationSec: number = 0.5) {
    const audio = this.getActiveGameplayAudio();
    if (!audio) return;
    if (this.gameplayAudioFadeInterval) {
      clearInterval(this.gameplayAudioFadeInterval);
      this.gameplayAudioFadeInterval = null;
    }
    const stepInterval = 40;
    const totalSteps = Math.max(1, Math.round((durationSec * 1000) / stepInterval));
    const startVol = audio.volume;
    const volDiff = targetVol - startVol;
    let step = 0;

    this.gameplayAudioFadeInterval = setInterval(() => {
      step++;
      const progress = Math.min(1.0, step / totalSteps);
      audio.volume = Math.max(0, Math.min(1.0, startVol + volDiff * progress));
      this.currentGameplayVolume = audio.volume;
      if (progress >= 1.0) {
        clearInterval(this.gameplayAudioFadeInterval);
        this.gameplayAudioFadeInterval = null;
      }
    }, stepInterval);
  }

  public stopMusic() {
    this.isGameplayMusicActive = false;
    this.stopProceduralBikeEngine();
    this.stopBeachSeagullAmbience();
    if (this.gameplayAudioFadeInterval) {
      clearInterval(this.gameplayAudioFadeInterval);
      this.gameplayAudioFadeInterval = null;
    }
    const playingTracks = [
      this.ambientAudio,
      this.activeBeachAudio,
      this.activeInfernoAudio,
      this.activeFavelaAudio,
      ...this.beachAudioElements,
      ...this.infernoAudioElements,
      ...this.favelaAudioElements,
    ].filter((a, idx, arr): a is HTMLAudioElement => !!a && !a.paused && arr.indexOf(a) === idx);

    if (playingTracks.length > 0) {
      const startVols = playingTracks.map((a) => a.volume);
      let step = 0;
      const totalSteps = 16;
      this.gameplayAudioFadeInterval = setInterval(() => {
        step++;
        const ratio = Math.max(0, 1 - step / totalSteps);
        playingTracks.forEach((a, i) => {
          try {
            a.volume = Math.max(0, startVols[i] * ratio);
          } catch {}
        });
        if (step >= totalSteps) {
          if (this.gameplayAudioFadeInterval) {
            clearInterval(this.gameplayAudioFadeInterval);
            this.gameplayAudioFadeInterval = null;
          }
          playingTracks.forEach((a) => {
            try {
              a.pause();
              a.currentTime = 0;
            } catch {}
          });
        }
      }, 30);
    }
    if (this.rainAudio) {
      this.rainAudio.pause();
      this.rainAudio.currentTime = 0;
    }
  }

  // 🌧️ Atualiza o volume e a reprodução do som ambiente de chuva real (volume mais presente)
  public updateRainSound(isRaining: boolean, intensity: number) {
    if (!this.enabled) {
      if (this.rainAudio && !this.rainAudio.paused) {
        this.rainAudio.pause();
      }
      return;
    }
    this.initCustomSounds();
    if (!this.rainAudio) return;

    if (isRaining && intensity > 0.02) {
      // Volume mais alto e nítido para destacar a chuva e trovões distantes
      const targetVol = Math.max(0.40, Math.min(1.0, 0.25 + intensity * 0.75));
      this.rainAudio.volume = targetVol;
      if (this.rainAudio.paused) {
        this.rainAudio.play().catch(() => {});
      }
    } else {
      if (!this.rainAudio.paused) {
        this.rainAudio.volume = Math.max(0, this.rainAudio.volume - 0.05);
        if (this.rainAudio.volume <= 0.02) {
          this.rainAudio.pause();
        }
      }
    }
  }

  public startProceduralBikeEngine() {
    if (!this.enabled) return;
    this.initCustomSounds();
    this.initCtx();
    if (!this.ctx) return;

    if (this.isEngineRunning && this.engineOscMain) return;
    this.stopProceduralBikeEngine();

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const oscMain = ctx.createOscillator();
      const oscSub = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      oscMain.type = 'sawtooth';
      oscSub.type = 'triangle';
      oscMain.frequency.setValueAtTime(46, now);
      oscSub.frequency.setValueAtTime(23, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(210, now);
      filter.Q.setValueAtTime(2.2, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.052, now + 0.25);

      oscMain.connect(filter);
      oscSub.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      oscMain.start(now);
      oscSub.start(now);

      // Ruído filtrado suave de vento em velocidade
      const windBufLen = ctx.sampleRate * 2;
      const windBuf = ctx.createBuffer(1, windBufLen, ctx.sampleRate);
      const data = windBuf.getChannelData(0);
      for (let i = 0; i < windBufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = windBuf;
      windSrc.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(320, now);
      windFilter.Q.setValueAtTime(1.1, now);

      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.0001, now);

      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      windSrc.start(now);

      this.engineOscMain = oscMain;
      this.engineOscSub = oscSub;
      this.engineFilter = filter;
      this.engineGain = gain;
      this.windNoiseSource = windSrc;
      this.windFilter = windFilter;
      this.windGain = windGain;
      this.currentEngineGear = 1;
      this.smoothedSpeedKmh = 0;
      this.isEngineRunning = true;
    } catch {}
  }

  public updateEngineRPM(speedKmh: number, isAccelerating = false, isWheelie = false) {
    if (!this.enabled) {
      if (this.isEngineRunning) this.stopProceduralBikeEngine();
      return;
    }
    if (!this.isEngineRunning || !this.engineOscMain || !this.ctx) {
      this.startProceduralBikeEngine();
    }
    if (!this.ctx || !this.engineOscMain || !this.engineOscSub || !this.engineFilter || !this.engineGain) {
      return;
    }

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const clampedKmh = Math.max(0, Math.min(165, speedKmh));
      const isDecelerating = clampedKmh < this.smoothedSpeedKmh - 0.8;
      this.smoothedSpeedKmh += (clampedKmh - this.smoothedSpeedKmh) * 0.14;

      // Cálculo de marcha de 5 velocidades (1ª a 5ª) com passagem de marcha realista
      const targetGear =
        this.smoothedSpeedKmh < 24
          ? 1
          : this.smoothedSpeedKmh < 46
            ? 2
            : this.smoothedSpeedKmh < 70
              ? 3
              : this.smoothedSpeedKmh < 96
                ? 4
                : 5;

      const nowMs = Date.now();
      if (targetGear !== this.currentEngineGear && nowMs - this.lastGearShiftTime > 450) {
        const upshift = targetGear > this.currentEngineGear;
        this.currentEngineGear = targetGear;
        this.lastGearShiftTime = nowMs;
        if (upshift && this.smoothedSpeedKmh > 18) {
          this.playGearShiftBlip();
        }
      }

      const gearRanges: [number, number][] = [
        [0, 26],
        [20, 50],
        [42, 74],
        [64, 100],
        [88, 155],
      ];
      const [gMin, gMax] = gearRanges[this.currentEngineGear - 1] || [0, 100];
      const gearRatio = Math.max(0, Math.min(1, (this.smoothedSpeedKmh - gMin) / Math.max(1, gMax - gMin)));

      // Marcha lenta (idle) com pulsação rítmica quando quase parado
      const idlePulse = this.smoothedSpeedKmh < 8 ? Math.sin(now * 26) * 2.4 : 0;
      const wheelieBoost = isWheelie ? 14 : 0;
      const accelBoost = isAccelerating ? 5.5 : isDecelerating ? -4.0 : 0;

      const shiftDip = nowMs - this.lastGearShiftTime < 130 ? -12 : 0;
      const baseHz =
        42 +
        this.currentEngineGear * 6.5 +
        gearRatio * 54 +
        wheelieBoost +
        accelBoost +
        shiftDip +
        idlePulse;

      const finalHz = Math.max(36, Math.min(148, baseHz));
      this.engineOscMain.frequency.setTargetAtTime(finalHz, now, 0.045);
      this.engineOscSub.frequency.setTargetAtTime(finalHz * 0.5, now, 0.045);

      const cutoff = 185 + gearRatio * 340 + (isWheelie ? 140 : 0) + (isAccelerating ? 65 : 0);
      this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);

      const targetEngineGain =
        this.smoothedSpeedKmh < 4
          ? 0.036
          : Math.min(0.082, 0.044 + (this.smoothedSpeedKmh / 140) * 0.032 + (isWheelie ? 0.012 : 0));
      this.engineGain.gain.setTargetAtTime(targetEngineGain, now, 0.06);

      // Som de vento proporcional à velocidade
      if (this.windFilter && this.windGain) {
        const windFactor = Math.max(0, Math.min(1, (this.smoothedSpeedKmh - 28) / 110));
        this.windFilter.frequency.setTargetAtTime(280 + windFactor * 520, now, 0.08);
        this.windGain.gain.setTargetAtTime(windFactor * windFactor * 0.042, now, 0.08);
      }
    } catch {}
  }

  private playGearShiftBlip() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(62, now + 0.09);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  public stopProceduralBikeEngine() {
    if (this.motorcycleAudio) {
      try {
        this.motorcycleAudio.pause();
        this.motorcycleAudio.currentTime = 0;
      } catch {}
    }
    try {
      if (this.engineOscMain) {
        this.engineOscMain.stop();
        this.engineOscMain.disconnect();
      }
    } catch {}
    try {
      if (this.engineOscSub) {
        this.engineOscSub.stop();
        this.engineOscSub.disconnect();
      }
    } catch {}
    try {
      if (this.windNoiseSource) {
        this.windNoiseSource.stop();
        this.windNoiseSource.disconnect();
      }
    } catch {}
    this.engineOscMain = null;
    this.engineOscSub = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.windNoiseSource = null;
    this.windFilter = null;
    this.windGain = null;
    this.isEngineRunning = false;
  }

  public updateVolumes(distanceToMotoboy: number, isClose: boolean) {
    if (!this.enabled) return;
    if (this.ambientAudio) {
      this.ambientAudio.volume = isClose ? 0.35 : 0.45;
    }
  }

  public toggleMute(isMenuState = false): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopMusic();
      this.stopMenuMusic();
    } else {
      if (isMenuState) {
        this.startMenuMusic();
      } else {
        this.startMusic();
      }
    }
    return this.enabled;
  }

  playCustomBark() {
    if (!this.enabled) return;
    const now = Date.now();
    if (now - this.lastBarkTime < 340) return; // Prevent overlapping audio burst
    this.lastBarkTime = now;

    this.initCustomSounds();
    if (this.barkAudioPool.length > 0) {
      // Round-robin from audio pool
      const bark = this.barkAudioPool.shift()!;
      this.barkAudioPool.push(bark);
      bark.currentTime = 0;
      // Pitch mais grave e imponente (0.80 - 0.84) para latido sério de cão de guarda
      bark.playbackRate = 0.82;
      bark.volume = 0.90;
      bark.play().catch(() => {
        this.playBark();
      });
    } else {
      this.playBark();
    }

    // Camada de impacto e rosnado sub-grave por cima do latido para encorpar o som
    this.playBarkDeepLayer();
  }

  // Camada sonora encorpada (Sub-Grave + Rosnado + Ressonância de Peito) sobreposta ao latido
  private playBarkDeepLayer() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const dur = 0.32;

      // Oscilador 1: Sub-harmônico grave de peito (95Hz -> 58Hz)
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(95, now);
      subOsc.frequency.exponentialRampToValueAtTime(58, now + dur);

      // Oscilador 2: Rosnado rústico e sério (130Hz -> 72Hz)
      const growlOsc = ctx.createOscillator();
      growlOsc.type = 'triangle';
      growlOsc.frequency.setValueAtTime(130, now);
      growlOsc.frequency.exponentialRampToValueAtTime(72, now + dur);

      // Filtro Low-Pass e Ressonância de Garganta
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + dur);
      filter.Q.setValueAtTime(2.2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.32, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      subOsc.connect(filter);
      growlOsc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      subOsc.start(now);
      growlOsc.start(now);
      subOsc.stop(now + dur + 0.02);
      growlOsc.stop(now + dur + 0.02);
    } catch {}
  }

  playDogGrowl(intensity = 0.7) {
    if (!this.enabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastGrowlTime < 1450) return;
    this.lastGrowlTime = nowMs;

    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const dur = 0.38;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(74, now);
      osc1.frequency.linearRampToValueAtTime(62, now + dur);
      osc2.frequency.setValueAtTime(81, now);
      osc2.frequency.linearRampToValueAtTime(67, now + dur);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(240, now);
      filter.Q.setValueAtTime(2.4, now);

      const peakGain = Math.max(0.06, Math.min(0.18, intensity * 0.16));
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + dur + 0.02);
      osc2.stop(now + dur + 0.02);
    } catch {}
  }

  playRecoverySound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch {}
  }

  playBark() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      // Frequências mais graves e encorpadas para latido sério
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(88, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.24);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.Q.setValueAtTime(2.2, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.34, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }

  playClick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  playBoing() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.14);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch {}
  }

  playCoin() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.setValueAtTime(1318.51, now + 0.07); // E6

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1975.53, now); // B6 Harmonic

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.33);
      osc2.stop(now + 0.33);
    } catch {}
  }

  playPowerup() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [330.0, 440.0, 554.37, 659.25]; // E4, A4, C#5, E5
      notes.forEach((freq, idx) => {
        const noteTime = now + idx * 0.06;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.001, noteTime);
        gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.23);
      });
    } catch {}
  }

  playBite() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Snappy, fleshy chomp
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.10);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  playCrash() {
    if (!this.enabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastCrashTime < 900) return;
    this.lastCrashTime = nowMs;
    // Sons antigos de batida e raspagem de veículos desativados conforme solicitado (Item 5)
  }

  playSyntheticCrash() {
    // Desativado (Item 5): evita reprodução dos sons antigos de colisão e raspagem metálica
  }

  playSplash() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.22);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }

  playWaterGeyserBurst() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // 1. Batida metálica oca da tampa de bueiro voando
      const clangOsc = ctx.createOscillator();
      const clangGain = ctx.createGain();
      clangOsc.type = 'triangle';
      clangOsc.frequency.setValueAtTime(520, now);
      clangOsc.frequency.exponentialRampToValueAtTime(165, now + 0.16);
      clangGain.gain.setValueAtTime(0.28, now);
      clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      clangOsc.connect(clangGain);
      clangGain.connect(ctx.destination);
      clangOsc.start(now);
      clangOsc.stop(now + 0.19);

      // 2. Jato pressurizado de água espirrando (ruído filtrado ascendente)
      const dur = 0.48;
      const bufSize = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        const t = i / bufSize;
        ch[i] = (Math.random() * 2 - 1) * Math.sin(Math.min(1, t * 5) * Math.PI * 0.5) * (1 - t * 0.78);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, now);
      filter.frequency.exponentialRampToValueAtTime(1850, now + 0.14);
      filter.frequency.exponentialRampToValueAtTime(780, now + dur);
      filter.Q.setValueAtTime(1.3, now);

      const sprayGain = ctx.createGain();
      sprayGain.gain.setValueAtTime(0.32, now);
      sprayGain.gain.exponentialRampToValueAtTime(0.008, now + dur);
      src.connect(filter);
      filter.connect(sprayGain);
      sprayGain.connect(ctx.destination);
      src.start(now);
    } catch {}
  }

  playCashPickup(denomination = 50) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const baseFreq =
        denomination >= 200 ? 784 : denomination >= 100 ? 698.46 : denomination >= 50 ? 622.25 : 523.25;
      const chord = denomination >= 200 ? [1, 1.25, 1.5, 2.0] : [1, 1.25, 1.5];

      chord.forEach((mult, idx) => {
        const t0 = now + idx * 0.042;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === chord.length - 1 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq * mult, t0);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * mult * 1.03, t0 + 0.14);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.2, t0 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.23);
      });
    } catch {}
  }

  playStumble() {
    // Som antigo de raspagem lateral de pneu/veículo desativado conforme solicitado (Item 5)
  }

  playWin() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const now = this.ctx!.currentTime + i * 0.12;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now);
        osc.stop(now + 0.29);
      });
    } catch {}
  }

  playWhoosh() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.08);
      filter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.22);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.22);

      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.23);
    } catch {}
  }

  /**
   * Som cômico e crocante ao coletar Osso Branco no modo Caramelo (+ boing de barriga inflando!)
   */
  playBoneCrunch() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // 1. Crocância estalada cartoon
      const crunchOsc = ctx.createOscillator();
      const crunchGain = ctx.createGain();
      crunchOsc.type = 'square';
      crunchOsc.frequency.setValueAtTime(360, now);
      crunchOsc.frequency.exponentialRampToValueAtTime(720, now + 0.045);
      crunchGain.gain.setValueAtTime(0.16, now);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      crunchOsc.connect(crunchGain);
      crunchGain.connect(ctx.destination);
      crunchOsc.start(now);
      crunchOsc.stop(now + 0.065);

      // 2. Boing elástico cômico do corpo inflando
      const boingOsc = ctx.createOscillator();
      const boingGain = ctx.createGain();
      boingOsc.type = 'sine';
      boingOsc.frequency.setValueAtTime(240, now + 0.035);
      boingOsc.frequency.exponentialRampToValueAtTime(590, now + 0.16);
      boingOsc.frequency.exponentialRampToValueAtTime(440, now + 0.26);
      boingGain.gain.setValueAtTime(0.001, now + 0.035);
      boingGain.gain.linearRampToValueAtTime(0.24, now + 0.06);
      boingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      boingOsc.connect(boingGain);
      boingGain.connect(ctx.destination);
      boingOsc.start(now + 0.035);
      boingOsc.stop(now + 0.29);
    } catch {}
  }

  /**
   * Som suculento + turbo ascendente ao pegar Carne Vermelha na rua
   */
  playMeatPowerup() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const notes = [392.0, 523.25, 659.25, 880.0, 1046.5];
      notes.forEach((freq, idx) => {
        const t0 = now + idx * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.08, t0 + 0.16);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(idx % 2 === 0 ? 0.22 : 0.12, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.25);
      });
    } catch {}
  }

  /**
   * Alerta cômico diagonal antes do Caramelo pular nas costas do Motoboy
   */
  playAttackWarning() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      [0, 0.13].forEach((offset, idx) => {
        const t0 = now + offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const fStart = idx === 0 ? 580 : 740;
        osc.frequency.setValueAtTime(fStart, t0);
        osc.frequency.exponentialRampToValueAtTime(fStart * 1.42, t0 + 0.095);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.24, t0 + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.115);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.12);
      });
    } catch {}
  }

  /**
   * Som sincronizado de Mordida Cartoon (nhac + impacto cômico!)
   */
  playBiteAttack() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // 1. Estalo forte de mandíbula ("NHAC!")
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'sawtooth';
      snapOsc.frequency.setValueAtTime(480, now);
      snapOsc.frequency.exponentialRampToValueAtTime(95, now + 0.085);
      snapGain.gain.setValueAtTime(0.32, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(now);
      snapOsc.stop(now + 0.1);

      // 2. Impacto grave cartoon + segunda mordidinha rápida
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(210, now + 0.09);
      thudOsc.frequency.exponentialRampToValueAtTime(75, now + 0.22);
      thudGain.gain.setValueAtTime(0.26, now + 0.09);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      thudOsc.start(now + 0.09);
      thudOsc.stop(now + 0.25);
    } catch {}
  }

  /**
   * Som sincronizado de confirmação do Desafio de Precisão da Mordida (Vermelho / Laranja / Amarelo / Verde!)
   */
  playBitePrecisionConfirm(quality: 'miss' | 'weak' | 'good' | 'perfect') {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      if (quality === 'miss') {
        // Mordida no vento + descida cômica ("whiff!")
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(115, now + 0.22);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
        return;
      }

      // 1. Mordida firme ("NHAC!") + achatamento cômico do Motoboy ("BOING-SQUASH!")
      this.playBiteAttack();

      const squashOsc = ctx.createOscillator();
      const squashGain = ctx.createGain();
      squashOsc.type = 'sine';
      const peakFreq = quality === 'perfect' ? 620 : quality === 'good' ? 490 : 390;
      squashOsc.frequency.setValueAtTime(150, now + 0.04);
      squashOsc.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.14);
      squashOsc.frequency.exponentialRampToValueAtTime(210, now + 0.28);
      squashGain.gain.setValueAtTime(0.28, now + 0.04);
      squashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
      squashOsc.connect(squashGain);
      squashGain.connect(ctx.destination);
      squashOsc.start(now + 0.04);
      squashOsc.stop(now + 0.31);

      // 2. Acorde brilhante extra para Bom / Perfeito!
      const notes =
        quality === 'perfect' ? [587.33, 880, 1174.66] : quality === 'good' ? [523.25, 783.99] : [440];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        const t0 = now + 0.05 + idx * 0.045;
        o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.001, t0);
        g.gain.linearRampToValueAtTime(quality === 'perfect' ? 0.22 : 0.15, t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t0);
        o.stop(t0 + 0.24);
      });
    } catch {}
  }

  /**
   * Feedback sonoro satisfatório ao esquivar da faixa vermelha de ataque do Caramelo!
   */
  playCartoonDodgeSuccess() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      this.playWhoosh();
      [659.25, 987.77].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t0 = now + idx * 0.055;
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t0 + 0.14);
        gain.gain.setValueAtTime(0.18, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.17);
      });
    } catch {}
  }

  /**
   * Sequência sonora cômica estilo desenho animado para a Briga Final na Nuvem de Poeira (0 vidas)!
   */
  playCartoonBrawlFinale() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // 1. Assobio ascendente do grande salto do Caramelo (0.0s -> 0.36s)
      const leapOsc = ctx.createOscillator();
      const leapGain = ctx.createGain();
      leapOsc.type = 'sine';
      leapOsc.frequency.setValueAtTime(280, now);
      leapOsc.frequency.exponentialRampToValueAtTime(1120, now + 0.34);
      leapGain.gain.setValueAtTime(0.24, now);
      leapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.37);
      leapOsc.connect(leapGain);
      leapGain.connect(ctx.destination);
      leapOsc.start(now);
      leapOsc.stop(now + 0.38);

      // 2. Sequência ritmada de pancadas cômicas, molas ("boing!") e peças metálicas quicando (0.38s -> 2.55s)
      const hits = [0.38, 0.58, 0.78, 0.98, 1.18, 1.40, 1.62, 1.86, 2.10, 2.34];
      hits.forEach((offset, idx) => {
        const t0 = now + offset;
        const thud = ctx.createOscillator();
        const thudG = ctx.createGain();
        thud.type = idx % 2 === 0 ? 'triangle' : 'sine';
        if (idx % 3 === 1) {
          // Mola cartoon ("BOING!") quando roda/peça salta
          thud.frequency.setValueAtTime(190, t0);
          thud.frequency.exponentialRampToValueAtTime(640, t0 + 0.16);
        } else {
          // Pancada cartoon na nuvem de poeira + tilintar metálico
          thud.frequency.setValueAtTime(idx % 2 === 0 ? 220 : 880, t0);
          thud.frequency.exponentialRampToValueAtTime(idx % 2 === 0 ? 52 : 340, t0 + 0.14);
        }
        thudG.gain.setValueAtTime(0.28, t0);
        thudG.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
        thud.connect(thudG);
        thudG.connect(ctx.destination);
        thud.start(t0);
        thud.stop(t0 + 0.19);
      });
    } catch {}
  }

  /**
   * Item 3: Som específico de atração magnética e coleta de Notas de Dinheiro
   */
  playCashMagnetCollect(denom: 10 | 50 | 100 | 200 = 10) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Sopro magnético curto ascendente + tilintar da nota
      const magOsc = ctx.createOscillator();
      const magGain = ctx.createGain();
      magOsc.type = 'sine';
      magOsc.frequency.setValueAtTime(320, now);
      magOsc.frequency.exponentialRampToValueAtTime(840, now + 0.08);
      magGain.gain.setValueAtTime(0.14, now);
      magGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      magOsc.connect(magGain);
      magGain.connect(ctx.destination);
      magOsc.start(now);
      magOsc.stop(now + 0.095);

      this.playCashPickup(denom);
    } catch {}
  }

  /**
   * Item 3: Som específico de atração e coleta satisfatória de Ossos no Modo Caramelo
   */
  playBoneMagnetCollect() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Pop magnético + crocância cômica do osso
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(290, now);
      popOsc.frequency.exponentialRampToValueAtTime(760, now + 0.065);
      popGain.gain.setValueAtTime(0.22, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      popOsc.connect(popGain);
      popGain.connect(ctx.destination);
      popOsc.start(now);
      popOsc.stop(now + 0.08);

      this.playBoneCrunch();
    } catch {}
  }

  /**
   * Item 6 & 7: Grito vocal cômico e engraçado do Motoboy ao cair do Grau / entrar na nuvem de pancadaria!
   */
  playMotoboyFunnyScream() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Formante vocal estilo desenho animado ("UAAAAH-HAAA-UI!") com vibrato cômico
      const carrier = ctx.createOscillator();
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      const formantFilter = ctx.createBiquadFilter();
      const mainGain = ctx.createGain();

      carrier.type = 'sawtooth';
      carrier.frequency.setValueAtTime(340, now);
      carrier.frequency.exponentialRampToValueAtTime(690, now + 0.18);
      carrier.frequency.exponentialRampToValueAtTime(520, now + 0.42);
      carrier.frequency.exponentialRampToValueAtTime(240, now + 0.68);

      vibrato.type = 'sine';
      vibrato.frequency.setValueAtTime(16.0, now);
      vibratoGain.gain.setValueAtTime(38.0, now);
      vibrato.connect(vibratoGain);
      vibratoGain.connect(carrier.frequency);

      formantFilter.type = 'bandpass';
      formantFilter.frequency.setValueAtTime(920, now);
      formantFilter.frequency.linearRampToValueAtTime(1280, now + 0.22);
      formantFilter.frequency.linearRampToValueAtTime(740, now + 0.65);
      formantFilter.Q.setValueAtTime(3.2, now);

      mainGain.gain.setValueAtTime(0.001, now);
      mainGain.gain.linearRampToValueAtTime(0.32, now + 0.04);
      mainGain.gain.setValueAtTime(0.28, now + 0.42);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

      carrier.connect(formantFilter);
      formantFilter.connect(mainGain);
      mainGain.connect(ctx.destination);

      carrier.start(now);
      vibrato.start(now);
      carrier.stop(now + 0.74);
      vibrato.stop(now + 0.74);
    } catch {}
  }

  /**
   * Item 7: Som cômico exclusivo de derrota do Caramelo (0 vidas)
   */
  playCarameloComicalDefeat() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const notes = [520, 440, 350, 220];
      notes.forEach((freq, idx) => {
        const t0 = now + idx * 0.14;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.78, t0 + 0.12);
        g.gain.setValueAtTime(0.24, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.15);
      });
    } catch {}
  }

  /**
   * Item 8: Som de arremesso da caixa de pizza com uma mão
   */
  playPizzaThrowWhoosh() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.11);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.21);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    } catch {}
  }

  /**
   * Item 8: Sino alegre de Pizzaria + confirmação cartoon quando o cliente recebe a pizza!
   */
  playPizzaDeliveredChime() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const notes = [587.33, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, idx) => {
        const t0 = now + idx * 0.055;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.26, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.30);
      });
    } catch {}
  }

  /**
   * Item 2: Efeito sonoro de transição para Câmera Lenta Cinematográfica do Tutorial Inicial
   */
  playSlowMoTransition(entering: boolean) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(entering ? 420 : 160, now);
      osc.frequency.exponentialRampToValueAtTime(entering ? 130 : 540, now + 0.32);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {}
  }

  /**
   * Som de erupção e queimadura do Ataque de Lava (Modo Extremo: Inferno)
   */
  playLavaEruptionSfx() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Sub-grave vulcânico + chiado de magma fervente
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.48);
      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.54);

      const sizzleOsc = ctx.createOscillator();
      const sizzleGain = ctx.createGain();
      sizzleOsc.type = 'square';
      sizzleOsc.frequency.setValueAtTime(620, now);
      sizzleOsc.frequency.exponentialRampToValueAtTime(180, now + 0.36);
      sizzleGain.gain.setValueAtTime(0.18, now);
      sizzleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      sizzleOsc.connect(sizzleGain);
      sizzleGain.connect(ctx.destination);
      sizzleOsc.start(now);
      sizzleOsc.stop(now + 0.4);
    } catch {}
  }

  /**
   * Som da Baforada de Fogo do Caramelo Diabo (Modo Extremo: Inferno)
   */
  playDemonFireBreathSfx() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Rugido grave demoníaco + rajada de fogo
      const roarOsc = ctx.createOscillator();
      const roarGain = ctx.createGain();
      roarOsc.type = 'sawtooth';
      roarOsc.frequency.setValueAtTime(190, now);
      roarOsc.frequency.linearRampToValueAtTime(110, now + 0.25);
      roarOsc.frequency.exponentialRampToValueAtTime(62, now + 0.72);
      roarGain.gain.setValueAtTime(0.001, now);
      roarGain.gain.linearRampToValueAtTime(0.36, now + 0.08);
      roarGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      roarOsc.connect(roarGain);
      roarGain.connect(ctx.destination);
      roarOsc.start(now);
      roarOsc.stop(now + 0.78);
    } catch {}
  }

  /**
   * Som celestial de Libertação da Alma ao entregar pizza para um Fantasma no Inferno!
   */
  playSoulLiberationSfx() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const chord = [523.25, 659.25, 783.99, 1046.5, 1567.98];
      chord.forEach((freq, idx) => {
        const t0 = now + idx * 0.065;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.06, t0 + 0.55);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.20, t0 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.62);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.65);
      });
    } catch {}
  }

  /**
   * Risada/Rosnado sinistro de entrada do Monstro Caramelo Diabo ao abrir o painel do Inferno!
   */
  playMonsterIntroGrowl() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const syllables = [138, 122, 108, 92];
      syllables.forEach((baseFreq, i) => {
        const t0 = now + i * 0.095;
        const osc = ctx.createOscillator();
        const sub = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        sub.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq * 1.12, t0);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.82, t0 + 0.085);
        sub.frequency.setValueAtTime(baseFreq * 0.5, t0);

        filter.type = 'bandpass';
        filter.Q.setValueAtTime(1.8, t0);
        filter.frequency.setValueAtTime(360, t0);
        filter.frequency.exponentialRampToValueAtTime(640, t0 + 0.035);
        filter.frequency.exponentialRampToValueAtTime(280, t0 + 0.085);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.78, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.092);

        osc.connect(filter);
        sub.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        sub.start(t0);
        osc.stop(t0 + 0.092);
        sub.stop(t0 + 0.092);
      });
    } catch {}
  }

  /**
   * Voz de Monstro / Character Chatter (Gibberish Voice) sincronizada com cada letra digitada!
   */
  playMonsterChatterBlip(charIndex: number, ch = '') {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const upper = ch.toUpperCase();
      const isVowel = 'AEIOUÁÉÍÓÚÃÕÂÊÔ'.includes(upper);
      const isQuestion = upper === '?';
      const isExclaim = upper === '!';

      // Contorno de entonação silábica estilo Banjo-Kazooie / Undertale (grave e gutural de monstro)
      const contour = [112, 128, 98, 136, 105, 142, 94, 122];
      const basePitch =
        contour[charIndex % contour.length] *
        (isQuestion ? 1.32 : isExclaim ? 1.24 : isVowel ? 1.08 : 0.94);

      const dur = isQuestion || isExclaim ? 0.085 : 0.058;

      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const formant = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      subOsc.type = 'square';

      osc.frequency.setValueAtTime(basePitch * 0.92, now);
      osc.frequency.linearRampToValueAtTime(
        isQuestion ? basePitch * 1.38 : basePitch * 1.14,
        now + dur * 0.45
      );
      osc.frequency.exponentialRampToValueAtTime(
        isQuestion ? basePitch * 1.28 : basePitch * 0.78,
        now + dur
      );

      subOsc.frequency.setValueAtTime(basePitch * 0.5, now);
      subOsc.frequency.exponentialRampToValueAtTime(basePitch * 0.42, now + dur);

      // Filtro de formante vocal ("wah/grah" de monstro falando — mais alto e encorpado!)
      formant.type = 'bandpass';
      formant.Q.setValueAtTime(1.5, now);
      const fStart = isVowel ? 360 : 280;
      const fPeak = isVowel ? 780 : 560;
      formant.frequency.setValueAtTime(fStart, now);
      formant.frequency.exponentialRampToValueAtTime(fPeak, now + dur * 0.42);
      formant.frequency.exponentialRampToValueAtTime(310, now + dur);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.75, now + 0.009);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(formant);
      subOsc.connect(formant);
      formant.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      subOsc.start(now);
      osc.stop(now + dur + 0.008);
      subOsc.stop(now + dur + 0.008);
    } catch {}
  }
}

export const sound = new SoundManager();
