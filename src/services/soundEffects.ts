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
  private lastCrashTime = 0;
  private isAudioLoaded = false;
  private isEngineRunning = false;

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

      this.ambientAudio = new Audio('/sounds/musica_fundo.mp3');
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

      // Antigo som de batida removido — novo sintetizador físico multi-camadas é usado em playCrash()

      this.isAudioLoaded = true;
    } catch {}
  }

  public playVehicleHonk(isTruck = false, distanceVolume = 0.35) {
    if (!this.enabled) return;
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

  // 🎮 CONTROLE DINÂMICO DA MÚSICA DA GAMEPLAY
  private gameplayAudioFadeInterval: any = null;
  private currentGameplayVolume = 0.10; // Inicia em volume suave e macio
  private baseGameplayVolume = 0.28;

  public startMenuMusic() {
    if (!this.enabled) return;
    if (this.isMenuPlaying && this.currentMenuAudio && !this.currentMenuAudio.paused) return;
    this.isMenuPlaying = true;
    this.playMenuTrack(this.currentMenuTrackIdx);
  }

  private playMenuTrack(index: number) {
    if (!this.isMenuPlaying) return;
    try {
      if (this.menuFadeInterval) {
        clearInterval(this.menuFadeInterval);
        this.menuFadeInterval = null;
      }
      if (this.currentMenuAudio) {
        this.currentMenuAudio.pause();
        this.currentMenuAudio.onended = null;
        this.currentMenuAudio = null;
      }
      const url = this.menuPlaylist[index % this.menuPlaylist.length];
      const audio = new Audio(url);
      audio.volume = 0.12; // Nível suave, relaxante e bem equilibrado com a interface
      audio.onended = () => {
        if (this.isMenuPlaying) {
          // Transição contínua para a próxima faixa sem corte brusco
          this.currentMenuTrackIdx = (this.currentMenuTrackIdx + 1) % this.menuPlaylist.length;
          this.playMenuTrack(this.currentMenuTrackIdx);
        }
      };
      audio.play().then(() => {
        this.currentMenuAudio = audio;
      }).catch(() => {});
    } catch (_) {}
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
    this.initCtx();
    this.warmUpWebAudio();
    this.initCustomSounds();
    this.startProceduralBikeEngine();
    if (this.ambientAudio) {
      // Inicia com volume suave e discreto (sem estourar áudio no início)
      this.currentGameplayVolume = startLowVolume ? 0.10 : this.baseGameplayVolume;
      this.ambientAudio.volume = this.currentGameplayVolume;
      if (this.ambientAudio.paused) {
        this.ambientAudio.play().catch(() => {});
      }
    }
  }

  // 🚀 Acelera/eleva dinamicamente a intensidade da música (ex: ao desviar de jato de água)
  public boostGameplayMusicIntensity(targetVol = 0.32, durationSec = 1.6) {
    if (!this.enabled || !this.ambientAudio) return;
    this.fadeGameplayVolume(targetVol, durationSec);
  }

  // ⏸️ Pausa da gameplay: Apenas reduz suavemente o volume SEM parar ou trocar a música
  public setGameplayPausedVolume(isPaused: boolean) {
    if (!this.enabled || !this.ambientAudio) return;
    const target = isPaused ? 0.06 : this.baseGameplayVolume;
    this.fadeGameplayVolume(target, 0.4);
  }

  // 🏁 Fim de jogo / Game Over: Música continua tocando bem baixa e com clima abafado cinematográfico
  public setGameOverMuffledVolume() {
    this.stopProceduralBikeEngine();
    if (this.rainAudio) {
      this.rainAudio.pause();
    }
    if (!this.enabled || !this.ambientAudio) return;
    // Volume bem baixo (~0.07) estilo rádio distante/abafado
    this.fadeGameplayVolume(0.07, 0.8);
  }

  public fadeGameplayVolume(targetVol: number, durationSec: number = 0.5) {
    if (!this.ambientAudio) return;
    if (this.gameplayAudioFadeInterval) {
      clearInterval(this.gameplayAudioFadeInterval);
      this.gameplayAudioFadeInterval = null;
    }
    const audio = this.ambientAudio;
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
    this.stopProceduralBikeEngine();
    if (this.gameplayAudioFadeInterval) {
      clearInterval(this.gameplayAudioFadeInterval);
      this.gameplayAudioFadeInterval = null;
    }
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
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
    // Som do motor da moto desativado conforme solicitação do usuário
    this.isEngineRunning = false;
  }

  public updateEngineRPM(speedKmh: number, isAccelerating = false, isWheelie = false) {
    // Motor silencioso
  }

  public stopProceduralBikeEngine() {
    if (this.motorcycleAudio) {
      try {
        this.motorcycleAudio.pause();
        this.motorcycleAudio.currentTime = 0;
      } catch {}
    }
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
    if (now - this.lastBarkTime < 380) return; // Prevent overlapping audio burst
    this.lastBarkTime = now;

    this.initCustomSounds();
    if (this.barkAudioPool.length > 0) {
      // Round-robin from audio pool
      const bark = this.barkAudioPool.shift()!;
      this.barkAudioPool.push(bark);
      bark.currentTime = 0;
      bark.volume = 0.85;
      bark.play().catch(() => {
        this.playBark();
      });
    } else {
      this.playBark();
    }
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

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.20);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, now);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
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

    this.playSyntheticCrash();
  }

  playSyntheticCrash() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const ctx = this.ctx;
      const now = ctx.currentTime;

      // 1. SUB-BASS EXPLOSIVE SHOCKWAVE THUMP (Impacto pesado da colisão)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(155, now);
      subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.52);

      subGain.gain.setValueAtTime(0.95, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.56);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.58);

      // 2. PUNCHY MID-LOW BODY SLAM (Estouro seco da carenagem e lataria)
      const punchOsc = ctx.createOscillator();
      const punchGain = ctx.createGain();
      punchOsc.type = 'triangle';
      punchOsc.frequency.setValueAtTime(240, now);
      punchOsc.frequency.exponentialRampToValueAtTime(38, now + 0.24);

      punchGain.gain.setValueAtTime(0.75, now);
      punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      punchOsc.connect(punchGain);
      punchGain.connect(ctx.destination);
      punchOsc.start(now);
      punchOsc.stop(now + 0.28);

      // 3. METALLIC CHASSIS CRUNCH & DEFORMATION (Ruído branco filtrado + modulação metálica)
      const bufferDuration = 0.65;
      const bufferSize = Math.floor(ctx.sampleRate * bufferDuration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        // Envelope irregular imitando amassado de metal e estilhaços
        const mod = 1.0 + 0.45 * Math.sin(i * 0.08) * Math.cos(i * 0.019);
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.55) * mod;
      }

      const crunchSource = ctx.createBufferSource();
      crunchSource.buffer = noiseBuffer;

      const crunchFilter = ctx.createBiquadFilter();
      crunchFilter.type = 'bandpass';
      crunchFilter.frequency.setValueAtTime(920, now);
      crunchFilter.frequency.exponentialRampToValueAtTime(280, now + 0.55);
      crunchFilter.Q.setValueAtTime(1.8, now);

      const crunchGain = ctx.createGain();
      crunchGain.gain.setValueAtTime(0.85, now);
      crunchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.62);

      crunchSource.connect(crunchFilter);
      crunchFilter.connect(crunchGain);
      crunchGain.connect(ctx.destination);
      crunchSource.start(now);

      // 4. GLASS SHATTER & SPARKS BURST (Estilhaços de vidro de farol e para-brisa)
      const shardDelays = [0.015, 0.055, 0.11, 0.17, 0.25];
      shardDelays.forEach((delay, idx) => {
        const shardOsc = ctx.createOscillator();
        const shardGain = ctx.createGain();
        shardOsc.type = 'sawtooth';
        const baseFreq = 2400 + (idx * 670) % 2100;
        shardOsc.frequency.setValueAtTime(baseFreq, now + delay);
        shardOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, now + delay + 0.09);

        shardGain.gain.setValueAtTime(0.18 * (1 - idx * 0.14), now + delay);
        shardGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.095);

        shardOsc.connect(shardGain);
        shardGain.connect(ctx.destination);
        shardOsc.start(now + delay);
        shardOsc.stop(now + delay + 0.1);
      });
    } catch {}
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

  playStumble() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Tyre skid chirp
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.linearRampToValueAtTime(280, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
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
}

export const sound = new SoundManager();
