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
  Sparkles,
  ChevronDown,
  Fuel
} from 'lucide-react';
import { SpeedCanvas } from './components/SpeedCanvas';
import { FuelGaugeCanvas } from './components/FuelGaugeCanvas';
import { InstantConsumptionCanvas } from './components/InstantConsumptionCanvas';
import { SpeedStockChart } from './components/SpeedStockChart';
import { OdometerDisplay } from './components/OdometerDisplay';
import { SettingsModal } from './components/SettingsModal';
import { FuelPhotoScannerModal } from './components/FuelPhotoScannerModal';
import { QuickRefuelModal } from './components/QuickRefuelModal';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
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

const STORAGE_KEY = 'clio_dashboard_telemetry_v1';

const getSavedState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Erro ao ler estado do localStorage', e);
  }
  return null;
};

export default function App() {
  const savedState = useRef(getSavedState()).current;

  const [carConfig, setCarConfig] = useState<CarConfig>(() => {
    // If state was saved previously, update fuelLevel to 18.5% if it was near 23.5%
    if (savedState?.carConfig) {
      const cfg = savedState.carConfig;
      if (cfg.fuelLevel === 23.5 || cfg.fuelLevel === 45) {
        return { ...cfg, fuelLevel: 18.5, currentFuel: 'gasoline', totalOdometerKm: cfg.totalOdometerKm ?? 149251 };
      }
      return { ...cfg, totalOdometerKm: cfg.totalOdometerKm ?? 149251 };
    }
    return {
      model: 'Renault Clio',
      details: '2010 1.0 16V Hi-Flex',
      tankCapacity: 50,
      currentFuel: 'gasoline',
      fuelLevel: 18.5, // Entre o 1º e o 2º traço acima da Reserva R (~9.25 Litros de 50L)
      avgConsumptionGasoline: 12.6,
      avgConsumptionEthanol: 8.9,
      totalOdometerKm: 149251,
    };
  });

  const [speed, setSpeed] = useState<number>(0);
  const [simulatedSpeed, setSimulatedSpeed] = useState<number>(45);
  const [gpsState, setGpsState] = useState<GpsState>({
    active: false,
    statusText: 'Aguardando',
    sourceText: '📍 Aguardando seleção de modo...',
  });

  const [mode, setMode] = useState<OperatingMode>(() => {
    if (savedState?.mode && savedState.mode !== 'pending') return savedState.mode;
    return 'pending';
  });
  const [speedLimit, setSpeedLimit] = useState<number>(80);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showPhotoScanner, setShowPhotoScanner] = useState<boolean>(false);
  const [showQuickRefuelModal, setShowQuickRefuelModal] = useState<boolean>(false);
  const [gpsDenied, setGpsDenied] = useState<boolean>(false);
  const [hudMode, setHudMode] = useState<boolean>(false);

  // Trip State
  const [activeTripKey, setActiveTripKey] = useState<TripKey>(() => {
    if (savedState?.activeTripKey) return savedState.activeTripKey;
    return 'a';
  });
  const [trips, setTrips] = useState<TripsState>(() => {
    if (savedState?.trips) return savedState.trips;
    return {
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
    };
  });

  // Save telemetry state to localStorage cache whenever changed
  useEffect(() => {
    try {
      const payload = {
        carConfig,
        activeTripKey,
        trips,
        mode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Erro ao salvar estado no localStorage', e);
    }
  }, [carConfig, activeTripKey, trips, mode]);

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

  const handleOdometerChange = (newKm: number) => {
    setCarConfig((prev) => ({
      ...prev,
      totalOdometerKm: newKm,
    }));
  };

  const handleQuickRefuel = (additionalLiters: number, fullTank?: boolean) => {
    setCarConfig((prev) => {
      let newFuelLevel = 100;
      if (!fullTank) {
        const currentLiters = (prev.tankCapacity * prev.fuelLevel) / 100;
        const targetLiters = Math.min(prev.tankCapacity, currentLiters + additionalLiters);
        newFuelLevel = (targetLiters / prev.tankCapacity) * 100;
      }
      return {
        ...prev,
        fuelLevel: Math.min(100, Math.max(0, newFuelLevel)),
      };
    });
    setShowQuickRefuelModal(false);
  };

  // Keep refs up-to-date for interval tick without causing effect recreation
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const activeTripKeyRef = useRef(activeTripKey);
  useEffect(() => {
    activeTripKeyRef.current = activeTripKey;
  }, [activeTripKey]);

  const carConfigRef = useRef(carConfig);
  useEffect(() => {
    carConfigRef.current = carConfig;
  }, [carConfig]);

  // Main tick for fuel consumption and trip tracking - Runs smoothly without interval resets
  useEffect(() => {
    lastTimestampRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = (now - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = now;

      const currentSpeed = speedRef.current;
      const currentTripKey = activeTripKeyRef.current;
      const currentConfig = carConfigRef.current;

      // Mileage and Fuel accumulation based on real speed
      if (currentSpeed > 0) {
        const baseConsumption =
          currentConfig.currentFuel === 'gasoline'
            ? currentConfig.avgConsumptionGasoline
            : currentConfig.avgConsumptionEthanol;

        // Distance covered in km = speed(km/h) * (deltaSeconds / 3600)
        const distanceKm = (currentSpeed / 3600) * deltaSeconds;
        // Liters consumed = distance / kmPerLiter
        const litersConsumed = baseConsumption > 0 ? distanceKm / baseConsumption : 0;
        // % of tank consumed
        const percentageConsumed = (litersConsumed / currentConfig.tankCapacity) * 100;

        setCarConfig((prev) => ({
          ...prev,
          fuelLevel: Math.max(0, prev.fuelLevel - percentageConsumed),
          totalOdometerKm: (prev.totalOdometerKm ?? 149251) + distanceKm,
        }));
      }

      // Update Active Trip
      setTrips((prevTrips) => {
        const trip = prevTrips[currentTripKey];
        if (!trip.active || trip.paused) return prevTrips;

        const speedMs = currentSpeed / 3.6;
        const distanceAdded = speedMs * deltaSeconds;

        const baseConsumption =
          currentConfig.currentFuel === 'gasoline'
            ? currentConfig.avgConsumptionGasoline
            : currentConfig.avgConsumptionEthanol;

        const instantCons =
          currentSpeed > 0
            ? currentSpeed < 20
              ? baseConsumption * 0.55
              : currentSpeed < 40
              ? baseConsumption * 0.85
              : currentSpeed <= 78
              ? baseConsumption * 1.25 // Eco zone (~2500 RPM)
              : currentSpeed <= 100
              ? baseConsumption * 0.85 // High RPM (>80 km/h)
              : baseConsumption * 0.70 // Very high RPM (>100 km/h)
            : 0;

        const fuelUsed =
          distanceAdded > 0 && instantCons > 0 ? distanceAdded / 1000 / instantCons : 0;

        const newSamples = [...trip.speedSamples, currentSpeed];
        if (newSamples.length > 120) newSamples.shift();

        return {
          ...prevTrips,
          [currentTripKey]: {
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
  }, []);

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
      : speed < 40
      ? baseConsumption * 0.85
      : speed <= 78
      ? baseConsumption * 1.25 // Zona Verde Eco (~2500 RPM)
      : speed <= 100
      ? baseConsumption * 0.85 // Acima de 80 km/h (Alto consumo)
      : baseConsumption * 0.70;

  const currentLitersNum = (carConfig.tankCapacity * carConfig.fuelLevel) / 100;
  const currentLiters = currentLitersNum.toFixed(1);
  const reserveLitersNum = carConfig.reserveLiters ?? (carConfig.tankCapacity * 0.1);
  const reserveLiters = reserveLitersNum.toFixed(1);
  const isReserveFuel = currentLitersNum <= reserveLitersNum;
  const autonomy = Math.round(currentLitersNum * baseConsumption);
  const fullTankAutonomy = Math.round(carConfig.tankCapacity * baseConsumption);

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

      {/* Main Dashboard Layout - Full Screen Car Head Unit Optimized */}
      <div className="w-full h-full flex flex-col justify-between gap-2 flex-1 max-w-none overflow-hidden">
        {/* Header Bar */}
        <header className="flex justify-between items-center px-3 py-2 bg-[#09090d] border border-[#1e1e28] rounded-2xl shadow-xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 border border-[#c19a6b] rounded-xl flex items-center justify-center text-[#c19a6b] bg-[#c19a6b]/15 shrink-0">
              <div className="w-3 h-3 bg-[#c19a6b] rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white leading-none tracking-tight">
                  {carConfig.model}
                </h1>
                <button
                  onClick={() =>
                    setCarConfig((prev) => ({
                      ...prev,
                      currentFuel: prev.currentFuel === 'gasoline' ? 'ethanol' : 'gasoline',
                    }))
                  }
                  className="text-[#c19a6b] bg-[#c19a6b]/15 hover:bg-[#c19a6b]/25 border border-[#c19a6b]/40 px-2.5 py-0.5 text-[10px] sm:text-xs font-black rounded-full tracking-wider transition-all active:scale-95"
                >
                  {carConfig.currentFuel === 'gasoline' ? '⛽ GASOLINA' : '🌿 ETANOL'}
                </button>
              </div>
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5 hidden xs:block">{carConfig.details}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* GPS Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black border uppercase tracking-wider ${
                gpsState.active
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  gpsState.active ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {gpsState.statusText}
            </div>

            {/* PWA Install Button */}
            <PwaInstallPrompt />

            {/* Quick AI Photo */}
            <button
              onClick={() => setShowPhotoScanner(true)}
              className="flex items-center gap-1 bg-[#c19a6b] hover:bg-[#a88255] text-black border border-[#c19a6b] px-2.5 py-1 text-[10px] sm:text-xs font-black rounded-xl uppercase tracking-wider transition-all active:scale-95 shadow-md"
              title="Escanear foto do tanque com IA"
            >
              <Sparkles size={14} /> <span className="hidden sm:inline">IA Foto</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 bg-[#14141e] hover:bg-[#1f1f2c] border border-[#2a2a3a] text-zinc-200 rounded-xl text-[10px] sm:text-xs font-extrabold flex items-center gap-1 transition-colors"
            >
              <Settings size={14} /> <span className="hidden md:inline">Ajustes</span>
            </button>

            {/* Reset */}
            <button
              onClick={() => {
                if (confirm('Deseja resetar as Trips e reabastecer o tanque para 100%?')) {
                  setTrips({
                    a: { active: false, paused: false, distance: 0, elapsedTime: 0, totalFuelConsumed: 0, speedSamples: [] },
                    b: { active: false, paused: false, distance: 0, elapsedTime: 0, totalFuelConsumed: 0, speedSamples: [] },
                  });
                  setCarConfig((prev) => ({ ...prev, fuelLevel: 100 }));
                }
              }}
              className="p-1.5 sm:px-2.5 sm:py-1 bg-[#14141e] hover:bg-[#1f1f2c] border border-[#2a2a3a] text-zinc-200 rounded-xl text-[10px] sm:text-xs font-extrabold flex items-center gap-1 transition-colors"
              title="Resetar Trips / Reabastecer"
            >
              <RefreshCw size={14} /> <span className="hidden lg:inline">Reset</span>
            </button>

            {/* HUD / Fullscreen toggle */}
            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              }}
              className="p-1.5 bg-[#14141e] hover:bg-[#1f1f2c] border border-[#2a2a3a] text-zinc-300 rounded-xl transition-colors"
              title="Tela Cheia"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </header>

        {/* Dashboard Grid - Fitted 100% vertically, No Scrolling */}
        <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 h-full overflow-hidden">
          {/* Column 1: Speedometer Gauge & Total Odometer (Col 4) */}
          <div className="col-span-12 md:col-span-4 flex flex-col gap-2 h-full min-h-0 justify-between">
            <div className="flex-1 min-h-0">
              <SpeedCanvas
                speed={speed}
                textSource={gpsState.sourceText}
                isSimulated={mode === 'simulated'}
                simulatedSpeed={simulatedSpeed}
                onSimulatedSpeedChange={handleSimulatedSpeedChange}
                speedLimit={speedLimit}
                onSpeedLimitChange={setSpeedLimit}
              />
            </div>

            {/* Renault Clio Digital Odometer */}
            <div className="shrink-0">
              <OdometerDisplay
                totalKm={carConfig.totalOdometerKm ?? 149251}
                onOdometerChange={handleOdometerChange}
              />
            </div>

            {/* Mode Switcher Footer */}
            <div className="bg-[#09090d] border border-[#1e1e28] p-2 rounded-2xl flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={() => setMode('pending')}
                className="flex-1 py-2 bg-[#14141e] hover:bg-[#1f1f2c] border border-[#2a2a3a] text-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider flex justify-center items-center gap-1.5 transition-colors"
              >
                <Compass size={15} /> Modo: {mode === 'real' ? 'GPS Real' : mode === 'simulated' ? 'Simulação' : 'Selecionar'}
              </button>
            </div>
          </div>

          {/* Column 2: Trip Computer & Speed Telemetry Stock Chart (Col 5) */}
          <div className="col-span-12 md:col-span-5 flex flex-col gap-2.5 h-full min-h-0 bg-[#09090d] border border-[#1e1e28] rounded-2xl p-2.5 sm:p-3 shadow-xl overflow-y-auto custom-scrollbar">
            {/* Trip Tabs Switcher */}
            <div className="flex bg-[#050508] border border-[#1e1e28] rounded-xl p-1 shrink-0">
              {(['a', 'b'] as TripKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setActiveTripKey(k)}
                  className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${
                    activeTripKey === k
                      ? 'text-[#c19a6b] bg-[#c19a6b]/20 border border-[#c19a6b]/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {k === 'a' ? <Route size={15} /> : <Map size={15} />}
                  TRIP {k.toUpperCase()}
                  {trips[k].active && !trips[k].paused && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                  )}
                </button>
              ))}
            </div>

            {/* 4 Primary High-Visibility Trip Cards (Large Size) */}
            <div className="grid grid-cols-2 gap-2 shrink-0 items-stretch">
              <div className="bg-[#12121c] border border-[#222232] p-3 sm:p-3.5 rounded-2xl flex flex-col justify-center items-center text-center shadow-inner">
                <span className="text-xs font-black uppercase tracking-wider text-[#c19a6b] mb-1">
                  DISTÂNCIA
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                  {(activeTrip.distance / 1000).toFixed(1)}
                </div>
                <span className="text-[10px] font-black text-zinc-400 uppercase mt-1">KM</span>
              </div>

              <div className="bg-[#12121c] border border-[#222232] p-3 sm:p-3.5 rounded-2xl flex flex-col justify-center items-center text-center shadow-inner">
                <span className="text-xs font-black uppercase tracking-wider text-[#c19a6b] mb-1">
                  TEMPO DECORRIDO
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                  {formatTime(activeTrip.elapsedTime)}
                </div>
                <span className="text-[10px] font-black text-zinc-400 uppercase mt-1">HH:MM:SS</span>
              </div>

              <div className="bg-[#12121c] border border-[#222232] p-3 sm:p-3.5 rounded-2xl flex flex-col justify-center items-center text-center shadow-inner">
                <span className="text-xs font-black uppercase tracking-wider text-[#c19a6b] mb-1">
                  CONSUMO MÉDIO
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                  {tripAvgCons}
                </div>
                <span className="text-[10px] font-black text-zinc-400 uppercase mt-1">KM / L</span>
              </div>

              <div className="bg-[#12121c] border border-[#222232] p-3 sm:p-3.5 rounded-2xl flex flex-col justify-center items-center text-center shadow-inner">
                <span className="text-xs font-black uppercase tracking-wider text-[#c19a6b] mb-1">
                  VELOCIDADE MÉDIA
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                  {tripAvgSpeed}
                </div>
                <span className="text-[10px] font-black text-zinc-400 uppercase mt-1">KM / H</span>
              </div>
            </div>

            {/* Trip Action Buttons */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <button
                onClick={toggleTripState}
                className="py-2.5 sm:py-3 border border-[#c19a6b] bg-[#c19a6b] hover:bg-[#a88255] text-black rounded-xl text-xs sm:text-sm font-black uppercase tracking-[0.15em] flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-lg"
              >
                {activeTrip.active && !activeTrip.paused ? (
                  <>
                    <Pause size={18} /> PAUSAR TRIP
                  </>
                ) : (
                  <>
                    <Play size={18} /> {activeTrip.paused ? 'RETOMAR' : 'INICIAR TRIP'}
                  </>
                )}
              </button>

              <button
                onClick={resetTrip}
                className="py-2.5 sm:py-3 border border-[#2a2a3c] bg-[#14141e] hover:bg-[#1f1f2c] text-zinc-200 hover:text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-[0.15em] flex justify-center items-center gap-2 transition-transform active:scale-95"
              >
                <RotateCcw size={18} /> ZERAR TRIP
              </button>
            </div>

            {/* Instant Consumption */}
            <div className="bg-[#12121c] border border-[#222232] px-3 py-2 rounded-2xl shrink-0">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  CONSUMO INSTANTÂNEO
                </span>
                <span className="text-base sm:text-lg font-black text-[#c19a6b]">
                  {instantConsumption.toFixed(1)} <span className="text-xs font-extrabold text-zinc-400">KM/L</span>
                </span>
              </div>
              <InstantConsumptionCanvas instantConsumption={instantConsumption} />
            </div>

            {/* Scroll Indicator Badge */}
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 text-[10px] font-black uppercase text-[#c19a6b] bg-[#14141f] border border-[#2a2a3e] rounded-xl shrink-0 my-0.5">
              <span>Deslize a coluna para ver Telemetria (B3)</span>
              <ChevronDown size={14} className="animate-bounce text-[#c19a6b]" />
            </div>

            {/* B3 Stock Market Style Speed Chart (Gráfico de Bolsa de Valores) */}
            <div className="shrink-0 pt-1">
              <SpeedStockChart
                speedSamples={activeTrip.speedSamples}
                currentSpeed={speed}
                avgSpeed={Number(tripAvgSpeed) || 0}
                speedLimit={speedLimit}
              />
            </div>
          </div>

          {/* Column 3: Renault Clio Fuel Gauge & Tank Info (Col 3) */}
          <div
            className={`col-span-12 md:col-span-3 flex flex-col justify-between gap-2 h-full min-h-0 border rounded-2xl p-2.5 sm:p-3 shadow-xl overflow-hidden transition-colors ${
              isReserveFuel
                ? 'bg-[#150a0a] border-red-500/60 shadow-red-950/40'
                : 'bg-[#09090d] border-[#1e1e28]'
            }`}
          >
            <div className="flex items-center justify-between pb-1 border-b border-[#1e1e28] shrink-0">
              <span className="text-xs font-black uppercase tracking-wider text-[#c19a6b] flex items-center gap-1.5">
                MARCADOR CLIO
                {isReserveFuel && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/60 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                    ⚠️ RESERVA!
                  </span>
                )}
              </span>
              <span className="text-[10px] font-black text-zinc-400 uppercase">
                {carConfig.currentFuel === 'gasoline' ? 'GASOLINA' : 'ETANOL'}
              </span>
            </div>

            {/* Refuel & Photo Scan Action Buttons */}
            <div className="grid grid-cols-2 gap-1.5 shrink-0">
              <button
                onClick={() => setShowQuickRefuelModal(true)}
                className="py-1.5 px-2 bg-[#1b1b2a] hover:bg-[#25253b] text-amber-400 border border-amber-500/40 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
              >
                <Fuel size={14} className="text-amber-400" /> Abastecer
              </button>
              <button
                onClick={() => setShowPhotoScanner(true)}
                className="py-1.5 px-2 bg-[#14141e] hover:bg-[#1f1f2c] text-[#c19a6b] border border-[#c19a6b]/40 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
              >
                <Sparkles size={14} className="text-[#c19a6b]" /> Escanear
              </button>
            </div>

            {/* Dial Canvas */}
            <div className="flex justify-center items-center relative shrink-0 my-0.5">
              <div
                className={`border rounded-2xl p-1.5 relative flex justify-center shadow-inner ${
                  isReserveFuel
                    ? 'bg-[#1e0a0a] border-red-500/50'
                    : 'bg-[#12121c] border-[#222232]'
                }`}
              >
                <FuelGaugeCanvas
                  fuelLevel={carConfig.fuelLevel}
                  tankCapacity={carConfig.tankCapacity}
                  reserveLiters={reserveLitersNum}
                />
                {isReserveFuel && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-xs border-2 border-white animate-bounce shadow-md">
                    R
                  </div>
                )}
              </div>
            </div>

            {/* Tank Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 my-0.5">
              <div
                className={`p-2 rounded-xl text-center flex flex-col justify-center border ${
                  isReserveFuel
                    ? 'bg-red-950/30 border-red-500/50'
                    : 'bg-[#12121c] border-[#222232]'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">NO TANQUE</span>
                <div className={`text-lg sm:text-xl font-black mt-0.5 ${isReserveFuel ? 'text-red-400' : 'text-white'}`}>
                  {currentLiters} L
                </div>
                <span className="text-[9px] text-zinc-400 font-bold">de {carConfig.tankCapacity} L ({carConfig.fuelLevel.toFixed(1)}%)</span>
              </div>

              <div
                className={`p-2 rounded-xl text-center flex flex-col justify-center border ${
                  isReserveFuel
                    ? 'bg-red-500/20 border-red-500 shadow-md animate-pulse'
                    : 'bg-[#12121c] border-[#222232]'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-red-400">RESERVA</span>
                <div className="text-lg sm:text-xl font-black text-red-400 mt-0.5">
                  {isReserveFuel ? '⚠️ EM RESERVA' : `≤ ${reserveLiters} L`}
                </div>
                <span className="text-[9px] text-zinc-400 font-bold">
                  {isReserveFuel ? `${currentLiters}L ≤ ${reserveLiters}L` : `Limite ${reserveLiters} Litros`}
                </span>
              </div>

              <div className="bg-[#12121c] border border-[#222232] p-2 rounded-xl text-center flex flex-col justify-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#c19a6b]">AUTONOMIA ATUAL</span>
                <div className="text-xl sm:text-2xl font-black text-[#c19a6b] mt-0.5">{autonomy} KM</div>
                <span className="text-[9px] text-zinc-400 font-bold">com {currentLiters} Litros</span>
              </div>

              <div className="bg-[#12121c] border border-[#222232] p-2 rounded-xl text-center flex flex-col justify-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">TANQUE CHEIO</span>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{fullTankAutonomy} KM</div>
                <span className="text-[9px] text-zinc-400 font-bold">{carConfig.tankCapacity}L @ {baseConsumption} km/L</span>
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

      {/* Quick Refuel Modal */}
      {showQuickRefuelModal && (
        <QuickRefuelModal
          carConfig={carConfig}
          onRefuel={handleQuickRefuel}
          onClose={() => setShowQuickRefuelModal(false)}
        />
      )}
    </div>
  );
}
