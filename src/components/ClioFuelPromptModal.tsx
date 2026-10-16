import React, { useState } from 'react';
import { Fuel, Check, Gauge } from 'lucide-react';
import { CarConfig } from '../types';

interface ClioFuelPromptModalProps {
  carConfig: CarConfig;
  onUpdateFuel: (newFuelLevel: number) => void;
  onClose: () => void;
}

export const ClioFuelPromptModal: React.FC<ClioFuelPromptModalProps> = ({
  carConfig,
  onUpdateFuel,
  onClose,
}) => {
  // Configuration for Clio fuel gauge
  const [totalBars, setTotalBars] = useState<number>(() => {
    return Number(localStorage.getItem('clio_total_bars')) || 8;
  });
  const [fullBarIndex, setFullBarIndex] = useState<number>(() => {
    return Number(localStorage.getItem('clio_full_bar')) || 8;
  });
  const [reserveBarIndex, setReserveBarIndex] = useState<number>(() => {
    return Number(localStorage.getItem('clio_reserve_bar')) || 2;
  });
  const [currentLitBars, setCurrentLitBars] = useState<number>(() => {
    // Estimate initial lit bars based on current fuel level
    const currentBars = Math.round((carConfig.fuelLevel / 100) * 8);
    return Math.max(0, Math.min(8, currentBars));
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Save settings
    localStorage.setItem('clio_total_bars', totalBars.toString());
    localStorage.setItem('clio_full_bar', fullBarIndex.toString());
    localStorage.setItem('clio_reserve_bar', reserveBarIndex.toString());

    // Calculate percentage based on current lit bars relative to full bar
    let calculatedPercentage = (currentLitBars / fullBarIndex) * 100;
    calculatedPercentage = Math.max(0, Math.min(100, calculatedPercentage));

    onUpdateFuel(calculatedPercentage);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0e0e15] border border-amber-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#222234] mb-5">
          <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-amber-400">
            <Fuel size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-wider text-white">Nível de Combustível do Clio</h3>
            <p className="text-xs text-zinc-400 font-medium">
              Verificação rápida ao abrir o painel
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Current Bars Selection */}
          <div className="bg-[#141420] border border-[#222234] p-4 rounded-2xl text-center">
            <label className="block text-xs font-black uppercase tracking-wider text-amber-400 mb-2">
              Quantos tracinhos estão acesos agora?
            </label>
            <div className="text-4xl font-black font-mono text-white mb-3">
              {currentLitBars} <span className="text-sm font-bold text-zinc-500">/ {totalBars}</span>
            </div>

            {/* Visual Bar Selector */}
            <div className="flex gap-1.5 justify-center mb-3">
              {Array.from({ length: totalBars }).map((_, idx) => {
                const barNum = idx + 1;
                const isLit = barNum <= currentLitBars;
                const isReserve = barNum <= reserveBarIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentLitBars(barNum)}
                    className={`flex-1 h-9 rounded-lg border font-mono font-black text-xs transition-all flex items-center justify-center ${
                      isLit
                        ? isReserve
                          ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-950/50 animate-pulse'
                          : 'bg-amber-500 border-amber-300 text-black shadow-lg shadow-amber-950/50'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                    }`}
                  >
                    {barNum}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase px-1">
              <span className="text-red-400">Reserva (Tracinho {reserveBarIndex})</span>
              <span className="text-amber-400">Cheio (Tracinho {fullBarIndex})</span>
            </div>
          </div>

          {/* Advanced Gauge Calibration Settings (Collapsible / Summary) */}
          <div className="bg-[#12121c] border border-[#222232] p-3.5 rounded-2xl space-y-3">
            <div className="text-[11px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Gauge size={14} className="text-[#c19a6b]" /> Configuração do Marcador do Clio
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] font-black uppercase text-zinc-500 mb-1">Total Tracinhos</label>
                <input
                  type="number"
                  min="4"
                  max="12"
                  value={totalBars}
                  onChange={(e) => setTotalBars(Number(e.target.value))}
                  className="w-full bg-[#181824] border border-[#2a2a3c] rounded-xl py-1.5 px-2 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-zinc-500 mb-1">Tracinho Cheio</label>
                <input
                  type="number"
                  min="2"
                  max={totalBars}
                  value={fullBarIndex}
                  onChange={(e) => setFullBarIndex(Number(e.target.value))}
                  className="w-full bg-[#181824] border border-[#2a2a3c] rounded-xl py-1.5 px-2 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-zinc-500 mb-1">Início Reserva</label>
                <input
                  type="number"
                  min="1"
                  max={fullBarIndex - 1}
                  value={reserveBarIndex}
                  onChange={(e) => setReserveBarIndex(Number(e.target.value))}
                  className="w-full bg-[#181824] border border-[#2a2a3c] rounded-xl py-1.5 px-2 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-xl shadow-amber-950/30flex items-center justify-center gap-2 transition-all active:scale-95 border border-amber-300"
          >
            <Check size={18} /> Confirmar Nível do Tanque ({((currentLitBars / fullBarIndex) * 100).toFixed(0)}%)
          </button>
        </form>
      </div>
    </div>
  );
};
