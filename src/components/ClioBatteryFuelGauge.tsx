import React from 'react';
import { Fuel, AlertTriangle, Sparkles, PlusCircle } from 'lucide-react';

interface ClioBatteryFuelGaugeProps {
  fuelLevel: number; // 0 to 100
  tankCapacity: number; // e.g. 50
  reserveLiters?: number; // e.g. 5
  totalBars?: number; // default 8
  reserveBars?: number; // default 2
  autonomy: number;
  instantConsumption?: number;
  onOpenRefuel?: () => void;
  onOpenClioPrompt?: () => void;
  compact?: boolean;
}

export const ClioBatteryFuelGauge: React.FC<ClioBatteryFuelGaugeProps> = ({
  fuelLevel,
  tankCapacity,
  reserveLiters = 5,
  totalBars = 8,
  reserveBars = 2,
  autonomy,
  instantConsumption = 12.0,
  onOpenRefuel,
  onOpenClioPrompt,
  compact = false,
}) => {
  const currentLitersVal = (tankCapacity * fuelLevel) / 100;
  const isReserve = currentLitersVal <= reserveLiters;

  // Calculate how many bars are currently lit (from 0 to totalBars)
  const litBars = Math.max(0, Math.min(totalBars, Math.round((fuelLevel / 100) * totalBars)));

  // Bars are rendered from top (bar #totalBars = full) down to bottom (bar #1 = empty/reserve)
  const barNumbers = Array.from({ length: totalBars }, (_, i) => totalBars - i);

  return (
    <div
      className={`flex flex-col justify-between h-full w-full rounded-2xl border p-2 sm:p-2.5 transition-colors shadow-xl relative overflow-hidden ${
        isReserve
          ? 'bg-[#150a0a] border-red-500/60 shadow-red-950/40'
          : 'bg-[#09090d] border-[#1e1e28]'
      }`}
    >
      {/* Top Header / Actions */}
      <div className="flex items-center justify-between shrink-0 mb-1">
        <div className="flex items-center gap-1.5">
          <div
            className={`p-1 rounded-lg border flex items-center justify-center ${
              isReserve
                ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
            }`}
          >
            <Fuel size={14} />
          </div>
          <span
            className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${
              isReserve ? 'text-red-400' : 'text-amber-400'
            }`}
          >
            Nível Clio 2010
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onOpenRefuel && (
            <button
              onClick={onOpenRefuel}
              className="py-1 px-2 bg-[#1b1b2a] hover:bg-[#25253b] text-amber-400 border border-amber-500/40 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-transform active:scale-95"
              title="Abastecer Tanque"
            >
              <PlusCircle size={11} /> Abastecer
            </button>
          )}
          {onOpenClioPrompt && (
            <button
              onClick={onOpenClioPrompt}
              className="py-1 px-2 bg-[#14141e] hover:bg-[#1f1f2c] text-[#c19a6b] border border-[#c19a6b]/40 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-transform active:scale-95"
              title="Ajustar Tracinhos do Painel"
            >
              <Sparkles size={11} /> Tracinhos
            </button>
          )}
        </div>
      </div>

      {/* Main Center Area: Vertical Battery / Bar Visor + Stats */}
      <div className="flex-1 min-h-0 flex items-center justify-center gap-2 sm:gap-3 py-1">
        
        {/* Scale labels on the left of battery */}
        <div className="flex flex-col justify-between h-[150px] sm:h-[180px] py-1 text-[9px] sm:text-[10px] font-black font-mono text-zinc-400 select-none text-right">
          <span className="text-amber-300">1/1</span>
          <span className="text-zinc-400">3/4</span>
          <span className="text-zinc-400">1/2</span>
          <span className="text-zinc-400">1/4</span>
          <span className={isReserve ? 'text-red-400 font-black animate-pulse' : 'text-red-400/80'}>
            R ⛽
          </span>
        </div>

        {/* Vertical Battery Housing (Visor Vertical com Barrinhas) */}
        <div
          onClick={onOpenClioPrompt}
          className={`flex flex-col items-center justify-between p-1.5 rounded-xl border-2 w-14 sm:w-16 h-[150px] sm:h-[180px] bg-[#0c0d14] cursor-pointer shadow-inner relative transition-transform hover:scale-[1.02] active:scale-[0.98] ${
            isReserve ? 'border-red-500/70 shadow-red-950/50' : 'border-[#2d2d42] shadow-black/80'
          }`}
          title="Clique para ajustar tracinhos"
        >
          {/* Top Battery Terminal Cap */}
          <div className="w-6 h-1 -mt-2 bg-[#2d2d42] rounded-t-sm border-t border-x border-[#3d3d56]" />

          {/* Bar segments container */}
          <div className="flex flex-col justify-between w-full h-full gap-1 pt-0.5">
            {barNumbers.map((barNum) => {
              const isLit = barNum <= litBars;
              const isReserveBar = barNum <= reserveBars;

              return (
                <div
                  key={barNum}
                  className={`w-full flex-1 rounded-sm transition-all duration-300 border flex items-center justify-center relative ${
                    isLit
                      ? isReserveBar
                        ? 'bg-gradient-to-r from-red-600 to-red-500 border-red-400 text-white shadow-md shadow-red-900/60 animate-pulse'
                        : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 border-amber-300 text-black shadow-md shadow-amber-950/40'
                      : 'bg-[#151520] border-[#222234] text-zinc-700 opacity-60'
                  }`}
                >
                  {/* Subtle bar level indicator text on larger screens */}
                  <span className="text-[7px] font-black font-mono tracking-tighter opacity-70">
                    {barNum}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom subtle reserve label */}
          <div className="w-full text-center text-[7px] font-black uppercase text-zinc-500 mt-0.5">
            {litBars}/{totalBars} BARRAS
          </div>
        </div>

        {/* Right Side: Big Digital Numbers (Liters & Autonomy) */}
        <div className="flex-1 flex flex-col justify-around h-full py-0.5">
          {/* No Tanque */}
          <div className="bg-[#12121c] border border-[#222232] rounded-xl p-1.5 sm:p-2 text-center shadow-inner">
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-emerald-400 block mb-0.5">
              NO TANQUE
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white leading-none tabular-nums flex items-baseline justify-center">
              {currentLitersVal.toFixed(1)}
              <span className="text-xs sm:text-sm text-zinc-400 ml-0.5 font-bold">L</span>
            </div>
            <div className="text-[9px] sm:text-[10px] font-bold text-zinc-400 mt-0.5">
              {fuelLevel.toFixed(0)}% • {litBars} de {totalBars} tracinhos
            </div>
          </div>

          {/* Autonomia */}
          <div className="bg-[#12121c] border border-[#222232] rounded-xl p-1.5 sm:p-2 text-center shadow-inner">
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-[#c19a6b] block mb-0.5">
              AUTONOMIA
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#c19a6b] leading-none tabular-nums flex items-baseline justify-center">
              {autonomy}
              <span className="text-xs sm:text-sm text-zinc-400 ml-0.5 font-bold">KM</span>
            </div>
            <div className="text-[9px] sm:text-[10px] font-bold text-zinc-400 mt-0.5">
              Est. {instantConsumption.toFixed(1)} KM/L
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Ribbon */}
      <div className="shrink-0 mt-0.5">
        {isReserve ? (
          <div className="bg-red-500/20 border border-red-500/60 rounded-xl py-1 px-2 flex items-center justify-center gap-1.5 text-red-400 animate-pulse text-[10px] font-black uppercase tracking-wider">
            <AlertTriangle size={12} />
            <span>ALERTA: RESERVA DE COMBUSTÍVEL (≤ {reserveLiters}L)</span>
          </div>
        ) : (
          <div className="bg-[#12121c] border border-[#222232] rounded-xl py-0.5 px-2 flex items-center justify-between text-zinc-400 text-[9px] font-bold">
            <span>Tanque: {tankCapacity}L Máx</span>
            <span className="text-amber-400 font-extrabold">{litBars} tracinhos acesos</span>
            <span>Reserva: ≤ {reserveLiters}L</span>
          </div>
        )}
      </div>
    </div>
  );
};
