import React from 'react';
import { TripKey, TripData, GpsState, OperatingMode } from '../types';
import { SpeedCanvas } from './SpeedCanvas';
import { OdometerDisplay } from './OdometerDisplay';
import { Route, Map, Play, Pause, RotateCcw, Maximize2, Compass, Radio } from 'lucide-react';

interface SplitDashboardViewProps {
  speed: number;
  gpsState: GpsState;
  mode: OperatingMode;
  simulatedSpeed: number;
  onSimulatedSpeedChange: (speed: number) => void;
  speedLimit: number;
  onSpeedLimitChange: (limit: number) => void;
  activeTripKey: TripKey;
  setActiveTripKey: (key: TripKey) => void;
  trips: Record<TripKey, TripData>;
  activeTrip: TripData;
  toggleTripState: () => void;
  resetTrip: () => void;
  totalKm: number;
  onOdometerChange: (newKm: number) => void;
  currentTime: Date;
  onExitSplitMode: () => void;
  isAutoDetected: boolean;
}

export const SplitDashboardView: React.FC<SplitDashboardViewProps> = ({
  speed,
  gpsState,
  mode,
  simulatedSpeed,
  onSimulatedSpeedChange,
  speedLimit,
  onSpeedLimitChange,
  activeTripKey,
  setActiveTripKey,
  trips,
  activeTrip,
  toggleTripState,
  resetTrip,
  totalKm,
  onOdometerChange,
  currentTime,
  onExitSplitMode,
  isAutoDetected,
}) => {
  const tripDistanceKm = (activeTrip.distance / 1000).toFixed(1);

  return (
    <div className="w-full h-[100dvh] bg-black text-zinc-100 p-2 flex flex-col justify-between font-sans select-none overflow-hidden">
      {/* Top Bar for Split Screen Mode */}
      <header className="flex justify-between items-center px-2.5 py-1.5 bg-[#09090d] border border-[#1e1e28] rounded-xl shrink-0 gap-2">
        {/* Left: Time & GPS status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#121220] border border-amber-500/30 rounded-lg px-2 py-0.5">
            <span className="text-xs">⏱️</span>
            <span className="text-xs sm:text-sm font-black text-amber-400 font-mono tracking-wider">
              {currentTime.toLocaleTimeString('pt-BR')}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[10px] font-bold ${
              gpsState.active
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
            }`}
          >
            <Radio size={11} className={gpsState.active ? 'animate-pulse text-emerald-400' : ''} />
            <span>{mode === 'simulated' ? 'SIM' : gpsState.active ? 'GPS' : 'BUSC'}</span>
          </div>
        </div>

        {/* Right: Switch back to Full View */}
        <button
          onClick={onExitSplitMode}
          className="px-2 py-1 bg-[#181828] hover:bg-[#222238] border border-[#33334c] text-sky-400 hover:text-sky-300 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          title="Ver painel completo com clima, combustível e estatísticas"
        >
          <Maximize2 size={13} />
          <span>Painel Completo</span>
        </button>
      </header>

      {/* Main Content Split Area: 1. Speedometer | 2. Distance & Odometer */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 my-1.5 overflow-hidden">
        {/* SECTION 1: VELOCIDADE (Speedometer Gauge) */}
        <div className="flex-1 min-h-0 flex flex-col justify-center items-center bg-[#09090d] border border-[#1e1e28] rounded-2xl p-2 relative shadow-xl overflow-hidden">
          <div className="absolute top-2 left-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#c19a6b]">
            <Compass size={12} />
            <span>VELOCIDADE ATUAL</span>
          </div>

          <div className="w-full flex-1 flex items-center justify-center min-h-0 max-h-[170px] mt-2">
            <SpeedCanvas
              speed={speed}
              textSource={gpsState.sourceText}
              isSimulated={mode === 'simulated'}
              simulatedSpeed={simulatedSpeed}
              onSimulatedSpeedChange={onSimulatedSpeedChange}
              speedLimit={speedLimit}
              onSpeedLimitChange={onSpeedLimitChange}
            />
          </div>

          {/* Speed slider in simulated mode */}
          {mode === 'simulated' && (
            <div className="w-full px-4 mt-1 flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap">Sim: {Math.round(simulatedSpeed)} km/h</span>
              <input
                type="range"
                min="0"
                max="160"
                value={simulatedSpeed}
                onChange={(e) => onSimulatedSpeedChange(Number(e.target.value))}
                className="w-full cursor-pointer accent-[#c19a6b] h-1"
              />
            </div>
          )}
        </div>

        {/* SECTION 2: QUILOMETRAGEM PERCORRIDA (Km que Já Percorri) */}
        <div className="flex-1 min-h-0 bg-[#09090d] border border-[#1e1e28] rounded-2xl p-2.5 flex flex-col justify-between shadow-xl overflow-y-auto custom-scrollbar">
          {/* Trip Selection Tabs */}
          <div className="flex items-center justify-between gap-2 shrink-0 border-b border-[#1c1c2b] pb-1.5">
            <div className="flex bg-[#050508] border border-[#1e1e28] rounded-lg p-0.5 flex-1">
              {(['a', 'b'] as TripKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setActiveTripKey(k)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                    activeTripKey === k
                      ? 'text-[#c19a6b] bg-[#c19a6b]/20 border border-[#c19a6b]/40 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {k === 'a' ? <Route size={12} /> : <Map size={12} />}
                  TRIP {k.toUpperCase()}
                  {trips[k].active && !trips[k].paused && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                  )}
                </button>
              ))}
            </div>

            {/* Quick Trip Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleTripState}
                className="px-2.5 py-1 bg-[#c19a6b] hover:bg-[#a88255] text-black font-black rounded-lg text-xs uppercase flex items-center gap-1 active:scale-95 transition-transform"
                title={activeTrip.active && !activeTrip.paused ? 'Pausar Trip' : 'Iniciar/Retomar Trip'}
              >
                {activeTrip.active && !activeTrip.paused ? <Pause size={12} /> : <Play size={12} />}
                <span>{activeTrip.active && !activeTrip.paused ? 'Pausar' : 'Iniciar'}</span>
              </button>
              <button
                onClick={resetTrip}
                className="p-1 bg-[#161624] border border-[#2a2a3e] text-zinc-300 hover:text-white rounded-lg active:scale-95 transition-transform"
                title="Zerar Trip"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          {/* Big Distance Display Card */}
          <div className="bg-[#12121c] border border-[#222232] p-2.5 my-1.5 rounded-xl flex items-center justify-between shadow-inner">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#c19a6b]">
                KM PERCORRIDOS (TRIP {activeTripKey.toUpperCase()})
              </span>
              <span className="text-[10px] font-bold text-zinc-400">
                {activeTrip.active ? (activeTrip.paused ? '⏸️ Pausado' : '🟢 Em movimento') : '⏹️ Zerado'}
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                {tripDistanceKm}
              </span>
              <span className="text-sm font-black text-[#c19a6b]">KM</span>
            </div>
          </div>

          {/* Vehicle Total Odometer */}
          <div className="shrink-0 mt-0.5">
            <OdometerDisplay totalKm={totalKm} onOdometerChange={onOdometerChange} />
          </div>
        </div>
      </div>
    </div>
  );
};
