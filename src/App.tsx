import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Fuel,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  AlertTriangle,
  Sun,
  Activity
} from 'lucide-react';
import { SpeedCanvas } from './components/SpeedCanvas';
import { FuelGaugeCanvas } from './components/FuelGaugeCanvas';
import { InstantConsumptionCanvas } from './components/InstantConsumptionCanvas';
import { SpeedStockChart } from './components/SpeedStockChart';
import { OdometerDisplay } from './components/OdometerDisplay';
import { FuelPhotoScannerModal } from './components/FuelPhotoScannerModal';
import { QuickRefuelModal } from './components/QuickRefuelModal';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { CarConfig, TripsState, TripKey, OperatingMode, GpsState } from './types';
import { getDoc, setDoc } from "firebase/firestore";
import { carDocRef } from "./firebase";

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
    if (savedState?.carConfig) {
      const cfg = savedState.carConfig;
      // One-time 800 meters (0.8 km) offset correction to align with the car's odometer
      if (localStorage.getItem('odometer_offset_800m_applied') !== 'true') {
        cfg.totalOdometerKm = (cfg.totalOdometerKm ?? 149545) + 0.8;
        localStorage.setItem('odometer_offset_800m_applied', 'true');
      }
      if (cfg.totalOdometerKm < 149545.8) {
        cfg.totalOdometerKm = 149545.8;
      }
      // Force update to 12.5% once based on latest refueling Clio photo (2nd tick above bottom)
      if (localStorage.getItem('fuel_override_12_5_done_v2') !== 'true') {
        cfg.fuelLevel = 12.5;
        localStorage.setItem('fuel_override_12_5_done_v2', 'true');
      }
      return cfg;
    }
    return {
      model: 'Renault Clio',
      details: '2010 1.0 16V Hi-Flex',
      tankCapacity: 50,
      currentFuel: 'gasoline',
      fuelLevel: 12.5, // ~6.25 Litros (Atualizado via nova foto do painel após uso, no 2º tracinho)
      avgConsumptionGasoline: 12.6,
      avgConsumptionEthanol: 8.9,
      totalOdometerKm: 149545.8,
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
  const [showPhotoScanner, setShowPhotoScanner] = useState<boolean>(false);
  const [showQuickRefuelModal, setShowQuickRefuelModal] = useState<boolean>(false);
  const [gpsDenied, setGpsDenied] = useState<boolean>(false);
  const [hudMode, setHudMode] = useState<boolean>(false);
  
  // Real-time Clock and Date
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Coordinates & Weather Info
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [weather, setWeather] = useState<{
    temp: number;
    tempMax: number;
    tempMin: number;
    rainProb: number;
    weatherCode: number;
    description: string;
    emoji: string;
    isRaining: boolean;
    cityName: string;
  } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const lastFetchedCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Fetch city name from OpenStreetMap Nominatim
  const fetchCityName = async (lat: number, lon: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
        headers: {
          'Accept-Language': 'pt-BR',
          'User-Agent': 'ClioDashboard/1.0'
        }
      });
      const data = await res.json();
      return data.address.city || data.address.town || data.address.suburb || data.address.village || 'Sua Rota';
    } catch (e) {
      return 'Sua Rota';
    }
  };

  const fetchWeatherInfo = async (lat: number, lon: number) => {
    setWeatherLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();
      
      const code = data.current.weather_code;
      const temp = data.current.temperature_2m;
      const isRaining = data.current.precipitation > 0;
      const tempMax = data.daily.temperature_2m_max[0];
      const tempMin = data.daily.temperature_2m_min[0];
      const rainProb = data.daily.precipitation_probability_max[0];
      
      // Map WMO codes
      let description = 'Céu Limpo';
      let emoji = '☀️';
      
      if (code === 0) {
        description = 'Céu Limpo';
        emoji = '☀️';
      } else if (code >= 1 && code <= 3) {
        description = 'Parcialmente Nublado';
        emoji = '🌤️';
      } else if (code === 45 || code === 48) {
        description = 'Névoa';
        emoji = '🌫️';
      } else if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
        description = isRaining ? 'Chovendo' : 'Chuva';
        emoji = '🌧️';
      } else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
        description = 'Neve';
        emoji = '❄️';
      } else if (code >= 95) {
        description = 'Tempestade';
        emoji = '⛈️';
      }
      
      const city = await fetchCityName(lat, lon);
      
      setWeather({
        temp,
        tempMax,
        tempMin,
        rainProb,
        weatherCode: code,
        description,
        emoji,
        isRaining,
        cityName: city
      });
    } catch (err) {
      console.error('Erro ao buscar previsão do tempo:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  // Clock ticks
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial GPS grab & fallback weather loading
  useEffect(() => {
    const defaultLat = -23.55052;
    const defaultLon = -46.633308;

    const triggerInitialFetch = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            setCoords({ latitude: lat, longitude: lon });
            lastFetchedCoordsRef.current = { latitude: lat, longitude: lon };
            fetchWeatherInfo(lat, lon);
          },
          (err) => {
            console.warn('GPS inicial para clima não concedido, usando padrão:', err.message);
            setCoords({ latitude: defaultLat, longitude: defaultLon });
            lastFetchedCoordsRef.current = { latitude: defaultLat, longitude: defaultLon };
            fetchWeatherInfo(defaultLat, defaultLon);
          },
          { enableHighAccuracy: false, timeout: 5000 }
        );
      } else {
        setCoords({ latitude: defaultLat, longitude: defaultLon });
        lastFetchedCoordsRef.current = { latitude: defaultLat, longitude: defaultLon };
        fetchWeatherInfo(defaultLat, defaultLon);
      }
    };

    triggerInitialFetch();

    // 30 minute interval
    const weatherInterval = setInterval(() => {
      const current = lastFetchedCoordsRef.current || { latitude: defaultLat, longitude: defaultLon };
      fetchWeatherInfo(current.latitude, current.longitude);
    }, 30 * 60 * 1000);

    return () => clearInterval(weatherInterval);
  }, []);

  // Fetch weather when coords changed significantly (> 2km)
  useEffect(() => {
    if (!coords) return;
    const last = lastFetchedCoordsRef.current;
    if (!last) {
      lastFetchedCoordsRef.current = coords;
      fetchWeatherInfo(coords.latitude, coords.longitude);
    } else {
      const distance = calculateDistance(last.latitude, last.longitude, coords.latitude, coords.longitude);
      if (distance > 2000) {
        lastFetchedCoordsRef.current = coords;
        fetchWeatherInfo(coords.latitude, coords.longitude);
      }
    }
  }, [coords]);

  const getFormattedDate = (date: Date) => {
    const daysOfWeek = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado'
    ];
    const dayOfWeek = daysOfWeek[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return {
      dayOfWeek,
      dateStr: `${day}/${month}/${year}`
    };
  };
  

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  // Sync with Cloud on mount
  useEffect(() => {
    const syncCloud = async () => {
      try {
        const docSnap = await getDoc(carDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const localTime = savedState?.lastUpdated || 0;
          const cloudTime = data.lastUpdated || 0;
          
          if (cloudTime >= localTime) {
            if (data.carConfig) {
              const cfg = data.carConfig;
              // One-time 800 meters (0.8 km) offset correction to align with the car's odometer
              if (localStorage.getItem('odometer_offset_800m_applied') !== 'true') {
                cfg.totalOdometerKm = (cfg.totalOdometerKm ?? 149545) + 0.8;
                localStorage.setItem('odometer_offset_800m_applied', 'true');
              }
              if (cfg.totalOdometerKm < 149545.8) cfg.totalOdometerKm = 149545.8;
              if (localStorage.getItem('fuel_override_12_5_done_v2') !== 'true') {
                cfg.fuelLevel = 12.5;
                localStorage.setItem('fuel_override_12_5_done_v2', 'true');
              }
              setCarConfig(cfg);
            }
            if (data.activeTripKey) setActiveTripKey(data.activeTripKey);
            if (data.trips) setTrips(data.trips);
            if (data.mode && data.mode !== 'pending') setMode(data.mode);
          } else {
            console.log("Local state is newer than cloud state. Skipping cloud override.");
          }
        }
      } catch (err) {
        console.error("Error fetching from Firebase", err);
      } finally {
        setIsCloudSynced(true);
      }
    };
    syncCloud();
  }, []);

  const [prevSpeed, setPrevSpeed] = useState<number>(0);
  const [instantConsumption, setInstantConsumption] = useState<number>(0);
  const instantConsumptionRef = useRef<number>(0);

  // Sync state to ref
  useEffect(() => {
    instantConsumptionRef.current = instantConsumption;
  }, [instantConsumption]);

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

  // Save telemetry state to localStorage AND Firebase whenever changed
  useEffect(() => {
    if (!isCloudSynced) return; // Wait for initial cloud sync

    try {
      const payload = {
        carConfig,
        activeTripKey,
        trips,
        mode,
        lastUpdated: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      
      // Background sync to Firebase (handles offline persistence automatically)
      setDoc(carDocRef, payload, { merge: true }).catch((err) => {
        console.warn('Firebase sync delayed (offline mode):', err);
      });
    } catch (e) {
      console.error('Erro ao salvar estado', e);
    }
  }, [carConfig, activeTripKey, trips, mode, isCloudSynced]);

  // Dynamic Instant Consumption Calculation (Oscillating with Acceleration/Deceleration)
  useEffect(() => {
    const accel = speed - prevSpeed;
    setPrevSpeed(speed);

    const base = carConfig.currentFuel === 'gasoline' 
      ? carConfig.avgConsumptionGasoline 
      : carConfig.avgConsumptionEthanol;

    let cons = 0;
    
    if (speed > 0) {
      let idealCons = base;
      if (speed < 20) idealCons = base * 0.55;
      else if (speed < 40) idealCons = base * 0.85;
      else if (speed <= 78) idealCons = base * 1.25;
      else if (speed <= 100) idealCons = base * 0.85;
      else idealCons = base * 0.70;

      if (accel > 1) {
        // Accelerating hard: lower km/l (worse performance)
        cons = idealCons * Math.max(0.2, 1 - accel * 0.15);
      } else if (accel < -1) {
        // Decelerating/Engine Brake: high km/l (great performance)
        cons = idealCons * Math.min(4.0, 1 + Math.abs(accel) * 0.4);
      } else {
        // Constant speed or slight variation: minor oscillation
        cons = idealCons * (0.95 + Math.random() * 0.1);
      }
    }
    
    if (cons > 99.9) cons = 99.9;
    setInstantConsumption(cons);
  }, [speed, carConfig.currentFuel, carConfig.avgConsumptionGasoline, carConfig.avgConsumptionEthanol]);

  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockRef = useRef<any>(null);

  const [backgroundAudioActive, setBackgroundAudioActive] = useState<boolean>(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const startSilentAudio = useCallback(() => {
    if (!backgroundAudioActive) return;
    try {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        return;
      }
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      // We generate a tiny buffer of silence and loop it to keep the audio thread alive
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); // 2 seconds of silence
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);

      console.log('Background silent audio track started successfully');
    } catch (e) {
      console.warn('Silent audio start error:', e);
    }
  }, [backgroundAudioActive]);

  const stopSilentAudio = useCallback(() => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      console.log('Background silent audio track stopped');
    } catch (e) {
      console.warn('Silent audio stop error:', e);
    }
  }, []);

  // Control background audio based on mode
  useEffect(() => {
    if (mode === 'real' || mode === 'simulated') {
      startSilentAudio();
    } else {
      stopSilentAudio();
    }
    return () => {
      stopSilentAudio();
    };
  }, [mode, backgroundAudioActive, startSilentAudio, stopSilentAudio]);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      console.log('Screen Wake Lock API not supported');
      return;
    }
    try {
      if (wakeLockRef.current) return;
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      setWakeLockActive(true);
      console.log('Screen Wake Lock acquired');
      
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null;
        setWakeLockActive(false);
        console.log('Screen Wake Lock was released');
      });
    } catch (err: any) {
      console.warn(`Failed to acquire wake lock: ${err.message}`);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  // Screen Wake Lock controller based on active tracking
  useEffect(() => {
    if (mode === 'real') {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [mode, requestWakeLock, releaseWakeLock]);

  // Re-acquire Wake Lock when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && mode === 'real') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [mode, requestWakeLock, releaseWakeLock]);

  // References for GPS & simulation
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ coords: GeolocationCoordinates; timestamp: number } | null>(null);
  const lastTimestampRef = useRef<number>(Date.now());
  const middleColRef = useRef<HTMLDivElement>(null);

  // Force scroll to top on initial page load / refresh / tab reopen
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (middleColRef.current) {
      middleColRef.current.scrollTop = 0;
    }
  }, []);

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
          let distanceKm = 0;
          let timeDiff = 0;

          if (position.coords.speed !== null && position.coords.speed !== undefined) {
            currentSpeedKmh = position.coords.speed * 3.6;
          } else if (lastPosRef.current) {
            const dist = calculateDistance(
              lastPosRef.current.coords.latitude,
              lastPosRef.current.coords.longitude,
              position.coords.latitude,
              position.coords.longitude
            );
            timeDiff = (now - lastPosRef.current.timestamp) / 1000;
            if (timeDiff > 0) {
              currentSpeedKmh = (dist / timeDiff) * 3.6;
            }
          }

          // Anti-drift filter for static position
          if (currentSpeedKmh < 2.0) currentSpeedKmh = 0;

          // Calculate distance and elapsed time from previous GPS tick
          if (lastPosRef.current) {
            const distMeters = calculateDistance(
              lastPosRef.current.coords.latitude,
              lastPosRef.current.coords.longitude,
              position.coords.latitude,
              position.coords.longitude
            );
            // Ignore minor jitter when stopped (under 15 meters) unless speed indicates we are definitely driving
            if (distMeters > 15 || currentSpeedKmh >= 2.0) {
              distanceKm = distMeters / 1000;
              timeDiff = (now - lastPosRef.current.timestamp) / 1000;
            }
          }

          lastPosRef.current = { coords: position.coords, timestamp: now };
          setSpeed(currentSpeedKmh);
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });

          // Accumulate background/foreground mileage and fuel directly via GPS ticks
          if (distanceKm > 0) {
            const currentConfig = carConfigRef.current;
            const baseConsumption =
              currentConfig.currentFuel === 'gasoline'
                ? currentConfig.avgConsumptionGasoline
                : currentConfig.avgConsumptionEthanol;

            const litersConsumed = baseConsumption > 0 ? distanceKm / baseConsumption : 0;
            const percentageConsumed = (litersConsumed / currentConfig.tankCapacity) * 100;

            setCarConfig((prev) => ({
              ...prev,
              fuelLevel: Math.max(0, prev.fuelLevel - percentageConsumed),
              totalOdometerKm: (prev.totalOdometerKm ?? 149545.8) + distanceKm,
            }));

            // Update Active Trip
            const currentTripKey = activeTripKeyRef.current;
            setTrips((prevTrips) => {
              const trip = prevTrips[currentTripKey];
              if (!trip.active || trip.paused) return prevTrips;

              const instantCons = instantConsumptionRef.current;
              const fuelUsed =
                distanceKm > 0 && instantCons > 0 ? distanceKm / instantCons : 0;

              const newSamples = [...trip.speedSamples, currentSpeedKmh];
              if (newSamples.length > 120) newSamples.shift();

              return {
                ...prevTrips,
                [currentTripKey]: {
                  ...trip,
                  // Add timeDiff safely (ignore giant jumps if browser was hibernated, max 60s of time counted per interval)
                  elapsedTime: trip.elapsedTime + (timeDiff > 0 && timeDiff < 60 ? timeDiff : 1),
                  distance: trip.distance + (distanceKm * 1000),
                  totalFuelConsumed: trip.totalFuelConsumed + fuelUsed,
                  speedSamples: newSamples,
                },
              };
            });
          }

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

  const handleQuickRefuel = (additionalLiters: number, fullTank?: boolean, fuelType?: 'gasoline' | 'ethanol') => {
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
        currentFuel: fuelType || prev.currentFuel,
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

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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
      const currentMode = modeRef.current;

      if (currentMode === 'simulated') {
        // Mileage and Fuel accumulation based on simulated speed
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
            totalOdometerKm: (prev.totalOdometerKm ?? 149545.8) + distanceKm,
          }));
        }

        // Update Active Trip
        setTrips((prevTrips) => {
          const trip = prevTrips[currentTripKey];
          if (!trip.active || trip.paused) return prevTrips;

          const speedMs = currentSpeed / 3.6;
          const distanceAdded = speedMs * deltaSeconds;

          const instantCons = instantConsumptionRef.current;

          const fuelUsed =
            distanceAdded > 0 && instantCons > 0 ? distanceAdded / 1000 / instantCons : 0;

          const newSamples = [...trip.speedSamples, currentSpeed];
          if (newSamples.length > 120) newSamples.shift();

          const isMoving = currentSpeed > 0;

          return {
            ...prevTrips,
            [currentTripKey]: {
              ...trip,
              // Tempo líquido de viagem: só incrementa quando o veículo estiver em movimento (velocidade > 0)
              elapsedTime: isMoving ? trip.elapsedTime + deltaSeconds : trip.elapsedTime,
              distance: trip.distance + distanceAdded,
              totalFuelConsumed: trip.totalFuelConsumed + fuelUsed,
              speedSamples: newSamples,
            },
          };
        });
      } else if (currentMode === 'real') {
        // In real GPS mode, accumulation is handled with 100% precision in watchPosition.
        // We only gather speed samples here for the stock chart visual.
        setTrips((prevTrips) => {
          const trip = prevTrips[currentTripKey];
          if (!trip.active || trip.paused) return prevTrips;

          const newSamples = [...trip.speedSamples, currentSpeed];
          if (newSamples.length > 120) newSamples.shift();

          return {
            ...prevTrips,
            [currentTripKey]: {
              ...trip,
              speedSamples: newSamples,
            },
          };
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleTripState = () => {
    startSilentAudio();
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
              onClick={() => {
                setMode('real');
                startSilentAudio();
              }}
              className="w-full bg-[#c19a6b] hover:bg-[#a88255] text-black font-black py-3.5 text-xs uppercase tracking-[0.2em] rounded-xl mb-3 flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
            >
              <CheckCircle size={18} /> {gpsDenied ? 'Tentar GPS Novamente' : 'Iniciar GPS Real'}
            </button>

            <button
              onClick={() => {
                setMode('simulated');
                startSilentAudio();
              }}
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
        <header className="flex justify-between items-center px-3 py-2 bg-[#09090d] border border-[#1e1e28] rounded-2xl shadow-xl shrink-0 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 border border-[#c19a6b] rounded-xl flex items-center justify-center text-[#c19a6b] bg-[#c19a6b]/15 shrink-0">
              <div className="w-3 h-3 bg-[#c19a6b] rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-lg font-black text-white leading-none tracking-tight">
                  {carConfig.model}
                </h1>
                <button
                  onClick={() =>
                    setCarConfig((prev) => ({
                      ...prev,
                      currentFuel: prev.currentFuel === 'gasoline' ? 'ethanol' : 'gasoline',
                    }))
                  }
                  className="text-[#c19a6b] bg-[#c19a6b]/15 hover:bg-[#c19a6b]/25 border border-[#c19a6b]/40 px-2.5 py-0.5 text-[9px] sm:text-xs font-black rounded-full tracking-wider transition-all active:scale-95"
                >
                  {carConfig.currentFuel === 'gasoline' ? '⛽ GASOLINA' : '🌿 ETANOL'}
                </button>
              </div>
              <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5 hidden xs:block">{carConfig.details}</div>
            </div>
          </div>

          {/* Dynamic Clock, Date & GPS Weather Info - Highly Polished Car HUD Center Console */}
          <div className="flex flex-col items-center justify-center bg-[#0d0d16] border border-[#222234] rounded-2xl px-2.5 sm:px-4 py-1 shadow-[inset_0_0_8px_rgba(0,0,0,0.8)] select-none relative overflow-hidden min-w-[120px] sm:min-w-[220px] md:min-w-[280px]">
            {/* Clock with seconds - glowing amber */}
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-base md:text-lg font-black text-amber-400 font-mono tracking-widest drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
                {currentTime.toLocaleTimeString('pt-BR')}
              </span>
            </div>

            {/* Day & Date - glowing emerald */}
            <div className="text-[7px] sm:text-[9px] md:text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 mt-0.5">
              <span>{getFormattedDate(currentTime).dayOfWeek}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              <span className="text-emerald-400 font-black drop-shadow-[0_0_5px_rgba(52,211,153,0.7)]">
                {getFormattedDate(currentTime).dateStr}
              </span>
            </div>

            {/* Weather Info */}
            {weather ? (
              <div className="flex items-center gap-1 md:gap-1.5 mt-0.5 md:mt-1 px-1 sm:px-2.5 py-0.5 bg-[#141424] rounded-xl border border-[#2c2c42] shadow-sm text-[7px] sm:text-[10px] md:text-[11px] font-extrabold text-zinc-200">
                <span className="text-[10px] sm:text-xs select-none">
                  {weather.emoji}
                </span>
                <div className="flex items-center gap-0.5">
                  <span className="text-white font-black drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]">
                    {weather.temp.toFixed(1)}°C
                  </span>
                  <span className="text-zinc-500 font-bold text-[7px] sm:text-[9px]">
                    ({weather.tempMin.toFixed(0)}°/{weather.tempMax.toFixed(0)}°)
                  </span>
                </div>
                <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-zinc-600" />
                <span className="text-[#c19a6b] font-black uppercase text-[6px] sm:text-[9px] tracking-wide max-w-[40px] sm:max-w-none truncate">
                  {weather.cityName}
                </span>
                {weather.rainProb > 0 ? (
                  <>
                    <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-zinc-600" />
                    <span className="text-blue-400 font-black flex items-center gap-0.5 text-[6px] sm:text-[9px] drop-shadow-[0_0_4px_rgba(96,165,250,0.5)]">
                      🌧️ {weather.rainProb}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-zinc-600" />
                    <span className="text-amber-500 font-black flex items-center gap-0.5 text-[6px] sm:text-[9px]">
                      ☀️ Sem Chuva
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-[6px] sm:text-[9px] text-zinc-500 mt-0.5 md:mt-1 animate-pulse flex items-center gap-1 font-bold uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Sincronizando clima...
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* GPS Status Indicator */}
            <div
              className={`flex items-center justify-center p-1.5 rounded-xl border ${
                gpsState.active
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
              }`}
              title={gpsState.statusText}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  gpsState.active ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </div>

            {/* Mode Switcher */}
            <button
              onClick={() => setMode('pending')}
              className="p-1.5 bg-[#14141e] hover:bg-[#1f1f2c] border border-[#2a2a3a] text-zinc-200 rounded-xl transition-colors"
              title={mode === 'real' ? 'GPS Real' : mode === 'simulated' ? 'Simulação' : 'Selecionar Modo'}
            >
              <Compass size={14} />
            </button>
            
            {/* Quick AI Photo */}
            <button
              onClick={() => setShowPhotoScanner(true)}
              className="p-1.5 bg-[#14141e] hover:bg-[#1f1f2c] border border-[#c19a6b]/40 text-[#c19a6b] rounded-xl transition-colors shadow-md"
              title="Escanear foto do tanque com IA"
            >
              <Sparkles size={14} />
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
              className="p-1.5 bg-[#14141e] hover:bg-[#1f1f2c] border border-[#2a2a3a] text-zinc-200 rounded-xl transition-colors"
              title="Resetar Trips / Reabastecer"
            >
              <RefreshCw size={14} />
            </button>

            {mode === 'simulated' && (
              <div className="flex items-center gap-2 w-24">
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={simulatedSpeed}
                  onChange={(e) => handleSimulatedSpeedChange(Number(e.target.value))}
                  className="w-full cursor-pointer accent-[#c19a6b]"
                  title={`Simulador: ${Math.round(simulatedSpeed)} km/h`}
                />
              </div>
            )}

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
            {/* Speedometer Gauge */}
            <div className="flex-1 min-h-0 flex flex-col">
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
                totalKm={carConfig.totalOdometerKm ?? 149545.8}
                onOdometerChange={handleOdometerChange}
              />
            </div>
          </div>

          {/* Column 2: Trip Computer & Speed Telemetry Stock Chart (Col 5) */}
          <div ref={middleColRef} className="col-span-12 md:col-span-5 flex flex-col gap-2.5 h-full min-h-0 bg-[#09090d] border border-[#1e1e28] rounded-2xl p-2.5 sm:p-3 shadow-xl overflow-y-auto custom-scrollbar overscroll-contain pb-6 sm:pb-4 relative">
            {/* Trip Tabs Switcher */}
            <div className="flex bg-[#050508] border border-[#1e1e28] rounded-xl p-1 shrink-0">
              {(['a', 'b'] as TripKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setActiveTripKey(k)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${
                    activeTripKey === k
                      ? 'text-[#c19a6b] bg-[#c19a6b]/20 border border-[#c19a6b]/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {k === 'a' ? <Route size={16} /> : <Map size={16} />}
                  TRIP {k.toUpperCase()}
                  {trips[k].active && !trips[k].paused && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                  )}
                </button>
              ))}
            </div>

            {/* 4 Primary High-Visibility Trip Cards */}
            <div className="grid grid-cols-2 gap-2.5 shrink-0 items-stretch">
              <div className="bg-[#12121c] border border-[#222232] p-3.5 sm:p-4 rounded-2xl flex flex-col justify-center items-center text-center shadow-inner">
                <span className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider text-[#c19a6b] mb-1.5">
                  DISTÂNCIA
                </span>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                  {(activeTrip.distance / 1000).toFixed(1)}
                </div>
                <span className="text-sm font-black text-zinc-400 uppercase mt-2">KM</span>
              </div>

              <div className="bg-[#12121c] border border-[#222232] p-3.5 sm:p-4 rounded-2xl flex flex-col justify-center items-center text-center shadow-inner">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider text-[#c19a6b]">
                    TEMPO LÍQUIDO
                  </span>
                  {speed === 0 && activeTrip.active && !activeTrip.paused && (
                    <span className="text-[10px] font-black text-amber-400 bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 rounded-full animate-pulse">
                      PAUSADO
                    </span>
                  )}
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                  {formatTime(activeTrip.elapsedTime)}
                </div>
                <span className="text-sm font-black text-zinc-400 uppercase mt-2">
                  HH:MM:SS ({speed > 0 ? 'EM MOVIMENTO' : 'PARADO'})
                </span>
              </div>

              <div className="bg-[#12121c] border border-[#222232] p-3.5 sm:p-4 rounded-2xl flex flex-col justify-center items-center text-center shadow-inner">
                <span className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider text-[#c19a6b] mb-1.5">
                  CONSUMO MÉDIO
                </span>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                  {tripAvgCons}
                </div>
                <span className="text-sm font-black text-zinc-400 uppercase mt-2">KM / L</span>
              </div>

              <div className="bg-[#12121c] border border-[#222232] p-3.5 sm:p-4 rounded-2xl flex flex-col justify-center items-center text-center shadow-inner">
                <span className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider text-[#c19a6b] mb-1.5">
                  VELOCIDADE MÉDIA
                </span>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                  {tripAvgSpeed}
                </div>
                <span className="text-sm font-black text-zinc-400 uppercase mt-2">KM / H</span>
              </div>
            </div>

            {/* Trip Action Buttons */}
            <div className="grid grid-cols-2 gap-2 shrink-0 mt-2">
              <button
                onClick={toggleTripState}
                className="py-3 sm:py-4 border border-[#c19a6b] bg-[#c19a6b] hover:bg-[#a88255] text-black rounded-xl text-sm sm:text-base font-black uppercase tracking-[0.15em] flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-lg"
              >
                {activeTrip.active && !activeTrip.paused ? (
                  <>
                    <Pause size={20} /> PAUSAR TRIP
                  </>
                ) : (
                  <>
                    <Play size={20} /> {activeTrip.paused ? 'RETOMAR' : 'INICIAR TRIP'}
                  </>
                )}
              </button>

              <button
                onClick={resetTrip}
                className="py-3 sm:py-4 border border-[#2a2a3c] bg-[#14141e] hover:bg-[#1f1f2c] text-zinc-200 hover:text-white rounded-xl text-sm sm:text-base font-black uppercase tracking-[0.15em] flex justify-center items-center gap-2 transition-transform active:scale-95"
              >
                <RotateCcw size={20} /> ZERAR TRIP
              </button>
            </div>

            {/* Instant Consumption */}
            <div className="bg-[#12121c] border border-[#222232] px-4 py-3 rounded-2xl shrink-0 mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-black uppercase tracking-wider text-zinc-300">
                  CONSUMO INSTANTÂNEO
                </span>
                <span className="text-lg sm:text-xl font-black text-[#c19a6b]">
                  {instantConsumption.toFixed(1)} <span className="text-sm font-extrabold text-zinc-400">KM/L</span>
                </span>
              </div>
              <InstantConsumptionCanvas instantConsumption={instantConsumption} />
            </div>

            {/* B3 Stock Market Style Speed Chart (Gráfico de Bolsa de Valores) */}
            <div className="shrink-0 pt-2 mt-2 border-t border-[#1e1e28]">
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
            {/* Refuel & Photo Scan Action Buttons */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <button
                onClick={() => setShowQuickRefuelModal(true)}
                className="py-2 px-2.5 bg-[#1b1b2a] hover:bg-[#25253b] text-amber-400 border border-amber-500/40 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <Fuel size={16} className="text-amber-400" /> Abastecer
              </button>
              <button
                onClick={() => setShowPhotoScanner(true)}
                className="py-2 px-2.5 bg-[#14141e] hover:bg-[#1f1f2c] text-[#c19a6b] border border-[#c19a6b]/40 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <Sparkles size={16} className="text-[#c19a6b]" /> Escanear
              </button>
            </div>

            {/* Dial Canvas (Visor Comprimido e Elevado) */}
            <div className="flex-1 min-h-0 flex justify-center items-center relative w-full h-full">
              <div
                className={`w-full h-full border rounded-2xl p-1 relative flex justify-center items-center shadow-inner ${
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
            <div className="grid grid-cols-2 gap-2 shrink-0 my-0">
              <div
                className={`p-1.5 sm:p-2 rounded-xl text-center flex flex-col justify-center border ${
                  isReserveFuel
                    ? 'bg-red-950/30 border-red-500/50'
                    : 'bg-[#12121c] border-[#222232]'
                }`}
              >
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400">NO TANQUE</span>
                <div className={`text-xl sm:text-2xl font-black mt-0.5 ${isReserveFuel ? 'text-red-400' : 'text-white'}`}>
                  {currentLiters} L
                </div>
                <span className="text-[10px] text-zinc-400 font-bold mt-1 leading-tight">de {carConfig.tankCapacity} L ({carConfig.fuelLevel.toFixed(1)}%)</span>
              </div>

              <div
                className={`p-1.5 sm:p-2 rounded-xl text-center flex flex-col justify-center border ${
                  isReserveFuel
                    ? 'bg-red-500/20 border-red-500 shadow-md animate-pulse'
                    : 'bg-[#12121c] border-[#222232]'
                }`}
              >
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-red-400">RESERVA</span>
                <div className="text-xl sm:text-2xl font-black text-red-400 mt-0.5">
                  {isReserveFuel ? '⚠️ EM RESERVA' : `≤ ${reserveLiters} L`}
                </div>
                <span className="text-[10px] text-zinc-400 font-bold mt-1 leading-tight">
                  {isReserveFuel ? `${currentLiters}L ≤ ${reserveLiters}L` : `Limite ${reserveLiters} Litros`}
                </span>
              </div>

              <div className="bg-[#12121c] border border-[#222232] p-1.5 sm:p-2 rounded-xl text-center flex flex-col justify-center">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#c19a6b]">AUTONOMIA ATUAL</span>
                <div className="text-xl sm:text-2xl font-black text-[#c19a6b] mt-0.5">{autonomy} KM</div>
                <span className="text-[10px] text-zinc-400 font-bold mt-1 leading-tight">com {currentLiters} Litros</span>
              </div>

              <div className="bg-[#12121c] border border-[#222232] p-1.5 sm:p-2 rounded-xl text-center flex flex-col justify-center">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-200">TANQUE CHEIO</span>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{fullTankAutonomy} KM</div>
                <span className="text-[10px] text-zinc-400 font-bold mt-1 leading-tight">{carConfig.tankCapacity}L @ {baseConsumption} km/L</span>
              </div>
            </div>
          </div>
        </div>

      </div>

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
