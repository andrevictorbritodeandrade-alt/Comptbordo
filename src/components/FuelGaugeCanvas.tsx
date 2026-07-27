import React, { useEffect, useRef } from 'react';

interface FuelGaugeCanvasProps {
  fuelLevel: number; // 0 to 100
  tankCapacity: number; // e.g. 50
  reserveLiters?: number; // e.g. 5.0
}

export const FuelGaugeCanvas: React.FC<FuelGaugeCanvasProps> = ({
  fuelLevel,
  tankCapacity,
  reserveLiters,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const resLiters = reserveLiters ?? tankCapacity * 0.1; // Default 10% of tank capacity
  const currentLitersVal = (tankCapacity * fuelLevel) / 100;
  const isReserve = currentLitersVal <= resLiters;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Center of the arc dial gauge (Renault Clio style)
    const cx = width / 2;
    const cy = 84;
    const radius = 56;

    // Angle range: 135 deg (Empty) to 45 deg (Full)
    const startAngle = (135 * Math.PI) / 180;
    const endAngle = (45 * Math.PI) / 180;
    const totalSweep = Math.PI * 1.5; // 270 degrees sweep

    const currentFrac = Math.min(1, Math.max(0, fuelLevel / 100));
    const currentAngle = startAngle + totalSweep * currentFrac;
    const currentLiters = currentLitersVal.toFixed(1);

    // Reserve fraction of full tank (e.g. 5L / 50L = 0.10)
    const reserveFrac = Math.min(0.35, Math.max(0.05, resLiters / tankCapacity));

    // 1. Dark Gauge Outer Bezel / Housing
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 16, startAngle - 0.12, endAngle + 0.12, false);
    ctx.strokeStyle = isReserve ? '#3b0a0a' : '#1a1a22';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Inner dial background
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 11, 0, Math.PI * 2);
    ctx.fillStyle = isReserve ? '#120505' : '#0a0a0d';
    ctx.fill();
    ctx.strokeStyle = isReserve ? '#450a0a' : '#22222a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Track Background Arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle, false);
    ctx.strokeStyle = '#1e1e26';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 3. Red Reserve Zone Arc (0 to reserveFrac)
    const reserveEndAngle = startAngle + totalSweep * reserveFrac;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, reserveEndAngle, false);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 4. Active Fuel Level Arc
    if (currentFrac > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, currentAngle, false);
      ctx.strokeStyle = isReserve ? '#ef4444' : '#c19a6b';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.shadowColor = isReserve ? '#ef4444' : '#c19a6b';
      ctx.shadowBlur = isReserve ? 14 : 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 5. Renault Clio Style Ticks (tracinhos)
    const tickCount = 16;
    for (let i = 0; i <= tickCount; i++) {
      const frac = i / tickCount;
      const angle = startAngle + totalSweep * frac;

      const isMajor = i % 4 === 0; // 0, 1/4, 1/2, 3/4, 1
      const isMedium = i % 2 === 0;
      const isReserveTick = frac <= reserveFrac;

      const innerR = radius - (isMajor ? 12 : isMedium ? 8 : 5);
      const outerR = radius - 3;

      const x1 = cx + innerR * Math.cos(angle);
      const y1 = cy + innerR * Math.sin(angle);
      const x2 = cx + outerR * Math.cos(angle);
      const y2 = cy + outerR * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = isMajor ? 2.2 : isMedium ? 1.5 : 1.0;
      ctx.strokeStyle = isReserveTick ? '#f87171' : isMajor ? '#f4f4f5' : '#71717a';
      ctx.stroke();

      // Labels on Major Ticks
      if (isMajor) {
        const labelR = radius - 20;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);

        let labelText = '';
        if (i === 0) labelText = 'R';
        else if (i === 4) labelText = '1/4';
        else if (i === 8) labelText = '1/2';
        else if (i === 12) labelText = '3/4';
        else if (i === 16) labelText = '1/1';

        ctx.fillStyle = i === 0 && isReserve ? '#ef4444' : '#ffffff';
        ctx.font = '900 10.5px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, lx, ly);
      }
    }

    // 6. Fuel Pump Icon in the Center
    ctx.save();
    ctx.fillStyle = isReserve ? '#ef4444' : '#a1a1aa';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⛽', cx, cy - 28);
    ctx.restore();

    // 7. Needle Indicator (Renault Clio Orange Pointer, turns Red when in Reserve)
    ctx.save();
    ctx.shadowColor = isReserve ? '#ef4444' : '#f97316';
    ctx.shadowBlur = isReserve ? 10 : 6;

    const needleLength = radius - 2;
    const nx = cx + needleLength * Math.cos(currentAngle);
    const ny = cy + needleLength * Math.sin(currentAngle);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = isReserve ? '#dc2626' : '#f97316';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center Pivot Cap
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#18181b';
    ctx.fill();
    ctx.strokeStyle = isReserve ? '#ef4444' : '#f97316';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = isReserve ? '#ef4444' : '#f97316';
    ctx.fill();

    ctx.restore();

    // 8. Liters and Percentage Digital Display at bottom
    ctx.fillStyle = isReserve ? '#f87171' : '#ffffff';
    ctx.font = '900 20px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${currentLiters} L`, cx, cy + 20);

    ctx.fillStyle = isReserve ? '#ef4444' : '#cbd5e1';
    ctx.font = '800 11px "Outfit", sans-serif';
    if (isReserve) {
      ctx.fillText(`⚠️ RESERVA (≤ ${resLiters.toFixed(1)} L)`, cx, cy + 44);
    } else {
      ctx.fillText(`DE ${tankCapacity} L (${Math.round(fuelLevel)}%)`, cx, cy + 44);
    }

    ctx.restore();
  }, [fuelLevel, tankCapacity, resLiters, currentLitersVal, isReserve]);

  return (
    <div className="flex flex-col items-center justify-center relative">
      <canvas ref={canvasRef} width={220} height={156} className="block" />
    </div>
  );
};
