import React, { useEffect, useRef, useState } from 'react';

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

  // Sync internal state if external prop changes
  useEffect(() => {
    if (externalSpeedLimit !== undefined && externalSpeedLimit !== speedLimit) {
      setSpeedLimit(externalSpeedLimit);
    }
  }, [externalSpeedLimit, speedLimit]);

  const updateSpeedLimit = (newLimit: number) => {
    const clamped = Math.min(150, Math.max(30, newLimit));
    setSpeedLimit(clamped);
    if (onSpeedLimitChange) {
      onSpeedLimitChange(clamped);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(0);

  // Estimate RPM for Renault Clio 1.0 16V in 5th gear (65 km/h = 2500 RPM)
  const estimatedRpm = speed > 0 ? Math.min(6500, Math.max(850, Math.round((speed / 65) * 2500))) : 0;

  // Determine speed state
  const isEco = speed >= 40 && speed <= (speedLimit - 2);
  const isOverLimit = speed > speedLimit;

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
      className={`relative border rounded-2xl p-3 sm:p-4 text-center overflow-hidden flex flex-col items-center justify-center shadow-xl h-full min-h-[220px] transition-colors duration-300 ${
        isOverLimit
          ? 'bg-[#150a0a] border-red-500/50 shadow-red-950/30'
          : 'bg-[#09090d] border-[#1e1e28]'
      }`}
    >
      <canvas ref={canvasRef} width={260} height={180} className="relative z-10" />
    </div>
  );
};
