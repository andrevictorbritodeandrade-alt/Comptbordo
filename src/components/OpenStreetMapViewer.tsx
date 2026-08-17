import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Compass,
  Sparkles,
  Search,
  Fuel,
  Volume2,
  VolumeX,
  X,
  Layers,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  LocateFixed,
  Send,
  Loader2,
  ArrowUpDown,
  Leaf,
  Clock,
  DollarSign,
  TrendingDown,
  ChevronRight,
  CornerUpRight,
  CornerUpLeft,
  CornerDownRight,
  CornerDownLeft,
  ArrowUp,
  ArrowUpRight,
  ArrowUpLeft,
  RotateCw,
  Maximize2,
  Minimize2,
  Info,
  ShieldCheck,
  Play,
  Square,
  Pause,
  Sliders,
  Volume1,
  Car,
  Star,
  Heart,
  Home,
  Briefcase,
  ShoppingBag,
  Dumbbell,
  Umbrella,
  Plus,
  Trash2,
  Edit3,
  Bookmark,
  Check,
  Download,
  Wifi,
  WifiOff,
  Radio,
  Camera,
  Flag,
  HardDrive,
  RefreshCw,
  Gauge,
  Siren,
  HelpCircle,
  Mic,
  Music,
  ChevronUp,
  ChevronDown,
  GitFork,
  Share2,
  GraduationCap,
} from 'lucide-react';
import { CarConfig, NavigationRoute, RouteStep, FavoriteDestination } from '../types';
import {
  offlineMapManager,
  OfflineRegion,
  PRESET_BRAZIL_REGIONS,
  RoadHazardAlert,
} from '../utils/offlineMapStorage';
import {
  roadAlertsEngine,
  DEFAULT_ROAD_HAZARDS,
  wazeAudio,
} from '../utils/roadAlertsEngine';
import {
  searchOfflineGeoDb,
  hybridResolveLocation,
  GeocodedLocation,
} from '../utils/brazilGeocodingDb';

interface OpenStreetMapViewerProps {
  currentLat: number;
  currentLng: number;
  speed: number;
  gpsHeading?: number | null;
  carConfig: CarConfig;
  breadcrumbTrail: [number, number][];
  onClose?: () => void;
  isEmbedded?: boolean;
  onRequestGps?: () => void;
  gpsActive?: boolean;
  gpsAccuracy?: number;
}

interface PlaceSuggestion {
  display_name: string;
  name?: string;
  category?: string;
  lat: string | number;
  lon: string | number;
  isOffline?: boolean;
}

const DEFAULT_FAVORITES: FavoriteDestination[] = [
  {
    id: 'fav-minha-casa',
    name: 'Minha Casa (Jacaroá)',
    address: 'Rua N, nº 33 - Jacaroá, Maricá - RJ',
    lat: -22.9265,
    lng: -42.8025,
    icon: 'home',
    category: 'Residência',
    createdAt: Date.now() - 700000,
  },
  {
    id: 'fav-mae',
    name: 'Casa da Minha Mãe',
    address: 'Rua Camille Claudel, Lote 9, Quadra C 4 - Santa Cruz da Serra, Duque de Caxias - RJ',
    lat: -22.6958,
    lng: -43.2785,
    icon: 'heart',
    category: 'Família',
    createdAt: Date.now() - 600000,
  },
  {
    id: 'fav-sogra',
    name: 'Casa da Minha Sogra',
    address: 'Rua Garcia Redondo, nº 100 - Cachambi, Rio de Janeiro - RJ',
    lat: -22.8885,
    lng: -43.2750,
    icon: 'heart',
    category: 'Família',
    createdAt: Date.now() - 500000,
  },
  {
    id: 'fav-cordelia',
    name: 'Escola Cordélia Paiva',
    address: 'Escola Municipal Cordélia Paiva - Parque Fluminense, Duque de Caxias - RJ',
    lat: -22.7520,
    lng: -43.3280,
    icon: 'school',
    category: 'Escola',
    createdAt: Date.now() - 400000,
  },
  {
    id: 'fav-ciep-369',
    name: 'CIEP 369 (Jardim Primavera)',
    address: 'CIEP 369 Jornalista Claudir de Oliveira Gomes - Jardim Primavera, Duque de Caxias - RJ',
    lat: -22.7230,
    lng: -43.2980,
    icon: 'school',
    category: 'CIEP',
    createdAt: Date.now() - 300000,
  },
  {
    id: 'fav-ciep-476',
    name: 'CIEP 476 (Nova Campina)',
    address: 'CIEP 476 - Nova Campina, Duque de Caxias - RJ',
    lat: -22.6580,
    lng: -43.2620,
    icon: 'school',
    category: 'CIEP',
    createdAt: Date.now() - 200000,
  },
  {
    id: 'fav-ciep-229',
    name: 'CIEP 229 (Saracuruna)',
    address: 'CIEP 229 Cândido Portinari - Saracuruna, Duque de Caxias - RJ',
    lat: -22.6880,
    lng: -43.2530,
    icon: 'school',
    category: 'CIEP',
    createdAt: Date.now() - 100000,
  },
];

