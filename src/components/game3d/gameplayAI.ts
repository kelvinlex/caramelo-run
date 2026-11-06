import { sound } from '../../services/soundEffects';

export interface CarameloAIState {
  behaviorState: 'STALKING' | 'SLIPSTREAM' | 'FLANK_ATTACK' | 'TIRED';
  slipstreamTimer: number;
  flankSide: 1 | -1;
  flankTimer: number;
  tauntCooldown: number;
  nearMissCount: number;
}

const _aiResult = { targetDogX: 0, speedBonus: 0 };

export class GameplayDirectorAI {
  private state: CarameloAIState = {
    behaviorState: 'STALKING',
    slipstreamTimer: 0,
    flankSide: 1,
    flankTimer: 0,
    tauntCooldown: 2.0,
    nearMissCount: 0,
  };

  /**
   * I.A. Tática do Cão Caramelo:
   * - Identifica cone de vácuo atrás da moto para dar arrancadas realistas.
   * - Executa fintas táticas laterais quando está pronto para o bote.
   * - Reage dinamicamente às ações do piloto (grau, desvios e velocidade).
   */
  public updateCarameloAI(
    dt: number,
    motoboyX: number,
    dogX: number,
    distanceToMotoboy: number,
    _motoboySpeed: number,
    isWheelie: boolean,
    onSpeech: (text: string) => void
  ): { targetDogX: number; speedBonus: number } {
    let targetDogX = motoboyX;
    let speedBonus = 0;
    this.state.tauntCooldown -= dt;

    const lateralDist = Math.abs(motoboyX - dogX);

    // 1. SLIPSTREAM DRAFTING (Cão entra no cone de vácuo aerodinâmico da moto)
    if (lateralDist < 0.65 && distanceToMotoboy < 8.5 && distanceToMotoboy > 2.0) {
      this.state.behaviorState = 'SLIPSTREAM';
      this.state.slipstreamTimer += dt;
      speedBonus = 2.6; // Arrancada no vácuo da moto

      if (this.state.slipstreamTimer > 1.1 && this.state.tauntCooldown <= 0) {
        this.state.tauntCooldown = 6.5;
        sound.playCustomBark();
        onSpeech('TÔ NO SEU VÁCUO! ESSA PIZZA É MINHA! 🍕💨🐕');
      }
    } else {
      this.state.slipstreamTimer = 0;
    }

    // 2. FINTA TÁTICA LATERAL DE BOTE (Quando se aproxima a menos de 3.6 metros)
    if (distanceToMotoboy <= 3.6 && distanceToMotoboy > 1.2) {
      this.state.flankTimer += dt;
      if (this.state.flankTimer > 2.2) {
        this.state.flankTimer = 0;
        this.state.flankSide = this.state.flankSide === 1 ? -1 : 1;
        if (this.state.tauntCooldown <= 0) {
          this.state.tauntCooldown = 5.5;
          sound.playCustomBark();
          onSpeech('VOU CORTAR PELA PONTA! NHAC! 🐶⚡');
        }
      }
      targetDogX = motoboyX + this.state.flankSide * 1.15;
      speedBonus += 1.4;
    } else {
      targetDogX = motoboyX * 0.92;
    }

    // 3. REAÇÃO INTELIGENTE AO GRAU
    if (isWheelie && this.state.tauntCooldown <= 0 && distanceToMotoboy < 7.5) {
      this.state.tauntCooldown = 7.0;
      onSpeech('ACHA QUE EMPINANDO VOCÊ ME ESCAPA?! 🏍️🐾');
    }

    _aiResult.targetDogX = targetDogX;
    _aiResult.speedBonus = speedBonus;
    return _aiResult;
  }

  /**
   * I.A. de Ultrapassagem Fina (Near-Miss / Tirando Fino)
   * Dispara recompensas de adrenalina, pontos extras e buzina quando o motoboy corta tirando fino.
   */
  public triggerNearMiss(
    isTruck: boolean,
    onNearMiss: (pts: number, message: string) => void
  ) {
    this.state.nearMissCount++;
    const pts = isTruck ? 250 : 150;
    const msg = isTruck
      ? '🚛💥 FINO NO CAMINHÃO! +250 PTS!'
      : '🚗⚡ FINO DO MOTOCA! +150 PTS!';

    sound.playVehicleHonk(isTruck, 0.95);
    onNearMiss(pts, msg);
  }

  public reset() {
    this.state = {
      behaviorState: 'STALKING',
      slipstreamTimer: 0,
      flankSide: 1,
      flankTimer: 0,
      tauntCooldown: 3.0,
      nearMissCount: 0,
    };
  }
}
