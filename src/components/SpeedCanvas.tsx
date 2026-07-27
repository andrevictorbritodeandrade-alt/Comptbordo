import React, { useEffect, useRef } from 'react';

interface SpeedCanvasProps {
  speed: number;
  textSource: string;
  simulatedSpeed?: number;
  isSimulated?: boolean;
  onSimulatedSpeedChange?: (speed: number) => void;
}

export const SpeedCanvas: React.FC<SpeedCanvasProps> = ({
  speed,
  textSource,
  simulatedSpeed,
  isSimulated,
  onSimulatedSpeedChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(0);

  // Estimate RPM for Renault Clio 1.0 16V in 5th gear (approx 70 km/h = 2500 RPM)
  const estimatedRpm = speed > 0 ? Math.min(6500, Math.max(850, Math.round((speed / 70) * 2500))) : 0;

  // Determine speed state
  const isEco = speed >= 40 && speed <= 78;
  const isOverLimit = speed > 80;

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
      gradient.addColorStop(0, isOverLimit ? 'rgba(239, 68, 68, 0.2)' : isEco ? 'rgba(34, 197, 94, 0.2)' : 'rgba(193, 154, 107, 0.15)');
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

      // Marker line at 80 km/h limit (80 / 160 * 1.5PI)
      const limit80Angle = Math.PI * 0.75 + (80 / 160) * (Math.PI * 1.5);
      const innerX = centerX + Math.cos(limit80Angle) * 70;
      const innerY = centerY + Math.sin(limit80Angle) * 70;
      const outerX = centerX + Math.cos(limit80Angle) * 90;
      const outerY = centerY + Math.sin(limit80Angle) * 90;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();

      // "80" limit text near marker
      ctx.fillStyle = '#ef4444';
      ctx.font = '900 10px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('80', outerX + 10, outerY + 2);

      // Dynamic Speed Arc
      const maxSpeed = 160;
      const speedRatio = Math.min(1, Math.max(0, speed / maxSpeed));
      const endAngle = Math.PI * 0.75 + speedRatio * (Math.PI * 1.5);

      ctx.strokeStyle = speedColor;
      ctx.shadowColor = speedColor;
      ctx.shadowBlur = isOverLimit ? 18 : isEco ? 14 : 8;
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
  }, [speed, isEco, isOverLimit, estimatedRpm]);

  return (
    <div className="relative bg-[#09090d] border border-[#1e1e28] rounded-2xl p-3 sm:p-4 text-center overflow-hidden flex flex-col items-center justify-between shadow-xl h-full min-h-[220px]">
      {/* Top Banner Status Badge */}
      <div className="w-full flex justify-between items-center z-20 px-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
          LIMITE: <strong className="text-red-400">80 KM/H</strong>
        </span>

        {isOverLimit ? (
          <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
            ⚠️ ACIMA DE 80 KM/H!
          </span>
        ) : isEco ? (
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
            🌿 VELOCIDADE ECO (~2500 RPM)
          </span>
        ) : speed > 0 ? (
          <span className="bg-[#c19a6b]/20 text-[#c19a6b] border border-[#c19a6b]/40 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
            ⚙️ MODO CRUZEIRO
          </span>
        ) : (
          <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
            🅿️ VEÍCULO PARADO
          </span>
        )}
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
            <strong className={simulatedSpeed > 80 ? 'text-red-400 font-mono' : simulatedSpeed >= 40 ? 'text-emerald-400 font-mono' : 'text-[#c19a6b] font-mono'}>
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

