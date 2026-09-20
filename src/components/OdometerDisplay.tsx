import React, { useState } from 'react';
import { Gauge, Edit3, Check, Plus, Minus } from 'lucide-react';

interface OdometerDisplayProps {
  totalKm: number; // e.g. 150427.0
  onOdometerChange: (newKm: number) => void;
}

export const OdometerDisplay: React.FC<OdometerDisplayProps> = ({ totalKm, onOdometerChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(totalKm.toFixed(1));

  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    const val = parseFloat(inputValue);
    if (!isNaN(val) && val >= 0) {
      const rounded = Math.round(val * 10) / 10;
      onOdometerChange(rounded);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
    setIsEditing(false);
  };

  // Format totalKm into 6 integer digits + 1 decimal digit (e.g., 150427.0)
  const kmFormatted = totalKm.toFixed(1);
  const [intPart, decPart] = kmFormatted.split('.');
  const paddedInt = intPart.padStart(6, '0');
  const digits = paddedInt.split('');

  return (
    <div className="bg-[#0b0b12] border border-[#1e1e2d] rounded-xl p-1.5 shadow-xl flex flex-col justify-between gap-1">
      {/* Top Title & Edit Action */}
      <div className="flex items-center justify-between border-b border-[#1a1a28] pb-0.5 px-0.5">
        <div className="flex items-center gap-1">
          <Gauge size={11} className="text-[#c19a6b]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-200">
            ODÔMETRO TOTAL (CLIO)
          </span>
        </div>

        {isEditing ? (
          <button
            onClick={handleSave}
            className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-[9px] font-black uppercase flex items-center gap-0.5 hover:bg-emerald-500/30 transition-all shadow-[0_0_8px_rgba(52,211,153,0.3)]"
          >
            <Check size={10} /> Salvar
          </button>
        ) : showSuccess ? (
          <div className="flex items-center gap-1 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40 animate-pulse">
            <Check size={9} className="text-emerald-400" />
            <span className="text-[8px] font-black text-emerald-400 uppercase">Salvo na Nuvem</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onOdometerChange(Math.max(0, totalKm - 1))}
              className="px-1 py-0.2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[8px] font-bold transition-colors"
              title="-1 km"
            >
              -1k
            </button>
            <button
              onClick={() => onOdometerChange(totalKm + 1)}
              className="px-1 py-0.2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[8px] font-bold transition-colors"
              title="+1 km"
            >
              +1k
            </button>
            <button
              onClick={() => {
                setInputValue(totalKm.toFixed(1));
                setIsEditing(true);
              }}
              className="px-1.5 py-0.5 bg-[#161622] text-[#c19a6b] border border-[#c19a6b]/30 hover:bg-[#c19a6b]/10 rounded text-[8px] font-bold uppercase flex items-center gap-0.5 transition-all"
              title="Ajustar quilometragem manualmente"
            >
              <Edit3 size={9} /> Ajustar
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="flex items-center gap-2 py-0.5 animate-in fade-in zoom-in-95 duration-200">
          <input
            type="number"
            step="0.1"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full p-1 bg-[#14141e] border border-[#c19a6b]/50 rounded-lg text-white font-mono font-bold text-sm text-center focus:outline-none focus:border-[#c19a6b] shadow-[0_0_10px_rgba(193,154,107,0.2)]"
            placeholder="Ex: 150427.0"
            autoFocus
          />
        </div>
      ) : (
        /* Odometer Mechanical Drum / LCD Display - CLICKABLE to edit */
        <div 
          onClick={() => {
            setInputValue(totalKm.toFixed(1));
            setIsEditing(true);
          }}
          className="flex items-center justify-center gap-0.5 bg-[#050508] border border-[#1e1e2c] py-1 px-1.5 rounded-lg shadow-inner cursor-pointer hover:border-[#c19a6b]/40 transition-colors group"
          title="Clique para editar odômetro"
        >
          {digits.map((digit, idx) => (
            <div
              key={idx}
              className="w-5 h-6 sm:w-6 sm:h-7 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black border border-zinc-700/60 rounded flex items-center justify-center font-mono font-black text-xs sm:text-sm text-amber-100 shadow-sm relative overflow-hidden group-hover:border-[#c19a6b]/30"
            >
              <div className="absolute inset-x-0 top-0 h-[1px] bg-white/10" />
              <span>{digit}</span>
              <div className="absolute inset-x-0 bottom-0 h-[1px] bg-black/60" />
            </div>
          ))}

          {/* Decimal Separator Dot */}
          <span className="text-amber-400 font-mono font-black text-sm px-0.5">.</span>

          {/* Red Tenths Digit (Decimais / 100m) */}
          <div className="w-5 h-6 sm:w-6 sm:h-7 bg-gradient-to-b from-red-900 via-red-950 to-black border border-red-600/80 rounded flex items-center justify-center font-mono font-black text-xs sm:text-sm text-white shadow-sm relative overflow-hidden group-hover:border-red-500">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-white/20" />
            <span>{decPart}</span>
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-black/60" />
          </div>

          <span className="ml-1 text-[9px] font-black text-zinc-500 font-mono group-hover:text-[#c19a6b]">KM</span>
        </div>
      )}
    </div>
  );
};
