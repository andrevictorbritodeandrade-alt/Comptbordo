import React, { useState } from 'react';
import { Camera, Upload, X, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface FuelPhotoScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tankCapacity: number;
  onApplyFuelLevel: (percentage: number, description: string) => void;
}

export const FuelPhotoScannerModal: React.FC<FuelPhotoScannerModalProps> = ({
  isOpen,
  onClose,
  tankCapacity,
  onApplyFuelLevel,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ fuelPercentage: number; readingDescription: string } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/estimate-fuel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao comunicar com a IA do servidor.');
      }

      setResult({
        fuelPercentage: data.fuelPercentage,
        readingDescription: data.readingDescription,
      });
    } catch (err: any) {
      setError(err?.message || 'Falha ao analisar a foto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApplyFuelLevel(result.fuelPercentage, result.readingDescription);
      onClose();
    }
  };

  const calculatedLiters = result
    ? ((tankCapacity * result.fuelPercentage) / 100).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md">
      <div className="bg-[#0c0c0e] border border-[#222] rounded-3xl p-5 sm:p-6 w-full max-w-lg text-zinc-200 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-[#1a1a20] transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-4 pb-3 border-b border-[#222]">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#c19a6b] font-extrabold flex items-center gap-1.5 mb-1">
            <Sparkles size={13} /> Inteligência Artificial Vision
          </span>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            Escanear Marcador por Foto
          </h3>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Envie uma foto do marcador de combustível do seu painel e a IA estimará o nível exato do tanque.
          </p>
        </div>

        {/* Upload / Capture Box */}
        {!selectedImage ? (
          <label className="border-2 border-dashed border-[#333] hover:border-[#c19a6b] bg-[#121216] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 bg-[#1e1e24] group-hover:bg-[#c19a6b]/20 border border-[#333] group-hover:border-[#c19a6b] text-[#c19a6b] rounded-2xl flex items-center justify-center mb-3 transition-all">
              <Camera size={28} />
            </div>
            <span className="text-sm font-extrabold text-white mb-1">
              Tirar foto ou Selecionar imagem
            </span>
            <span className="text-[11px] text-zinc-500 font-medium">
              Suporta painéis analógicos e digitais (PNG, JPG, WEBP)
            </span>
          </label>
        ) : (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative rounded-2xl overflow-hidden border border-[#2a2a32] bg-[#121216] max-h-56 flex justify-center items-center">
              <img
                src={selectedImage}
                alt="Marcador de combustível do veículo"
                className="max-h-56 w-auto object-contain"
              />
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setResult(null);
                  setError(null);
                }}
                className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white p-1.5 rounded-xl border border-white/20 text-xs font-bold flex items-center gap-1"
              >
                <X size={14} /> Trocar Foto
              </button>
            </div>

            {/* Analyze Action */}
            {!result && !loading && (
              <button
                onClick={handleAnalyze}
                className="w-full py-3.5 bg-[#c19a6b] hover:bg-[#a88255] text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
              >
                <Sparkles size={16} /> Analisar Leitura com IA
              </button>
            )}

            {/* Loading state */}
            {loading && (
              <div className="bg-[#121216] border border-[#222] p-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-bold text-[#c19a6b]">
                <Loader2 size={20} className="animate-spin" />
                <span>Analisando ponteiro e marcadores do painel...</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Result Display */}
            {result && (
              <div className="bg-[#121216] border border-[#c19a6b]/40 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#222]">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-400 flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-emerald-400" /> Estimativa IA
                  </span>
                  <span className="text-[#c19a6b] font-black text-lg">
                    {result.fuelPercentage}% ({calculatedLiters} L)
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                  "{result.readingDescription}"
                </p>

                <button
                  onClick={handleApply}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
                >
                  <CheckCircle2 size={16} /> Atualizar Tanque para {result.fuelPercentage}%
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-[#222] text-center">
          <p className="text-[10px] text-zinc-500 font-medium">
            A leitura automática é baseada em visão computacional da multimodal Gemini AI.
          </p>
        </div>
      </div>
    </div>
  );
};
