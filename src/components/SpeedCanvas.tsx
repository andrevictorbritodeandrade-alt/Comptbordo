import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Plus, Minus, AlertTriangle, ShieldAlert } from 'lucide-react';

interface SpeedCanvasProps {
  speed: number;
  textSource: string;
  simulatedSpeed?: number;
  isSimulated?: boolean;
  onSimulatedSpeedChange?: (speed: number) => void;
  speedLimit?: number;
  onSpeedLimitChange?: (limit: number) => void;
}

export const SpeedCanvas: React.FC<SpeedCanvasProps> = ({
  speed,
  textSource,
  simulatedSpeed,
  isSimulated,
  onSimulatedSpeedChange,
  speedLimit: externalSpeedLimit,
  onSpeedLimitChange,
}) => {
  const [speedLimit, setSpeedLimit] = useState<number>(externalSpeedLimit ?? 80);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Sync internal state if external prop changes
  useEffect(() => {
    if (externalSpeedLimit !== undefined && externalSpeedLimit !== speedLimit) {
      setSpeedLimit(externalSpeedLimit);
    }
  }, [externalSpeedLimit]);

  const updateSpeedLimit = (newLimit: number) => {
    const clamped = Math.min(150, Math.max(30, newLimit));
    setSpeedLimit(clamped);
    if (onSpeedLimitChange) {
      onSpeedLimitChange(clamped);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Estimate RPM for Renault Clio 1.0 16V in 5th gear (approx 70 km/h = 2500 RPM)
  const estimatedRpm = speed > 0 ? Math.min(6500, Math.max(850, Math.round((speed / 70) * 2500))) : 0;

  // Determine speed state
  const isEco = speed >= 40 && speed <= (speedLimit - 2);
  const isOverLimit = speed > speedLimit;

  // Web Audio warning beep function
  const playWarningBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Tone 1: Alert Beep (880 Hz - High pitch alert)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Tone 2: Alert Siren Pulse (1046.5 Hz - High C)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(1046.5, now + 0.16);
      gain2.gain.setValueAtTime(0.22, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn('Erro na síntese de áudio do alerta de velocidade:', e);
    }
  }, [soundEnabled]);

  // Trigger sound alarm when over limit
  useEffect(() => {
    if (isOverLimit && soundEnabled) {
      playWarningBeep();
      const interval = setInterval(() => {
        playWarningBeep();
      }, 1100);
      return () => clearInterval(interval);
    }
  }, [isOverLimit, soundEnabled, playWarningBeep]);

  // Render speedometer canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Rotating radial background effect
      rotationRef.current += 0.006;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRef.current);

      const speedColor = isOverLimit ? '#ef4444' : isEco ? '#22c55e' : '#c19a6b';

      const gradient = ctx.createRadialGradient(0, 0, 20, 0, 0, 110);
      gradient.addColorStop(
        0,
        isOverLimit
          ? 'rgba(239, 68, 68, 0.25)'
          : isEco
          ? 'rgba(34, 197, 94, 0.2)'
          : 'rgba(193, 154, 107, 0.15)'
      );
      gradient.addColorStop(0.6, 'rgba(10, 10, 15, 0.05)');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 140, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Circular gauge ring outline
      ctx.save();
      ctx.strokeStyle = '#1a1a24';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 80, Math.PI * 0.75, Math.PI * 2.25);
      ctx.stroke();

      // Marker line at configured speedLimit (e.g. 80 km/h)
      const maxSpeed = 160;
      const limitRatio = Math.min(1, Math.max(0, speedLimit / maxSpeed));
      const limitAngle = Math.PI * 0.75 + limitRatio * (Math.PI * 1.5);
      const innerX = centerX + Math.cos(limitAngle) * 70;
      const innerY = centerY + Math.sin(limitAngle) * 70;
      const outerX = centerX + Math.cos(limitAngle) * 90;
      const outerY = centerY + Math.sin(limitAngle) * 90;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();

      // Limit speed number text near tick mark
      ctx.fillStyle = '#ef4444';
      ctx.font = '900 10px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      const textOffsetX = Math.cos(limitAngle) * 12;
      const textOffsetY = Math.sin(limitAngle) * 12;
      ctx.fillText(speedLimit.toString(), outerX + textOffsetX, outerY + textOffsetY + 3);

      // Dynamic Speed Arc
      const speedRatio = Math.min(1, Math.max(0, speed / maxSpeed));
      const endAngle = Math.PI * 0.75 + speedRatio * (Math.PI * 1.5);

      ctx.strokeStyle = speedColor;
      ctx.shadowColor = speedColor;
      ctx.shadowBlur = isOverLimit ? 20 : isEco ? 14 : 8;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 80, Math.PI * 0.75, endAngle);
      ctx.stroke();
      ctx.restore();

      // Display Speed Text
      ctx.save();
      ctx.fillStyle = speedColor;
      ctx.font = '900 76px "Outfit", "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(speed).toString(), centerX, centerY - 10);

      // Speed Unit
      ctx.fillStyle = speedColor;
      ctx.font = '800 13px "Outfit", sans-serif';
      ctx.fillText('KM/H', centerX, centerY + 32);

      // RPM Display
      if (speed > 0) {
        ctx.fillStyle = isOverLimit ? '#f87171' : isEco ? '#4ade80' : '#a1a1aa';
        ctx.font = '800 11px "Outfit", sans-serif';
        ctx.fillText(`~${estimatedRpm} RPM`, centerX, centerY + 50);
      } else {
        ctx.fillStyle = '#71717a';
        ctx.font = '700 10px "Outfit", sans-serif';
        ctx.fillText('0 RPM (PARADO)', centerX, centerY + 50);
      }

      ctx.restore();

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [speed, speedLimit, isEco, isOverLimit, estimatedRpm]);

  return (
    <div
      className={`relative border rounded-2xl p-3 sm:p-4 text-center overflow-hidden flex flex-col items-center justify-between shadow-xl h-full min-h-[220px] transition-colors duration-300 ${
        isOverLimit
          ? 'bg-[#150a0a] border-red-500/50 shadow-red-950/30'
          : 'bg-[#09090d] border-[#1e1e28]'
      }`}
    >
      {/* Top Banner Status & Speed Limit Control Bar */}
      <div className="w-full flex justify-between items-center z-20 gap-1">
        {/* Configurable Speed Limit Badge */}
        <div className="flex items-center gap-1 bg-[#12121c] border border-[#222232] rounded-lg px-2 py-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <ShieldAlert size={12} className="text-red-400" />
            <span className="hidden sm:inline">LIMITE:</span>
            <strong className="text-red-400">{speedLimit} KM/H</strong>
          </span>

          <div className="flex items-center gap-0.5 ml-1 border-l border-zinc-700/50 pl-1">
            <button
              onClick={() => updateSpeedLimit(speedLimit - 5)}
              className="p-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition-colors"
              title="Diminuir limite (-5 km/h)"
            >
              <Minus size={12} />
            </button>
            <button
              onClick={() => updateSpeedLimit(speedLimit + 5)}
              className="p-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition-colors"
              title="Aumentar limite (+5 km/h)"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        {/* Sound Toggle & Status Alert Badge */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const nextState = !soundEnabled;
              setSoundEnabled(nextState);
              if (nextState) {
                playWarningBeep(); // Test sound on enable
              }
            }}
            className={`p-1.5 rounded-lg border text-xs font-black flex items-center gap-1 transition-all ${
              soundEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
            }`}
            title={soundEnabled ? 'Alerta Sonoro Ativado (Clique para Silenciar)' : 'Alerta Sonoro Mudo (Clique para Ativar)'}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span className="text-[9px] uppercase font-bold hidden sm:inline">
              {soundEnabled ? 'SOM ON' : 'MUTO'}
            </span>
          </button>

          {isOverLimit ? (
            <span className="bg-red-500/20 text-red-400 border border-red-500/60 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-md shadow-red-950/50">
              <AlertTriangle size={12} className="animate-bounce" />
              <span>EXCESSO DE VELOCIDADE!</span>
            </span>
          ) : isEco ? (
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
              🌿 VELOCIDADE ECO
            </span>
          ) : speed > 0 ? (
            <span className="bg-[#c19a6b]/20 text-[#c19a6b] border border-[#c19a6b]/40 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
              ⚙️ CRUZEIRO
            </span>
          ) : (
            <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
              PARADO
            </span>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} width={260} height={180} className="relative z-10" />

      {/* GPS Source Indicator */}
      <div className="text-[10px] text-zinc-400 uppercase tracking-[0.15em] font-extrabold flex items-center justify-center gap-1.5 z-20">
        {textSource}
      </div>

      {isSimulated && onSimulatedSpeedChange && typeof simulatedSpeed === 'number' && (
        <div className="w-full max-w-xs mt-2 pt-2 border-t border-[#1e1e28] flex flex-col items-center gap-1.5 z-20">
          <div className="flex justify-between w-full text-[10px] uppercase tracking-wider text-zinc-400">
            <span>Acelerador Simulador:</span>
            <strong
              className={
                simulatedSpeed > speedLimit
                  ? 'text-red-400 font-mono font-bold'
                  : simulatedSpeed >= 40
                  ? 'text-emerald-400 font-mono font-bold'
                  : 'text-[#c19a6b] font-mono font-bold'
              }
            >
              {Math.round(simulatedSpeed)} km/h
            </strong>
          </div>
          <input
            type="range"
            min="0"
            max="150"
            value={simulatedSpeed}
            onChange={(e) => onSimulatedSpeedChange(Number(e.target.value))}
            className="w-full cursor-pointer accent-[#c19a6b]"
          />
        </div>
      )}
    </div>
  );
};


