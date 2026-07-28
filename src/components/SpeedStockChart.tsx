import React, { useEffect, useRef, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart2, LineChart, ShieldAlert, Clock, AlertTriangle, ArrowDown } from 'lucide-react';

interface SpeedStockChartProps {
  speedSamples: number[];
  currentSpeed: number;
  avgSpeed: number;
  speedLimit?: number;
}

interface SpeedEvent {
  id: string;
  timestamp: Date;
  type: 'limit' | 'low' | 'summary';
  message: string;
  speedInfo: string;
}

export const SpeedStockChart: React.FC<SpeedStockChartProps> = ({
  speedSamples,
  currentSpeed,
  avgSpeed,
  speedLimit = 80,
}) => {
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Maintain a live sliding buffer of up to 60 samples if trip samples are few
  const [liveHistory, setLiveHistory] = useState<number[]>([]);
  
  // Event tracking
  const [events, setEvents] = useState<SpeedEvent[]>([]);
  const summaryStartTimeRef = useRef<number>(Date.now());
  const summaryDataRef = useRef<{ min: number; max: number; sum: number; count: number }>({ min: 999, max: 0, sum: 0, count: 0 });
  const isOverLimitRef = useRef<boolean>(false);
  const isLowSpeedRef = useRef<boolean>(false);

  useEffect(() => {
    setLiveHistory((prev) => {
      const updated = [...prev, currentSpeed];
      if (updated.length > 60) updated.shift();
      return updated;
    });

    // Event Logging Logic
    const now = Date.now();
    const s = summaryDataRef.current;
    
    // Update summary data (ignore 0 if you want, but for avg it's fine)
    s.min = Math.min(s.min, currentSpeed);
    s.max = Math.max(s.max, currentSpeed);
    s.sum += currentSpeed;
    s.count += 1;

    // 15 min interval check (900000 ms)
    // For testing purposes, if you want it faster, you'd change this, but the user asked for 15 min.
    if (now - summaryStartTimeRef.current >= 900000) {
      const avg = s.count > 0 ? Math.round(s.sum / s.count) : 0;
      const minVal = s.min === 999 ? 0 : Math.round(s.min);
      const newEvent: SpeedEvent = {
        id: Math.random().toString(),
        timestamp: new Date(),
        type: 'summary',
        message: 'Resumo 15 min',
        speedInfo: `MÁX ${Math.round(s.max)} | MÍN ${minVal} | MÉD ${avg}`,
      };
      setEvents((prev) => [newEvent, ...prev].slice(0, 30));
      
      // Reset
      summaryStartTimeRef.current = now;
      summaryDataRef.current = { min: 999, max: 0, sum: 0, count: 0 };
    }

    // Over limit trigger
    if (currentSpeed > speedLimit && !isOverLimitRef.current) {
      isOverLimitRef.current = true;
      const newEvent: SpeedEvent = {
        id: Math.random().toString(),
        timestamp: new Date(),
        type: 'limit',
        message: 'Limite Excedido',
        speedInfo: `${Math.round(currentSpeed)} km/h`,
      };
      setEvents((prev) => [newEvent, ...prev].slice(0, 30));
    } else if (currentSpeed <= speedLimit - 5) {
      isOverLimitRef.current = false; // reset with hysteresis
    }

    // Low speed trigger (< 20 km/h), avoid spamming when stopped by only triggering once when dropping below 20
    if (currentSpeed > 0 && currentSpeed <= 20 && !isLowSpeedRef.current) {
      isLowSpeedRef.current = true;
      const newEvent: SpeedEvent = {
        id: Math.random().toString(),
        timestamp: new Date(),
        type: 'low',
        message: 'Velocidade Baixa',
        speedInfo: `${Math.round(currentSpeed)} km/h`,
      };
      setEvents((prev) => [newEvent, ...prev].slice(0, 30));
    } else if (currentSpeed >= 25) {
      isLowSpeedRef.current = false; // reset when speed picks up
    }

  }, [currentSpeed, speedLimit]);

  // Combined dataset for analysis (prefer trip samples if available, fallback to live sliding history)
  const activeSamples = useMemo(() => {
    if (speedSamples && speedSamples.length >= 3) return speedSamples;
    if (liveHistory.length >= 2) return liveHistory;
    return [0, currentSpeed];
  }, [speedSamples, liveHistory, currentSpeed]);

  // Compute stock-style statistical metrics (Min, Max, Avg, Open, Close, Trend)
  const metrics = useMemo(() => {
    const valid = activeSamples.length > 0 ? activeSamples : [0];
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const open = valid[0] || 0;
    const close = currentSpeed;
    const computedAvg = avgSpeed > 0 ? avgSpeed : valid.reduce((a, b) => a + b, 0) / valid.length;
    const diff = close - open;
    const percentChange = open > 0 ? ((diff / open) * 100).toFixed(1) : '0.0';

    return {
      min: Math.round(min),
      max: Math.round(max),
      avg: Math.round(computedAvg * 10) / 10,
      open: Math.round(open),
      close: Math.round(close),
      diff: Math.round(diff),
      percentChange,
    };
  }, [activeSamples, currentSpeed, avgSpeed]);

  // Group samples into Candle OHLC blocks (5 samples per candle)
  const candles = useMemo(() => {
    const blockSize = 4;
    const result: { open: number; high: number; low: number; close: number }[] = [];
    for (let i = 0; i < activeSamples.length; i += blockSize) {
      const chunk = activeSamples.slice(i, i + blockSize);
      if (chunk.length === 0) continue;
      const open = chunk[0];
      const close = chunk[chunk.length - 1];
      const high = Math.max(...chunk);
      const low = Math.min(...chunk);
      result.push({ open, high, low, close });
    }
    return result;
  }, [activeSamples]);

  // Render HTML5 Canvas Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#08080e';
    ctx.fillRect(0, 0, width, height);

    // Padding for labels
    const padding = { top: 25, right: 55, bottom: 25, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Y Scale: 0 to Math.max(120, maxSpeed + 20)
    const maxY = Math.max(100, metrics.max + 20, speedLimit + 10);
    const minY = 0;

    const getY = (val: number) => {
      const ratio = (val - minY) / (maxY - minY);
      return padding.top + chartH * (1 - ratio);
    };

    // Grid lines (horizontal speed thresholds: 20, 40, 60, 80, 100)
    ctx.strokeStyle = '#181824';
    ctx.lineWidth = 1;
    ctx.font = '900 9px "Outfit", sans-serif';
    ctx.fillStyle = '#52525b';
    ctx.textAlign = 'left';

    [20, 40, 60, 80, 100].forEach((level) => {
      if (level <= maxY) {
        const y = getY(level);
        ctx.beginPath();
        ctx.setLineDash([2, 4]);
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartW, y);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillText(`${level}`, padding.left + chartW + 6, y + 3);
      }
    });

    // Draw Dotted Horizontal Line for Speed Limit (80 km/h)
    const limitY = getY(speedLimit);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, limitY);
    ctx.lineTo(padding.left + chartW, limitY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Limit Tag on Right
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(padding.left + chartW + 2, limitY - 7, 45, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LIM: ${speedLimit}`, padding.left + chartW + 24, limitY + 3);

    // Draw Average Speed Reference Line (Amber)
    if (metrics.avg > 0) {
      const avgY = getY(metrics.avg);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, avgY);
      ctx.lineTo(padding.left + chartW, avgY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '800 8px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`MÉD ${metrics.avg}`, padding.left + chartW + 6, avgY + 3);
    }

    // Draw Max Speed Reference Line (Red/Orange)
    if (metrics.max > 0) {
      const maxYPos = getY(metrics.max);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(padding.left, maxYPos);
      ctx.lineTo(padding.left + chartW, maxYPos);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f87171';
      ctx.font = '800 8px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`MÁX ${metrics.max}`, padding.left + chartW + 6, maxYPos + 3);
    }

    // DRAW CHART BASED ON TYPE
    if (chartType === 'line') {
      const samples = activeSamples;
      if (samples.length >= 2) {
        const stepX = chartW / (samples.length - 1);

        // Path for gradient fill under the line
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartH);

        samples.forEach((val, i) => {
          const x = padding.left + i * stepX;
          const y = getY(val);
          ctx.lineTo(x, y);
        });

        ctx.lineTo(padding.left + (samples.length - 1) * stepX, padding.top + chartH);
        ctx.closePath();

        const lineGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        lineGradient.addColorStop(
          0,
          currentSpeed > speedLimit
            ? 'rgba(239, 68, 68, 0.35)'
            : 'rgba(34, 197, 94, 0.3)'
        );
        lineGradient.addColorStop(1, 'rgba(8, 8, 14, 0.0)');
        ctx.fillStyle = lineGradient;
        ctx.fill();

        // Main Stroke Line
        ctx.beginPath();
        samples.forEach((val, i) => {
          const x = padding.left + i * stepX;
          const y = getY(val);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        const strokeColor =
          currentSpeed > speedLimit
            ? '#ef4444'
            : currentSpeed >= 40 && currentSpeed <= (speedLimit - 2)
            ? '#22c55e'
            : '#c19a6b';

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Current Pulsing Point
        const lastX = padding.left + (samples.length - 1) * stepX;
        const lastY = getY(currentSpeed);

        ctx.beginPath();
        ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    } else {
      // CANDLESTICK MODE (Bolsa de Valores OHLC)
      if (candles.length > 0) {
        const candleWidth = Math.max(4, Math.min(12, (chartW / candles.length) * 0.6));
        const stepX = chartW / candles.length;

        candles.forEach((c, i) => {
          const x = padding.left + i * stepX + stepX / 2;
          const yOpen = getY(c.open);
          const yClose = getY(c.close);
          const yHigh = getY(c.high);
          const yLow = getY(c.low);

          const isBullish = c.close >= c.open;
          const candleColor = isBullish ? '#22c55e' : '#ef4444';

          // Wick line (High to Low)
          ctx.strokeStyle = candleColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, yHigh);
          ctx.lineTo(x, yLow);
          ctx.stroke();

          // Body box (Open to Close)
          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

          ctx.fillStyle = candleColor;
          ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
        });
      }
    }
  }, [activeSamples, candles, currentSpeed, speedLimit, metrics, chartType]);

  const getEventIcon = (type: SpeedEvent['type']) => {
    switch (type) {
      case 'limit': return <AlertTriangle size={14} className="text-red-400" />;
      case 'low': return <ArrowDown size={14} className="text-sky-400" />;
      case 'summary': return <Clock size={14} className="text-amber-400" />;
    }
  };

  return (
    <div className="bg-[#0b0b12] border border-[#1e1e2d] rounded-2xl p-3 sm:p-4 text-white shadow-xl flex flex-col justify-between gap-2.5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1a1a28] pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#181826] border border-[#2a2a3e] rounded-lg text-[#c19a6b]">
            <Activity size={16} className="animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
              <span>B3 SPEED TICKER</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">
              Histórico & Ocorrências (A cada 15 min / Limites)
            </p>
          </div>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex bg-[#12121e] p-1 rounded-xl border border-[#222234]">
          <button
            onClick={() => setChartType('line')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
              chartType === 'line'
                ? 'bg-[#c19a6b] text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LineChart size={12} /> Linhas
          </button>
          <button
            onClick={() => setChartType('candlestick')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
              chartType === 'candlestick'
                ? 'bg-[#c19a6b] text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart2 size={12} /> Velas (Candles)
          </button>
        </div>
      </div>

      {/* Stock Ticker KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-[#12121e] border border-[#1f1f30] p-2 rounded-xl text-center">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-sky-400 block">
            🔵 MÍNIMA (MÍN)
          </span>
          <div className="text-base sm:text-lg font-black text-white mt-0.5 font-mono">
            {metrics.min} <span className="text-[10px] text-zinc-400">KM/H</span>
          </div>
        </div>

        <div className="bg-[#12121e] border border-[#1f1f30] p-2 rounded-xl text-center">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-400 block">
            🟡 MÉDIA (MÉD)
          </span>
          <div className="text-base sm:text-lg font-black text-amber-300 mt-0.5 font-mono">
            {metrics.avg} <span className="text-[10px] text-zinc-400">KM/H</span>
          </div>
        </div>

        <div className="bg-[#12121e] border border-[#1f1f30] p-2 rounded-xl text-center">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-red-400 block">
            🔴 MÁXIMA (MÁX)
          </span>
          <div className="text-base sm:text-lg font-black text-red-400 mt-0.5 font-mono">
            {metrics.max} <span className="text-[10px] text-zinc-400">KM/H</span>
          </div>
        </div>

        <div className="bg-[#12121e] border border-[#1f1f30] p-2 rounded-xl text-center">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 block flex items-center justify-center gap-1">
            {metrics.diff >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            TENDÊNCIA
          </span>
          <div
            className={`text-base sm:text-lg font-black mt-0.5 font-mono ${
              metrics.diff >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {metrics.diff >= 0 ? `+${metrics.diff}` : `${metrics.diff}`}{' '}
            <span className="text-[10px] text-zinc-400">KM/H</span>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full overflow-hidden bg-[#07070b] border border-[#181824] rounded-xl p-1 flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={420}
          height={160}
          className="w-full h-[150px] sm:h-[160px] object-contain"
        />
      </div>

      {/* Footer Info & Events Table */}
      <div className="flex flex-col gap-2 mt-1">
        <div className="flex justify-between items-center text-[10px] text-zinc-400 px-1 font-semibold">
          <span className="flex items-center gap-1">
            <ShieldAlert size={11} className="text-red-400" /> Limite de Alerta: {speedLimit} KM/H
          </span>
          <span className="font-mono text-zinc-300">
            Abertura: {metrics.open} km/h | Atual: {metrics.close} km/h
          </span>
        </div>
        
        {/* Events Table Container */}
        <div className="bg-[#12121e] border border-[#1f1f30] rounded-xl overflow-hidden flex flex-col max-h-[140px]">
          <div className="bg-[#1a1a28] px-3 py-1.5 text-[10px] font-black uppercase text-zinc-300 border-b border-[#2a2a3e] flex items-center justify-between">
            <span>Tabela de Ocorrências</span>
            <span className="text-zinc-500">{events.length > 0 ? `${events.length} Registros` : 'Aguardando...'}</span>
          </div>
          <div className="overflow-y-auto custom-scrollbar p-1">
            {events.length === 0 ? (
              <div className="text-center text-zinc-500 text-xs py-4 font-medium italic">
                Nenhuma ocorrência registrada nesta viagem.
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-center gap-2 p-2 bg-[#0b0b12] border border-[#1e1e2d] rounded-lg">
                    <div className="shrink-0 w-10 text-[9px] font-mono text-zinc-500 font-bold">
                      {ev.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div className="shrink-0 p-1 bg-[#1a1a28] rounded">
                      {getEventIcon(ev.type)}
                    </div>
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <span className={`text-[11px] font-black uppercase leading-tight truncate ${
                        ev.type === 'limit' ? 'text-red-400' : ev.type === 'summary' ? 'text-amber-400' : 'text-sky-400'
                      }`}>
                        {ev.message}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-300 truncate">
                        {ev.speedInfo}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
