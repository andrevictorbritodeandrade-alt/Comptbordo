// Road Alert & Hazard Voice Feedback Engine (Waze-style proactive audio copilot)
import { RoadHazardAlert } from './offlineMapStorage';

// Pre-seeded verified Brazilian road hazards (Radares, Lombadas, Curvas perigosas e Postos)
export const DEFAULT_ROAD_HAZARDS: RoadHazardAlert[] = [
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
    id: 'hazard-lombada-centro',
    type: 'speed_bump',
    title: 'Lombada / Quebra-mola',
    description: 'Rua Ribeiro de Almeida - Centro',
    lat: -22.9198,
    lng: -42.8190,
    speedLimit: 30,
    audioPrompt: 'Lombada à frente. Reduza a velocidade.',
  },
  {
    id: 'hazard-curva-perigosa-serra',
    type: 'sharp_curve',
    title: 'Curva Acentuada Perigosa',
    description: 'Trecho sinuoso em declive',
    lat: -22.9340,
    lng: -42.8120,
    audioPrompt: 'Atenção: Curva acentuada perigosa à direita. Mantenha cautela.',
  },
  {
    id: 'hazard-pista-irregular',
    type: 'pothole',
    title: 'Pista Irregular / Buracos',
    description: 'Asfalto com ondulações e buracos na faixa da direita',
    lat: -22.9160,
    lng: -42.8100,
    audioPrompt: 'Atenção motorista: Trecho com pista irregular e buracos à frente.',
  },
  {
    id: 'hazard-posto-combustivel',
    type: 'gas_station',
    title: 'Posto de Combustível GNV / Gasolina / Etanol',
    description: 'Posto com conveniência e calibrador de pneus',
    lat: -22.9240,
    lng: -42.8310,
    audioPrompt: 'Posto de combustível a 400 metros à direita.',
  },
];

class RoadAlertsEngine {
  private spokenHazardIds: Set<string> = new Set();
  private lastOverspeedAlertTime = 0;
  private isVoiceMuted = false;

  setMuted(muted: boolean) {
    this.isVoiceMuted = muted;
    if (muted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Speak with speech synthesis with optimal Brazilian Portuguese voice parameters
  speak(text: string, force = false) {
    if (this.isVoiceMuted && !force) return;
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.06;
      utterance.pitch = 1.02;
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

  // Check nearby hazards within proximity threshold (e.g., 400 meters)
  checkNearbyRoadHazards(
    currentLat: number,
    currentLng: number,
    currentSpeedKmh: number,
    allHazards: RoadHazardAlert[]
  ): { nearbyAlerts: (RoadHazardAlert & { distanceMeters: number })[]; activeVoiceAlert?: string } {
    const nearbyAlerts: (RoadHazardAlert & { distanceMeters: number })[] = [];
    let activeVoiceAlert: string | undefined;

    for (const h of allHazards) {
      const dist = this.computeDistanceMeters(currentLat, currentLng, h.lat, h.lng);

      if (dist <= 450) {
        nearbyAlerts.push({ ...h, distanceMeters: Math.round(dist) });

        // Trigger voice alert when vehicle is within 350m and hasn't announced this hazard recently
        if (dist <= 350 && !this.spokenHazardIds.has(h.id)) {
          this.spokenHazardIds.add(h.id);
          activeVoiceAlert = h.audioPrompt;
          this.speak(h.audioPrompt);
        }

        // Overspeed warning near speed camera
        if (h.type === 'speed_camera' && h.speedLimit && currentSpeedKmh > h.speedLimit + 5 && dist <= 250) {
          const now = Date.now();
          if (now - this.lastOverspeedAlertTime > 12000) {
            this.lastOverspeedAlertTime = now;
            const overspeedMsg = `Atenção: Reduza! Sua velocidade é ${Math.round(
              currentSpeedKmh
            )} km/h no trecho de ${h.speedLimit} km/h.`;
            this.speak(overspeedMsg);
            activeVoiceAlert = overspeedMsg;
          }
        }
      }
    }

    return {
      nearbyAlerts: nearbyAlerts.sort((a, b) => a.distanceMeters - b.distanceMeters),
      activeVoiceAlert,
    };
  }

  resetSpokenHazards() {
    this.spokenHazardIds.clear();
  }
}

export const roadAlertsEngine = new RoadAlertsEngine();
