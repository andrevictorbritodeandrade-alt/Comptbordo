import React from 'react';
import { Settings, X, Save, Car, Sparkles } from 'lucide-react';
import { CarConfig, CarModel } from '../types';

export const CAR_DATABASE: Record<string, CarModel> = {
  clio2010: {
    model: 'Renault Clio',
    details: '2010 1.0 16V Hi-Flex',
    tank: 50,
    avgGas: 12.6,
    avgEth: 8.9,
  },
  clio2008: {
    model: 'Renault Clio',
    details: '2008 1.0 16V',
    tank: 50,
    avgGas: 12.0,
    avgEth: 8.5,
  },
  sandero2010: {
    model: 'Renault Sandero',
    details: '2010 1.0 16V',
    tank: 50,
    avgGas: 11.8,
    avgEth: 8.3,
  },
  argo2019: {
    model: 'Fiat Argo',
    details: '2019 1.0 Firefly',
    tank: 48,
    avgGas: 13.0,
    avgEth: 9.2,
  },
  gol2010: {
    model: 'VW Gol',
    details: '2010 1.0 Flex',
    tank: 55,
    avgGas: 12.0,
    avgEth: 8.5,
  },
  hb202021: {
    model: 'Hyundai HB20',
    details: '2021 1.0 Sense',
    tank: 50,
    avgGas: 13.3,
    avgEth: 9.5,
  },
  onix2020: {
    model: 'Chevrolet Onix',
    details: '2020 1.0 Flex',
    tank: 44,
    avgGas: 13.9,
    avgEth: 9.9,
  },
};

