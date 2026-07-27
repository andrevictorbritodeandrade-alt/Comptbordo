import React, { useEffect, useRef } from 'react';

interface InstantConsumptionCanvasProps {
  instantConsumption: number;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

export const InstantConsumptionCanvas: React.FC<InstantConsumptionCanvasProps> = ({
  instantConsumption,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Track background
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    drawRoundRect(ctx, 0, 0, width, 8, 2);
    ctx.fill();

    // Fill bar (0 to 20 km/L)
    const fillPercentage = Math.min(1, Math.max(0, instantConsumption / 20));
    const fillWidth = width * fillPercentage;

    if (fillWidth > 0) {
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(0.6, '#c19a6b');
      gradient.addColorStop(1, '#d97706');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      drawRoundRect(ctx, 0, 0, fillWidth, 8, 2);
      ctx.fill();
    }

    // Ticks & labels
    ctx.fillStyle = '#71717a';
    ctx.font = '500 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('0', 0, 24);
    ctx.textAlign = 'center';
    ctx.fillText('5', width * 0.25, 24);
    ctx.fillText('10', width * 0.5, 24);
    ctx.fillText('15', width * 0.75, 24);
    ctx.textAlign = 'right';
    ctx.fillText('20+', width, 24);
  }, [instantConsumption]);

  return <canvas ref={canvasRef} width={300} height={28} className="w-full mt-2" />;
};
