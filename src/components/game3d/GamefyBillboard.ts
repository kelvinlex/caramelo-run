import * as THREE from 'three';
import { getActiveAd, recordAdImpression } from '../game/MarketingPortalModal';

/**
 * ============================================================================
 * GAMEFY BILLBOARD 3D SYSTEM — Outdoor Tecnológico Cyberpunk Gamefy.net.br
 * ============================================================================
 * - Estrutura 3D física imponente: Base de concreto, pilares de aço carbono preto,
 *   gabinete moderno roxo tecnológico com detalhes chanfrados em preto fosco.
 * - Textura e relevo de controle de videogame (Gamepad) na carcaça e no display.
 * - Telão dinâmico animado em tempo real com efeito "typewriter" escrevendo
 *   "GAMEFY.NET.BR", cursor pulsante, scanlines LED, equalizador e neon glow.
 * - Alternância suave entre calçada esquerda e direita com ângulo de visão ideal.
 * ============================================================================
 */

class GamefyBillboardManagerClass {
  private screenCanvas: HTMLCanvasElement | null = null;
  private screenCtx: CanvasRenderingContext2D | null = null;
  private screenTexture: THREE.CanvasTexture | null = null;
  private screenMaterial: THREE.MeshStandardMaterial | null = null;

  private adImageMap: Map<string, HTMLImageElement> = new Map();
  private adImpressionAcc = 0;

  // Textura procedural de relevo do controle de videogame para a moldura roxa
  private controllerBodyTexture: THREE.CanvasTexture | null = null;

  // Estado da animação dinâmica
  private animTimer = 0;
  private lastRenderTime = 0;
  private fullText = 'GAMEFY.NET.BR';
  private currentDisplayedChars = 0;
  private typewriterTimer = 0;
  private cursorBlink = true;
  private state: 'TYPING' | 'HOLD' | 'CLEARING' = 'TYPING';
  private holdTimer = 0;
  private pulseGlow = 0;
  private subTickerIndex = 0;
  private tickerMessages = [
    '🎮 O PORTAL OFICIAL DE JOGOS DO BRASIL',
    '⚡ JOGUE GRÁTIS NO NAVEGADOR • CARAMELO RUN',
    '🏆 O MELHOR DO GRAU E DA QUEBRADA ONLINE',
    '🚀 DESAFIE SEUS AMIGOS EM GAMEFY.NET.BR'
  ];

  // Materiais compartilhados para otimização máxima de memória e draw calls
  private concreteMat: THREE.MeshStandardMaterial | null = null;
  private steelPoleMat: THREE.MeshStandardMaterial | null = null;
  private purpleCabinetMat: THREE.MeshStandardMaterial | null = null;
  private blackCarbonMat: THREE.MeshStandardMaterial | null = null;
  private neonStripMat: THREE.MeshBasicMaterial | null = null;

  constructor() {
    this.initCanvasAndTexture();
  }

