import React, { useState } from 'react';
import { Gauge, Edit3, Check, Plus, Minus } from 'lucide-react';

interface OdometerDisplayProps {
  totalKm: number; // e.g. 150427.0
  onOdometerChange: (newKm: number) => void;
}

export const OdometerDisplay: React.FC<OdometerDisplayProps> = ({ totalKm, onOdometerChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(totalKm.toFixed(1));

  const handleSave = () => {
    const val = parseFloat(inputValue);
    if (!isNaN(val) && val >= 0) {
      onOdometerChange(Math.round(val * 10) / 10);
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
            className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-[9px] font-black uppercase flex items-center gap-0.5 hover:bg-emerald-500/30 transition-all"
          >
            <Check size={10} /> Salvar
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onOdometerChange(Math.max(0, totalKm - 1))}
              className="px-1 py-0.2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[8px] font-bold"
              title="-1 km"
            >
              -1k
            </button>
            <button
              onClick={() => onOdometerChange(totalKm + 1)}
              className="px-1 py-0.2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[8px] font-bold"
              title="+1 km"
            >
              +1k
            </button>
            <button
              onClick={() => {
                setInputValue(totalKm.toFixed(1));
                setIsEditing(true);
              }}
              className="px-1.5 py-0.5 bg-[#161622] text-zinc-400 border border-[#2a2a3e] hover:text-white rounded text-[8px] font-bold uppercase flex items-center gap-0.5 transition-all"
              title="Ajustar quilometragem"
            >
              <Edit3 size={9} /> Ajustar
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="flex items-center gap-2 py-0.5">
          <input
            type="number"
            step="0.1"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full p-1 bg-[#14141e] border border-[#33334c] rounded-lg text-white font-mono font-bold text-sm text-center focus:outline-none focus:border-[#c19a6b]"
            placeholder="Ex: 150427"
            autoFocus
          />
        </div>
      ) : (
        /* Odometer Mechanical Drum / LCD Display */
        <div className="flex items-center justify-center gap-0.5 bg-[#050508] border border-[#1e1e2c] py-1 px-1.5 rounded-lg shadow-inner">
          {digits.map((digit, idx) => (
            <div
              key={idx}
              className="w-5 h-6 sm:w-6 sm:h-7 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black border border-zinc-700/60 rounded flex items-center justify-center font-mono font-black text-xs sm:text-sm text-amber-100 shadow-sm relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-[1px] bg-white/20" />
              <span>{digit}</span>
              <div className="absolute inset-x-0 bottom-0 h-[1px] bg-black/60" />
            </div>
          ))}

          {/* Decimal Separator Dot */}
          <span className="text-amber-400 font-mono font-black text-sm px-0.5">.</span>

          {/* Red Tenths Digit (Decimais / 100m) */}
          <div className="w-5 h-6 sm:w-6 sm:h-7 bg-gradient-to-b from-red-900 via-red-950 to-black border border-red-600/80 rounded flex items-center justify-center font-mono font-black text-xs sm:text-sm text-white shadow-sm relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-white/30" />
            <span>{decPart}</span>
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-black/60" />
          </div>

          <span className="ml-1 text-[9px] font-black text-zinc-400 font-mono">KM</span>
        </div>
      )}
    </div>
  );
};
