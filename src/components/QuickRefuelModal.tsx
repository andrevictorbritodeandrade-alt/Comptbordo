import React, { useState } from 'react';
import { Fuel, Check, X, Sparkles, PlusCircle } from 'lucide-react';
import { CarConfig } from '../types';

interface QuickRefuelModalProps {
  carConfig: CarConfig;
  onRefuel: (additionalLiters: number, fullTank?: boolean) => void;
  onClose: () => void;
}

export const QuickRefuelModal: React.FC<QuickRefuelModalProps> = ({
  carConfig,
  onRefuel,
  onClose,
}) => {
  const isGasoline = carConfig.currentFuel === 'gasoline';
  // Default estimated fuel prices in Brazil (R$)
  const [gasPrice, setGasPrice] = useState(5.89);
  const [ethanolPrice, setEthanolPrice] = useState(3.89);
  const currentPrice = isGasoline ? gasPrice : ethanolPrice;

  const [customAmountR$, setCustomAmountR$] = useState('');
  const [customLiters, setCustomLiters] = useState('');

  const currentLiters = (carConfig.tankCapacity * carConfig.fuelLevel) / 100;
  const maxLitersNeeded = carConfig.tankCapacity - currentLiters;

  const handleRefuelAmountR$ = (amountR$: number) => {
    const litersToAdd = amountR$ / currentPrice;
    onRefuel(litersToAdd);
  };

  const handleRefuelLiters = (liters: number) => {
    onRefuel(liters);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customLiters && Number(customLiters) > 0) {
      onRefuel(Number(customLiters));
    } else if (customAmountR$ && Number(customAmountR$) > 0) {
      onRefuel(Number(customAmountR$) / currentPrice);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0e0e15] border border-[#2a2a3e] rounded-3xl p-5 w-full max-w-md shadow-2xl relative text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222234] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Fuel size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white">Reabastecer Clio</h3>
              <p className="text-[11px] text-zinc-400 font-medium">
                Combustível Atual: <span className="text-amber-400 font-bold">{currentLiters.toFixed(1)} L</span> / {carConfig.tankCapacity} L ({isGasoline ? 'Gasolina' : 'Etanol'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-[#1a1a28] hover:bg-[#252538] text-zinc-400 hover:text-white rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Fill Full Tank Button */}
        <button
          onClick={() => onRefuel(maxLitersNeeded, true)}
          className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase tracking-wider rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-950/40 border border-emerald-400/40 transition-all active:scale-95 mb-4 group"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles size={18} className="text-emerald-200 group-hover:rotate-12 transition-transform" />
            <div className="text-left">
              <div className="text-sm">COMPLETAR TANQUE CHEIO</div>
              <div className="text-[10px] text-emerald-100 font-semibold">Adiciona +{maxLitersNeeded.toFixed(1)} Litros (Até 100%)</div>
            </div>
          </div>
          <span className="text-xs font-black bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-400/30">
            {carConfig.tankCapacity} L
          </span>
        </button>

        {/* Quick Refuel by Value (R$) */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
              Rápido por Valor (Preço: R$ {currentPrice.toFixed(2)}/L)
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[30, 50, 100].map((val) => {
              const liters = (val / currentPrice).toFixed(1);
              return (
                <button
                  key={val}
                  onClick={() => handleRefuelAmountR$(val)}
                  className="bg-[#181826] hover:bg-[#222238] border border-[#2a2a40] hover:border-[#c19a6b] p-2.5 rounded-xl text-center transition-all group active:scale-95"
                >
                  <div className="text-base font-black text-amber-400 group-hover:scale-105 transition-transform">
                    + R$ {val}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-bold mt-0.5">
                    ~ {liters} Litros
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Refuel by Fixed Liters */}
        <div className="mb-4">
          <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1.5">
            Rápido por Litros
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 20].map((liters) => (
              <button
                key={liters}
                onClick={() => handleRefuelLiters(liters)}
                className="bg-[#181826] hover:bg-[#222238] border border-[#2a2a40] hover:border-emerald-500/50 p-2.5 rounded-xl text-center transition-all group active:scale-95"
              >
                <div className="text-base font-black text-emerald-400 group-hover:scale-105 transition-transform">
                  + {liters} L
                </div>
                <div className="text-[10px] text-zinc-400 font-bold mt-0.5">
                  ~ R$ {(liters * currentPrice).toFixed(1)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <form onSubmit={handleCustomSubmit} className="bg-[#141420] border border-[#222234] p-3 rounded-2xl">
          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">
            Valor Personalizado
          </label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <span className="text-[9px] text-zinc-400 font-bold uppercase block mb-1">Em Reais (R$)</span>
              <input
                type="number"
                step="1"
                placeholder="Ex: 80"
                value={customAmountR$}
                onChange={(e) => {
                  setCustomAmountR$(e.target.value);
                  setCustomLiters('');
                }}
                className="w-full bg-[#0a0a10] border border-[#2a2a3e] rounded-xl p-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 font-bold uppercase block mb-1">Em Litros (L)</span>
              <input
                type="number"
                step="0.5"
                placeholder="Ex: 15"
                value={customLiters}
                onChange={(e) => {
                  setCustomLiters(e.target.value);
                  setCustomAmountR$('');
                }}
                className="w-full bg-[#0a0a10] border border-[#2a2a3e] rounded-xl p-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-[#252538] hover:bg-[#32324c] border border-[#3e3e5e] text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <PlusCircle size={14} /> Adicionar Combustível
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-3 text-center text-[10px] text-zinc-400 font-medium">
          Dica: Você também pode tirar foto do painel pelo botão de Inteligência Artificial.
        </div>
      </div>
    </div>
  );
};
