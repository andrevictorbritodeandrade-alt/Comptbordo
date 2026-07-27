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

      const gradient = ctx.createRadialGradient(0, 0, 20, 0, 0, 110);
      gradient.addColorStop(0, 'rgba(193, 154, 107, 0.12)');
      gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.05)');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 140, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Circular gauge ring outline
      ctx.save();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 82, Math.PI * 0.75, Math.PI * 2.25);
      ctx.stroke();

      // Dynamic Speed Arc
      const maxSpeed = 160;
      const speedRatio = Math.min(1, Math.max(0, speed / maxSpeed));
      const endAngle = Math.PI * 0.75 + speedRatio * (Math.PI * 1.5);

      const speedColor = speed > 110 ? '#ef4444' : speed > 70 ? '#d97706' : '#c19a6b';

      ctx.strokeStyle = speedColor;
      ctx.shadowColor = speedColor;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 82, Math.PI * 0.75, endAngle);
      ctx.stroke();
      ctx.restore();

      // Display Speed Text
      ctx.save();
      ctx.fillStyle = speedColor;
      ctx.font = '900 82px "Outfit", "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(speed).toString(), centerX, centerY - 6);

      // Speed Unit
      ctx.fillStyle = '#c19a6b';
      ctx.font = '800 14px "Outfit", sans-serif';
      ctx.fillText('KM/H', centerX, centerY + 38);

      // Label
      ctx.fillStyle = '#71717a';
      ctx.font = '700 10px "Outfit", sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('VELOCIDADE ATUAL', centerX, centerY + 62);
      ctx.restore();

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [speed]);

  return (
    <div className="relative bg-[#080808] border border-[#1a1a1a] rounded-2xl p-4 sm:p-5 text-center overflow-hidden flex flex-col items-center justify-center shadow-xl h-full min-h-[220px]">
      <canvas ref={canvasRef} width={260} height={200} className="relative z-10" />
      <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-extrabold mt-0.5 flex items-center justify-center gap-1.5">
        {textSource}
      </div>

      {isSimulated && onSimulatedSpeedChange && typeof simulatedSpeed === 'number' && (
        <div className="w-full max-w-xs mt-4 pt-3 border-t border-[#1a1a1a] flex flex-col items-center gap-2 z-20">
          <div className="flex justify-between w-full text-[10px] uppercase tracking-wider text-zinc-400">
            <span>Pedal de Aceleração (Simulador):</span>
            <strong className="text-[#c19a6b] font-mono">{Math.round(simulatedSpeed)} km/h</strong>
          </div>
          <input
            type="range"
            min="0"
            max="150"
            value={simulatedSpeed}
            onChange={(e) => onSimulatedSpeedChange(Number(e.target.value))}
            className="w-full cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
