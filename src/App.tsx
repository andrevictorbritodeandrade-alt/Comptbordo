import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  RotateCcw,
  Route,
  Map,
  Play,
  Pause,
  Zap,
  CheckCircle,
  RefreshCw,
  Satellite,
  Gauge,
  Compass,
  Maximize2,
  Sparkles
} from 'lucide-react';
import { SpeedCanvas } from './components/SpeedCanvas';
import { FuelGaugeCanvas } from './components/FuelGaugeCanvas';
import { InstantConsumptionCanvas } from './components/InstantConsumptionCanvas';
import { SettingsModal } from './components/SettingsModal';
import { FuelPhotoScannerModal } from './components/FuelPhotoScannerModal';
import { CarConfig, TripsState, TripKey, OperatingMode, GpsState } from './types';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function App() {
  const [carConfig, setCarConfig] = useState<CarConfig>({
    model: 'Renault Clio',
    details: '2010 1.0 16V Hi-Flex',
    tankCapacity: 50,
    currentFuel: 'gasoline',
    fuelLevel: 45, // %
    avgConsumptionGasoline: 12.6,
    avgConsumptionEthanol: 8.9,
  });

  const [speed, setSpeed] = useState<number>(0);
  const [simulatedSpeed, setSimulatedSpeed] = useState<number>(45);
  const [gpsState, setGpsState] = useState<GpsState>({
    active: false,
    statusText: 'Aguardando',
    sourceText: '📍 Aguardando seleção de modo...',
  });

  const [mode, setMode] = useState<OperatingMode>('pending');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showPhotoScanner, setShowPhotoScanner] = useState<boolean>(false);
  const [gpsDenied, setGpsDenied] = useState<boolean>(false);
  const [hudMode, setHudMode] = useState<boolean>(false);

  // Trip State
  const [activeTripKey, setActiveTripKey] = useState<TripKey>('a');
  const [trips, setTrips] = useState<TripsState>({
    a: {
      active: false,
      paused: false,
      distance: 0,
      elapsedTime: 0,
      totalFuelConsumed: 0,
      speedSamples: [],
    },
    b: {
      active: false,
      paused: false,
      distance: 0,
      elapsedTime: 0,
      totalFuelConsumed: 0,
      speedSamples: [],
    },
  });

  // References for GPS & simulation
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ coords: GeolocationCoordinates; timestamp: number } | null>(null);
  const lastTimestampRef = useRef<number>(Date.now());

  // GPS & Simulation Mode Handler
  useEffect(() => {
    if (mode === 'simulated') {
      setGpsState({
        active: true,
        statusText: 'Simulado',
        sourceText: '📍 Modo Simulado - Controle pelo Pedal / Autogerado',
      });

      // Auto speed fluctuation in simulation if user is not dragging slider aggressively
      setSpeed(simulatedSpeed);

      simulationRef.current = setInterval(() => {
        setSimulatedSpeed((prev) => {
          const delta = (Math.random() - 0.48) * 6;
          const next = Math.max(0, Math.min(140, prev + delta));
          setSpeed(next);
          return next;
        });
      }, 1500);
    } else if (mode === 'real') {
      if (!('geolocation' in navigator)) {
        setGpsState({
          active: false,
          statusText: 'Erro',
          sourceText: '❌ GPS não suportado no navegador',
        });
        return;
      }

      setGpsState({
        active: true,
        statusText: 'Buscando Sinal',
        sourceText: '📍 Conectando aos satélites GPS...',
      });

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          let currentSpeedKmh = 0;

          if (position.coords.speed !== null && position.coords.speed !== undefined) {
            currentSpeedKmh = position.coords.speed * 3.6;
          } else if (lastPosRef.current) {
            const dist = calculateDistance(
              lastPosRef.current.coords.latitude,
              lastPosRef.current.coords.longitude,
              position.coords.latitude,
              position.coords.longitude
            );
            const timeDiff = (now - lastPosRef.current.timestamp) / 1000;
            if (timeDiff > 0) {
              currentSpeedKmh = (dist / timeDiff) * 3.6;
            }
          }

          // Anti-drift filter for static position
          if (currentSpeedKmh < 2.0) currentSpeedKmh = 0;

          lastPosRef.current = { coords: position.coords, timestamp: now };

          setSpeed(currentSpeedKmh);
          const acc = position.coords.accuracy ? Math.round(position.coords.accuracy) : 0;
          setGpsState({
            active: true,
            statusText: 'GPS Ativo',
            sourceText: `📍 GPS Ativo • Precisão: ${acc}m`,
            accuracy: acc,
          });
        },
        (error) => {
          let errorMsg = error.message || 'Erro de leitura GPS';

          switch (error.code) {
            case 1:
              errorMsg = 'Permissão negada pelo usuário';
              setGpsDenied(true);
              setMode('pending');
              break;
            case 2:
              errorMsg = 'Sinal GPS indisponível no momento';
              break;
            case 3:
              errorMsg = 'Aguardando atualização de localização';
              break;
          }

          setGpsState({
            active: false,
            statusText: error.code === 1 ? 'Bloqueado' : 'Sem Sinal',
            sourceText: `❌ ${errorMsg}`,
          });
          setSpeed(0);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000,
        }
      );
    }

    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [mode]);

  // Handle manual simulation slider change
  const handleSimulatedSpeedChange = (val: number) => {
    setSimulatedSpeed(val);
    setSpeed(val);
  };

  // Main tick for fuel consumption and trip tracking
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = (now - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = now;

      // Fuel consumption rate simulation
      if (speed > 0 && carConfig.fuelLevel > 0) {
        const speedFactor = speed / 60;
        const consumptionRate = 0.0006 * speedFactor * (deltaSeconds / 1);
        setCarConfig((prev) => ({
          ...prev,
          fuelLevel: Math.max(0, prev.fuelLevel - consumptionRate),
        }));
      }

      // Update Active Trip
      setTrips((prevTrips) => {
        const trip = prevTrips[activeTripKey];
        if (!trip.active || trip.paused) return prevTrips;

        const speedMs = speed / 3.6;
        const distanceAdded = speedMs * deltaSeconds;

        const baseConsumption =
          carConfig.currentFuel === 'gasoline'
            ? carConfig.avgConsumptionGasoline
            : carConfig.avgConsumptionEthanol;

        const instantCons =
          speed > 0
            ? speed < 60
              ? baseConsumption * 0.85
              : speed < 110
              ? baseConsumption * 1.15
              : baseConsumption * 0.75
            : 0;

        const fuelUsed =
          distanceAdded > 0 && instantCons > 0 ? distanceAdded / 1000 / instantCons : 0;

        const newSamples = [...trip.speedSamples, speed];
        if (newSamples.length > 120) newSamples.shift();

        return {
          ...prevTrips,
          [activeTripKey]: {
            ...trip,
            elapsedTime: trip.elapsedTime + deltaSeconds,
            distance: trip.distance + distanceAdded,
            totalFuelConsumed: trip.totalFuelConsumed + fuelUsed,
            speedSamples: newSamples,
          },
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    speed,
    activeTripKey,
    carConfig.currentFuel,
    carConfig.avgConsumptionEthanol,
    carConfig.avgConsumptionGasoline,
    carConfig.fuelLevel,
  ]);

  const toggleTripState = () => {
    setTrips((prev) => {
      const current = prev[activeTripKey];
      if (!current.active) {
        return {
          ...prev,
          [activeTripKey]: {
            ...current,
            active: true,
            paused: false,
            distance: 0,
            elapsedTime: 0,
            totalFuelConsumed: 0,
            speedSamples: [],
          },
        };
      }
      return {
        ...prev,
        [activeTripKey]: { ...current, paused: !current.paused },
      };
    });
  };

  const resetTrip = () => {
    if (confirm(`Deseja zerar os dados do computador de bordo Trip ${activeTripKey.toUpperCase()}?`)) {
      setTrips((prev) => ({
        ...prev,
        [activeTripKey]: {
          active: false,
          paused: false,
          distance: 0,
          elapsedTime: 0,
          totalFuelConsumed: 0,
          speedSamples: [],
        },
      }));
    }
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Calculations
  const activeTrip = trips[activeTripKey];
  const tripAvgSpeed =
    activeTrip.speedSamples.length > 0
      ? (
          activeTrip.speedSamples.reduce((a, b) => a + b, 0) / activeTrip.speedSamples.length
        ).toFixed(1)
      : '--.-';

  const tripAvgCons =
    activeTrip.totalFuelConsumed > 0
      ? (activeTrip.distance / 1000 / activeTrip.totalFuelConsumed).toFixed(1)
      : '--.-';

  const baseConsumption =
    carConfig.currentFuel === 'gasoline'
      ? carConfig.avgConsumptionGasoline
      : carConfig.avgConsumptionEthanol;

  const instantConsumption =
    speed === 0
      ? 0
      : speed < 20
      ? baseConsumption * 0.55
      : speed < 60
      ? baseConsumption * 0.95
      : speed < 95
      ? baseConsumption * 1.25
      : baseConsumption * 0.85;

  const currentLiters = ((carConfig.tankCapacity * carConfig.fuelLevel) / 100).toFixed(1);
  const autonomy = Math.round(Number(currentLiters) * baseConsumption);
  const reserveLiters = (carConfig.tankCapacity * 0.1).toFixed(1);

  return (
    <div
      className={`min-h-screen h-screen w-screen bg-[#000000] text-zinc-100 p-2 sm:p-4 flex flex-col justify-between font-sans select-none overflow-x-hidden ${
        hudMode ? 'scale-y-[-1]' : ''
      }`}
    >
      {/* Mode / Permission Selection Modal */}
      {mode === 'pending' && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#0c0c0e] border border-[#222] rounded-3xl p-6 sm:p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 border-2 border-[#c19a6b] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#c19a6b] bg-[#c19a6b]/10">
              <Satellite size={32} />
            </div>
            
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#c19a6b] mb-1 font-extrabold">
              Telemetria Automotiva
            </p>
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
              Painel GPS
            </h3>

            {gpsDenied ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 mb-6 text-left">
                <p className="text-xs font-extrabold text-red-400 mb-1">Acesso GPS Bloqueado</p>
                <p className="text-[11px] text-red-300 font-medium">
                  O sinal de localização em tempo real foi recusado. Ative a permissão do GPS ou utilize o Modo Simulado.
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-medium">
                Para medição real no veículo em trânsito, ative o receptor GPS. Para testes estáticos, selecione o Modo Simulado.
              </p>
            )}

            <button
              onClick={() => setMode('real')}
              className="w-full bg-[#c19a6b] hover:bg-[#a88255] text-black font-black py-3.5 text-xs uppercase tracking-[0.2em] rounded-xl mb-3 flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
            >
              <CheckCircle size={18} /> {gpsDenied ? 'Tentar GPS Novamente' : 'Iniciar GPS Real'}
            </button>

            <button
              onClick={() => setMode('simulated')}
              className="w-full bg-[#141418] border border-[#2a2a32] hover:bg-[#1a1a20] text-zinc-200 font-bold py-3.5 text-xs uppercase tracking-[0.15em] rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Gauge size={18} className="text-[#c19a6b]" /> Modo Simulado
            </button>
          </div>
        </div>
      )}

      {/* Main Dashboard Layout - Full Screen Landscape Tablet Optimized */}
      <div className="w-full h-full flex flex-col justify-between gap-2.5 flex-1 max-w-none">
        {/* Header Bar */}
        <header className="flex justify-between items-center p-3 sm:px-5 bg-[#080808] border border-[#1a1a1a] rounded-2xl shadow-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#c19a6b] rounded-xl flex items-center justify-center text-[#c19a6b] bg-[#c19a6b]/10">
              <div className="w-3 h-3 bg-[#c19a6b] rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-black text-white leading-none tracking-tight">
                  {carConfig.model}
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#c19a6b] bg-[#c19a6b]/10 border border-[#c19a6b]/30 px-2.5 py-0.5 rounded-full">
                  {carConfig.currentFuel === 'gasoline' ? 'Gasolina' : 'Etanol'}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">{carConfig.details}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHudMode(!hudMode)}
              title="Modo HUD (Reflexo no Para-brisa)"
              className={`p-2 rounded-xl border transition-all ${
                hudMode
                  ? 'bg-[#c19a6b] text-black border-[#c19a6b] font-bold'
                  : 'bg-[#121214] text-zinc-400 border-[#222] hover:text-white'
              }`}
            >
              <Maximize2 size={16} />
            </button>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider border ${
                gpsState.active
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  gpsState.active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              {gpsState.statusText}
            </div>
          </div>
        </header>

        {/* Dashboard Grid - Fills remaining screen space */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 flex-1 items-stretch min-h-0 overflow-y-auto md:overflow-hidden">
          {/* Left Column: Speedometer & Controls */}
          <div className="md:col-span-5 flex flex-col justify-between gap-2.5 h-full">
            <div className="flex-1 flex flex-col justify-center min-h-[220px]">
              <SpeedCanvas
                speed={speed}
                textSource={gpsState.sourceText}
                isSimulated={mode === 'simulated'}
                simulatedSpeed={simulatedSpeed}
                onSimulatedSpeedChange={handleSimulatedSpeedChange}
              />
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-[#080808] border border-[#1a1a1a] p-3 rounded-2xl flex flex-col gap-2 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    setCarConfig((prev) => ({
                      ...prev,
                      currentFuel: prev.currentFuel === 'gasoline' ? 'ethanol' : 'gasoline',
                    }))
                  }
                  className="py-2.5 border border-[#222] bg-[#121214] hover:border-[#c19a6b] text-[#c19a6b] text-[10px] font-extrabold uppercase tracking-[0.15em] rounded-xl flex justify-center items-center gap-1.5 transition-colors"
                >
                  <Zap size={14} /> {carConfig.currentFuel === 'gasoline' ? 'Mudar p/ Etanol' : 'Mudar p/ Gasolina'}
                </button>

                <button
                  onClick={() => setShowSettings(true)}
                  className="py-2.5 bg-[#c19a6b] hover:bg-[#a88255] text-black rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex justify-center items-center gap-1.5 transition-colors shadow-md"
                >
                  <Settings size={14} /> Ajustes Veículo
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('pending')}
                  className="py-2 bg-[#121214] hover:bg-[#1a1a1e] border border-[#222] text-zinc-300 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex justify-center items-center gap-1.5 transition-colors"
                >
                  <Compass size={14} /> GPS / Simulação
                </button>

                <button
                  onClick={() => {
                    if (confirm('Deseja resetar todas as Trips e reabastecer o combustível para 100%?')) {
                      setTrips({
                        a: {
                          active: false,
                          paused: false,
                          distance: 0,
                          elapsedTime: 0,
                          totalFuelConsumed: 0,
                          speedSamples: [],
                        },
                        b: {
                          active: false,
                          paused: false,
                          distance: 0,
                          elapsedTime: 0,
                          totalFuelConsumed: 0,
                          speedSamples: [],
                        },
                      });
                      setCarConfig((prev) => ({ ...prev, fuelLevel: 100 }));
                    }
                  }}
                  className="py-2 bg-[#121214] hover:bg-[#1a1a1e] border border-[#222] text-zinc-300 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex justify-center items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={14} /> Resetar / Encher
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Trip Computer & Fuel Gauge */}
          <div className="md:col-span-7 flex flex-col justify-between gap-2.5 h-full">
            {/* Trip Computer Panel */}
            <div className="bg-[#080808] border border-[#1a1a1a] rounded-2xl overflow-hidden shadow-xl flex-1 flex flex-col justify-between">
              <div className="flex bg-[#050505] border-b border-[#1a1a1a] shrink-0">
                {(['a', 'b'] as TripKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setActiveTripKey(k)}
                    className={`flex-1 py-3 text-center text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 flex items-center justify-center gap-2 ${
                      activeTripKey === k
                        ? 'text-[#c19a6b] border-[#c19a6b] bg-[#c19a6b]/10'
                        : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                  >
                    {k === 'a' ? <Route size={14} /> : <Map size={14} />}
                    Trip {k.toUpperCase()}
                    {trips[k].active && !trips[k].paused && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-3 sm:p-4 flex-1 flex flex-col justify-around gap-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#101014] border border-[#202028] p-3 rounded-xl text-center shadow-inner">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-extrabold">Distância</div>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-0.5 tracking-tight">
                      {(activeTrip.distance / 1000).toFixed(1)}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-extrabold uppercase">KM</div>
                  </div>

                  <div className="bg-[#101014] border border-[#202028] p-3 rounded-xl text-center shadow-inner">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-extrabold">Tempo Decorrido</div>
                    <div className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
                      {formatTime(activeTrip.elapsedTime)}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-extrabold uppercase">HH:MM:SS</div>
                  </div>

                  <div className="bg-[#101014] border border-[#202028] p-3 rounded-xl text-center shadow-inner">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-extrabold">Consumo Médio</div>
                    <div className="text-2xl font-black text-white mt-0.5 tracking-tight">{tripAvgCons}</div>
                    <div className="text-[9px] text-zinc-500 font-extrabold uppercase">KM/L</div>
                  </div>

                  <div className="bg-[#101014] border border-[#202028] p-3 rounded-xl text-center shadow-inner">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-extrabold">Velocidade Média</div>
                    <div className="text-2xl font-black text-white mt-0.5 tracking-tight">{tripAvgSpeed}</div>
                    <div className="text-[9px] text-zinc-500 font-extrabold uppercase">KM/H</div>
                  </div>
                </div>

                {/* Consumo Instantâneo */}
                <div className="bg-[#101014] border border-[#202028] p-3 rounded-xl text-center">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-extrabold">
                      Consumo Instantâneo
                    </span>
                    <span className="text-sm font-black text-[#c19a6b]">
                      {instantConsumption.toFixed(1)} <span className="text-[10px] font-bold text-zinc-500">KM/L</span>
                    </span>
                  </div>
                  <InstantConsumptionCanvas instantConsumption={instantConsumption} />
                </div>

                {/* Botoes Trip */}
                <div className="flex gap-2">
                  <button
                    onClick={toggleTripState}
                    className="flex-1 py-2.5 border border-[#c19a6b] bg-[#c19a6b] text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex justify-center items-center gap-2 hover:bg-[#a88255] transition-colors shadow-md"
                  >
                    {activeTrip.active && !activeTrip.paused ? (
                      <>
                        <Pause size={15} /> Pausar
                      </>
                    ) : (
                      <>
                        <Play size={15} /> {activeTrip.paused ? 'Retomar' : 'Iniciar Trip'}
                      </>
                    )}
                  </button>

                  <button
                    onClick={resetTrip}
                    className="flex-1 py-2.5 border border-[#222] bg-[#121214] text-zinc-300 rounded-xl text-[10px] font-extrabold uppercase tracking-[0.2em] flex justify-center items-center gap-2 hover:text-white hover:border-[#444] transition-colors"
                  >
                    <RotateCcw size={15} /> Zerar Trip
                  </button>
                </div>
              </div>
            </div>

            {/* Fuel Gauge Card - Renault Clio Dial Style */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#080808] border border-[#1a1a1a] rounded-2xl p-3 sm:p-4 shadow-xl shrink-0 overflow-hidden">
              <div className="flex flex-col items-center shrink-0">
                <div className="bg-[#101014] border border-[#202028] rounded-2xl p-1.5 relative flex justify-center shadow-inner">
                  <FuelGaugeCanvas fuelLevel={carConfig.fuelLevel} tankCapacity={carConfig.tankCapacity} />
                  {carConfig.fuelLevel < 15 && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] border-2 border-white animate-pulse shadow-md">
                      R
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between gap-2 text-xs w-full min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-extrabold uppercase text-zinc-400">
                  <span className="truncate">Marcador Clio</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setShowPhotoScanner(true)}
                      className="flex items-center gap-1 bg-[#c19a6b]/20 hover:bg-[#c19a6b]/30 text-[#c19a6b] border border-[#c19a6b]/40 px-2 py-0.5 text-[9px] font-black rounded-full transition-all active:scale-95"
                      title="Escanear foto do marcador com IA"
                    >
                      <Sparkles size={11} /> Ler Foto com IA
                    </button>
                    <span className="text-[#c19a6b] bg-[#c19a6b]/10 border border-[#c19a6b]/30 px-2 py-0.5 text-[9px] font-black rounded-full tracking-wider">
                      {carConfig.currentFuel === 'gasoline' ? 'GASOLINA' : 'ETANOL'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="bg-[#101014] border border-[#202028] p-2 rounded-xl text-center min-w-0">
                    <div className="uppercase tracking-tight text-[8px] sm:text-[9px] text-zinc-400 font-extrabold truncate">Capacidade</div>
                    <div className="text-zinc-100 font-black text-xs sm:text-sm mt-0.5 truncate">{carConfig.tankCapacity} L</div>
                  </div>

                  <div className="bg-[#101014] border border-[#202028] p-2 rounded-xl text-center min-w-0">
                    <div className="uppercase tracking-tight text-[8px] sm:text-[9px] text-zinc-400 font-extrabold truncate">Reserva</div>
                    <div className="text-red-400 font-black text-xs sm:text-sm mt-0.5 truncate">~{reserveLiters} L</div>
                  </div>

                  <div className="bg-[#101014] border border-[#202028] p-2 rounded-xl text-center min-w-0">
                    <div className="uppercase tracking-tight text-[8px] sm:text-[9px] text-zinc-400 font-extrabold truncate">Autonomia</div>
                    <div className="text-[#c19a6b] font-black text-xs sm:text-sm mt-0.5 truncate">{autonomy} KM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          carConfig={carConfig}
          setCarConfig={setCarConfig}
          onClose={() => setShowSettings(false)}
          onOpenPhotoScanner={() => setShowPhotoScanner(true)}
        />
      )}

      {/* Fuel Photo Scanner Modal (Gemini AI Vision) */}
      <FuelPhotoScannerModal
        isOpen={showPhotoScanner}
        onClose={() => setShowPhotoScanner(false)}
        tankCapacity={carConfig.tankCapacity}
        onApplyFuelLevel={(percentage) => {
          setCarConfig((prev) => ({ ...prev, fuelLevel: percentage }));
        }}
      />
    </div>
  );
}