interface SettingsModalProps {
  carConfig: CarConfig;
  setCarConfig: React.Dispatch<React.SetStateAction<CarConfig>>;
  onClose: () => void;
  onOpenPhotoScanner?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  carConfig,
  setCarConfig,
  onClose,
  onOpenPhotoScanner,
}) => {
  const handleSelectModel = (key: string) => {
    const selected = CAR_DATABASE[key];
    if (selected) {
      setCarConfig((prev) => ({
        ...prev,
        model: selected.model,
        details: selected.details,
        tankCapacity: selected.tank,
        avgConsumptionGasoline: selected.avgGas,
        avgConsumptionEthanol: selected.avgEth,
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-[#0c0c0e] border border-[#222] rounded-3xl p-6 w-full max-w-md text-zinc-300 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-white rounded-xl hover:bg-[#1a1a20] transition-colors"
        >
          <X size={18} />
        </button>

        <div className="mb-5 pb-3 border-b border-[#222]">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#c19a6b] font-extrabold block mb-1">
            Configuração do Sistema
          </span>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Settings size={20} className="text-[#c19a6b]" /> Parâmetros do Veículo
          </h3>
        </div>

        <div className="space-y-4 text-xs font-bold">
          <div>
            <label className="block text-zinc-400 font-extrabold mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Car size={14} className="text-[#c19a6b]" /> Selecionar Veículo
            </label>
            <select
              className="w-full p-2.5 bg-[#141418] border border-[#222] rounded-xl text-zinc-200 font-bold focus:border-[#c19a6b] outline-none"
              onChange={(e) => handleSelectModel(e.target.value)}
              defaultValue="clio2010"
            >
              <option value="clio2010" className="bg-[#0c0c0e] text-white">
                Renault Clio 2010 1.0 Hi-Flex
              </option>
              <option value="clio2008" className="bg-[#0c0c0e] text-white">
                Renault Clio 2008 1.0
              </option>
              <option value="sandero2010" className="bg-[#0c0c0e] text-white">
                Renault Sandero 2010 1.0
              </option>
              <option value="argo2019" className="bg-[#0c0c0e] text-white">
                Fiat Argo 2019 1.0 Firefly
              </option>
              <option value="gol2010" className="bg-[#0c0c0e] text-white">
                VW Gol 2010 1.0 Flex
              </option>
              <option value="hb202021" className="bg-[#0c0c0e] text-white">
                Hyundai HB20 2021 1.0
              </option>
              <option value="onix2020" className="bg-[#0c0c0e] text-white">
                Chevrolet Onix 2020 1.0
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 text-[10px] uppercase tracking-wider font-extrabold">Modelo</label>
              <input
                type="text"
                value={carConfig.model}
                onChange={(e) => setCarConfig((p) => ({ ...p, model: e.target.value }))}
                className="w-full p-2 bg-[#141418] border border-[#222] rounded-xl text-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1 text-[10px] uppercase tracking-wider font-extrabold">Versão / Detalhes</label>
              <input
                type="text"
                value={carConfig.details}
                onChange={(e) => setCarConfig((p) => ({ ...p, details: e.target.value }))}
                className="w-full p-2 bg-[#141418] border border-[#222] rounded-xl text-white text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-[11px] uppercase tracking-wider font-extrabold">
              <label className="text-zinc-400">Nível de Combustível</label>
              <span className="text-[#c19a6b] font-black">
                {Math.round(carConfig.fuelLevel)}% ({((carConfig.tankCapacity * carConfig.fuelLevel) / 100).toFixed(1)} L)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={carConfig.fuelLevel}
              onChange={(e) => setCarConfig((p) => ({ ...p, fuelLevel: Number(e.target.value) }))}
              className="w-full cursor-pointer mb-2"
            />
            {onOpenPhotoScanner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPhotoScanner();
                }}
                className="w-full py-2 bg-[#1a1a22] hover:bg-[#252530] text-[#c19a6b] border border-[#c19a6b]/30 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles size={14} /> Ler Foto do Marcador com IA
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-amber-400 mb-1 text-[10px] uppercase tracking-wider font-extrabold">Odômetro Total (km)</label>
              <input
                type="number"
                step="0.1"
                value={carConfig.totalOdometerKm ?? 150016}
                onChange={(e) => setCarConfig((p) => ({ ...p, totalOdometerKm: Math.max(0, Number(e.target.value)) }))}
                className="w-full p-2 bg-[#141418] border border-amber-500/40 rounded-xl text-amber-300 font-bold font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1 text-[10px] uppercase tracking-wider font-extrabold">Capacidade do Tanque (L)</label>
              <input
                type="number"
                value={carConfig.tankCapacity}
                onChange={(e) => setCarConfig((p) => ({ ...p, tankCapacity: Math.max(1, Number(e.target.value)) }))}
                className="w-full p-2 bg-[#141418] border border-[#222] rounded-xl text-white font-bold"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-red-400 mb-1 text-[10px] uppercase tracking-wider font-extrabold">Reserva (Litros)</label>
            <input
              type="number"
              step="0.5"
              value={carConfig.reserveLiters ?? (carConfig.tankCapacity * 0.1)}
              onChange={(e) => setCarConfig((p) => ({ ...p, reserveLiters: Math.max(0.5, Number(e.target.value)) }))}
              className="w-full p-2 bg-[#141418] border border-red-500/40 rounded-xl text-red-400 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 text-[10px] uppercase tracking-wider font-extrabold">Média Gasolina (km/L)</label>
              <input
                type="number"
                step="0.1"
                value={carConfig.avgConsumptionGasoline}
                onChange={(e) =>
                  setCarConfig((p) => ({ ...p, avgConsumptionGasoline: Math.max(0.1, Number(e.target.value)) }))
                }
                className="w-full p-2 bg-[#141418] border border-[#222] rounded-xl text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1 text-[10px] uppercase tracking-wider font-extrabold">Média Etanol (km/L)</label>
              <input
                type="number"
                step="0.1"
                value={carConfig.avgConsumptionEthanol}
                onChange={(e) =>
                  setCarConfig((p) => ({ ...p, avgConsumptionEthanol: Math.max(0.1, Number(e.target.value)) }))
                }
                className="w-full p-2 bg-[#141418] border border-[#222] rounded-xl text-white font-bold"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#c19a6b] hover:bg-[#a88255] text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
          >
            <Save size={16} /> Salvar Parâmetros
          </button>
        </div>
      </div>
    </div>
  );
};