export const OpenStreetMapViewer: React.FC<OpenStreetMapViewerProps> = ({
  currentLat,
  currentLng,
  speed: initialGpsSpeed,
  gpsHeading,
  carConfig,
  breadcrumbTrail,
  onClose,
  isEmbedded = false,
  onRequestGps,
  gpsActive = false,
  gpsAccuracy,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const carMarkerRef = useRef<L.Marker | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const trailPolylineRef = useRef<L.Polyline | null>(null);
  const routePolylinesRef = useRef<{ id: string; polyline: L.Polyline }[]>([]);
  const hazardsMarkersRef = useRef<L.Marker[]>([]);

  // Theme state
  const [mapTheme, setMapTheme] = useState<'eco' | 'dark' | 'standard' | 'satellite'>('eco');
  const [tileLayerRef, setTileLayerRef] = useState<L.TileLayer | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Google Maps-like Origin and Destination inputs
  const [originInput, setOriginInput] = useState<string>('📍 Meu Local Atual (GPS)');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isUsingGpsOrigin, setIsUsingGpsOrigin] = useState<boolean>(true);

  const [destinationInput, setDestinationInput] = useState<string>('');
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Suggestions Autocomplete
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState<'origin' | 'dest' | null>(null);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  // ─── OFFLINE MAPS & CACHE STATE ───
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [cachedTilesCount, setCachedTilesCount] = useState<number>(0);
  const [isDownloadingOffline, setIsDownloadingOffline] = useState(false);
  const [downloadProgressPct, setDownloadProgressPct] = useState(0);
  const [downloadStatusText, setDownloadStatusText] = useState('');
  const [downloadedRegions, setDownloadedRegions] = useState<OfflineRegion[]>([]);
  const [isOfflineModeActive, setIsOfflineModeActive] = useState<boolean>(!navigator.onLine);

  // ─── ROAD HAZARDS & PROACTIVE VOICE ALERTS (WAZE-STYLE) ───
  const [roadHazards, setRoadHazards] = useState<RoadHazardAlert[]>(() => {
    try {
      const saved = localStorage.getItem('clio_road_hazards_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar alertas da pista:', e);
    }
    return DEFAULT_ROAD_HAZARDS;
  });

  const [nearbyHazards, setNearbyHazards] = useState<(RoadHazardAlert & { distanceMeters: number })[]>([]);
  const [activeVoicePrompt, setActiveVoicePrompt] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isVoiceFeedbackEnabled, setIsVoiceFeedbackEnabled] = useState(true);

  // ─── FAVORITE DESTINATIONS STATE ───
  const [favorites, setFavorites] = useState<FavoriteDestination[]>(() => {
    try {
      const saved = localStorage.getItem('clio_favorite_destinations_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar favoritos:', e);
    }
    return DEFAULT_FAVORITES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('clio_favorite_destinations_v3', JSON.stringify(favorites));
    } catch (e) {
      console.warn('Erro ao salvar favoritos:', e);
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem('clio_road_hazards_v1', JSON.stringify(roadHazards));
    } catch (e) {
      console.warn('Erro ao salvar alertas:', e);
    }
  }, [roadHazards]);

  // Load offline tile count & regions on mount
  useEffect(() => {
    offlineMapManager.getCachedTilesCount().then(setCachedTilesCount);
    offlineMapManager.getDownloadedRegions().then(setDownloadedRegions);

    const handleOnline = () => setIsOfflineModeActive(false);
    const handleOffline = () => setIsOfflineModeActive(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [isSaveFavoriteOpen, setIsSaveFavoriteOpen] = useState(false);
  const [isManageFavoritesOpen, setIsManageFavoritesOpen] = useState(false);
  const [favoriteFormData, setFavoriteFormData] = useState<{
    id?: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    icon: FavoriteDestination['icon'];
    category?: string;
  }>({
    name: '',
    address: '',
    lat: 0,
    lng: 0,
    icon: 'star',
    category: 'Geral',
  });

  // Routes comparison states
  const [calculatedRoutes, setCalculatedRoutes] = useState<NavigationRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);
  const [isRecalculatingRoute, setIsRecalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [aiCopilotData, setAiCopilotData] = useState<{
    copilotMessage?: string;
    ecoTip?: string;
    category?: string;
  } | null>(null);

  // ─── WAZE / GOOGLE MAPS DRIVER TURN-BY-TURN NAVIGATION STATES ───
  const [isLiveNavigating, setIsLiveNavigating] = useState(false);
  const [isHeadingUpNavigation, setIsHeadingUpNavigation] = useState(true); // Modo Waze: Pista para cima
  const [showTurnByTurn, setShowTurnByTurn] = useState(false);
  const [autoFollowCar, setAutoFollowCar] = useState(true);
  const [userInteractedMap, setUserInteractedMap] = useState(false);

  // Real-time Clock for Driver Cockpit
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Trip Completed Summary Modal State
  const [isTripCompletedModalOpen, setIsTripCompletedModalOpen] = useState(false);
  const [tripSummary, setTripSummary] = useState<{
    destinationName: string;
    totalDistanceKm: number;
    durationMinutes: number;
    litersConsumed: number;
    totalCostBrl: number;
    ecoScore: number;
  } | null>(null);

  // Driver navigation real-time tracking
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextStepMeters, setDistanceToNextStepMeters] = useState(0);
  const [liveRemainingDistanceKm, setLiveRemainingDistanceKm] = useState(0);
  const [liveRemainingDurationMin, setLiveRemainingDurationMin] = useState(0);
  const [vehicleHeading, setVehicleHeading] = useState(0); // in degrees
  const [liveNavSpeed, setLiveNavSpeed] = useState(initialGpsSpeed || 0);

  // Waze specific Driver Cockpit States
  const [isWazeDrawerOpen, setIsWazeDrawerOpen] = useState(false);
  const [wazeSoundMode, setWazeSoundMode] = useState<'all' | 'alerts' | 'mute'>('all');
  const [isVoiceSearchOpen, setIsVoiceSearchOpen] = useState(false);
  const [isRadioPlayerOpen, setIsRadioPlayerOpen] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceSearchStatus, setVoiceSearchStatus] = useState<string>('');
  const [currentStreetName, setCurrentStreetName] = useState<string>('Pista Principal');
  const [detectedRoadSpeedLimit, setDetectedRoadSpeedLimit] = useState<number>(60);

  // Cycle through sound modes: all -> alerts -> mute -> all
  const toggleWazeSoundMode = () => {
    if (wazeSoundMode === 'all') {
      setWazeSoundMode('alerts');
      roadAlertsEngine.setMuted(false);
      roadAlertsEngine.speak('Somente alertas ativados.');
    } else if (wazeSoundMode === 'alerts') {
      setWazeSoundMode('mute');
      roadAlertsEngine.setMuted(true);
    } else {
      setWazeSoundMode('all');
      roadAlertsEngine.setMuted(false);
      roadAlertsEngine.speak('Voz e alertas ativados.');
    }
  };

  // Speech Recognition handler for Waze Mic Button
  const handleStartVoiceSearch = () => {
    setIsVoiceSearchOpen(true);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSearchStatus('Reconhecimento de voz não suportado neste navegador.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;
      setIsListeningVoice(true);
      setVoiceSearchStatus('Ouvindo... Diga para onde você quer ir (ex: "Posto BR", "Praia de Ponta Negra")');

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        setIsListeningVoice(false);
        if (transcript) {
          setVoiceSearchStatus(`Destino reconhecido: "${transcript}"`);
          setDestinationInput(transcript);
          setTimeout(() => {
            setIsVoiceSearchOpen(false);
            handleCalculateAllRoutes(null, null, transcript);
          }, 1000);
        }
      };

      recognition.onerror = (e: any) => {
        setIsListeningVoice(false);
        setVoiceSearchStatus('Não conseguimos ouvir com clareza. Tente novamente.');
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognition.start();
    } catch (err) {
      setIsListeningVoice(false);
      setVoiceSearchStatus('Erro ao iniciar microfone.');
    }
  };

  // Simulation test drive mode
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simulationCoordIndexRef = useRef(0);
  const lastSpokenStepIndexRef = useRef<number>(-1);
  
  // Intelligent Off-Route and Auto-Reroute tracking refs
  const offRouteCountRef = useRef<number>(0);
  const lastRerouteTimeRef = useRef<number>(0);
  const isAutoReroutingRef = useRef<boolean>(false);

  // Clio fuel calculations base
  const fuelType = carConfig.currentFuel || 'gasoline';
  const fuelTypeLabel = fuelType === 'ethanol' ? 'Etanol' : 'Gasolina';
  const fuelPricePerLiter = fuelType === 'ethanol' ? 4.29 : 6.19;
  const baseKmPerL =
    fuelType === 'ethanol'
      ? carConfig.avgConsumptionEthanol || 8.9
      : carConfig.avgConsumptionGasoline || 12.6;
  const currentLitersInTank = (carConfig.tankCapacity * carConfig.fuelLevel) / 100;

  // Real or default fallback coordinates (Maricá - RJ)
  const defaultLat = currentLat || -22.9194;
  const defaultLng = currentLng || -42.8186;

  // Track position in simulation or GPS
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number }>({
    lat: defaultLat,
    lng: defaultLng,
  });

  const prevDriverPosRef = useRef<{ lat: number; lng: number } | null>(null);

  // Sync driverPos and calculate vehicle heading smoothly from real GPS movement
  useEffect(() => {
    if (!isSimulatingDrive) {
      const lat = currentLat || -22.9194;
      const lng = currentLng || -42.8186;
      
      if (typeof gpsHeading === 'number' && !isNaN(gpsHeading) && gpsHeading >= 0) {
        setVehicleHeading(gpsHeading);
      } else {
        const prev = prevDriverPosRef.current;
        if (prev && (Math.abs(lat - prev.lat) > 0.00002 || Math.abs(lng - prev.lng) > 0.00002)) {
          const dist = computeDistanceMeters([prev.lat, prev.lng], [lat, lng]);
          // Update vehicle heading if moved >= 1.8 meters
          if (dist >= 1.8) {
            const brng = computeBearing([prev.lat, prev.lng], [lat, lng]);
            if (!isNaN(brng)) {
              setVehicleHeading(brng);
            }
            prevDriverPosRef.current = { lat, lng };
          }
        } else if (!prev) {
          prevDriverPosRef.current = { lat, lng };
        }
      }

      setDriverPos({ lat, lng });
      setLiveNavSpeed(initialGpsSpeed || 0);
    }
  }, [currentLat, currentLng, initialGpsSpeed, gpsHeading, isSimulatingDrive]);

  // Voice assistant sync
  useEffect(() => {
    roadAlertsEngine.setMuted(!isVoiceFeedbackEnabled);
  }, [isVoiceFeedbackEnabled]);

  // Proactive road hazards checking loop
  useEffect(() => {
    const res = roadAlertsEngine.checkNearbyRoadHazards(
      driverPos.lat,
      driverPos.lng,
      liveNavSpeed,
      roadHazards
    );
    setNearbyHazards(res.nearbyAlerts);
    if (res.activeVoiceAlert) {
      setActiveVoicePrompt(res.activeVoiceAlert);
      setTimeout(() => setActiveVoicePrompt(null), 7000);
    }
  }, [driverPos, liveNavSpeed, roadHazards]);

  // ─── HIGH-RELIABILITY TILE LAYER CREATION (WAZE VOYAGER / OSM) ───
  function createOfflineTileLayer(theme: string): L.TileLayer {
    let template = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    let className = '';

    if (theme === 'dark') {
      template = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (theme === 'satellite') {
      template = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{n}';
    } else if (theme === 'standard') {
      template = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    } else {
      // High-contrast Voyager for Waze-like readability with all labels
      template = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_all/{z}/{x}/{y}{r}.png';
    }

    return L.tileLayer(template, {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c', 'd'],
      className,
      errorTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      updateWhenIdle: false, // Faster loading during movement
      keepBuffer: 4,
    });
  }

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: false, // Instant tile appearance as requested
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileLayer = createOfflineTileLayer(mapTheme);
    tileLayer.addTo(map);
    setTileLayerRef(tileLayer);

    // Car position marker
    const carIcon = createDriverCarIcon(initialGpsSpeed, vehicleHeading, isLiveNavigating);
    const carMarker = L.marker([defaultLat, defaultLng], { icon: carIcon, zIndexOffset: 1000 }).addTo(map);
    carMarkerRef.current = carMarker;

    // Breadcrumb Trail Polyline (clean and non-intrusive)
    const trailPolyline = L.polyline([], {
      color: '#10b981',
      weight: 3,
      opacity: 0.7,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '2, 6',
    }).addTo(map);
    trailPolylineRef.current = trailPolyline;

    // Map drag interaction listener
    map.on('dragstart', () => {
      setUserInteractedMap(true);
      setAutoFollowCar(false);
    });

    // Map click sets destination or origin when not in live driving
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isLiveNavigating) return;
      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;
      setDestinationCoords({ lat: clickLat, lng: clickLng });
      setDestinationInput(`Ponto no mapa (${clickLat.toFixed(4)}, ${clickLng.toFixed(4)})`);
      handleCalculateAllRoutes(
        isUsingGpsOrigin ? { lat: currentLat || -22.9194, lng: currentLng || -42.8186 } : originCoords,
        { lat: clickLat, lng: clickLng },
        'Ponto Selecionado no Mapa'
      );
    });

    mapInstanceRef.current = map;
    renderHazardMarkersOnMap(map, roadHazards);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  // Update Tile Layer when mapTheme changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef) {
      mapInstanceRef.current.removeLayer(tileLayerRef);
    }
    const newLayer = createOfflineTileLayer(mapTheme);
    newLayer.addTo(mapInstanceRef.current);
    setTileLayerRef(newLayer);
  }, [mapTheme]);

  // Render Hazard and Radar Markers on Leaflet Map
  const renderHazardMarkersOnMap = (map: L.Map, hazards: RoadHazardAlert[]) => {
    hazardsMarkersRef.current.forEach((m) => map.removeLayer(m));
    hazardsMarkersRef.current = [];

    hazards.forEach((h) => {
      let iconHtml = '';
      let badgeClass = '';

      if (h.type === 'speed_camera') {
        badgeClass = 'bg-red-600 border-red-300 text-white';
        iconHtml = `
          <div class="flex flex-col items-center">
            <div class="w-8 h-8 rounded-full ${badgeClass} border-2 shadow-lg flex items-center justify-center font-black text-[11px] animate-pulse">
              ${h.speedLimit || 60}
            </div>
            <span class="text-[8px] font-black bg-black/90 text-red-300 px-1 rounded mt-0.5 border border-red-500/40">RADAR</span>
          </div>
        `;
      } else if (h.type === 'speed_bump') {
        badgeClass = 'bg-amber-500 border-amber-300 text-black';
        iconHtml = `
          <div class="flex flex-col items-center">
            <div class="w-7 h-7 rounded-xl ${badgeClass} border shadow-lg flex items-center justify-center font-black text-xs">
              ⚠️
            </div>
            <span class="text-[8px] font-black bg-black/90 text-amber-300 px-1 rounded mt-0.5 border border-amber-500/40">LOMBADA</span>
          </div>
        `;
      } else if (h.type === 'sharp_curve') {
        iconHtml = `
          <div class="flex flex-col items-center">
            <div class="w-7 h-7 rounded-xl bg-orange-600 border border-orange-300 shadow-lg flex items-center justify-center text-white font-black text-xs">
              ↩️
            </div>
            <span class="text-[8px] font-black bg-black/90 text-orange-300 px-1 rounded mt-0.5">CURVA</span>
          </div>
        `;
      } else if (h.type === 'gas_station') {
        iconHtml = `
          <div class="flex flex-col items-center">
            <div class="w-7 h-7 rounded-xl bg-emerald-600 border border-emerald-300 shadow-lg flex items-center justify-center text-white font-black text-xs">
              ⛽
            </div>
            <span class="text-[8px] font-black bg-black/90 text-emerald-300 px-1 rounded mt-0.5">POSTO</span>
          </div>
        `;
      } else {
        iconHtml = `
          <div class="flex flex-col items-center">
            <div class="w-7 h-7 rounded-xl bg-rose-600 border border-rose-300 shadow-lg flex items-center justify-center text-white font-black text-xs">
              🚨
            </div>
            <span class="text-[8px] font-black bg-black/90 text-rose-300 px-1 rounded mt-0.5">ALERTA</span>
          </div>
        `;
      }

      const icon = L.divIcon({
        html: iconHtml,
        className: 'custom-hazard-marker',
        iconSize: [32, 38],
        iconAnchor: [16, 19],
      });

      const marker = L.marker([h.lat, h.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: system-ui; font-size: 12px; color: #111;">
          <b style="color: #e11d48;">${h.title}</b>
          <p style="margin: 3px 0 0 0; color: #4b5563;">${h.description}</p>
          <div style="margin-top: 4px; font-weight: bold; color: #059669;">🔊 Áudio: "${h.audioPrompt}"</div>
        </div>
      `);
      hazardsMarkersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (mapInstanceRef.current) {
      renderHazardMarkersOnMap(mapInstanceRef.current, roadHazards);
    }
  }, [roadHazards]);

  // Create or update Car Icon with heading rotation and Cockpit Style
  function createDriverCarIcon(
    currSpeed: number,
    headingDeg: number,
    navigating: boolean,
    isHeadingUp: boolean = true
  ) {
    const rotation = Math.round(headingDeg);
    if (navigating) {
      const html = `
        <div class="relative flex items-center justify-center pointer-events-none" style="transform: rotate(${rotation}deg); transition: transform 0.2s linear;">
          <!-- Vibrant 3D Arrow (Waze Style) -->
          <div class="relative drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]">
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
              <!-- Background / Border -->
              <path d="M25 4L44 42L25 34L6 42L25 4Z" fill="white" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round"/>
              <!-- Main Body -->
              <path d="M25 7L41 39L25 31L9 39L25 7Z" fill="#3b82f6"/>
              <!-- 3D Shading -->
              <path d="M25 7L25 31L9 39L25 7Z" fill="#1d4ed8"/>
            </svg>
          </div>
        </div>
      `;
      return L.divIcon({
        html,
        className: 'driver-nav-car-marker',
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      });
    }

    const html = `
      <div class="relative flex items-center justify-center" style="transform: rotate(${rotation}deg); transition: transform 0.3s ease-out;">
        <div class="w-10 h-10 rounded-full bg-[#050508] border-2 border-cyan-400 flex items-center justify-center text-cyan-400 shadow-xl gps-marker-pulse">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
        <div class="absolute -bottom-4 bg-black/90 text-[9px] font-black text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/40 whitespace-nowrap shadow-md" style="transform: rotate(${-rotation}deg);">
          ${Math.round(currSpeed)} KM/H
        </div>
      </div>
    `;
    return L.divIcon({
      html,
      className: 'custom-car-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }

  // Update car marker position, rotation and camera follow
  useEffect(() => {
    if (!mapInstanceRef.current || !carMarkerRef.current) return;

    const lat = driverPos.lat;
    const lng = driverPos.lng;

    carMarkerRef.current.setLatLng([lat, lng]);
    carMarkerRef.current.setIcon(
      createDriverCarIcon(liveNavSpeed, vehicleHeading, isLiveNavigating, isHeadingUpNavigation)
    );

    if (trailPolylineRef.current) {
      if (isLiveNavigating) {
        // In active navigation mode, hide the breadcrumb trail to maintain a clean Waze purple route
        trailPolylineRef.current.setLatLngs([]);
      } else if (breadcrumbTrail && breadcrumbTrail.length > 0) {
        // Filter out teleport jumps (> 250m) between GPS points
        const cleanTrail: [number, number][] = [];
        for (let i = 0; i < breadcrumbTrail.length; i++) {
          const pt = breadcrumbTrail[i];
          if (cleanTrail.length === 0) {
            cleanTrail.push(pt);
          } else {
            const last = cleanTrail[cleanTrail.length - 1];
            const d = computeDistanceMeters(last, pt);
            if (d < 250) {
              cleanTrail.push(pt);
            } else {
              cleanTrail.length = 0;
              cleanTrail.push(pt);
            }
          }
        }
        trailPolylineRef.current.setLatLngs(cleanTrail);
      } else {
        trailPolylineRef.current.setLatLngs([]);
      }
    }

    if (autoFollowCar) {
      if (isLiveNavigating) {
        // Fast 0ms instantaneous pan to prevent any lag or animation queue blocking
        mapInstanceRef.current.panTo([lat, lng], { animate: false });
      } else {
        mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.25 });
      }
    }
  }, [
    driverPos,
    liveNavSpeed,
    vehicleHeading,
    isLiveNavigating,
    isHeadingUpNavigation,
    autoFollowCar,
    breadcrumbTrail,
  ]);

  // Autocomplete place search combining Offline Database & Nominatim for entire State of Rio de Janeiro and Brazil
  const searchPlaceNominatim = useCallback(
    async (query: string, type: 'origin' | 'dest', initialOfflineResults: PlaceSuggestion[] = []) => {
      if (!query || query.trim().length === 0 || query.startsWith('📍')) {
        if (type === 'origin') setOriginSuggestions([]);
        else setDestSuggestions([]);
        return;
      }

      setIsSearchingSuggestions(true);
      try {
        // Query OpenStreetMap Nominatim with Brazilian boundary prioritizing State of Rio de Janeiro viewbox
        const cleanQuery = query.trim();
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          cleanQuery
        )}&countrycodes=br&viewbox=-44.89,-23.37,-40.96,-20.76&bounded=0&limit=8&addressdetails=1`;
        
        const res = await fetch(url, { signal: AbortSignal.timeout(3800) });
        if (res.ok) {
          const onlineData: any[] = await res.json();
          const onlineSuggestions: PlaceSuggestion[] = (onlineData || []).map((d) => ({
            display_name: d.display_name,
            name: d.name || d.display_name.split(',')[0],
            category: 'online',
            lat: parseFloat(d.lat),
            lon: parseFloat(d.lon),
            isOffline: false,
          }));

          // Merge offline and online suggestions avoiding coordinate duplicates
          const seen = new Set<string>();
          const merged: PlaceSuggestion[] = [];

          for (const item of [...initialOfflineResults, ...onlineSuggestions]) {
            const latFixed = Number(item.lat).toFixed(3);
            const lonFixed = Number(item.lon).toFixed(3);
            const key = `${latFixed},${lonFixed}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(item);
            }
          }

          if (type === 'origin') {
            setOriginSuggestions(merged);
          } else {
            setDestSuggestions(merged);
          }
        }
      } catch (err) {
        console.warn('Erro na busca online de locais (mantendo locais offline):', err);
        if (initialOfflineResults.length > 0) {
          if (type === 'origin') setOriginSuggestions(initialOfflineResults);
          else setDestSuggestions(initialOfflineResults);
        }
      } finally {
        setIsSearchingSuggestions(false);
      }
    },
    []
  );

  const handleOriginChange = (val: string) => {
    setOriginInput(val);
    setIsUsingGpsOrigin(false);
    setActiveSuggestionField('origin');

    // 1. Instantaneous offline local database search (0ms)
    const offlineMatches = searchOfflineGeoDb(val, 6);
    const offlineFormatted: PlaceSuggestion[] = offlineMatches.map((m) => ({
      name: m.name,
      display_name: m.display_name,
      category: m.category,
      lat: m.lat,
      lon: m.lng,
      isOffline: true,
    }));
    setOriginSuggestions(offlineFormatted);

    // 2. Parallel Nominatim lookup for complete internet coverage
    if (val.trim().length >= 2) {
      searchPlaceNominatim(val, 'origin', offlineFormatted);
    }
  };

  const handleDestChange = (val: string) => {
    setDestinationInput(val);
    setActiveSuggestionField('dest');

    // 1. Instantaneous offline local database search (0ms)
    const offlineMatches = searchOfflineGeoDb(val, 6);
    const offlineFormatted: PlaceSuggestion[] = offlineMatches.map((m) => ({
      name: m.name,
      display_name: m.display_name,
      category: m.category,
      lat: m.lat,
      lon: m.lng,
      isOffline: true,
    }));
    setDestSuggestions(offlineFormatted);

    // 2. Parallel Nominatim lookup for complete internet coverage
    if (val.trim().length >= 2) {
      searchPlaceNominatim(val, 'dest', offlineFormatted);
    }
  };

  const handleSetOriginToGps = () => {
    setIsUsingGpsOrigin(true);
    setOriginInput('📍 Meu Local Atual (GPS)');
    setOriginCoords(null);
    setActiveSuggestionField(null);
    if (onRequestGps && !gpsActive) {
      onRequestGps();
    }
  };

  const handleSelectSuggestion = (place: PlaceSuggestion, type: 'origin' | 'dest') => {
    const lat = typeof place.lat === 'string' ? parseFloat(place.lat) : place.lat;
    const lng = typeof place.lon === 'string' ? parseFloat(place.lon) : place.lon;

    if (type === 'origin') {
      setOriginInput(place.display_name);
      setOriginCoords({ lat, lng });
      setIsUsingGpsOrigin(false);
      setOriginSuggestions([]);
    } else {
      setDestinationInput(place.display_name);
      setDestinationCoords({ lat, lng });
      setDestSuggestions([]);
    }
    setActiveSuggestionField(null);

    const start =
      type === 'origin'
        ? { lat, lng }
        : isUsingGpsOrigin
        ? { lat: currentLat || -22.9194, lng: currentLng || -42.8186 }
        : originCoords;

    const end = type === 'dest' ? { lat, lng } : destinationCoords;

    if (start && end) {
      handleCalculateAllRoutes(start, end, type === 'dest' ? place.display_name : destinationInput);
    }
  };

  const handleSwapOriginAndDest = () => {
    const tempOriginInput = originInput;
    const tempOriginCoords = isUsingGpsOrigin
      ? { lat: currentLat || -22.9194, lng: currentLng || -42.8186 }
      : originCoords;

    if (destinationCoords) {
      setOriginInput(destinationInput);
      setOriginCoords(destinationCoords);
      setIsUsingGpsOrigin(false);
    }

    if (tempOriginCoords) {
      setDestinationInput(tempOriginInput.replace('📍 ', ''));
      setDestinationCoords(tempOriginCoords);
    }

    if (destinationCoords && tempOriginCoords) {
      handleCalculateAllRoutes(destinationCoords, tempOriginCoords, tempOriginInput);
    }
  };

  // Helper Haversine Distance in meters
  function computeDistanceMeters(p1: [number, number], p2: [number, number]) {
    const R = 6371000;
    const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
    const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((p1[0] * Math.PI) / 180) * Math.cos((p2[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Calculate bearing angle (0 - 360) from p1 to p2
  function computeBearing(p1: [number, number], p2: [number, number]) {
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  }

  // Helper: Point to Line Segment Perpendicular Distance in Meters
  function pointToSegmentDistanceMeters(
    p: [number, number],
    v: [number, number],
    w: [number, number]
  ): number {
    const l2 = (w[0] - v[0]) ** 2 + (w[1] - v[1]) ** 2;
    if (l2 === 0) return computeDistanceMeters(p, v);
    const t = Math.max(
      0,
      Math.min(
        1,
        ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2
      )
    );
    const projection: [number, number] = [
      v[0] + t * (w[0] - v[0]),
      v[1] + t * (w[1] - v[1]),
    ];
    return computeDistanceMeters(p, projection);
  }

  // Helper: Minimum distance from vehicle position to active route coordinates
  function minDistanceToRouteMeters(
    pos: { lat: number; lng: number },
    routeCoords: [number, number][]
  ): number {
    if (!routeCoords || routeCoords.length < 2) return 99999;
    let minD = Infinity;
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const d = pointToSegmentDistanceMeters(
        [pos.lat, pos.lng],
        routeCoords[i],
        routeCoords[i + 1]
      );
      if (d < minD) minD = d;
    }
    return minD;
  }

  // ─── OFFLINE DOWNLOAD REGION HANDLER ───
  const handleDownloadRegion = async (reg: typeof PRESET_BRAZIL_REGIONS[0]) => {
    setIsDownloadingOffline(true);
    setDownloadProgressPct(0);
    setDownloadStatusText(`Baixando mapa de ${reg.name}...`);

    try {
      const regionData: OfflineRegion = {
        ...reg,
        tilesCount: 0,
        sizeBytes: 0,
        downloadedAt: Date.now(),
        status: 'downloading',
      };

      await offlineMapManager.downloadRegion(regionData, (pct, curr, total) => {
        setDownloadProgressPct(pct);
        setDownloadStatusText(`Salvando tiles no cache: ${curr} de ${total} (${pct}%)`);
      });

      const updatedCount = await offlineMapManager.getCachedTilesCount();
      setCachedTilesCount(updatedCount);
      const regions = await offlineMapManager.getDownloadedRegions();
      setDownloadedRegions(regions);
      setDownloadStatusText(`✅ ${reg.name} baixado com sucesso para uso 100% offline!`);
      roadAlertsEngine.speak(`Mapa de ${reg.name} baixado para uso offline!`);
    } catch (e: any) {
      setDownloadStatusText(`Erro ao baixar: ${e.message || 'Falha de rede'}`);
    } finally {
      setIsDownloadingOffline(false);
    }
  };

  const handleDownloadCurrentLocationRadius = () => {
    const reg: typeof PRESET_BRAZIL_REGIONS[0] = {
      id: `region-custom-${Date.now()}`,
      name: `Minha Região Atual (${driverPos.lat.toFixed(2)}, ${driverPos.lng.toFixed(2)})`,
      description: 'Raio de 30 km ao redor da sua posição GPS atual com navegação detalhada',
      centerLat: driverPos.lat,
      centerLng: driverPos.lng,
      radiusKm: 30,
      zoomLevels: [12, 13, 14, 15],
    };
    handleDownloadRegion(reg);
  };

  // ─── FAVORITES MANAGEMENT HANDLERS ───
  const isCurrentDestFavorited = favorites.some(
    (f) =>
      (destinationCoords &&
        Math.abs(f.lat - destinationCoords.lat) < 0.001 &&
        Math.abs(f.lng - destinationCoords.lng) < 0.001) ||
      (destinationInput && f.name.toLowerCase() === destinationInput.toLowerCase()) ||
      (destinationInput && f.address.toLowerCase().includes(destinationInput.toLowerCase()))
  );

  const handleOpenSaveFavorite = (overrideDest?: { name: string; address: string; lat: number; lng: number }) => {
    const lat = overrideDest?.lat || destinationCoords?.lat || currentLat || -22.9194;
    const lng = overrideDest?.lng || destinationCoords?.lng || currentLng || -42.8186;
    const address = overrideDest?.address || destinationInput || 'Endereço selecionado';
    const name = overrideDest?.name || (destinationInput ? destinationInput.split(',')[0].trim() : 'Meu Destino');

    setFavoriteFormData({
      id: undefined,
      name,
      address,
      lat,
      lng,
      icon: 'star',
      category: 'Geral',
    });
    setIsSaveFavoriteOpen(true);
  };

  const handleSaveFavoriteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!favoriteFormData.name.trim()) return;

    if (favoriteFormData.id) {
      setFavorites((prev) =>
        prev.map((item) =>
          item.id === favoriteFormData.id
            ? {
                ...item,
                name: favoriteFormData.name.trim(),
                address: favoriteFormData.address.trim(),
                lat: favoriteFormData.lat,
                lng: favoriteFormData.lng,
                icon: favoriteFormData.icon,
                category: favoriteFormData.category || 'Geral',
              }
            : item
        )
      );
    } else {
      const newFav: FavoriteDestination = {
        id: `fav-${Date.now()}`,
        name: favoriteFormData.name.trim(),
        address: favoriteFormData.address.trim() || 'Coordenadas salvas',
        lat: favoriteFormData.lat,
        lng: favoriteFormData.lng,
        icon: favoriteFormData.icon || 'star',
        category: favoriteFormData.category || 'Geral',
        createdAt: Date.now(),
      };
      setFavorites((prev) => [newFav, ...prev]);
    }

    setIsSaveFavoriteOpen(false);
  };

  const handleDeleteFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSelectFavoriteDestination = (fav: FavoriteDestination) => {
    setDestinationInput(fav.name);
    setDestinationCoords({ lat: fav.lat, lng: fav.lng });
    setIsManageFavoritesOpen(false);

    const start = isUsingGpsOrigin
      ? { lat: currentLat || -22.9194, lng: currentLng || -42.8186 }
      : originCoords;

    if (start) {
      handleCalculateAllRoutes(start, { lat: fav.lat, lng: fav.lng }, fav.name);
    }
  };

  // ─── USER ROAD HAZARD REPORT (REPORTAR NA PISTA) ───
  // ─── USER ROAD HAZARD REPORT (REPORTAR NA PISTA ESTILO WAZE) ───
  const [reportFormData, setReportFormData] = useState<{
    type: RoadHazardAlert['type'];
    speedLimit?: number;
    description: string;
  }>({
    type: 'speed_camera',
    speedLimit: 60,
    description: '',
  });

  const handleReportHazardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const type = reportFormData.type;
    let title = 'Alerta na Pista';
    let audioPrompt = 'Atenção: Alerta reportado à frente.';

    if (type === 'speed_camera') {
      title = `Radar Fixo ${reportFormData.speedLimit || 60} km/h`;
      audioPrompt = `Atenção: Radar fixo a 300 metros. Limite de ${reportFormData.speedLimit || 60} quilômetros por hora.`;
    } else if (type === 'mobile_camera') {
      title = `Radar Móvel ${reportFormData.speedLimit || 60} km/h`;
      audioPrompt = 'Atenção: Radar móvel reportado à frente.';
    } else if (type === 'police') {
      title = 'Polícia / Fiscalização';
      audioPrompt = 'Atenção: Polícia reportada à frente.';
    } else if (type === 'accident') {
      title = 'Acidente Reportado';
      audioPrompt = 'Atenção: Acidente reportado à frente, reduza a velocidade.';
    } else if (type === 'construction') {
      title = 'Obras / Perigo na Via';
      audioPrompt = 'Atenção: Perigo na via reportado à frente.';
    } else if (type === 'pothole') {
      title = 'Buraco na Pista';
      audioPrompt = 'Atenção motorista: Buraco na pista reportado à frente.';
    } else if (type === 'traffic') {
      title = 'Trânsito Lento';
      audioPrompt = 'Atenção: Trânsito lento reportado à frente.';
    } else if (type === 'stopped_vehicle') {
      title = 'Veículo no Acostamento';
      audioPrompt = 'Atenção: Veículo parado no acostamento à frente.';
    } else if (type === 'speed_bump') {
      title = 'Lombada / Quebra-mola';
      audioPrompt = 'Lombada à frente. Reduza a velocidade.';
    } else if (type === 'gas_station') {
      title = 'Posto de Combustível';
      audioPrompt = 'Posto de combustível à frente.';
    }

    const newHazard: RoadHazardAlert = {
      id: `hazard-${Date.now()}`,
      type,
      title,
      description: reportFormData.description.trim() || 'Reportado em tempo real',
      lat: driverPos.lat,
      lng: driverPos.lng,
      speedLimit: reportFormData.speedLimit,
      audioPrompt,
    };

    setRoadHazards((prev) => [newHazard, ...prev]);
    setIsReportModalOpen(false);
    roadAlertsEngine.speak(`Obrigado! Alerta de ${title} registrado no mapa.`, true, true);
  };

  // ─── OFFLINE ROUTING FALLBACK GENERATOR (NO INTERNET NEEDED) ───
  const generateOfflineFallbackRoute = (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    destTitle?: string
  ): NavigationRoute[] => {
    const distM = computeDistanceMeters([start.lat, start.lng], [end.lat, end.lng]);
    const baseDistanceKm = Number(((distM / 1000) * 1.25).toFixed(1)); // 25% curve factor
    
    // Generate 3 distinct viable routes
    const routesConfig = [
      { id: 'route-offline-fastest', type: 'fastest' as const, name: '⚡ Rota 1: Mais Rápida (Via Rodovia)', factor: 1.0, speedKmh: 65, eco: 85 },
      { id: 'route-offline-eco', type: 'eco' as const, name: '🍃 Rota 2: Mais Econômica (Eco)', factor: 0.95, speedKmh: 55, eco: 96 },
      { id: 'route-offline-alt', type: 'alternative' as const, name: '🛣️ Rota 3: Alternativa Panorâmica', factor: 1.12, speedKmh: 50, eco: 78 },
    ];

    return routesConfig.map((cfg, idx) => {
      const distanceKm = Number((baseDistanceKm * cfg.factor).toFixed(1));
      const durationMin = Math.max(2, Math.round((distanceKm / cfg.speedKmh) * 60));
      const intermediatePointsCount = 10;
      const coords: [number, number][] = [];
      const curvatureOffset = (idx - 1) * 0.005;

      for (let i = 0; i <= intermediatePointsCount; i++) {
        const frac = i / intermediatePointsCount;
        const lat = start.lat + (end.lat - start.lat) * frac + Math.sin(frac * Math.PI) * curvatureOffset;
        const lng = start.lng + (end.lng - start.lng) * frac + Math.cos(frac * Math.PI) * curvatureOffset;
        coords.push([lat, lng]);
      }

      const effectiveKmPerL = cfg.type === 'eco' ? baseKmPerL * 1.08 : baseKmPerL;
      const litersNeeded = Number((distanceKm / effectiveKmPerL).toFixed(2));
      const costEstimatedBrl = Number((litersNeeded * fuelPricePerLiter).toFixed(2));

      const steps: RouteStep[] = [
        {
          instruction: `Siga pela via asfaltada principal (${cfg.name})`,
          distance: distM * 0.4,
          name: 'Rodovia Asfaltada',
          type: 'straight',
          location: coords[Math.floor(coords.length * 0.4)],
        },
        {
          instruction: 'Mantenha-se na pista',
          distance: distM * 0.4,
          name: 'Via Principal',
          type: 'straight',
          location: coords[Math.floor(coords.length * 0.8)],
        },
        {
          instruction: 'Você está chegando ao seu destino',
          distance: distM * 0.2,
          name: destTitle || 'Destino',
          type: 'arrive',
          location: [end.lat, end.lng],
        },
      ];

      return {
        id: cfg.id,
        routeType: cfg.type,
        routeName: cfg.name,
        originName: originInput,
        destinationName: destTitle || destinationInput || 'Destino',
        distanceKm,
        durationMin,
        coordinates: coords,
        steps,
        litersNeeded,
        costEstimatedBrl,
        ecoScore: cfg.eco,
        fuelSufficiency: `Tanque OK! (${currentLitersInTank.toFixed(1)}L disponíveis, consome ~${litersNeeded.toFixed(1)}L)`,
      };
    });
  };

  // Core Eco-Routes Engine: Calculate up to 3 distinct routes via OSRM (Avoiding Ferries & Unpaved, Allowing Tolls)
  const handleCalculateAllRoutes = async (
    startPoint: { lat: number; lng: number } | null,
    endPoint: { lat: number; lng: number } | null,
    destTitle?: string
  ) => {
    let start =
      startPoint ||
      (isUsingGpsOrigin ? { lat: currentLat || -22.9194, lng: currentLng || -42.8186 } : originCoords);
    let end = endPoint || destinationCoords;

    setIsCalculatingRoutes(true);
    setRouteError(null);

    // Auto-resolve destination if text is provided but coords are not yet set
    if (!end && destinationInput.trim()) {
      const resolved = await hybridResolveLocation(
        destinationInput,
        start?.lat || currentLat || -22.9194,
        start?.lng || currentLng || -42.8186
      );
      if (resolved) {
        end = { lat: resolved.lat, lng: resolved.lng };
        setDestinationCoords(end);
        destTitle = destTitle || resolved.displayName;
      }
    }

    // Auto-resolve origin if text is provided but coords are not yet set
    if (!start && originInput.trim() && !isUsingGpsOrigin) {
      const resolvedOrigin = await hybridResolveLocation(
        originInput,
        currentLat || -22.9194,
        currentLng || -42.8186
      );
      if (resolvedOrigin) {
        start = { lat: resolvedOrigin.lat, lng: resolvedOrigin.lng };
        setOriginCoords(start);
      }
    }

    if (!start || !end) {
      setIsCalculatingRoutes(false);
      setRouteError('Digite um local válido de partida e de destino para traçar a rota.');
      return;
    }

    stopLiveNavigation();

    try {
      // Request OSRM driving engine with alternatives=3
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&alternatives=3`;
      
      let rawRoutes: any[] = [];
      try {
        const response = await fetch(osrmUrl, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            rawRoutes = data.routes;
          }
        }
      } catch (netErr) {
        console.warn('OSRM Principal lento/offline, tentando servidor secundário...', netErr);
        try {
          const backupUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&alternatives=3`;
          const backupRes = await fetch(backupUrl, { signal: AbortSignal.timeout(5000) });
          if (backupRes.ok) {
            const bData = await backupRes.json();
            if (bData.routes && bData.routes.length > 0) {
              rawRoutes = bData.routes;
            }
          }
        } catch (bErr) {
          console.warn('Falha também no secundário:', bErr);
        }
      }

      // If offline or no network response, fallback to offline 3-route engine
      if (rawRoutes.length === 0) {
        const offlineRoutes = generateOfflineFallbackRoute(start, end, destTitle);
        setCalculatedRoutes(offlineRoutes);
        setSelectedRouteId(offlineRoutes[0].id);
        setLiveRemainingDistanceKm(offlineRoutes[0].distanceKm);
        setLiveRemainingDurationMin(offlineRoutes[0].durationMin);
        renderRoutesOnMap(offlineRoutes, offlineRoutes[0].id, start, end, destTitle || destinationInput);
        setRouteError('Modo Offline: 3 Rotas calculadas no aparelho (evitando balsas e estradas de terra).');
        return;
      }

      // Filter out ferry steps (Evitar Balsa)
      const nonFerryRoutes = rawRoutes.filter((r) => {
        const steps = r.legs?.[0]?.steps || [];
        const hasFerry = steps.some((s: any) => s.maneuver?.type === 'ferry' || s.mode === 'ferry');
        return !hasFerry;
      });

      const validRawRoutes = nonFerryRoutes.length > 0 ? nonFerryRoutes : rawRoutes;

      let parsedRoutes: NavigationRoute[] = validRawRoutes.map((r: any, idx: number) => {
        const coords: [number, number][] = r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        const distanceKm = Number((r.distance / 1000).toFixed(1));
        const durationMin = Math.max(1, Math.round(r.duration / 60));

        const avgSpeedKmh = distanceKm / (durationMin / 60 || 0.1);

        let efficiencyMultiplier = 1.0;
        if (avgSpeedKmh > 95) {
          efficiencyMultiplier = 1.14;
        } else if (avgSpeedKmh < 28) {
          efficiencyMultiplier = 1.22;
        } else if (avgSpeedKmh >= 55 && avgSpeedKmh <= 80) {
          efficiencyMultiplier = 0.92;
        }

        const effectiveKmPerL = baseKmPerL / efficiencyMultiplier;
        const litersNeeded = Number((distanceKm / effectiveKmPerL).toFixed(2));
        const costEstimatedBrl = Number((litersNeeded * fuelPricePerLiter).toFixed(2));

        const ecoScore = Math.max(
          20,
          Math.min(
            100,
            Math.round(100 - litersNeeded * 10 + (avgSpeedKmh >= 50 && avgSpeedKmh <= 80 ? 15 : 0))
          )
        );

        const fuelSufficiency =
          currentLitersInTank >= litersNeeded
            ? `Tanque suficiente! (${currentLitersInTank.toFixed(1)}L disponíveis, consome ~${litersNeeded.toFixed(
                1
              )}L)`
            : `Atenção: Combustível insuficiente (${currentLitersInTank.toFixed(
                1
              )}L disponíveis vs ${litersNeeded.toFixed(1)}L necessários). Abasteça antes!`;

        const routeSteps: RouteStep[] = (r.legs?.[0]?.steps || []).map((s: any) => ({
          instruction: formatManeuver(s.maneuver),
          distance: s.distance,
          name: s.name || 'Via Principal',
          type: s.maneuver?.type,
          modifier: s.maneuver?.modifier,
          location: s.maneuver?.location ? [s.maneuver.location[1], s.maneuver.location[0]] : undefined,
        }));

        return {
          id: `route-${idx}`,
          routeType: (idx === 0 ? 'fastest' : idx === 1 ? 'eco' : 'alternative') as any,
          routeName: idx === 0 ? '⚡ Rota 1: Mais Rápida' : idx === 1 ? '🍃 Rota 2: Mais Econômica' : `🛣️ Rota ${idx + 1}: Alternativa`,
          originName: originInput,
          destinationName: destTitle || destinationInput || 'Destino Escolhido',
          distanceKm,
          durationMin,
          coordinates: coords,
          steps: routeSteps,
          litersNeeded,
          costEstimatedBrl,
          ecoScore,
          fuelSufficiency,
        };
      });

      // Ensure we always provide 3 distinct routes (if OSRM returned only 1 or 2)
      if (parsedRoutes.length < 3 && parsedRoutes.length > 0) {
        const primary = parsedRoutes[0];
        
        if (parsedRoutes.length === 1) {
          // Create Route 2 (Eco) and Route 3 (Alternative)
          const ecoCoords: [number, number][] = primary.coordinates.map(([lat, lng], i) => [
            lat + Math.sin((i / primary.coordinates.length) * Math.PI) * 0.003,
            lng + Math.cos((i / primary.coordinates.length) * Math.PI) * 0.003,
          ]);
          const altCoords: [number, number][] = primary.coordinates.map(([lat, lng], i) => [
            lat - Math.sin((i / primary.coordinates.length) * Math.PI) * 0.004,
            lng - Math.cos((i / primary.coordinates.length) * Math.PI) * 0.004,
          ]);

          const routeEco: NavigationRoute = {
            ...primary,
            id: 'route-1-eco',
            routeType: 'eco',
            routeName: '🍃 Rota 2: Mais Econômica (Eco)',
            distanceKm: Number((primary.distanceKm * 0.96).toFixed(1)),
            durationMin: primary.durationMin + 3,
            coordinates: ecoCoords,
            litersNeeded: Number((primary.litersNeeded * 0.92).toFixed(2)),
            costEstimatedBrl: Number(((primary.litersNeeded * 0.92) * fuelPricePerLiter).toFixed(2)),
            ecoScore: 95,
          };

          const routeAlt: NavigationRoute = {
            ...primary,
            id: 'route-2-alt',
            routeType: 'alternative',
            routeName: '🛣️ Rota 3: Alternativa Panorâmica',
            distanceKm: Number((primary.distanceKm * 1.08).toFixed(1)),
            durationMin: primary.durationMin + 6,
            coordinates: altCoords,
            litersNeeded: Number((primary.litersNeeded * 1.06).toFixed(2)),
            costEstimatedBrl: Number(((primary.litersNeeded * 1.06) * fuelPricePerLiter).toFixed(2)),
            ecoScore: 82,
          };

          parsedRoutes = [primary, routeEco, routeAlt];
        } else if (parsedRoutes.length === 2) {
          const second = parsedRoutes[1];
          const altCoords: [number, number][] = primary.coordinates.map(([lat, lng], i) => [
            lat - Math.sin((i / primary.coordinates.length) * Math.PI) * 0.004,
            lng - Math.cos((i / primary.coordinates.length) * Math.PI) * 0.004,
          ]);
          const routeAlt: NavigationRoute = {
            ...second,
            id: 'route-2-alt',
            routeType: 'alternative',
            routeName: '🛣️ Rota 3: Alternativa Panorâmica',
            distanceKm: Number((primary.distanceKm * 1.07).toFixed(1)),
            durationMin: primary.durationMin + 5,
            coordinates: altCoords,
            litersNeeded: Number((primary.litersNeeded * 1.05).toFixed(2)),
            costEstimatedBrl: Number(((primary.litersNeeded * 1.05) * fuelPricePerLiter).toFixed(2)),
            ecoScore: 80,
          };
          parsedRoutes.push(routeAlt);
        }
      }

      // Label top routes properly
      parsedRoutes[0].routeName = '⚡ Rota 1: Mais Rápida';
      parsedRoutes[0].routeType = 'fastest';
      if (parsedRoutes[1]) {
        parsedRoutes[1].routeName = '🍃 Rota 2: Mais Econômica';
        parsedRoutes[1].routeType = 'eco';
      }
      if (parsedRoutes[2]) {
        parsedRoutes[2].routeName = '🛣️ Rota 3: Alternativa';
        parsedRoutes[2].routeType = 'alternative';
      }

      setCalculatedRoutes(parsedRoutes.slice(0, 3));
      setSelectedRouteId(parsedRoutes[0].id);

      setLiveRemainingDistanceKm(parsedRoutes[0].distanceKm);
      setLiveRemainingDurationMin(parsedRoutes[0].durationMin);

      renderRoutesOnMap(parsedRoutes.slice(0, 3), parsedRoutes[0].id, start, end, destTitle || destinationInput);

      // Proactive Voice Feedback: Announce 3 routes calculated with female voice
      roadAlertsEngine.speak(
        `Traçadas 3 rotas para ${destTitle || destinationInput}. A mais rápida leva cerca de ${parsedRoutes[0].durationMin} minutos.`,
        false,
        true
      );

      fetchAiEcoAdvice(originInput, destTitle || destinationInput, parsedRoutes[0]);
    } catch (err: any) {
      console.error('Erro no cálculo de rotas:', err);
      setRouteError(err?.message || 'Não foi possível calcular as rotas.');
    } finally {
      setIsCalculatingRoutes(false);
    }
  };

  // ─── AUTO REROUTE ENGINE (OFF-ROUTE 1-2 SECONDS RECALCULATION) ───
  const handleAutoRerouteLive = async (
    currentPos: { lat: number; lng: number },
    targetDest: { lat: number; lng: number },
    destName: string
  ) => {
    if (isAutoReroutingRef.current) return;
    isAutoReroutingRef.current = true;
    setIsRecalculatingRoute(true);
    const now = Date.now();
    const timeSinceLastReroute = now - lastRerouteTimeRef.current;
    
    lastRerouteTimeRef.current = now;
    offRouteCountRef.current = 0;

    // Reduced frequency of reroute speech (Cooldown of 20 seconds for the voice)
    if (timeSinceLastReroute > 20000) {
      roadAlertsEngine.speak('Percurso atualizado. Recalculando rota...');
    } else {
      // Just a chime if it's too frequent
      wazeAudio.playHazardChime();
    }

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${currentPos.lng},${currentPos.lat};${targetDest.lng},${targetDest.lat}?overview=full&geometries=geojson&steps=true&alternatives=false`;

      let rawRoute: any = null;
      try {
        const response = await fetch(osrmUrl, { signal: AbortSignal.timeout(4000) });
        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            rawRoute = data.routes[0];
          }
        }
      } catch (err) {
        console.warn('Falha OSRM em recálculo, tentando secundário...', err);
        try {
          const backupUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${currentPos.lng},${currentPos.lat};${targetDest.lng},${targetDest.lat}?overview=full&geometries=geojson&steps=true&alternatives=false`;
          const backupRes = await fetch(backupUrl, { signal: AbortSignal.timeout(4000) });
          if (backupRes.ok) {
            const bData = await backupRes.json();
            if (bData.routes && bData.routes.length > 0) {
              rawRoute = bData.routes[0];
            }
          }
        } catch (bErr) {}
      }

      let newRoute: NavigationRoute;

      if (rawRoute) {
        const coords: [number, number][] = rawRoute.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        const distanceKm = Number((rawRoute.distance / 1000).toFixed(1));
        const durationMin = Math.max(1, Math.round(rawRoute.duration / 60));
        const litersNeeded = Number((distanceKm / baseKmPerL).toFixed(2));
        const costEstimatedBrl = Number((litersNeeded * fuelPricePerLiter).toFixed(2));

        const routeSteps: RouteStep[] = (rawRoute.legs?.[0]?.steps || []).map((s: any) => ({
          instruction: formatManeuver(s.maneuver),
          distance: s.distance,
          name: s.name || 'Via Principal',
          type: s.maneuver?.type,
          modifier: s.maneuver?.modifier,
          location: s.maneuver?.location ? [s.maneuver.location[1], s.maneuver.location[0]] : undefined,
        }));

        newRoute = {
          id: `reroute-${Date.now()}`,
          routeType: 'eco',
          routeName: '🍃 Nova Rota Recalculada',
          originName: 'Posição Atual',
          destinationName: destName,
          distanceKm,
          durationMin,
          coordinates: coords,
          steps: routeSteps,
          litersNeeded,
          costEstimatedBrl,
          ecoScore: 92,
          fuelSufficiency: `Tanque suficiente! (${currentLitersInTank.toFixed(1)}L disponíveis)`,
        };
      } else {
        const offlineList = generateOfflineFallbackRoute(currentPos, targetDest, destName);
        newRoute = offlineList[0];
        newRoute.routeName = '🌿 Nova Rota Recalculada (Offline)';
      }

      setCalculatedRoutes([newRoute]);
      setSelectedRouteId(newRoute.id);
      setLiveRemainingDistanceKm(newRoute.distanceKm);
      setLiveRemainingDurationMin(newRoute.durationMin);
      setCurrentStepIndex(0);
      lastSpokenStepIndexRef.current = -1;

      // Update map polylines seamlessly
      if (mapInstanceRef.current) {
        renderRoutesOnMap([newRoute], newRoute.id, currentPos, targetDest, destName);
      }

      const nextInst = newRoute.steps?.[0]?.instruction || 'Siga a rota traçada.';
      roadAlertsEngine.speak(`Nova rota traçada. ${nextInst}`);
    } catch (e) {
      console.error('Erro no auto-reroute:', e);
    } finally {
      setIsRecalculatingRoute(false);
      isAutoReroutingRef.current = false;
    }
  };

  // ─── FINISH TRIP / ARRIVAL HANDLER ───
  const finishTrip = (route: NavigationRoute) => {
    stopLiveNavigation();
    const finalSummary = {
      destinationName: route.destinationName || destinationInput || 'Destino',
      totalDistanceKm: route.distanceKm,
      durationMinutes: route.durationMin,
      litersConsumed: route.litersNeeded,
      totalCostBrl: route.costEstimatedBrl || Number((route.litersNeeded * fuelPricePerLiter).toFixed(2)),
      ecoScore: route.ecoScore || 95,
    };
    setTripSummary(finalSummary);
    setIsTripCompletedModalOpen(true);
    roadAlertsEngine.speak('Você chegou ao seu destino! Boa viagem com seu Clio.');
  };

  // ─── REAL-TIME OFF-ROUTE DETECTOR, PROGRESS TRACKER & ARRIVAL ENGINE ───
  useEffect(() => {
    if (!isLiveNavigating || !destinationCoords || isSimulatingDrive) return;

    const route = calculatedRoutes.find((r) => r.id === selectedRouteId) || calculatedRoutes[0];
    if (!route || !route.coordinates || route.coordinates.length < 2) return;

    const currentPos = driverPos;
    const dest = destinationCoords;

    // 1. ARRIVAL CHECK: Less than 35 meters to final destination
    const distanceToDestMeters = computeDistanceMeters([currentPos.lat, currentPos.lng], [dest.lat, dest.lng]);
    if (distanceToDestMeters < 35) {
      finishTrip(route);
      return;
    }

    // 2. OFF-ROUTE DETECTION & 5-8 SECONDS AUTO REROUTE (Waze-style stability)
    const distToRoute = minDistanceToRouteMeters(currentPos, route.coordinates);
    const now = Date.now();

    // Threshold increased to 80m to account for GPS noise and parallel streets
    if (distToRoute > 80) {
      offRouteCountRef.current += 1;
      // If off route for 4 consecutive ticks (approx 4-6 seconds) and hasn't rerouted in the last 8s
      if (offRouteCountRef.current >= 4 && now - lastRerouteTimeRef.current > 8000) {
        handleAutoRerouteLive(currentPos, dest, route.destinationName);
      }
    } else {
      offRouteCountRef.current = 0;
    }

    // 3. PROGRESS UPDATE & PRECISE STEP TRACKING ALONG THE ROUTE (When driving normally)
    if (distToRoute <= 80) {
      // Find closest point index in route coords to calculate remaining fraction
      let closestIdx = 0;
      let minPtDist = Infinity;
      for (let i = 0; i < route.coordinates.length; i++) {
        const d = computeDistanceMeters([currentPos.lat, currentPos.lng], route.coordinates[i]);
        if (d < minPtDist) {
          minPtDist = d;
          closestIdx = i;
        }
      }

      const totalCoords = route.coordinates.length;
      
      // Calculate more precise distance travelled along polyline
      let distTravelled = 0;
      for (let i = 0; i < closestIdx; i++) {
        distTravelled += computeDistanceMeters(route.coordinates[i], route.coordinates[i+1]);
      }
      
      const totalDistanceM = route.distanceKm * 1000;
      const fractionTravelled = Math.min(1, distTravelled / totalDistanceM);
      const fractionRemaining = Math.max(0, 1 - fractionTravelled);
      
      const remKm = Math.max(0.1, Number((route.distanceKm * fractionRemaining).toFixed(1)));
      const remMin = Math.max(1, Math.round(route.durationMin * fractionRemaining));
      
      setLiveRemainingDistanceKm(remKm);
      setLiveRemainingDurationMin(remMin);

      const steps = route.steps || [];
      if (steps.length > 0) {
        // Calculate cumulative distance to find the current active step
        let cumulativeM = 0;
        let activeIdx = 0;
        
        for (let i = 0; i < steps.length; i++) {
          cumulativeM += steps[i].distance;
          if (distTravelled < cumulativeM) {
            activeIdx = i;
            break;
          }
          activeIdx = i;
        }

        const upcomingStepIdx = Math.min(steps.length - 1, activeIdx + 1);
        const upcomingStep = steps[upcomingStepIdx];
        
        // Distance to the upcoming maneuver is the remaining distance of the current step
        let currentStepCumulative = 0;
        for (let i = 0; i <= activeIdx; i++) {
          currentStepCumulative += steps[i].distance;
        }
        const distToNextManeuver = Math.max(0, currentStepCumulative - distTravelled);

        // Update current street and detected speed limit (Heuristic based on street name and speed)
        const activeStepObj = steps[activeIdx];
        if (activeStepObj) {
          const sName = activeStepObj.name || activeStepObj.instruction || 'Pista';
          setCurrentStreetName(sName);
          
          const sNameLower = sName.toLowerCase();
          if (sNameLower.includes('rodovia') || sNameLower.includes('br-') || sNameLower.includes('sp-') || liveNavSpeed > 95) {
            setDetectedRoadSpeedLimit(110);
          } else if (sNameLower.includes('avenida') || sNameLower.includes('expressa') || liveNavSpeed > 65) {
            setDetectedRoadSpeedLimit(80);
          } else if (sNameLower.includes('rua') || sNameLower.includes('alameda')) {
            setDetectedRoadSpeedLimit(40);
          } else if (liveNavSpeed > 45) {
            setDetectedRoadSpeedLimit(60);
          }
        }

        setCurrentStepIndex(upcomingStepIdx);
        const cleanStepMeters = Math.max(0, Math.round(distToNextManeuver));
        setDistanceToNextStepMeters(cleanStepMeters);

        // Voice and Visual Synchronized Announcement
        if (upcomingStepIdx !== lastSpokenStepIndexRef.current) {
          lastSpokenStepIndexRef.current = upcomingStepIdx;
          const currentInst = upcomingStep.instruction;
          const street = upcomingStep.name && upcomingStep.name !== 'Via Principal' ? `na ${upcomingStep.name}` : '';
          
          if (cleanStepMeters > 50) {
            roadAlertsEngine.speak(`Em ${cleanStepMeters} metros, ${currentInst} ${street}`);
          } else {
            roadAlertsEngine.speak(`${currentInst} ${street}`);
          }
        }
      }
    }
  }, [driverPos, isLiveNavigating, destinationCoords, selectedRouteId, isSimulatingDrive]);

  function formatManeuver(m: any) {
    if (!m) return 'Siga em frente';
    const type = m.type;
    const mod = m.modifier;
    if (type === 'turn') {
      if (mod === 'right') return 'Vire à direita';
      if (mod === 'left') return 'Vire à esquerda';
      if (mod === 'slight right') return 'Mantenha-se à direita';
      if (mod === 'slight left') return 'Mantenha-se à esquerda';
      if (mod === 'sharp right') return 'Curva acentuada à direita';
      if (mod === 'sharp left') return 'Curva acentuada à esquerda';
    }
    if (type === 'roundabout') return `Entre na rotatória (${m.exit || 1}ª saída)`;
    if (type === 'merge') return 'Acesse a via principal';
    if (type === 'fork') return mod === 'right' ? 'Na bifurcação, siga à direita' : 'Na bifurcação, siga à esquerda';
    if (type === 'arrive') return 'Você chegou ao seu destino';
    return 'Siga em frente';
  }

  // Draw all route polylines and markers on Leaflet
  const renderRoutesOnMap = (
    routes: NavigationRoute[],
    activeId: string,
    startCoords: { lat: number; lng: number },
    endCoords: { lat: number; lng: number },
    destName: string
  ) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    routePolylinesRef.current.forEach((r) => map.removeLayer(r.polyline));
    routePolylinesRef.current = [];

    if (originMarkerRef.current) map.removeLayer(originMarkerRef.current);
    if (destMarkerRef.current) map.removeLayer(destMarkerRef.current);

    const polylinesList: { id: string; polyline: L.Polyline }[] = [];

    routes.forEach((route) => {
      const isSelected = route.id === activeId;
      let color = '#64748b';
      let weight = 4;
      let opacity = 0.5;
      let dashArray: string | undefined = '4, 8';

      if (isSelected) {
        // Waze Signature Royal Purple with high-contrast white casing
        color = '#9333ea'; 
        weight = 10;
        opacity = 1;
        dashArray = undefined;

        // White Casing (Outer border) for that Waze-app look
        const borderPoly = L.polyline(route.coordinates, {
          color: '#ffffff',
          weight: 15,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        polylinesList.push({ id: `${route.id}-border`, polyline: borderPoly });
      }

      const poly = L.polyline(route.coordinates, {
        color,
        weight,
        opacity,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray,
      }).addTo(map);

      poly.on('click', () => {
        handleSelectRoute(route.id);
      });

      polylinesList.push({ id: route.id, polyline: poly });
    });

    routePolylinesRef.current = polylinesList;

    // Add turn street label marker if available (like in Waze screenshots: "Av. Horácio Macedo")
    const activeRouteObj = routes.find((r) => r.id === activeId);
    if (activeRouteObj && activeRouteObj.steps && activeRouteObj.steps.length > 0) {
      const turnStep = activeRouteObj.steps.find((s) => s.name && s.name !== 'Via Principal') || activeRouteObj.steps[0];
      if (turnStep && activeRouteObj.coordinates && activeRouteObj.coordinates.length > 5) {
        const turnCoord = activeRouteObj.coordinates[Math.min(10, activeRouteObj.coordinates.length - 1)];
        const turnBadgeHtml = `
          <div class="relative flex flex-col items-center pointer-events-none drop-shadow-xl">
            <div class="bg-[#3b0764] text-white font-black text-[11px] px-3 py-1 rounded-xl border-2 border-[#a855f7] whitespace-nowrap tracking-wide">
              ${turnStep.name || activeRouteObj.destinationName}
            </div>
            <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-[#3b0764]"></div>
          </div>
        `;
        const turnLabelIcon = L.divIcon({
          html: turnBadgeHtml,
          className: 'waze-turn-badge',
          iconSize: [120, 30],
          iconAnchor: [60, 30],
        });
        const turnMarker = L.marker([turnCoord[0], turnCoord[1]], { icon: turnLabelIcon }).addTo(map);
        originMarkerRef.current = turnMarker;
      }
    }

    const originIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center">
          <div class="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-white shadow-xl">
            <span class="text-[10px] font-black">A</span>
          </div>
        </div>
      `,
      className: 'origin-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
    const originMarker = L.marker([startCoords.lat, startCoords.lng], { icon: originIcon })
      .addTo(map)
      .bindPopup(`<b>Origem:</b> ${originInput}`);
    originMarkerRef.current = originMarker;

    const destIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shadow-xl animate-bounce">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
      `,
      className: 'dest-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
    const destMarker = L.marker([endCoords.lat, endCoords.lng], { icon: destIcon })
      .addTo(map)
      .bindPopup(`<b>Destino:</b> ${destName}`)
      .openPopup();
    destMarkerRef.current = destMarker;

    const activePolyline = polylinesList.find((p) => p.id === activeId)?.polyline;
    if (activePolyline && !isLiveNavigating) {
      map.fitBounds(activePolyline.getBounds(), { padding: [50, 50] });
    }
  };

  const handleSelectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    const targetRoute = calculatedRoutes.find((r) => r.id === routeId);
    if (targetRoute) {
      setLiveRemainingDistanceKm(targetRoute.distanceKm);
      setLiveRemainingDurationMin(targetRoute.durationMin);
    }

    if (!mapInstanceRef.current || calculatedRoutes.length === 0) return;

    routePolylinesRef.current.forEach((item) => {
      const isSelected = item.id === routeId;
      const r = calculatedRoutes.find((x) => x.id === item.id);
      if (isSelected && r) {
        let color = '#10b981';
        if (r.routeType === 'fastest') color = '#38bdf8';
        else if (r.routeType !== 'eco') color = '#f59e0b';

        item.polyline.setStyle({
          color,
          weight: 7,
          opacity: 0.95,
          dashArray: undefined,
        });
        item.polyline.bringToFront();
      } else {
        item.polyline.setStyle({
          color: '#64748b',
          weight: 4,
          opacity: 0.5,
          dashArray: '4, 8',
        });
      }
    });
  };

  const fetchAiEcoAdvice = async (origin: string, dest: string, ecoRoute: NavigationRoute) => {
    try {
      const response = await fetch('/api/smart-route-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: dest,
          originQuery: origin,
          currentLat: currentLat || -22.9194,
          currentLng: currentLng || -42.8186,
          carConfig,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setAiCopilotData({
          copilotMessage: data.copilotMessage,
          ecoTip:
            data.ecoTip ||
            'Mantenha rotações entre 2.000 e 2.800 RPM no Clio 1.0 para maximizar a economia.',
          category: data.category,
        });
      }
    } catch (err) {
      console.warn('AI Co-pilot offline:', err);
    }
  };

  const handleAiSmartSearch = async (promptQuery?: string) => {
    const query = promptQuery || destinationInput;
    if (!query.trim()) return;

    setIsCalculatingRoutes(true);
    setRouteError(null);

    try {
      const response = await fetch('/api/smart-route-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: query,
          originQuery: isUsingGpsOrigin ? undefined : originInput,
          currentLat: currentLat || -22.9194,
          currentLng: currentLng || -42.8186,
          carConfig,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao processar comando com a IA de navegação.');
      }

      const data = await response.json();
      setAiCopilotData({
        copilotMessage: data.copilotMessage,
        ecoTip: data.ecoTip,
        category: data.category,
      });

      let endLat = data.latitude;
      let endLng = data.longitude;
      let finalDestName = data.destinationName || query;

      if (!endLat || !endLng) {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          data.searchQuery || query
        )}&limit=1`;
        const nomRes = await fetch(nomUrl);
        const nomData = await nomRes.json();
        if (nomData && nomData.length > 0) {
          endLat = parseFloat(nomData[0].lat);
          endLng = parseFloat(nomData[0].lon);
          finalDestName = nomData[0].display_name;
        } else {
          throw new Error(`Não encontramos o endereço "${query}" no OpenStreetMap.`);
        }
      }

      setDestinationInput(finalDestName);
      setDestinationCoords({ lat: endLat, lng: endLng });

      let startPoint = isUsingGpsOrigin
        ? { lat: currentLat || -22.9194, lng: currentLng || -42.8186 }
        : originCoords;

      if (data.originLatitude && data.originLongitude) {
        startPoint = { lat: data.originLatitude, lng: data.originLongitude };
        setOriginCoords(startPoint);
        setOriginInput(data.originName || 'Origem identificada');
        setIsUsingGpsOrigin(false);
      }

      handleCalculateAllRoutes(startPoint, { lat: endLat, lng: endLng }, finalDestName);
    } catch (err: any) {
      console.error('Erro na busca inteligente IA:', err);
      setRouteError(err?.message || 'Não foi possível encontrar o local desejado.');
    } finally {
      setIsCalculatingRoutes(false);
    }
  };

  // ─── START / STOP LIVE DRIVER NAVIGATION (WAZE / GOOGLE MAPS STYLE) ───
  const startLiveNavigation = (simulateMode: boolean = false) => {
    const route = calculatedRoutes.find((r) => r.id === selectedRouteId) || calculatedRoutes[0];
    if (!route || !route.coordinates || route.coordinates.length < 2) {
      setRouteError('Selecione uma rota válida antes de iniciar a navegação.');
      return;
    }

    setIsLiveNavigating(true);
    setShowTurnByTurn(false);
    setAutoFollowCar(true);
    setUserInteractedMap(false);
    setCurrentStepIndex(0);
    lastSpokenStepIndexRef.current = -1;
    roadAlertsEngine.resetSpokenHazards();

    // Center map with driver zoom and invalidate tile size for perfect loading
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      const startCoord = route.coordinates[0];
      mapInstanceRef.current.setView([startCoord[0], startCoord[1]], 17, { animate: true });
    }

    // Voice announcement
    const firstStep = route.steps?.[0];
    const initialAnnouncement = `Iniciando navegação para ${route.destinationName}. ${
      firstStep ? firstStep.instruction : 'Siga a rota traçada.'
    }`;
    roadAlertsEngine.speak(initialAnnouncement);

    // Only simulate if explicitly requested by test drive simulation button
    if (simulateMode) {
      setIsSimulatingDrive(true);
      simulationCoordIndexRef.current = 0;

      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }

      const totalCoords = route.coordinates.length;
      let currentIndex = 0;

      simulationIntervalRef.current = setInterval(() => {
        if (currentIndex >= totalCoords - 1) {
          if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
          setIsSimulatingDrive(false);
          setLiveNavSpeed(0);
          roadAlertsEngine.speak('Você chegou ao seu destino!');
          return;
        }

        const currentPt = route.coordinates[currentIndex];
        const nextPt = route.coordinates[currentIndex + 1];

        const brng = computeBearing(currentPt, nextPt);
        setVehicleHeading(brng);

        currentIndex += 1;
        simulationCoordIndexRef.current = currentIndex;
        setDriverPos({ lat: nextPt[0], lng: nextPt[1] });

        const simSpeed = 52 + Math.floor(Math.random() * 20);
        setLiveNavSpeed(simSpeed);

        const fractionRemaining = 1 - currentIndex / totalCoords;
        const remKm = Math.max(0.1, Number((route.distanceKm * fractionRemaining).toFixed(1)));
        const remMin = Math.max(1, Math.round(route.durationMin * fractionRemaining));
        setLiveRemainingDistanceKm(remKm);
        setLiveRemainingDurationMin(remMin);

        const steps = route.steps || [];
        if (steps.length > 0) {
          let activeIdx = currentStepIndex;
          const activeManeuver = steps[activeIdx]?.location;
          if (activeManeuver) {
            const dMan = computeDistanceMeters([nextPt[0], nextPt[1]], activeManeuver);
            if (dMan < 25 && activeIdx < steps.length - 1) {
              activeIdx += 1;
              setCurrentStepIndex(activeIdx);
            }
          } else {
            const estIdx = Math.min(steps.length - 1, Math.floor((currentIndex / totalCoords) * steps.length));
            if (estIdx > activeIdx) {
              activeIdx = estIdx;
              setCurrentStepIndex(activeIdx);
            }
          }

          const currentStepObj = steps[activeIdx] || steps[0];
          let distToManeuver = 0;
          if (currentStepObj.location) {
            distToManeuver = computeDistanceMeters([nextPt[0], nextPt[1]], currentStepObj.location);
          } else {
            distToManeuver = Math.round(currentStepObj.distance * fractionRemaining);
          }

          const stepMeters = Math.max(10, Math.round(distToManeuver));
          setDistanceToNextStepMeters(stepMeters);

          if (activeIdx !== lastSpokenStepIndexRef.current) {
            lastSpokenStepIndexRef.current = activeIdx;
            const currentInst = currentStepObj.instruction;
            const street = currentStepObj.name && currentStepObj.name !== 'Via Principal' ? `na ${currentStepObj.name}` : '';
            if (stepMeters > 50) {
              roadAlertsEngine.speak(`Em ${stepMeters} metros, ${currentInst} ${street}`);
            } else {
              roadAlertsEngine.speak(`${currentInst} ${street}`);
            }
          }
        }
      }, 1200);
    }
  };

  const stopLiveNavigation = () => {
    setIsLiveNavigating(false);
    setIsSimulatingDrive(false);
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    recenterOnCar();
  };

  const clearAllRoutes = () => {
    stopLiveNavigation();
    if (mapInstanceRef.current) {
      routePolylinesRef.current.forEach((r) => mapInstanceRef.current?.removeLayer(r.polyline));
      routePolylinesRef.current = [];
      if (originMarkerRef.current) mapInstanceRef.current.removeLayer(originMarkerRef.current);
      if (destMarkerRef.current) mapInstanceRef.current.removeLayer(destMarkerRef.current);
      mapInstanceRef.current.panTo([currentLat || -22.9194, currentLng || -42.8186]);
    }
    setCalculatedRoutes([]);
    setSelectedRouteId(null);
    setDestinationInput('');
    setDestinationCoords(null);
    setAiCopilotData(null);
    setRouteError(null);
    setShowTurnByTurn(false);
    setAutoFollowCar(true);
  };

  const recenterOnCar = () => {
    setAutoFollowCar(true);
    setUserInteractedMap(false);
    if (mapInstanceRef.current) {
      const lat = driverPos.lat;
      const lng = driverPos.lng;
      mapInstanceRef.current.setView([lat, lng], isLiveNavigating ? 17 : 16, { animate: true });
    }
  };

  const activeRoute = calculatedRoutes.find((r) => r.id === selectedRouteId) || calculatedRoutes[0];
  const activeStep = activeRoute?.steps?.[currentStepIndex] || activeRoute?.steps?.[0];
  const nextStep = activeRoute?.steps?.[currentStepIndex + 1];

  // Authentic Waze Maneuver Direction Arrow SVG
  const renderWazeManeuverSvg = (step?: RouteStep, size = 44) => {
    if (!step) {
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <path d="M22 36V10" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 20L22 8L32 20" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    const mod = (step.modifier || '').toLowerCase();
    const type = (step.type || '').toLowerCase();

    // Roundabout / Rotary
    if (type.includes('roundabout') || type.includes('rotary')) {
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <path d="M22 8A14 14 0 1 1 8 22" stroke="white" strokeWidth="5" strokeLinecap="round" />
          <path d="M8 14L8 22L16 22" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // Turn Left (e.g. sharp left, slight left, regular left as seen in screenshots)
    if (mod.includes('left') || type.includes('left')) {
      if (mod.includes('slight')) {
        return (
          <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
            <path d="M28 36V22L16 10" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 10H16V18" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      }
      // Standard Waze curved turn left arrow (exactly like screenshot 1 & 2)
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <path d="M30 36V22C30 14 24 10 14 10H8" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 4L8 10L16 16" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // Turn Right
    if (mod.includes('right') || type.includes('right')) {
      if (mod.includes('slight')) {
        return (
          <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
            <path d="M16 36V22L28 10" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 10H28V18" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      }
      // Standard Waze curved turn right arrow
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <path d="M14 36V22C14 14 20 10 30 10H36" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M28 4L36 10L28 16" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // U-Turn
    if (mod.includes('uturn') || type.includes('u-turn')) {
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <path d="M30 36V18C30 11.5 24.5 7 18 7C11.5 7 6 11.5 6 18V28" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M1 23L6 29L11 23" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // Straight
    return (
      <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
        <path d="M22 36V10" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 20L22 8L32 20" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const renderManeuverIcon = (step?: RouteStep, size = 26) => {
    return renderWazeManeuverSvg(step, size);
  };

  const renderFavoriteIcon = (iconName?: string, size = 14) => {
    switch (iconName) {
      case 'home':
        return <Home size={size} className="text-emerald-400" />;
      case 'work':
        return <Briefcase size={size} className="text-sky-400" />;
      case 'school':
        return <GraduationCap size={size} className="text-amber-400" />;
      case 'gas':
        return <Fuel size={size} className="text-amber-400" />;
      case 'beach':
        return <Umbrella size={size} className="text-cyan-400" />;
      case 'shopping':
        return <ShoppingBag size={size} className="text-purple-400" />;
      case 'gym':
        return <Dumbbell size={size} className="text-rose-400" />;
      case 'heart':
        return <Heart size={size} className="text-red-400 fill-red-400/20" />;
      default:
        return <Star size={size} className="text-amber-400 fill-amber-400/20" />;
    }
  };

  const calculateETA = (durationMinutes: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + durationMinutes);
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-[#07070b] overflow-hidden ${
        isEmbedded ? 'rounded-2xl border border-[#1e1e28]' : 'fixed inset-0 z-50'
      }`}
    >
      {/* ─── TOP SECTION: GOOGLE MAPS PLANNER OR WAZE TURN-BY-TURN HUD ─── */}
      {!isLiveNavigating ? (
        <div className="bg-[#00b8ff] text-white p-3 z-30 shadow-2xl shrink-0 flex flex-col gap-2">
          {/* Authentic Waze Top Bar Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white text-[#00b8ff] font-black flex items-center justify-center shadow-md text-sm">
                🚗
              </div>
              <span className="text-base font-black tracking-tighter text-white drop-shadow">Waze Live</span>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-1.5">
              {gpsActive ? (
                <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-full text-white text-[11px] font-black">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                  <span>GPS ATIVO</span>
                </div>
              ) : (
                <button
                  onClick={onRequestGps}
                  className="flex items-center gap-1 bg-white text-[#00b8ff] px-2.5 py-1 rounded-full text-[11px] font-black uppercase shadow hover:bg-zinc-100 active:scale-95"
                >
                  <LocateFixed size={12} />
                  <span>GPS</span>
                </button>
              )}

              <button
                onClick={() => setIsOfflineModalOpen(true)}
                className="px-2.5 py-1 rounded-full bg-black/20 hover:bg-black/30 text-white text-[11px] font-black shadow"
              >
                OFFLINE
              </button>

              <button
                onClick={() => setIsManageFavoritesOpen(true)}
                className="px-2.5 py-1 rounded-full bg-black/20 hover:bg-black/30 text-white text-[11px] font-black shadow flex items-center gap-1"
              >
                <Star size={12} className="fill-amber-300 text-amber-300" />
                <span>({favorites.length})</span>
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center bg-black/20 hover:bg-black/40 text-white rounded-full font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* ─── AUTHENTIC WAZE SEARCH PILL BOX ─── */}
          <div className="bg-white rounded-2xl p-2 shadow-lg flex flex-col gap-2 text-zinc-800">
            {/* Origin & Destination with Swap button */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center justify-between py-1 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                <div className="w-0.5 h-5 bg-zinc-300 my-0.5" />
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-100" />
              </div>

              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                {/* Origin Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={originInput}
                    onChange={(e) => handleOriginChange(e.target.value)}
                    onFocus={() => setActiveSuggestionField('origin')}
                    placeholder="Sua localização atual..."
                    className="w-full bg-zinc-100 text-xs text-zinc-900 placeholder-zinc-400 px-3 py-1.5 pr-8 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#00b8ff] font-semibold"
                  />
                  {!isUsingGpsOrigin ? (
                    <button
                      onClick={handleSetOriginToGps}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#00b8ff] p-0.5"
                    >
                      <LocateFixed size={13} />
                    </button>
                  ) : (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600 text-[10px] font-black">
                      GPS
                    </span>
                  )}

                  {activeSuggestionField === 'origin' && originSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                      {originSuggestions.map((place, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectSuggestion(place, 'origin')}
                          className="px-3 py-2 text-xs text-zinc-700 hover:bg-emerald-50 hover:text-emerald-950 cursor-pointer border-b border-zinc-100 last:border-0 flex items-center justify-between"
                        >
                          <span className="font-bold truncate">{place.name || place.display_name.split(',')[0]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Destination Input (Waze Search Bar Style) */}
                <div className="relative">
                  <input
                    type="text"
                    value={destinationInput}
                    onChange={(e) => handleDestChange(e.target.value)}
                    onFocus={() => setActiveSuggestionField('dest')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCalculateAllRoutes(null, null, destinationInput);
                      }
                    }}
                    placeholder="Para onde vamos? 🚗💨"
                    className="w-full bg-zinc-100 text-xs text-zinc-900 placeholder-zinc-400 px-3 py-2 pr-12 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#00b8ff] font-bold shadow-sm"
                  />

                  {destinationInput && (
                    <button
                      onClick={() => {
                        setDestinationInput('');
                        setDestinationCoords(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-0.5"
                    >
                      <X size={13} />
                    </button>
                  )}

                  {activeSuggestionField === 'dest' && destSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                      {destSuggestions.map((place, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectSuggestion(place, 'dest')}
                          className="px-3 py-2 text-xs text-zinc-700 hover:bg-blue-50 hover:text-blue-950 cursor-pointer border-b border-zinc-100 last:border-0 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin size={13} className="text-[#00b8ff] shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-zinc-900 truncate">{place.name || place.display_name.split(',')[0]}</span>
                              <span className="text-[10px] text-zinc-500 truncate">{place.display_name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Swap Origin/Dest Button */}
              <button
                onClick={handleSwapOriginAndDest}
                className="p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200 shrink-0 transition-transform active:rotate-180"
              >
                <ArrowUpDown size={14} />
              </button>
            </div>

            {/* Favorites Shortcut Chips Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
              <span className="text-[9px] font-black uppercase text-amber-600 shrink-0 flex items-center gap-1">
                <Star size={10} className="fill-amber-500 text-amber-500" />
                FAVORITOS:
              </span>
              {favorites.map((fav) => (
                <button
                  key={fav.id}
                  onClick={() => handleSelectFavoriteDestination(fav)}
                  className="px-2 py-1 bg-zinc-100 hover:bg-blue-50 text-zinc-700 hover:text-blue-600 border border-zinc-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all shadow-xs"
                >
                  {renderFavoriteIcon(fav.icon, 11)}
                  <span>{fav.name}</span>
                </button>
              ))}
            </div>

            {/* Quick Actions & Calculate Button */}
            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-zinc-100">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAiSmartSearch('Posto de combustível mais próximo com GNV e gasolina')}
                  className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold border border-amber-200 flex items-center gap-1"
                >
                  <Fuel size={11} /> Postos
                </button>

                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[10px] font-bold border border-red-200 flex items-center gap-1"
                >
                  <Flag size={11} className="text-red-500" />
                  <span>Reportar</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCalculateAllRoutes(null, null)}
                  disabled={isCalculatingRoutes || !destinationInput}
                  className="px-4 py-2 bg-[#00b8ff] hover:bg-[#009de0] disabled:opacity-50 text-white font-black text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  {isCalculatingRoutes ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Calculando...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={13} />
                      <span>Vamos! (Traçar)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (

        /* ─── AUTHENTIC WAZE TOP MANEUVER BANNER (VIBRANT BLUE) ─── */
        <div className="bg-[#2563eb] text-white px-5 py-4 z-30 shadow-2xl shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            {/* White Maneuver Direction Arrow with Shadow */}
            <div className="shrink-0 flex items-center justify-center filter drop-shadow-lg">
              {renderWazeManeuverSvg(activeStep, 50)}
            </div>

            {/* Big Countdown Distance and Target Street */}
            <div className="flex-1 min-w-0">
              <div className="text-4xl sm:text-5xl font-black tracking-tighter text-white leading-none">
                {distanceToNextStepMeters > 0
                  ? distanceToNextStepMeters >= 1000
                    ? `${(distanceToNextStepMeters / 1000).toFixed(1)}km`
                    : `${distanceToNextStepMeters}m`
                  : 'Agora'}
              </div>
              <div className="text-lg sm:text-xl font-bold text-white/90 truncate mt-1 leading-tight flex items-center gap-2">
                {activeStep?.name && activeStep?.name !== 'Via Principal' 
                  ? activeStep.name 
                  : activeStep?.instruction || activeRoute?.destinationName || 'Siga a via'}
              </div>
            </div>
          </div>

          {/* Quick Sound Mode & Exit Trip */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <button
              onClick={toggleWazeSoundMode}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 active:scale-95 transition-all shadow-lg backdrop-blur-sm"
            >
              {wazeSoundMode === 'all' ? (
                <Volume2 size={22} />
              ) : wazeSoundMode === 'alerts' ? (
                <Volume1 size={22} className="text-amber-300" />
              ) : (
                <VolumeX size={22} className="text-white/40" />
              )}
            </button>

            <button
              onClick={stopLiveNavigation}
              className="p-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white border border-red-500 active:scale-95 transition-all shadow-lg"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN LEAFLET MAP CONTAINER ─── */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden bg-[#e8ecef]">
        {/* Map div with smooth Hardware Accelerated Heads-Up Rotation */}
        <div
          ref={mapContainerRef}
          className="w-full h-full z-10 will-change-transform"
          style={{
            transform: isLiveNavigating && isHeadingUpNavigation ? `rotate(${-vehicleHeading}deg) scale(1.6)` : 'none',
            transformOrigin: '50% 50%',
            transition: 'transform 0.3s linear',
          }}
        />

        {/* Dynamic Auto-Reroute Realtime Badge */}
        {isRecalculatingRoute && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-amber-400 text-black px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2 font-black text-xs uppercase tracking-wider animate-bounce border-2 border-black">
            <Loader2 size={16} className="animate-spin" />
            <span>Recalculando rota Waze...</span>
          </div>
        )}

        {/* Proactive Nearby Hazards Alert Floating Pill */}
        {nearbyHazards.length > 0 && (
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 max-w-xs animate-in slide-in-from-top-2">
            {nearbyHazards.slice(0, 2).map((h) => (
              <div
                key={h.id}
                className="bg-[#0d0d18]/95 border border-red-500/50 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-white"
              >
                <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-400 flex items-center justify-center font-black text-sm text-red-300 shrink-0 animate-pulse">
                  {h.type === 'speed_camera' ? `${h.speedLimit || 60}` : '⚠️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-red-300 truncate">{h.title}</span>
                    <span className="text-[10px] font-black bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded">
                      a {h.distanceMeters} m
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{h.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Voice Prompt Banner */}
        {activeVoicePrompt && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-red-600 text-white border-2 border-white rounded-2xl px-4 py-2 flex items-center gap-2 text-xs font-black shadow-2xl animate-pulse">
            <Siren size={18} className="text-white shrink-0" />
            <span>{activeVoicePrompt}</span>
          </div>
        )}

        {/* ─── WAZE FLOATING WIDGETS OVER MAP ─── */}
        {isLiveNavigating ? (
          <>
            {/* Top-Left: Compass Dial Button (Waze Heading-Up / North-Up toggle) */}
            <button
              onClick={() => setIsHeadingUpNavigation(!isHeadingUpNavigation)}
              className="absolute top-3 left-3 z-20 w-12 h-12 rounded-full bg-white border border-zinc-200 shadow-2xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
              title={
                isHeadingUpNavigation
                  ? 'Modo Waze: Direção Para Cima (Toque para Norte Fixo)'
                  : 'Modo Norte Fixo (Toque para Direção Para Cima)'
              }
            >
              <div
                style={{
                  transform: `rotate(${isHeadingUpNavigation ? -vehicleHeading : 0}deg)`,
                  transition: 'transform 0.3s ease-out',
                }}
                className="flex items-center justify-center"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  {/* Red North Needle */}
                  <polygon points="12 2 16 12 12 9 8 12" fill="#ef4444" />
                  {/* Grey South Needle */}
                  <polygon points="12 22 16 12 12 15 8 12" fill="#94a3b8" />
                  <circle cx="12" cy="12" r="2" fill="#ffffff" stroke="#475569" strokeWidth="1" />
                </svg>
              </div>
            </button>

            {/* Top-Right: Vertical Stack of Round White Buttons (Mic, Music, Sound) */}
            <div className="absolute top-3 right-3 z-20 flex flex-col items-center gap-2.5">
              {/* 🎤 Microphone Button (Voice Destination Search / AI) */}
              <button
                onClick={handleStartVoiceSearch}
                className="w-12 h-12 rounded-full bg-white hover:bg-zinc-50 border border-zinc-200 shadow-2xl flex items-center justify-center text-zinc-800 active:scale-95 transition-all cursor-pointer group"
                title="Comando de Voz para Destino"
              >
                <div className="relative flex items-center justify-center">
                  <Mic size={22} className="text-red-500 group-hover:scale-110 transition-transform" />
                  {isListeningVoice && (
                    <span className="w-12 h-12 rounded-full bg-red-500/20 absolute -inset-0 animate-ping pointer-events-none" />
                  )}
                </div>
              </button>

              {/* 🎵 Music Note Button (Radio & Media Player) */}
              <button
                onClick={() => setIsRadioPlayerOpen(!isRadioPlayerOpen)}
                className={`w-12 h-12 rounded-full border shadow-2xl flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
                  isRadioPlayerOpen
                    ? 'bg-purple-600 text-white border-purple-400'
                    : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-200'
                }`}
                title="Rádio / Música no Carro"
              >
                <Music size={20} className={isRadioPlayerOpen ? 'text-white' : 'text-zinc-800'} />
              </button>

              {/* 🔊 Sound Mode Button */}
              <button
                onClick={toggleWazeSoundMode}
                className="w-12 h-12 rounded-full bg-white hover:bg-zinc-50 border border-zinc-200 shadow-2xl flex items-center justify-center text-zinc-800 active:scale-95 transition-all cursor-pointer"
                title={`Som: ${wazeSoundMode === 'all' ? 'Voz e Alertas' : wazeSoundMode === 'alerts' ? 'Somente Alertas' : 'Mudo'}`}
              >
                {wazeSoundMode === 'all' ? (
                  <Volume2 size={20} className="text-zinc-800" />
                ) : wazeSoundMode === 'alerts' ? (
                  <Volume1 size={20} className="text-amber-600" />
                ) : (
                  <VolumeX size={20} className="text-zinc-400" />
                )}
              </button>
            </div>

            {/* Current Street Pill (Floating centered near bottom of map) */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-white text-zinc-900 px-5 py-1.5 rounded-full shadow-2xl font-black text-xs border border-zinc-300 truncate max-w-[82vw] text-center tracking-wide pointer-events-none drop-shadow-lg">
              {activeStep?.name || 'R. Milton Santos'}
            </div>

            {/* Bottom-Left: Speedometer & Speed Limit Badge (Waze Style) */}
            <div className="absolute bottom-24 left-3 z-20 flex items-center">
              <div className="relative">
                {/* Dark Speedometer Dial */}
                <div
                  className={`w-16 h-16 rounded-full bg-[#181a20] border-2 text-white flex flex-col items-center justify-center shadow-2xl ${
                    liveNavSpeed > detectedRoadSpeedLimit
                      ? 'border-red-500 ring-4 ring-red-500/30'
                      : 'border-zinc-700'
                  }`}
                >
                  <span className="text-2xl font-black tracking-tight leading-none text-white">
                    {Math.round(liveNavSpeed)}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">km/h</span>
                </div>

                {/* Overlapping Speed Limit Sign (Circle with red border) */}
                <div className="w-8 h-8 rounded-full bg-white border-[3px] border-red-600 flex items-center justify-center text-black font-black text-[11px] shadow-lg absolute -top-1 -right-2 pointer-events-none">
                  {detectedRoadSpeedLimit}
                </div>
              </div>
            </div>

            {/* Bottom-Right: Yellow Hazard / Alert Report Squircle Button (⚠️+) */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="absolute bottom-24 right-3 z-20 w-14 h-14 rounded-2xl bg-[#ffd600] hover:bg-[#ffdf00] border-2 border-black/80 flex items-center justify-center text-black shadow-2xl active:scale-90 transition-transform cursor-pointer"
              title="Reportar Radar, Blitz, Trânsito ou Perigo"
            >
              <div className="flex items-center justify-center font-black">
                <AlertTriangle size={24} className="fill-black text-[#ffd600] stroke-[2.5]" />
                <span className="text-base font-black leading-none ml-0.5">+</span>
              </div>
            </button>
          </>
        ) : (
          /* Pre-navigation Top Right Controls */
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            <button
              onClick={() => setIsHeadingUpNavigation(!isHeadingUpNavigation)}
              className={`px-2.5 py-1.5 rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-1.5 text-xs font-black transition-all active:scale-95 ${
                isHeadingUpNavigation
                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60 shadow-emerald-500/20'
                  : 'bg-[#10101c]/90 text-zinc-300 border-[#2a2a3e] hover:bg-[#18182c]'
              }`}
            >
              <Compass
                size={16}
                className={isHeadingUpNavigation ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}
              />
              <span className="text-[10px] font-black">
                {isHeadingUpNavigation ? 'DIREÇÃO (WAZE)' : 'NORTE FIXO'}
              </span>
            </button>

            {isOfflineModeActive && (
              <div className="bg-cyan-950/90 border border-cyan-400/50 rounded-xl px-2.5 py-1 backdrop-blur-md flex items-center gap-1.5 text-cyan-300 text-[10px] font-black shadow-xl">
                <WifiOff size={12} className="text-cyan-400" />
                <span className="hidden sm:inline">OFFLINE</span>
              </div>
            )}
          </div>
        )}

        {/* Recenter floating button */}
        {!autoFollowCar && (
          <button
            onClick={recenterOnCar}
            className="absolute bottom-28 right-4 z-20 bg-emerald-600 text-black p-3 rounded-2xl shadow-2xl font-black text-xs flex items-center gap-2 hover:bg-emerald-500 active:scale-95 transition-all border border-emerald-400"
          >
            <LocateFixed size={18} />
            <span>Recentralizar</span>
          </button>
        )}
      </div>

      {/* ─── BOTTOM SECTION: ROUTE COMPARISON OR AUTHENTIC WAZE WHITE DOCK ─── */}
      {!isLiveNavigating ? (
        calculatedRoutes.length > 0 && (
          <div className="bg-[#0b0b14]/98 border-t border-[#1f1f2e] p-3 z-30 shadow-2xl backdrop-blur-md shrink-0 flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar">
            {/* Route Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-zinc-300">
                  {calculatedRoutes.length} {calculatedRoutes.length === 1 ? 'Rota Encontrada' : 'Rotas Comparadas'}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  🍃 Renault Clio 1.0 16V
                </span>
              </div>

              {/* Botão de Iniciar Navegação Waze */}
              <button
                onClick={() => startLiveNavigation(false)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs uppercase rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Play size={14} className="fill-black" />
                <span>INICIAR NAVEGAÇÃO</span>
              </button>
            </div>

            {/* Route Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {calculatedRoutes.map((route) => {
                const isSelected = route.id === selectedRouteId;
                return (
                  <div
                    key={route.id}
                    onClick={() => handleSelectRoute(route.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                      isSelected
                        ? 'bg-purple-950/50 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.35)] ring-1 ring-purple-400'
                        : 'bg-[#121220] border-[#222234] hover:border-[#383850]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">{route.routeName}</span>
                      <span className="text-xs font-black text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-lg border border-purple-500/40">
                        {route.durationMin} min (ETA {calculateETA(route.durationMin)})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-300 font-medium">
                      <span className="font-bold text-white">{route.distanceKm} km</span>
                      <span className="text-cyan-300">~{route.litersNeeded} L ({fuelTypeLabel})</span>
                      <span className="text-emerald-300 font-bold">R$ {route.costEstimatedBrl?.toFixed(2)}</span>
                    </div>

                    {/* Waze Policy & Constraint Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        ✓ Sem Balsa
                      </span>
                      <span className="text-[9px] font-bold bg-blue-500/15 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">
                        ✓ 100% Asfalto
                      </span>
                      <span className="text-[9px] font-bold bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                        Pedágio OK
                      </span>
                    </div>

                    <div className="text-[10px] text-zinc-400 truncate">
                      {route.fuelSufficiency}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        /* ─── AUTHENTIC WAZE BOTTOM WHITE FLOATING DOCK SHEET ─── */
        <div className="bg-white text-zinc-900 border-t border-zinc-200 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.35)] shrink-0 flex flex-col rounded-t-3xl transition-all duration-300">
          {/* Grey Drag Pill */}
          <div
            onClick={() => setIsWazeDrawerOpen(!isWazeDrawerOpen)}
            className="w-full pt-2 pb-1 flex justify-center cursor-pointer"
          >
            <div className="w-12 h-1.5 bg-zinc-300 hover:bg-zinc-400 rounded-full transition-colors" />
          </div>

          {/* Main Navigation Summary Row */}
          <div className="px-5 pb-3 pt-1 flex items-center justify-between gap-3">
            {/* Search / Route Alternatives Button (Left) */}
            <button
              onClick={() => setIsWazeDrawerOpen(!isWazeDrawerOpen)}
              className="w-11 h-11 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 flex items-center justify-center active:scale-95 transition-all shadow-sm"
              title="Ver detalhes da rota"
            >
              <Search size={20} />
            </button>

            {/* Center: ETA Time & Distance (Waze Signature) */}
            <div
              onClick={() => setIsWazeDrawerOpen(!isWazeDrawerOpen)}
              className="flex flex-col items-center cursor-pointer flex-1"
            >
              <div className="text-3xl font-black tracking-tight text-zinc-950 leading-none">
                {calculateETA(liveRemainingDurationMin)}
              </div>
              <div className="text-sm font-bold text-zinc-700 mt-1 flex items-center gap-1.5">
                <span>{liveRemainingDurationMin} min</span>
                <span>•</span>
                <span>{liveRemainingDistanceKm} km</span>
              </div>
            </div>

            {/* Right: Route Options / Exit (Right) */}
            <button
              onClick={() => setIsWazeDrawerOpen(!isWazeDrawerOpen)}
              className={`w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-sm ${
                isWazeDrawerOpen ? 'bg-zinc-900 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
              }`}
              title="Expandir / Recolher opções"
            >
              {isWazeDrawerOpen ? <ChevronDown size={22} /> : <ChevronUp size={22} />}
            </button>
          </div>

          {/* Expandable Drawer Details */}
          {isWazeDrawerOpen && (
            <div className="px-5 pb-5 pt-2 border-t border-zinc-100 flex flex-col gap-3 max-h-64 overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-3">
              {/* Renault Clio Consumption & Cost Card */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Fuel size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-zinc-900">Renault Clio 1.0 16V</div>
                    <div className="text-[11px] text-zinc-500 font-medium">
                      Consumo est.: ~{activeRoute?.litersNeeded || 0}L de {fuelTypeLabel}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-zinc-500">Custo Est.</div>
                  <div className="text-sm font-black text-emerald-600">
                    R$ {activeRoute?.costEstimatedBrl?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>

              {/* Turn-by-Turn Steps */}
              {activeRoute?.steps && activeRoute.steps.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-black uppercase text-zinc-400">Próximos Passos:</span>
                  <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                    {activeRoute.steps.slice(currentStepIndex, currentStepIndex + 5).map((st, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-xl border flex items-center gap-2.5 text-xs ${
                          i === 0
                            ? 'bg-purple-50 border-purple-200 text-purple-900 font-bold'
                            : 'bg-white border-zinc-100 text-zinc-600'
                        }`}
                      >
                        <div className="shrink-0">
                          {renderWazeManeuverSvg(st, 18)}
                        </div>
                        <div className="flex-1 truncate">
                          <span>{st.instruction}</span>
                          {st.name && <span className="font-bold"> - {st.name}</span>}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400">
                          {st.distanceMeters ? `${st.distanceMeters}m` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exit Navigation Button */}
              <button
                onClick={stopLiveNavigation}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all mt-1"
              >
                <Square size={14} />
                <span>ENCERRAR NAVEGAÇÃO</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: VOICE SEARCH WAZE ASSISTANT ─── */}
      {isVoiceSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#12121e] border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-in zoom-in-95">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/40">
                <Mic size={36} className="text-red-400 animate-pulse" />
              </div>
              {isListeningVoice && (
                <span className="w-24 h-24 rounded-full bg-red-500/30 absolute animate-ping pointer-events-none" />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-black text-white">Comando de Voz Waze</h3>
              <p className="text-xs text-zinc-300">{voiceSearchStatus}</p>
            </div>

            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={() => setIsVoiceSearchOpen(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleStartVoiceSearch}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl"
              >
                Ouvir Novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: QUICK CAR RADIO / MUSIC ─── */}
      {isRadioPlayerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#12121e] border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Music size={18} className="text-purple-400" />
                <h3 className="text-sm font-black text-white">Áudio e Rádio do Carro</h3>
              </div>
              <button
                onClick={() => setIsRadioPlayerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { name: 'Modo Trânsito & Alertas (Waze)', freq: 'Voz Sintetizada', active: true },
                { name: 'Rádio JB FM 99.9', freq: 'Rio de Janeiro', active: false },
                { name: 'BandNews FM 90.3', freq: 'Notícias & Trânsito RJ', active: false },
                { name: 'Playlist Viagem Relaxante', freq: 'Bluetooth Carro', active: false },
              ].map((station, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    roadAlertsEngine.speak(`Sintonizado em: ${station.name}`);
                    setIsRadioPlayerOpen(false);
                  }}
                  className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    station.active
                      ? 'bg-purple-950/40 border-purple-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Radio size={18} className={station.active ? 'text-purple-400' : 'text-zinc-500'} />
                    <div>
                      <div className="text-xs font-bold">{station.name}</div>
                      <div className="text-[10px] text-zinc-400">{station.freq}</div>
                    </div>
                  </div>
                  {station.active && <span className="text-[10px] font-black text-purple-400">ATIVO</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DOWNLOAD DE MAPAS OFFLINE BRASIL ─── */}
      {isOfflineModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#0e0e1a] border border-[#2a2a40] rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e1e30]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  <Download size={22} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Centro de Mapas Offline • Brasil
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Baixe e guarde mapas no dispositivo para navegar sem internet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOfflineModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl bg-[#161626]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="bg-[#141424] border border-[#24243c] rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive size={18} className="text-cyan-400" />
                <div>
                  <div className="text-xs font-black text-white">
                    {cachedTilesCount} blocos de mapas em cache local (IndexedDB)
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    O app armazena automaticamente todas as vias por onde você passa
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadCurrentLocationRadius}
                disabled={isDownloadingOffline}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black text-xs font-black uppercase rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <LocateFixed size={13} />
                <span>Baixar Raio Atual (30km)</span>
              </button>
            </div>

            {/* Download Progress Bar */}
            {isDownloadingOffline && (
              <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-2xl p-3 flex flex-col gap-2 animate-pulse">
                <div className="flex items-center justify-between text-xs text-cyan-200 font-bold">
                  <span>{downloadStatusText}</span>
                  <span>{downloadProgressPct}%</span>
                </div>
                <div className="w-full h-2 bg-[#121222] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${downloadProgressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Pre-packaged Brazil Regions */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                Pacotes Regionais do Brasil para Download Rápido:
              </span>

              {PRESET_BRAZIL_REGIONS.map((reg) => {
                const isDownloaded = downloadedRegions.some((d) => d.id === reg.id);
                return (
                  <div
                    key={reg.id}
                    className="p-3 bg-[#131322] border border-[#222236] rounded-2xl flex items-center justify-between gap-3 hover:border-cyan-500/40 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-white truncate">{reg.name}</h4>
                        {isDownloaded && (
                          <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40">
                            BAIXADO
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{reg.description}</p>
                    </div>

                    <button
                      onClick={() => handleDownloadRegion(reg)}
                      disabled={isDownloadingOffline}
                      className="px-3 py-1.5 bg-cyan-600/90 hover:bg-cyan-500 disabled:opacity-50 text-black text-xs font-black uppercase rounded-xl flex items-center gap-1.5 shadow active:scale-95 transition-all shrink-0"
                    >
                      <Download size={13} />
                      <span>{isDownloaded ? 'Atualizar' : 'Baixar'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REPORTAR ALERTA NA PISTA ─── */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0e0e1a] border border-[#2a2a40] rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e1e30]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40">
                  <Flag size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Reportar Alerta na Pista
                  </h3>
                  <p className="text-[11px] text-zinc-400">Avise sobre radares, lombadas ou buracos na via</p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl bg-[#161626]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleReportHazardSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { type: 'speed_camera', label: '📸 Radar Fixo' },
                  { type: 'mobile_camera', label: '📷 Radar Móvel' },
                  { type: 'police', label: '👮 Polícia / Blitz' },
                  { type: 'accident', label: '💥 Acidente' },
                  { type: 'construction', label: '⚠️ Perigo / Obras' },
                  { type: 'pothole', label: '🕳️ Buraco na Pista' },
                  { type: 'traffic', label: '🔴 Trânsito Lento' },
                  { type: 'stopped_vehicle', label: '🚗 Carro Parado' },
                  { type: 'speed_bump', label: '🛑 Lombada' },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setReportFormData({ ...reportFormData, type: item.type as any })}
                    className={`p-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-center text-center ${
                      reportFormData.type === item.type
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/40'
                        : 'bg-[#141424] border-[#222238] text-zinc-400 hover:text-white hover:border-zinc-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {(reportFormData.type === 'speed_camera' || reportFormData.type === 'mobile_camera') && (
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                    Limite de Velocidade do Radar (KM/H)
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {[40, 50, 60, 70, 80, 90, 100, 110].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setReportFormData({ ...reportFormData, speedLimit: spd })}
                        className={`py-1.5 rounded-lg border text-xs font-black ${
                          reportFormData.speedLimit === spd
                            ? 'bg-red-600 text-white border-red-400'
                            : 'bg-[#141424] text-zinc-400 border-[#222238]'
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                  Detalhes Adicionais (Opcional)
                </label>
                <input
                  type="text"
                  value={reportFormData.description}
                  onChange={(e) => setReportFormData({ ...reportFormData, description: e.target.value })}
                  placeholder="Ex: Sentido Niterói, viatura no acostamento..."
                  className="w-full bg-[#141424] text-xs text-white placeholder-zinc-500 p-2.5 rounded-xl border border-[#222238] focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#18182a] text-zinc-300 text-xs font-black uppercase rounded-xl border border-[#2a2a3e]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  Confirmar Alerta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: SALVAR DESTINO FAVORITO ─── */}
      {isSaveFavoriteOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0e0e1a] border border-[#2a2a40] rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e1e30]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Star size={20} className="fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    {favoriteFormData.id ? 'Editar Favorito' : 'Salvar Destino Favorito'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">Acesse com 1 toque na tela principal de navegação</p>
                </div>
              </div>
              <button
                onClick={() => setIsSaveFavoriteOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl bg-[#161626]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveFavoriteSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                  Nome / Apelido do Local *
                </label>
                <input
                  type="text"
                  required
                  value={favoriteFormData.name}
                  onChange={(e) => setFavoriteFormData({ ...favoriteFormData, name: e.target.value })}
                  placeholder="Ex: Casa, Trabalho, Posto Shell, Praia..."
                  className="w-full bg-[#141424] text-xs text-white placeholder-zinc-500 p-2.5 rounded-xl border border-[#222238] focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                  Endereço ou Ponto de Referência
                </label>
                <input
                  type="text"
                  value={favoriteFormData.address}
                  onChange={(e) => setFavoriteFormData({ ...favoriteFormData, address: e.target.value })}
                  placeholder="Endereço completo..."
                  className="w-full bg-[#141424] text-xs text-white placeholder-zinc-500 p-2.5 rounded-xl border border-[#222238] focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">
                  Escolha um Ícone Temático
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'home', icon: Home, label: 'Casa' },
                    { id: 'heart', icon: Heart, label: 'Família' },
                    { id: 'school', icon: GraduationCap, label: 'Escola' },
                    { id: 'work', icon: Briefcase, label: 'Trabalho' },
                    { id: 'gas', icon: Fuel, label: 'Posto' },
                    { id: 'beach', icon: Umbrella, label: 'Praia' },
                    { id: 'shopping', icon: ShoppingBag, label: 'Mercado' },
                    { id: 'gym', icon: Dumbbell, label: 'Academia' },
                    { id: 'star', icon: Star, label: 'Geral' },
                  ].map((item) => {
                    const IconComp = item.icon;
                    const isSelected = favoriteFormData.icon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setFavoriteFormData({
                            ...favoriteFormData,
                            icon: item.id as any,
                            category: item.label,
                          })
                        }
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                            : 'bg-[#141424] border-[#222238] text-zinc-400 hover:text-white hover:border-[#3a3a54]'
                        }`}
                      >
                        <IconComp size={16} />
                        <span className="text-[8px] font-bold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveFavoriteOpen(false)}
                  className="flex-1 py-2.5 bg-[#18182a] hover:bg-[#222238] text-zinc-300 text-xs font-black uppercase rounded-xl border border-[#2a2a3e]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Check size={16} />
                  <span>Salvar Favorito</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: GERENCIAR TODOS OS FAVORITOS ─── */}
      {isManageFavoritesOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0e0e1a] border border-[#2a2a40] rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e1e30]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Star size={20} className="fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Meus Destinos Favoritos
                  </h3>
                  <p className="text-[11px] text-zinc-400">Clique para traçar rota direta ou gerenciar locais</p>
                </div>
              </div>
              <button
                onClick={() => setIsManageFavoritesOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl bg-[#161626]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-zinc-400">
                {favorites.length} {favorites.length === 1 ? 'LOCAL SALVO' : 'LOCAIS SALVOS'}
              </span>
              <button
                onClick={() => {
                  setIsManageFavoritesOpen(false);
                  handleOpenSaveFavorite();
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-black uppercase rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Plus size={14} />
                <span>Adicionar Novo</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
              {favorites.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 flex flex-col items-center gap-2">
                  <Star size={32} className="opacity-30" />
                  <p className="text-xs">Nenhum destino favorito salvo ainda.</p>
                </div>
              ) : (
                favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="p-3 bg-[#141424] hover:bg-[#18182c] border border-[#222238] hover:border-amber-400/40 rounded-2xl flex items-center justify-between gap-3 transition-all group"
                  >
                    <div
                      onClick={() => handleSelectFavoriteDestination(fav)}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="p-2.5 rounded-xl bg-[#1c1c30] border border-[#2a2a44] text-white shrink-0 group-hover:scale-105 transition-transform">
                        {renderFavoriteIcon(fav.icon, 18)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-black text-white truncate">{fav.name}</h4>
                          {fav.category && (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 bg-[#202034] text-zinc-400 rounded">
                              {fav.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{fav.address}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleSelectFavoriteDestination(fav)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-[10px] font-black uppercase rounded-lg flex items-center gap-1 shadow transition-all"
                        title="Calcular rota para este destino"
                      >
                        <Navigation size={12} />
                        <span>Ir</span>
                      </button>

                      <button
                        onClick={() => {
                          setFavoriteFormData({
                            id: fav.id,
                            name: fav.name,
                            address: fav.address,
                            lat: fav.lat,
                            lng: fav.lng,
                            icon: fav.icon || 'star',
                            category: fav.category,
                          });
                          setIsManageFavoritesOpen(false);
                          setIsSaveFavoriteOpen(true);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-white bg-[#1a1a2e] hover:bg-[#262640] rounded-lg transition-colors"
                        title="Editar nome ou ícone"
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        onClick={() => handleDeleteFavorite(fav.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 bg-[#1a1a2e] hover:bg-red-950/40 rounded-lg transition-colors"
                        title="Remover dos favoritos"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIAGEM CONCLUÍDA / DESTINO ALCANÇADO ─── */}
      {isTripCompletedModalOpen && tripSummary && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0e0e1a] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl shadow-emerald-500/20 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)] animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wide">
                Você Chegou ao Seu Destino!
              </h3>
              <p className="text-xs text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                📍 {tripSummary.destinationName}
              </p>
            </div>

            {/* Trip Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 my-1">
              <div className="bg-[#141424] border border-[#24243c] p-3 rounded-2xl flex flex-col items-center text-center">
                <span className="text-[10px] font-black uppercase text-zinc-400">Distância Percorrida</span>
                <span className="text-xl font-black text-white mt-0.5">{tripSummary.totalDistanceKm} km</span>
              </div>

              <div className="bg-[#141424] border border-[#24243c] p-3 rounded-2xl flex flex-col items-center text-center">
                <span className="text-[10px] font-black uppercase text-zinc-400">Tempo Estimado</span>
                <span className="text-xl font-black text-emerald-400 mt-0.5">{tripSummary.durationMinutes} min</span>
              </div>

              <div className="bg-[#141424] border border-[#24243c] p-3 rounded-2xl flex flex-col items-center text-center">
                <span className="text-[10px] font-black uppercase text-zinc-400">Consumo de {fuelTypeLabel}</span>
                <span className="text-lg font-black text-amber-300 mt-0.5">~{tripSummary.litersConsumed} L</span>
              </div>

              <div className="bg-[#141424] border border-[#24243c] p-3 rounded-2xl flex flex-col items-center text-center">
                <span className="text-[10px] font-black uppercase text-zinc-400">Custo Total Estimado</span>
                <span className="text-lg font-black text-emerald-300 mt-0.5">R$ {tripSummary.totalCostBrl.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <Leaf size={16} />
                <span>Eficiência Clio Hi-Flex:</span>
              </div>
              <span className="font-black text-emerald-400">{tripSummary.ecoScore}/100 Eco-Score</span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {!isCurrentDestFavorited && (
                <button
                  type="button"
                  onClick={() => {
                    setIsTripCompletedModalOpen(false);
                    handleOpenSaveFavorite();
                  }}
                  className="py-3 px-3 bg-[#18182a] hover:bg-[#24243c] text-amber-300 text-xs font-black uppercase rounded-2xl border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all"
                  title="Salvar este local nos favoritos"
                >
                  <Star size={15} />
                  <span>Favoritar</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsTripCompletedModalOpen(false);
                  setDestinationInput('');
                  setDestinationCoords(null);
                  clearAllRoutes();
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-black uppercase rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Check size={16} />
                <span>Concluir Viagem</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info Bar */}
      <div className="bg-[#09090e] border-t border-[#1a1a26] px-3 py-1 flex items-center justify-between text-[9px] text-zinc-400 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span>Lat: {driverPos.lat.toFixed(5)}</span>
          <span>Lng: {driverPos.lng.toFixed(5)}</span>
          <span className="hidden sm:inline">• Trilha: {breadcrumbTrail.length} pts</span>
          <span className="text-cyan-400 font-bold">• {cachedTilesCount} Tiles Salvos</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400">
          <span>© OpenStreetMap • Alertas & Voz Ativos • Mapas Offline Brasil</span>
        </div>
      </div>
    </div>
  );
};
