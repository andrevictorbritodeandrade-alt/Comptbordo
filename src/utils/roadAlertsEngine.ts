// Road Alert & Hazard Voice Feedback Engine (Waze-style proactive audio copilot)
import { RoadHazardAlert } from './offlineMapStorage';

// Web Audio synthesizer for crisp Waze-style audio chimes without relying on external MP3s
class WazeAudioSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Waze-style double chime for approaching hazard/radar
  playHazardChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(784, now); // G5
      osc1.frequency.setValueAtTime(1046.5, now + 0.12); // C6

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

      osc1.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.35);
    } catch (e) {
      // AudioContext unavailable or blocked by browser policy
    }
  }

  // Urgent double beep for overspeed near speed camera
  playOverspeedAlarm() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(900, now + 0.1);
      osc.frequency.setValueAtTime(1200, now + 0.2);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }
}

export const wazeAudio = new WazeAudioSynthesizer();

// Pre-seeded verified Brazilian road hazards (Radares, Polícia, Lombadas, Buracos, Veículos parados em RJ e rodovias)
export const DEFAULT_ROAD_HAZARDS: RoadHazardAlert[] = [
  // ─── MARICÁ / RJ-106 (Amaral Peixoto) ───
  {
    id: 'hazard-radar-marica-rj106-km28',
    type: 'speed_camera',
    title: 'Radar Fixo 60 km/h',
    description: 'RJ-106 KM 28 - Sentido Maricá / Região dos Lagos',
    lat: -22.9234,
    lng: -42.8295,
    speedLimit: 60,
    audioPrompt: 'Atenção: Radar fixo a 300 metros. Limite de 60 quilômetros por hora.',
  },
  {
    id: 'hazard-radar-marica-rj106-km22',
    type: 'speed_camera',
    title: 'Radar Fixo 80 km/h',
    description: 'RJ-106 KM 22 - Inoã / Maricá',
    lat: -22.9288,
    lng: -42.8710,
    speedLimit: 80,
    audioPrompt: 'Atenção: Radar fixo à frente. Limite de 80 quilômetros por hora.',
  },
  {
    id: 'hazard-policia-bprv-rj106-km20',
    type: 'police',
    title: 'Polícia Rodoviária (BPRv)',
    description: 'Posto Policial BPRv RJ-106 KM 20 - Inoã',
    lat: -22.9295,
    lng: -42.8850,
    audioPrompt: 'Atenção: Polícia reportada à frente.',
  },
  {
    id: 'hazard-radar-marica-rj106-km18',
    type: 'speed_camera',
    title: 'Radar Fixo 80 km/h',
    description: 'RJ-106 KM 18 - São José do Imbassaí',
    lat: -22.9260,
    lng: -42.8950,
    speedLimit: 80,
    audioPrompt: 'Atenção: Radar fixo a 300 metros. Limite 80 quilômetros por hora.',
  },
  {
    id: 'hazard-radar-marica-rj106-km32',
    type: 'speed_camera',
    title: 'Radar Fixo 60 km/h',
    description: 'RJ-106 KM 32 - Flamengo / Maricá',
    lat: -22.9210,
    lng: -42.7950,
    speedLimit: 60,
    audioPrompt: 'Atenção: Radar fixo à frente. Limite de 60 quilômetros por hora.',
  },
  {
    id: 'hazard-lombada-centro',
    type: 'speed_bump',
    title: 'Lombada / Quebra-mola',
    description: 'Rua Ribeiro de Almeida - Centro Maricá',
    lat: -22.9198,
    lng: -42.8190,
    speedLimit: 30,
    audioPrompt: 'Lombada à frente. Reduza a velocidade.',
  },
  {
    id: 'hazard-curva-perigosa-serra',
    type: 'sharp_curve',
    title: 'Curva Acentuada Perigosa',
    description: 'Trecho sinuoso em declive RJ-106',
    lat: -22.9340,
    lng: -42.8120,
    audioPrompt: 'Atenção: Curva acentuada perigosa à frente. Mantenha cautela.',
  },
  {
    id: 'hazard-pista-irregular',
    type: 'pothole',
    title: 'Pista Irregular / Buracos',
    description: 'Asfalto com ondulações e buracos na faixa da direita',
    lat: -22.9160,
    lng: -42.8100,
    audioPrompt: 'Atenção motorista: Buraco na pista reportado à frente.',
  },
  {
    id: 'hazard-posto-combustivel',
    type: 'gas_station',
    title: 'Posto Shell GNV / Gasolina / Etanol',
    description: 'Posto com conveniência e calibrador de pneus',
    lat: -22.9240,
    lng: -42.8310,
    audioPrompt: 'Posto de combustível a 400 metros à direita.',
  },
  {
    id: 'hazard-veiculo-parado-rj106',
    type: 'stopped_vehicle',
    title: 'Veículo Parado no Acostamento',
    description: 'Carro no acostamento com pisca-alerta ligado',
    lat: -22.9255,
    lng: -42.8450,
    audioPrompt: 'Atenção: Veículo parado no acostamento à frente.',
  },

  // ─── NITERÓI & PONTE RIO-NITERÓI (BR-101) ───
  {
    id: 'hazard-ponte-radar-80',
    type: 'speed_camera',
    title: 'Radar Fixo 80 km/h - Ponte Rio-Niterói',
    description: 'Vão Central da Ponte Presidente Costa e Silva',
    lat: -22.8715,
    lng: -43.1490,
    speedLimit: 80,
    audioPrompt: 'Atenção: Radar fixo na Ponte Rio-Niterói. Limite de 80 quilômetros por hora.',
  },
  {
    id: 'hazard-policia-prf-ponte',
    type: 'police',
    title: 'Polícia Rodoviária Federal (PRF)',
    description: 'Posto da PRF Pedágio Ponte Rio-Niterói',
    lat: -22.8850,
    lng: -43.1200,
    audioPrompt: 'Atenção: Polícia reportada à frente.',
  },
  {
    id: 'hazard-transito-niteroi-manilha',
    type: 'traffic',
    title: 'Trânsito Lento / Retenção',
    description: 'BR-101 Niterói-Manilha sentido São Gonçalo',
    lat: -22.8550,
    lng: -43.0650,
    audioPrompt: 'Atenção: Trânsito lento reportado à frente.',
  },

  // ─── RIO DE JANEIRO CAPITAL (Linha Amarela, Linha Vermelha, Av. Brasil) ───
  {
    id: 'hazard-radar-linha-amarela-80',
    type: 'speed_camera',
    title: 'Radar Fixo 80 km/h - Linha Amarela',
    description: 'Av. Carlos Lacerda próximo ao Túnel Covanca',
    lat: -22.9250,
    lng: -43.3200,
    speedLimit: 80,
    audioPrompt: 'Atenção: Radar fixo a 300 metros. Limite de 80 quilômetros por hora.',
  },
  {
    id: 'hazard-radar-linha-vermelha-90',
    type: 'speed_camera',
    title: 'Radar Fixo 90 km/h - Linha Vermelha',
    description: 'Via Expressa Presidente João Goulart próximo à Ilha',
    lat: -22.8350,
    lng: -43.2350,
    speedLimit: 90,
    audioPrompt: 'Atenção: Radar fixo à frente. Limite de 90 quilômetros por hora.',
  },
  {
    id: 'hazard-policia-av-brasil',
    type: 'police',
    title: 'Fiscalização Policial (PMERJ / BPVE)',
    description: 'Avenida Brasil altura de Guadalupe',
    lat: -22.8420,
    lng: -43.3750,
    audioPrompt: 'Atenção: Polícia reportada à frente.',
  },
  {
    id: 'hazard-radar-av-brasil-80',
    type: 'speed_camera',
    title: 'Radar Semafórico 80 km/h - Av. Brasil',
    description: 'Avenida Brasil altura de Deodoro',
    lat: -22.8550,
    lng: -43.3950,
    speedLimit: 80,
    audioPrompt: 'Atenção: Radar fixo à frente. Limite de 80 quilômetros por hora.',
  },

  // ─── REGIÃO DOS LAGOS (Saquarema, Araruama, Cabo Frio, Búzios) ───
  {
    id: 'hazard-policia-bprv-saquarema',
    type: 'police',
    title: 'Posto BPRv Bacaxá / Saquarema',
    description: 'RJ-106 entroncamento com RJ-128',
    lat: -22.9050,
    lng: -42.4850,
    audioPrompt: 'Atenção: Polícia reportada à frente.',
  },
  {
    id: 'hazard-radar-vialagos-100',
    type: 'speed_camera',
    title: 'Radar Fixo 100 km/h - ViaLagos (RJ-124)',
    description: 'ViaLagos próximo à praça de pedágio',
    lat: -22.7850,
    lng: -42.3450,
    speedLimit: 100,
    audioPrompt: 'Atenção: Radar fixo a 300 metros. Limite de 100 quilômetros por hora.',
  },
  {
    id: 'hazard-radar-cabo-frio-60',
    type: 'speed_camera',
    title: 'Radar Fixo 60 km/h - Cabo Frio',
    description: 'Av. América Central - Entrada de Cabo Frio',
    lat: -22.8820,
    lng: -42.0450,
    speedLimit: 60,
    audioPrompt: 'Atenção: Radar fixo à frente. Limite 60 quilômetros por hora.',
  },
];

