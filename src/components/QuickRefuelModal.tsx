import React, { useState } from 'react';
import { Fuel, Check, X, Sparkles, PlusCircle, Calculator, Percent } from 'lucide-react';
import { CarConfig } from '../types';

interface QuickRefuelModalProps {
  carConfig: CarConfig;
  onRefuel: (additionalLiters: number, fullTank?: boolean, fuelType?: 'gasoline' | 'ethanol') => void;
  onClose: () => void;
}

export const QuickRefuelModal: React.FC<QuickRefuelModalProps> = ({
  carConfig,
  onRefuel,
  onClose,
}) => {
  // Fuel type selected in this refuel event
  const [selectedFuel, setSelectedFuel] = useState<'gasoline' | 'ethanol'>(carConfig.currentFuel);

  // Load prices from localStorage or fallback to standard averages
  const [gasPrice, setGasPrice] = useState<string>(() => {
    return localStorage.getItem('refuel_price_gasoline') || '5.89';
  });
  const [ethanolPrice, setEthanolPrice] = useState<string>(() => {
    return localStorage.getItem('refuel_price_ethanol') || '3.89';
  });

  // Current price state input value
  const currentPriceInput = selectedFuel === 'gasoline' ? gasPrice : ethanolPrice;

  // Custom fuel inputs
  const [amountSpentR$, setAmountSpentR$] = useState<string>('');
  const [directLiters, setDirectLiters] = useState<string>('');

  const currentLiters = (carConfig.tankCapacity * carConfig.fuelLevel) / 100;
  const maxLitersNeeded = Math.max(0, carConfig.tankCapacity - currentLiters);

  // Price converted to number
  const priceNum = parseFloat(currentPriceInput) || (selectedFuel === 'gasoline' ? 5.89 : 3.89);

  // Calculate liters from R$ input in real-time
  const calculatedLitersFromR$ = amountSpentR$ && parseFloat(amountSpentR$) > 0 
    ? parseFloat(amountSpentR$) / priceNum 
    : 0;

  // Actual liters that will be added depending on active fields
  const finalLitersToAdd = directLiters && parseFloat(directLiters) > 0
    ? parseFloat(directLiters)
    : calculatedLitersFromR$;

  // New estimated percentage
  const estimatedNewLiters = Math.min(carConfig.tankCapacity, currentLiters + finalLitersToAdd);
  const estimatedNewPercentage = (estimatedNewLiters / carConfig.tankCapacity) * 100;

  const handlePriceChange = (val: string) => {
    if (selectedFuel === 'gasoline') {
      setGasPrice(val);
      localStorage.setItem('refuel_price_gasoline', val);
    } else {
      setEthanolPrice(val);
      localStorage.setItem('refuel_price_ethanol', val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (finalLitersToAdd > 0) {
      onRefuel(finalLitersToAdd, false, selectedFuel);
    }
  };

  const handleQuickRefuelAmountR$ = (val: number) => {
    const liters = val / priceNum;
    onRefuel(liters, false, selectedFuel);
  };

  const handleQuickRefuelLiters = (liters: number) => {
    onRefuel(liters, false, selectedFuel);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0e0e15] border border-[#2a2a3e] rounded-3xl p-5 w-full max-w-md shadow-2xl relative text-white animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222234] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Fuel size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white">Novo Abastecimento</h3>
              <p className="text-[11px] text-zinc-400 font-medium">
                Atualização dinâmica de nível e combustível do Clio
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

        {/* Current State Indicator */}
        <div className="bg-[#141420] border border-[#222234] p-3 rounded-2xl mb-4">
          <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
            <span>Tanque Atual</span>
            <span className="text-amber-400">{carConfig.fuelLevel.toFixed(1)}% ({currentLiters.toFixed(1)}L / {carConfig.tankCapacity}L)</span>
          </div>
          <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-300" 
              style={{ width: `${carConfig.fuelLevel}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-zinc-500 font-bold mt-1 uppercase">
            <span>Reserva</span>
            <span>Metade</span>
            <span>Cheio</span>
          </div>
        </div>

        {/* Main Fuel Calculator Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fuel Type Selector */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-2">
              1. Selecione o Combustível
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedFuel('gasoline')}
                className={`py-2.5 px-3 rounded-xl border font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                  selectedFuel === 'gasoline'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-sm'
                    : 'bg-[#141420] border-[#222234] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${selectedFuel === 'gasoline' ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
                Gasolina
              </button>
              <button
                type="button"
                onClick={() => setSelectedFuel('ethanol')}
                className={`py-2.5 px-3 rounded-xl border font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                  selectedFuel === 'ethanol'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-sm'
                    : 'bg-[#141420] border-[#222234] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${selectedFuel === 'ethanol' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                Etanol
              </button>
            </div>
          </div>

          {/* Price & Value inputs */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                2. Preço do Litro (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">R$</span>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder={selectedFuel === 'gasoline' ? '5.89' : '3.89'}
                  value={currentPriceInput}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full bg-[#141420] border border-[#222234] rounded-xl py-2.5 pl-8 pr-3 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400/70"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                3. Valor Abastecido (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 100.00"
                  value={amountSpentR$}
                  onChange={(e) => {
                    setAmountSpentR$(e.target.value);
                    setDirectLiters('');
                  }}
                  className="w-full bg-[#141420] border border-[#222234] rounded-xl py-2.5 pl-8 pr-3 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-400/70"
                />
              </div>
            </div>
          </div>

          {/* Alternatively Direct Liters */}
          <div className="text-center">
            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">— OU INSIRA EM LITROS DIRETAMENTE —</span>
          </div>

          <div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">LITROS</span>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 15.5"
                value={directLiters}
                onChange={(e) => {
                  setDirectLiters(e.target.value);
                  setAmountSpentR$('');
                }}
                className="w-full bg-[#141420] border border-[#222234] rounded-xl py-2.5 pl-14 pr-3 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-400/70 text-right"
              />
            </div>
          </div>

          {/* Calculated Output Box */}
          {finalLitersToAdd > 0 && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3 text-center space-y-1 animate-in slide-in-from-top-2 duration-150">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Resultado do Abastecimento
              </div>
              <div className="text-2xl font-black text-white font-mono">
                +{finalLitersToAdd.toFixed(2)} Litros
              </div>
              <p className="text-[11px] text-zinc-300 font-medium leading-tight">
                Tanque irá de <span className="font-bold text-amber-400">{carConfig.fuelLevel.toFixed(1)}%</span> para{' '}
                <span className="font-bold text-emerald-400">{estimatedNewPercentage.toFixed(1)}%</span>
              </p>
              {amountSpentR$ && parseFloat(amountSpentR$) > 0 && (
                <p className="text-[9px] text-zinc-500 font-bold">
                  Cálculo: R$ {parseFloat(amountSpentR$).toFixed(2)} / R$ {priceNum.toFixed(2)} por litro
                </p>
              )}
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={!(finalLitersToAdd > 0)}
            className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 border ${
              finalLitersToAdd > 0
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400 text-black font-extrabold shadow-lg shadow-amber-950/20'
                : 'bg-zinc-800/40 border-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <PlusCircle size={16} /> Confirmar e Abastecer
          </button>
        </form>

        {/* Divider for Quick Shortcuts */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1d1d2b]"></div>
          </div>
          <span className="relative bg-[#0e0e15] px-3 text-[9px] font-black uppercase tracking-widest text-zinc-500">Atalhos Rápidos</span>
        </div>

        {/* Quick Fill Full Tank Button */}
        <button
          onClick={() => onRefuel(maxLitersNeeded, true, selectedFuel)}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase tracking-wider rounded-xl flex items-center justify-between shadow-md border border-emerald-400/20 transition-all active:scale-95 group mb-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-200 group-hover:rotate-12 transition-transform" />
            <div className="text-left">
              <div className="text-xs">Completar Tanque Cheio</div>
              <div className="text-[9px] text-emerald-100 font-semibold">Adiciona +{maxLitersNeeded.toFixed(1)}L ({selectedFuel === 'gasoline' ? 'Gasolina' : 'Etanol'})</div>
            </div>
          </div>
          <span className="text-[10px] font-black bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-400/20">
            {carConfig.tankCapacity} L
          </span>
        </button>

        {/* Quick Fixed Values Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[30, 50, 100].map((val) => {
            const liters = (val / priceNum).toFixed(1);
            return (
              <button
                key={val}
                onClick={() => handleQuickRefuelAmountR$(val)}
                className="bg-[#141420] hover:bg-[#1a1a2b] border border-[#222234] hover:border-amber-500/50 p-2 rounded-xl text-center transition-all group active:scale-95"
              >
                <div className="text-xs font-black text-amber-400 group-hover:scale-105 transition-transform">
                  + R$ {val}
                </div>
                <div className="text-[9px] text-zinc-500 font-bold mt-0.5">
                  ~{liters}L
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Fixed Liters Grid */}
        <div className="grid grid-cols-3 gap-2">
          {[5, 10, 20].map((liters) => (
            <button
              key={liters}
              onClick={() => handleQuickRefuelLiters(liters)}
              className="bg-[#141420] hover:bg-[#1a1a2b] border border-[#222234] hover:border-emerald-500/40 p-2 rounded-xl text-center transition-all group active:scale-95"
            >
              <div className="text-xs font-black text-emerald-400 group-hover:scale-105 transition-transform">
                + {liters} L
              </div>
              <div className="text-[9px] text-zinc-500 font-bold mt-0.5">
                ~R$ {(liters * priceNum).toFixed(0)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