  /**
   * Inicializa o canvas de 1024x576 (16:9) e as texturas dinâmicas
   */
  private initCanvasAndTexture(): void {
    if (typeof document === 'undefined') return;

    // 1. Canvas do Telão Dinâmico (Resolução otimizada para mobile)
    const isMobile = typeof window !== 'undefined' && (
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 850
    );
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = isMobile ? 512 : 1024;
    this.screenCanvas.height = isMobile ? 288 : 576;
    this.screenCtx = this.screenCanvas.getContext('2d');

    if (this.screenCtx) {
      this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
      this.screenTexture.generateMipmaps = !isMobile;
      this.screenTexture.minFilter = isMobile ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
      this.screenTexture.magFilter = THREE.LinearFilter;
      this.screenTexture.wrapS = THREE.ClampToEdgeWrapping;
      this.screenTexture.wrapT = THREE.ClampToEdgeWrapping;

      this.screenMaterial = new THREE.MeshStandardMaterial({
        map: this.screenTexture,
        emissiveMap: this.screenTexture,
        emissive: new THREE.Color(0x9333ea),
        emissiveIntensity: 0.85,
        roughness: 0.25,
        metalness: 0.1,
      });
    }

    // 2. Textura com padrão de controle de videogame para a moldura
    this.createControllerBodyTexture();

    // 3. Materiais estruturais do outdoor
    this.concreteMat = new THREE.MeshStandardMaterial({
      color: 0x828285,
      roughness: 0.92,
      metalness: 0.05,
    });

    this.steelPoleMat = new THREE.MeshStandardMaterial({
      color: 0x18181c,
      roughness: 0.45,
      metalness: 0.85,
    });

    this.purpleCabinetMat = new THREE.MeshStandardMaterial({
      color: 0x6d28d9, // Roxo tecnológico marcante
      bumpMap: this.controllerBodyTexture || undefined,
      bumpScale: 0.04,
      roughness: 0.35,
      metalness: 0.4,
    });

    this.blackCarbonMat = new THREE.MeshStandardMaterial({
      color: 0x111114, // Preto fosco acabamento esportivo
      roughness: 0.6,
      metalness: 0.5,
    });

    this.neonStripMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7, // Luz de neon roxa ultra brilhante
    });
  }

  /**
   * Gera uma textura de controle de videogame para a moldura do outdoor
   */
  private createControllerBodyTexture(): void {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fundo roxo escuro metálico
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(0, 0, 512, 512);

    // Grade sutil de padrões de controle de videogame (D-pad, botões, triângulos, círculos)
    ctx.fillStyle = '#3b0764';
    ctx.strokeStyle = '#6d28d9';
    ctx.lineWidth = 2;

    const tileSize = 64;
    for (let y = 0; y < 512; y += tileSize) {
      for (let x = 0; x < 512; x += tileSize) {
        ctx.strokeRect(x + 4, y + 4, tileSize - 8, tileSize - 8);

        // Ícone de D-pad ou botões alternados
        if ((x + y) % 128 === 0) {
          // D-Pad estilizado
          ctx.fillRect(x + 26, y + 16, 12, 32);
          ctx.fillRect(x + 16, y + 26, 32, 12);
        } else {
          // 4 Botões geométricos
          ctx.beginPath();
          ctx.arc(x + 22, y + 32, 4, 0, Math.PI * 2);
          ctx.arc(x + 42, y + 32, 4, 0, Math.PI * 2);
          ctx.arc(x + 32, y + 22, 4, 0, Math.PI * 2);
          ctx.arc(x + 32, y + 42, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    this.controllerBodyTexture = new THREE.CanvasTexture(canvas);
    this.controllerBodyTexture.wrapS = THREE.RepeatWrapping;
    this.controllerBodyTexture.wrapT = THREE.RepeatWrapping;
    this.controllerBodyTexture.repeat.set(4, 2);
  }

  /**
   * Renderiza a imagem dinâmica da tela do outdoor a cada ciclo
   */
  private renderScreen(): void {
    const ctx = this.screenCtx;
    if (!ctx || !this.screenCanvas) return;

    const width = this.screenCanvas.width;
    const height = this.screenCanvas.height;

    const activeAd = getActiveAd('outdoors');

    if (activeAd) {
      // -------------------------------------------------------------
      // TELA DE PROPAGANDA PAGA (ANUNCIANTE ATIVO)
      // -------------------------------------------------------------
      if (activeAd.imageUrl && !this.adImageMap.has(activeAd.imageUrl)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = activeAd.imageUrl;
        this.adImageMap.set(activeAd.imageUrl, img);
      }

      const cachedImg = activeAd.imageUrl ? this.adImageMap.get(activeAd.imageUrl) : null;
      const isImgLoaded = cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0;

      // 1. Fundo Gradiente Cyberpunk VIP
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0.0, '#111827');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1.0, '#1e1b4b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Grid de fundo e linhas neon
      ctx.save();
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.18)';
      ctx.lineWidth = 1.5;
      for (let x = 40; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 30; y < height; y += 45) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Scanlines LED de alta fidelidade
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 2);
      }
      ctx.restore();

      // 4. Header Badge Patrocinado
      ctx.save();
      ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
      ctx.fillRect(30, 20, width - 60, 48);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 20, width - 60, 48);

      const isGlow = Math.sin(this.pulseGlow * 4) > 0;
      ctx.fillStyle = isGlow ? '#10b981' : '#059669';
      ctx.beginPath();
      ctx.arc(54, 44, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 18px "Arial Black", Arial, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      ctx.fillText('ANÚNCIO PATROCINADO', 72, 50);

      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(`ANUNCIANTE: ${activeAd.companyName.toUpperCase()}`, width - 50, 50);
      ctx.restore();

      // 5. Conteúdo Principal
      ctx.save();
      if (isImgLoaded && cachedImg) {
        const imgH = height - 170;
        const imgW = imgH * (16 / 9);
        const imgX = 40;
        const imgY = 86;

        ctx.fillStyle = '#020617';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.fillRect(imgX - 4, imgY - 4, Math.min(imgW, 440) + 8, imgH + 8);
        ctx.strokeRect(imgX - 4, imgY - 4, Math.min(imgW, 440) + 8, imgH + 8);

        ctx.drawImage(cachedImg, imgX, imgY, Math.min(imgW, 440), imgH);

        const textX = imgX + Math.min(imgW, 440) + 30;
        const textMaxW = width - textX - 40;

        ctx.font = '900 32px "Arial Black", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';

        const words = activeAd.title.split(' ');
        let line = '';
        let curY = imgY + 45;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > textMaxW && n > 0) {
            ctx.fillText(line, textX, curY);
            line = words[n] + ' ';
            curY += 38;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, textX, curY);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`★ EMPRESA: ${activeAd.companyName}`, textX, curY + 45);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px "Courier New", monospace';
        ctx.fillText(`PAINEL ADS • CAMPAIGN #${activeAd.id}`, textX, curY + 75);
      } else {
        const textX = width / 2;
        ctx.textAlign = 'center';

        ctx.font = '900 44px "Arial Black", sans-serif';
        const textGrad = ctx.createLinearGradient(100, 0, width - 100, 0);
        textGrad.addColorStop(0.0, '#ffffff');
        textGrad.addColorStop(0.5, '#fef08a');
        textGrad.addColorStop(1.0, '#f59e0b');
        ctx.fillStyle = textGrad;

        ctx.fillText(activeAd.title, textX, 220, width - 120);

        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`PARCEIRO: ${activeAd.companyName}`, textX, 290);

        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.fillStyle = '#a855f7';
        ctx.fillText('⚡ PROPAGANDA EM DESTAQUE NO CARAMELO RUN', textX, 340);
      }
      ctx.restore();

      // 6. Rodapé Ticker
      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
      ctx.fillRect(20, height - 58, width - 40, 40);
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(20, height - 58, width - 40, 40);

      ctx.font = 'bold 18px "Arial Black", sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(`🚀 ${activeAd.companyName} • ${activeAd.title} • ANUNCIE NO CARAMELO RUN VIA PAINEL ADS!`, width / 2, height - 32);
      ctx.restore();

      // 7. Moldura Neon
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.strokeRect(18, 18, width - 36, height - 36);
      ctx.restore();

      if (this.screenTexture) {
        this.screenTexture.needsUpdate = true;
      }
      return;
    }

    // 1. Fundo Gradiente Tecnológico Roxo Profundo com Preto
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0.0, '#19062e');
    bgGrad.addColorStop(0.5, '#0e021a');
    bgGrad.addColorStop(1.0, '#1b0533');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Grid Cibernético e Linhas de Dados em Perspectiva
    ctx.save();
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.22)';
    ctx.lineWidth = 1.5;
    for (let x = 40; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 30; y < height; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Scanlines LED sutis de telão profissional
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 2);
    }
    ctx.restore();

    // 4. Desenho de Controle de Videogame Tecnológico (Gamepad Icon)
    const gpX = 140;
    const gpY = 240;
    ctx.save();
    ctx.translate(gpX, gpY);

    // Glow do controle
    const glowRad = 110 + Math.sin(this.pulseGlow * 3) * 10;
    const gpGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, glowRad);
    gpGlow.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
    gpGlow.addColorStop(0.7, 'rgba(147, 51, 234, 0.15)');
    gpGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gpGlow;
    ctx.beginPath();
    ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
    ctx.fill();

    // Corpo do Gamepad (Estilo moderno com empunhaduras ergonômicas)
    ctx.fillStyle = '#1c1033';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-90, -50, 180, 100, [32, 32, 24, 24]);
    ctx.fill();
    ctx.stroke();

    // Empunhaduras inferiores do controle
    ctx.beginPath();
    ctx.ellipse(-65, 38, 26, 42, Math.PI / 6, 0, Math.PI * 2);
    ctx.ellipse(65, 38, 26, 42, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // D-Pad esquerdo
    ctx.fillStyle = '#06b6d4'; // Ciano neon contrastante
    ctx.fillRect(-62, -22, 10, 28);
    ctx.fillRect(-71, -13, 28, 10);

    // Botões de Ação da Direita (A, B, X, Y estilizados em cores neon)
    const btnColors = ['#f43f5e', '#10b981', '#3b82f6', '#fbbf24'];
    const offsets = [
      { x: 50, y: -8 },
      { x: 64, y: 4 },
      { x: 36, y: 4 },
      { x: 50, y: 16 }
    ];
    offsets.forEach((off, idx) => {
      ctx.fillStyle = btnColors[idx];
      ctx.beginPath();
      ctx.arc(off.x, off.y - 12, 5.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Dois Analógicos Centrais com LED
    ctx.fillStyle = '#2e1065';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-22, 18, 14, 0, Math.PI * 2);
    ctx.arc(22, 18, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // LED Central no topo do controle
    ctx.fillStyle = Math.sin(this.pulseGlow * 5) > 0 ? '#38bdf8' : '#a855f7';
    ctx.beginPath();
    ctx.arc(0, -26, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 5. Header Cibernético com Badge "ONLINE" e Detalhes
    ctx.save();
    // Barra superior
    ctx.fillStyle = 'rgba(126, 34, 206, 0.4)';
    ctx.fillRect(40, 36, width - 80, 48);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 36, width - 80, 48);

    // Badge LIVE / ONLINE
    const isLiveGlow = Math.sin(this.pulseGlow * 4) > 0;
    ctx.fillStyle = isLiveGlow ? '#22c55e' : '#15803d';
    ctx.beginPath();
    ctx.arc(68, 60, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 20px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('GAMEFY NETWORK', 86, 67);

    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'right';
    ctx.fillText('● 100% ONLINE • 60 FPS HD', width - 60, 66);
    ctx.restore();

    // 6. Texto Principal Animado: "GAMEFY.NET.BR" (Efeito Typewriter)
    const textToShow = this.fullText.substring(0, this.currentDisplayedChars);
    const cursorStr = this.cursorBlink ? '█' : ' ';

    ctx.save();
    ctx.font = '900 78px "Arial Black", sans-serif';
    ctx.textAlign = 'left';

    // Sombra Neon Intensa (Apenas no PC para poupar CPU mobile)
    const isMobile = typeof window !== 'undefined' && (
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 850
    );
    if (!isMobile) {
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 24 + Math.sin(this.pulseGlow * 4) * 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Gradiente no texto digitado
    const textGrad = ctx.createLinearGradient(270, 0, width - 60, 0);
    textGrad.addColorStop(0.0, '#ffffff');
    textGrad.addColorStop(0.4, '#f3e8ff');
    textGrad.addColorStop(0.7, '#d8b4fe');
    textGrad.addColorStop(1.0, '#38bdf8');
    ctx.fillStyle = textGrad;

    const textX = 270;
    const textY = 250;
    ctx.fillText(textToShow + (this.state === 'HOLD' ? '' : cursorStr), textX, textY);

    // Contorno fino para destaque
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#6b21a8';
    ctx.lineWidth = 3;
    ctx.strokeText(textToShow + (this.state === 'HOLD' ? '' : cursorStr), textX, textY);
    ctx.restore();

    // 7. Sub-Texto Ticker Animado (Mudança rotativa)
    ctx.save();
    const curTicker = this.tickerMessages[this.subTickerIndex % this.tickerMessages.length];
    ctx.font = 'bold 26px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = '#fef08a'; // Amarelo vibrante de alta visibilidade
    ctx.shadowColor = 'rgba(250, 204, 21, 0.7)';
    ctx.shadowBlur = 10;
    ctx.fillText(curTicker, 275, 305);
    ctx.restore();

    // 8. Equalizador Gráfico Dinâmico no Rodapé (Barras de Música/Ação)
    ctx.save();
    const barWidth = 14;
    const barSpacing = 7;
    const startX = 275;
    const bottomY = 490;
    const numBars = 26;

    for (let b = 0; b < numBars; b++) {
      const barH = 14 + Math.abs(Math.sin(this.pulseGlow * 3.5 + b * 0.45) * 60) + (b % 4) * 6;
      const bGrad = ctx.createLinearGradient(0, bottomY, 0, bottomY - barH);
      bGrad.addColorStop(0, '#9333ea');
      bGrad.addColorStop(0.6, '#a855f7');
      bGrad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = bGrad;
      ctx.fillRect(startX + b * (barWidth + barSpacing), bottomY - barH, barWidth, barH);
    }
    ctx.restore();

    // 9. Moldura Interna de LEDs Neon com Cantoneiras Estilizadas
    ctx.save();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 5;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // Cantoneiras triangulares tecnológicas
    const cornerSize = 28;
    ctx.fillStyle = '#38bdf8';
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(18, 18);
    ctx.lineTo(18 + cornerSize, 18);
    ctx.lineTo(18, 18 + cornerSize);
    ctx.fill();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(width - 18, 18);
    ctx.lineTo(width - 18 - cornerSize, 18);
    ctx.lineTo(width - 18, 18 + cornerSize);
    ctx.fill();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(18, height - 18);
    ctx.lineTo(18 + cornerSize, height - 18);
    ctx.lineTo(18, height - 18 - cornerSize);
    ctx.fill();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(width - 18, height - 18);
    ctx.lineTo(width - 18 - cornerSize, height - 18);
    ctx.lineTo(width - 18, height - 18 - cornerSize);
    ctx.fill();
    ctx.restore();

    // Sinaliza ao Three.js para subir a nova textura para a GPU
    if (this.screenTexture) {
      this.screenTexture.needsUpdate = true;
    }
  }

  /**
   * Atualização contínua chamada a cada frame do jogo
   */
  public update(dt: number, currentSpeed: number): void {
    this.animTimer += dt;
    this.pulseGlow += dt;
    this.adImpressionAcc += dt;
    if (this.adImpressionAcc > 10.0) {
      this.adImpressionAcc = 0;
      recordAdImpression('outdoors');
    }

    // Throttling inteligente: no celular desenha a 8 FPS e no PC a 20 FPS para liberar barramento de textura
    const isMobile = typeof window !== 'undefined' && (
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 850
    );
    const minInterval = isMobile ? 0.12 : 0.05;
    if (this.animTimer - this.lastRenderTime < minInterval) {
      return;
    }
    this.lastRenderTime = this.animTimer;

    // Lógica do Efeito Typewriter ("escrevendo animado")
    this.typewriterTimer += dt;
    if (this.typewriterTimer > 0.08) {
      this.typewriterTimer = 0;
      this.cursorBlink = !this.cursorBlink;

      if (this.state === 'TYPING') {
        if (this.currentDisplayedChars < this.fullText.length) {
          this.currentDisplayedChars++;
        } else {
          this.state = 'HOLD';
          this.holdTimer = 0;
        }
      } else if (this.state === 'HOLD') {
        this.holdTimer += 0.08;
        if (this.holdTimer > 3.2) { // Segura o texto completo por 3.2 segundos
          this.state = 'CLEARING';
        }
      } else if (this.state === 'CLEARING') {
        this.currentDisplayedChars -= 2;
        if (this.currentDisplayedChars <= 0) {
          this.currentDisplayedChars = 0;
          this.state = 'TYPING';
          this.subTickerIndex = (this.subTickerIndex + 1) % this.tickerMessages.length;
        }
      }
    }

    this.renderScreen();
  }

  /**
   * Cria uma instância 3D completa do Outdoor Gamefy para a calçada
   * @param side -1 para calçada esquerda, +1 para calçada direita
   * @param isNight true se for período noturno
   */
  public createBillboardInstance(side: 1 | -1, isNight: boolean): THREE.Group {
    const group = new THREE.Group();
    group.name = `GamefyBillboard_${side > 0 ? 'Right' : 'Left'}`;
    group.userData.isGamefyBillboard = true;
    group.userData.isScenery = true;

    // Dimensões do Outdoor
    const billboardWidth = 4.6;
    const billboardHeight = 2.6;
    const billboardDepth = 0.42;
    const poleHeight = 3.6;

    // 1. BASE DE CONCRETO NA CALÇADA
    const baseGeo = new THREE.BoxGeometry(3.0, 0.35, 1.3);
    const baseMesh = new THREE.Mesh(baseGeo, this.concreteMat || undefined);
    baseMesh.position.set(0, 0.18, 0);
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // 2. SAPATAS DE AÇO COM PARAFUSOS
    const flangeMat = this.blackCarbonMat || undefined;
    const flangeGeo = new THREE.BoxGeometry(0.7, 0.1, 0.7);
    const flange1 = new THREE.Mesh(flangeGeo, flangeMat);
    flange1.position.set(-0.95, 0.38, 0);
    const flange2 = new THREE.Mesh(flangeGeo, flangeMat);
    flange2.position.set(0.95, 0.38, 0);
    group.add(flange1, flange2);

    // 3. DOIS PILARES DUPLOS DE AÇO CARBONO
    const poleGeo = new THREE.CylinderGeometry(0.16, 0.18, poleHeight, 12);
    const poleLeft = new THREE.Mesh(poleGeo, this.steelPoleMat || undefined);
    poleLeft.position.set(-0.95, poleHeight / 2 + 0.35, 0);
    poleLeft.castShadow = false;

    const poleRight = new THREE.Mesh(poleGeo, this.steelPoleMat || undefined);
    poleRight.position.set(0.95, poleHeight / 2 + 0.35, 0);
    poleRight.castShadow = false;
    group.add(poleLeft, poleRight);

    // Treliça diagonal entre os pilares
    const trussGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
    const truss1 = new THREE.Mesh(trussGeo, this.steelPoleMat || undefined);
    truss1.rotation.z = Math.PI / 4;
    truss1.position.set(0, 1.8, 0);

    const truss2 = new THREE.Mesh(trussGeo, this.steelPoleMat || undefined);
    truss2.rotation.z = -Math.PI / 4;
    truss2.position.set(0, 1.8, 0);
    group.add(truss1, truss2);

    // 4. GABINETE PRINCIPAL DO OUTDOOR (ROXO TECNOLÓGICO)
    const cabinetY = poleHeight + billboardHeight * 0.5 + 0.1;
    const cabinetGeo = new THREE.BoxGeometry(billboardWidth, billboardHeight, billboardDepth);
    const cabinetMesh = new THREE.Mesh(cabinetGeo, this.purpleCabinetMat || undefined);
    cabinetMesh.position.set(0, cabinetY, 0);
    cabinetMesh.castShadow = false;
    group.add(cabinetMesh);

    // 5. MOLDURA CHANFRADA EM PRETO FOSCO (DETALHE ESPORTIVO)
    const borderMat = this.blackCarbonMat || undefined;
    // Borda superior e inferior
    const borderHorizGeo = new THREE.BoxGeometry(billboardWidth + 0.12, 0.16, billboardDepth + 0.04);
    const borderTop = new THREE.Mesh(borderHorizGeo, borderMat);
    borderTop.position.set(0, cabinetY + billboardHeight * 0.5 - 0.08, 0);

    const borderBottom = new THREE.Mesh(borderHorizGeo, borderMat);
    borderBottom.position.set(0, cabinetY - billboardHeight * 0.5 + 0.08, 0);
    group.add(borderTop, borderBottom);

    // Borda esquerda e direita
    const borderVertGeo = new THREE.BoxGeometry(0.16, billboardHeight, billboardDepth + 0.04);
    const borderLeft = new THREE.Mesh(borderVertGeo, borderMat);
    borderLeft.position.set(-billboardWidth * 0.5 + 0.08, cabinetY, 0);

    const borderRight = new THREE.Mesh(borderVertGeo, borderMat);
    borderRight.position.set(billboardWidth * 0.5 - 0.08, cabinetY, 0);
    group.add(borderLeft, borderRight);

    // 6. ADEREÇO 3D DE CONTROLE DE VIDEOGAME NO TOPO DA MOLDURA (RELEVO 3D)
    const gpGroup = new THREE.Group();
    gpGroup.position.set(0, cabinetY + billboardHeight * 0.5 + 0.28, 0);

    // Placa suporte do controle
    const gpPlateGeo = new THREE.BoxGeometry(1.4, 0.55, 0.22);
    const gpPlate = new THREE.Mesh(gpPlateGeo, this.blackCarbonMat || undefined);
    gpGroup.add(gpPlate);

    // Corpo do controle em relevo
    const gpBodyGeo = new THREE.BoxGeometry(1.0, 0.38, 0.12);
    const gpBody = new THREE.Mesh(gpBodyGeo, this.purpleCabinetMat || undefined);
    gpBody.position.set(0, 0, 0.1);
    gpGroup.add(gpBody);

    // D-pad em relevo
    const dpadGeo = new THREE.BoxGeometry(0.18, 0.18, 0.08);
    const dpadMesh = new THREE.Mesh(dpadGeo, this.neonStripMat || undefined);
    dpadMesh.position.set(-0.3, 0, 0.16);
    gpGroup.add(dpadMesh);

    // Botões coloridos
    const btnMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const btnGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8);
    btnGeo.rotateX(Math.PI / 2);
    const btnMesh = new THREE.Mesh(btnGeo, btnMat);
    btnMesh.position.set(0.3, 0, 0.16);
    gpGroup.add(btnMesh);

    group.add(gpGroup);

    // 7. O TELÃO DINÂMICO PRINCIPAL (FACE FRONTAL VIRADA PARA A CÂMERA/JOGADOR)
    const screenGeo = new THREE.PlaneGeometry(billboardWidth - 0.36, billboardHeight - 0.36);
    const screenMesh = new THREE.Mesh(screenGeo, this.screenMaterial || undefined);
    // Face voltada para Z negativo (de onde vem o jogador)
    screenMesh.position.set(0, cabinetY, -billboardDepth * 0.5 - 0.015);
    screenMesh.rotation.y = Math.PI; // Inverte para alinhar o canvas corretamente de frente
    group.add(screenMesh);

    // 8. FITAS DE LED NEON DE TOPO E BASE (ROXO/VIOLETA PULSANTE)
    const stripGeo = new THREE.BoxGeometry(billboardWidth - 0.2, 0.06, 0.06);
    const stripTop = new THREE.Mesh(stripGeo, this.neonStripMat || undefined);
    stripTop.position.set(0, cabinetY + billboardHeight * 0.5 - 0.14, -billboardDepth * 0.5 - 0.02);

    const stripBottom = new THREE.Mesh(stripGeo, this.neonStripMat || undefined);
    stripBottom.position.set(0, cabinetY - billboardHeight * 0.5 + 0.14, -billboardDepth * 0.5 - 0.02);
    group.add(stripTop, stripBottom);

    // 9. BRAÇOS COM SPOTLIGHTS DE ILUMINAÇÃO SUPERIOR
    for (let s of [-1.3, 1.3]) {
      const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8);
      armGeo.rotateX(Math.PI / 3);
      const arm = new THREE.Mesh(armGeo, this.steelPoleMat || undefined);
      arm.position.set(s, cabinetY + billboardHeight * 0.5 + 0.15, -billboardDepth * 0.5 - 0.25);
      group.add(arm);

      const lampGeo = new THREE.ConeGeometry(0.12, 0.2, 8);
      lampGeo.rotateX(-Math.PI / 4);
      const lamp = new THREE.Mesh(lampGeo, this.neonStripMat || undefined);
      lamp.position.set(s, cabinetY + billboardHeight * 0.5 + 0.3, -billboardDepth * 0.5 - 0.42);
      group.add(lamp);
    }

    // 10. ORIENTAÇÃO E ANGULAÇÃO CORRETA PARA A CALÇADA ESQUERDA OU DIREITA
    // Posiciona na calçada (X = ±7.35) e inclina suavemente ~14 graus em direção ao centro da pista
    // para dar uma visão diagonal cinematográfica ao jogador enquanto se aproxima
    if (side === -1) {
      // Calçada esquerda: leve rotação horária (+0.22 rad) em direção à pista
      group.rotation.y = 0.22;
    } else {
      // Calçada direita: leve rotação anti-horária (-0.22 rad) em direção à pista
      group.rotation.y = -0.22;
    }

    // Ajuste de emissive para dia/noite
    if (this.screenMaterial) {
      this.screenMaterial.emissiveIntensity = isNight ? 1.15 : 0.75;
    }

    return group;
  }
}

export const GamefyBillboardManager = new GamefyBillboardManagerClass();