class RoadAlertsEngine {
  private spokenHazardIds: Set<string> = new Set();
  private lastOverspeedAlertTime = 0;
  private isVoiceMuted = false;
  private femaleVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const findBestFemaleVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // Search for female Portuguese (pt-BR) voice
      const ptVoices = voices.filter(
        (v) => v.lang === 'pt-BR' || v.lang === 'pt_BR' || v.lang.startsWith('pt')
      );

      // Prioritize natural female voices: Luciana, Francisca, Maria, Google português, Leticia, Vitória
      const femaleCandidate =
        ptVoices.find((v) =>
          /luciana|francisca|maria|leticia|vitoria|heloisa|camila|fernanda|female|mulher/i.test(v.name)
        ) ||
        ptVoices.find((v) => /google.*brasil/i.test(v.name)) ||
        ptVoices[0] ||
        voices.find((v) => v.lang.startsWith('pt')) ||
        null;

      this.femaleVoice = femaleCandidate;
      this.voicesLoaded = true;
    };

    findBestFemaleVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = findBestFemaleVoice;
    }
  }

  setMuted(muted: boolean) {
    this.isVoiceMuted = muted;
    if (muted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  get isMuted(): boolean {
    return this.isVoiceMuted;
  }

  // Speak with natural female Brazilian Portuguese voice synthesis
  speak(text: string, force = false, playChime = false) {
    if (this.isVoiceMuted && !force) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (playChime) {
      wazeAudio.playHazardChime();
    }

    try {
      // Commented out cancel() to prevent aggressive audio focus theft that stops music on some car systems
      // window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05; // Natural GPS co-pilot speed
      utterance.pitch = 1.06; // Bright feminine tone

      if (!this.femaleVoice) {
        this.initVoices();
      }
      if (this.femaleVoice) {
        utterance.voice = this.femaleVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Erro na síntese de voz:', e);
    }
  }

  // Haversine distance in meters
  computeDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Check nearby hazards within proximity threshold (e.g. 450 meters)
  checkNearbyRoadHazards(
    currentLat: number,
    currentLng: number,
    currentSpeedKmh: number,
    allHazards: RoadHazardAlert[]
  ): {
    nearbyAlerts: (RoadHazardAlert & { distanceMeters: number })[];
    activeVoiceAlert?: string;
    isOverspeeding?: boolean;
  } {
    const nearbyAlerts: (RoadHazardAlert & { distanceMeters: number })[] = [];
    let activeVoiceAlert: string | undefined;
    let isOverspeeding = false;

    for (const h of allHazards) {
      const dist = this.computeDistanceMeters(currentLat, currentLng, h.lat, h.lng);

      if (dist <= 480) {
        nearbyAlerts.push({ ...h, distanceMeters: Math.round(dist) });

        // Trigger voice alert when vehicle is within 380m and hasn't announced this hazard yet
        if (dist <= 380 && !this.spokenHazardIds.has(h.id)) {
          this.spokenHazardIds.add(h.id);
          activeVoiceAlert = h.audioPrompt;
          this.speak(h.audioPrompt, false, true);
        }

        // Overspeed warning near speed camera
        if (
          (h.type === 'speed_camera' || h.type === 'mobile_camera') &&
          h.speedLimit &&
          currentSpeedKmh > h.speedLimit + 4 &&
          dist <= 280
        ) {
          isOverspeeding = true;
          const now = Date.now();
          if (now - this.lastOverspeedAlertTime > 10000) {
            this.lastOverspeedAlertTime = now;
            wazeAudio.playOverspeedAlarm();
            const overspeedMsg = `Atenção: Reduza a velocidade! Limite de ${h.speedLimit} km/h. Sua velocidade é ${Math.round(
              currentSpeedKmh
            )} km/h.`;
            this.speak(overspeedMsg, false, false);
            activeVoiceAlert = overspeedMsg;
          }
        }
      }
    }

    return {
      nearbyAlerts: nearbyAlerts.sort((a, b) => a.distanceMeters - b.distanceMeters),
      activeVoiceAlert,
      isOverspeeding,
    };
  }

  resetSpokenHazards() {
    this.spokenHazardIds.clear();
  }
}

export const roadAlertsEngine = new RoadAlertsEngine();
