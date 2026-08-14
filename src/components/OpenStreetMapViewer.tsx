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
} from '../utils/roadAlertsEngine';

interface OpenStreetMapViewerProps {
  currentLat: number;
  currentLng: number;
  speed: number;
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
  lat: string;
  lon: string;
}

const DEFAULT_FAVORITES: FavoriteDestination[] = [
  {
    id: 'fav-home',
    name: 'Casa',
    address: 'Centro de Maricá, RJ',
    lat: -22.9194,
    lng: -42.8186,
    icon: 'home',
    category: 'Residência',
    createdAt: Date.now() - 500000,
  },
  {
    id: 'fav-work',
    name: 'Trabalho',
    address: 'Av. Amaral Peixoto, Maricá, RJ',
    lat: -22.9205,
    lng: -42.8250,
    icon: 'work',
    category: 'Trabalho',
    createdAt: Date.now() - 400000,
  },
  {
    id: 'fav-gas',
    name: 'Posto Shell Maricá',
    address: 'Rodovia Amaral Peixoto KM 28, Maricá, RJ',
    lat: -22.9240,
    lng: -42.8310,
    icon: 'gas',
    category: 'Posto',
    createdAt: Date.now() - 300000,
  },
  {
    id: 'fav-beach',
    name: 'Praia de Ponta Negra',
    address: 'Ponta Negra, Maricá, RJ',
    lat: -22.9654,
    lng: -42.6908,
    icon: 'beach',
    category: 'Lazer',
    createdAt: Date.now() - 200000,
  },
  {
    id: 'fav-shopping',
    name: 'Supermercado',
    address: 'Flamengo, Maricá, RJ',
    lat: -22.9150,
    lng: -42.8120,
    icon: 'shopping',
    category: 'Compras',
    createdAt: Date.now() - 100000,
  },
];

export const OpenStreetMapViewer: React.FC<OpenStreetMapViewerProps> = ({
  currentLat,
  currentLng,
  speed: initialGpsSpeed,
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
      const saved = localStorage.getItem('clio_favorite_destinations_v2');
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
      localStorage.setItem('clio_favorite_destinations_v2', JSON.stringify(favorites));
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

  // Sync driverPos with GPS when not simulating
  useEffect(() => {
    if (!isSimulatingDrive) {
      const lat = currentLat || -22.9194;
      const lng = currentLng || -42.8186;
      setDriverPos({ lat, lng });
      setLiveNavSpeed(initialGpsSpeed || 0);
    }
  }, [currentLat, currentLng, initialGpsSpeed, isSimulatingDrive]);

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

  // ─── OFFLINE-ENABLED CUSTOM TILE LAYER CREATION ───
  function createOfflineTileLayer(theme: string): L.TileLayer {
    const OfflineTileLayerClass = L.TileLayer.extend({
      createTile: function (coords: { x: number; y: number; z: number }, done: (error: any, tile: HTMLElement) => void) {
        const tile = document.createElement('img');
        const url = this.getTileUrl(coords);

        tile.setAttribute('role', 'presentation');

        // Check IndexedDB cache first
        offlineMapManager.getTile(url).then((blob) => {
          if (blob) {
            const objectUrl = URL.createObjectURL(blob);
            tile.onload = () => {
              URL.revokeObjectURL(objectUrl);
              done(null, tile);
            };
            tile.onerror = (e) => done(e, tile);
            tile.src = objectUrl;
          } else {
            // Not in cache, fetch online and cache in background
            fetch(url, { mode: 'cors' })
              .then((res) => {
                if (res.ok) return res.blob();
                throw new Error('Tile download failed');
              })
              .then((newBlob) => {
                offlineMapManager.saveTile(url, newBlob);
                const objectUrl = URL.createObjectURL(newBlob);
                tile.onload = () => {
                  URL.revokeObjectURL(objectUrl);
                  done(null, tile);
                };
                tile.onerror = (e) => done(e, tile);
                tile.src = objectUrl;
              })
              .catch((err) => {
                // If completely offline and tile is missing, show fallback subtle grid
                tile.src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" fill="%230b0b14"><rect width="256" height="256"/><path d="M0 0h256v256H0z" stroke="%23191928" stroke-width="1" fill="none"/><text x="128" y="128" fill="%23334155" font-size="11" font-family="sans-serif" text-anchor="middle">Mapa Local</text></svg>';
                done(null, tile);
              });
          }
        });

        return tile;
      },
    });

    let template = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let className = 'osm-eco-filter';

    if (theme === 'dark') {
      template = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      className = 'osm-cockpit-filter';
    } else if (theme === 'satellite') {
      template = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{n}';
      className = '';
    } else if (theme === 'standard') {
      className = '';
    }

    return new (OfflineTileLayerClass as any)(template, {
      maxZoom: 19,
      className,
      subdomains: ['a', 'b', 'c'],
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
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileLayer = createOfflineTileLayer(mapTheme);
    tileLayer.addTo(map);
    setTileLayerRef(tileLayer);

    // Car position marker
    const carIcon = createDriverCarIcon(initialGpsSpeed, vehicleHeading, isLiveNavigating);
    const carMarker = L.marker([defaultLat, defaultLng], { icon: carIcon, zIndexOffset: 1000 }).addTo(map);
    carMarkerRef.current = carMarker;

    // Breadcrumb Trail Polyline
    const trailPolyline = L.polyline(breadcrumbTrail.length > 0 ? breadcrumbTrail : [[defaultLat, defaultLng]], {
      color: '#10b981',
      weight: 4,
      opacity: 0.85,
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
  function createDriverCarIcon(currSpeed: number, headingDeg: number, navigating: boolean) {
    if (navigating) {
      const html = `
        <div class="relative flex items-center justify-center pointer-events-none" style="transform: rotate(${Math.round(
          headingDeg
        )}deg); transition: transform 0.4s ease-out;">
          <div class="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center animate-ping absolute inset-0"></div>
          <div class="w-11 h-11 rounded-full bg-[#050509] border-[3px] border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.8)] flex items-center justify-center text-emerald-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 2L4 20L12 16L20 20L12 2Z" />
            </svg>
          </div>
        </div>
      `;
      return L.divIcon({
        html,
        className: 'driver-nav-car-marker',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
    }

    const html = `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full bg-[#050508] border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl gps-marker-pulse">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
        <div class="absolute -bottom-4 bg-black/90 text-[9px] font-black text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/40 whitespace-nowrap shadow-md">
          ${Math.round(currSpeed)} KM/H
        </div>
      </div>
    `;
    return L.divIcon({
      html,
      className: 'custom-car-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  // Update car marker position, rotation and camera follow
  useEffect(() => {
    if (!mapInstanceRef.current || !carMarkerRef.current) return;

    const lat = driverPos.lat;
    const lng = driverPos.lng;

    carMarkerRef.current.setLatLng([lat, lng]);
    carMarkerRef.current.setIcon(createDriverCarIcon(liveNavSpeed, vehicleHeading, isLiveNavigating));

    if (trailPolylineRef.current) {
      if (breadcrumbTrail && breadcrumbTrail.length > 0) {
        trailPolylineRef.current.setLatLngs(breadcrumbTrail);
      } else {
        trailPolylineRef.current.setLatLngs([[lat, lng]]);
      }
    }

    if (autoFollowCar) {
      if (isLiveNavigating) {
        mapInstanceRef.current.setView([lat, lng], 17, { animate: true, duration: 0.4 });
      } else {
        mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.4 });
      }
    }
  }, [driverPos, liveNavSpeed, vehicleHeading, isLiveNavigating, autoFollowCar, breadcrumbTrail]);

  // Autocomplete place search via Nominatim
  const searchPlaceNominatim = useCallback(async (query: string, type: 'origin' | 'dest') => {
    if (!query || query.length < 3 || query.startsWith('📍')) {
      if (type === 'origin') setOriginSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    setIsSearchingSuggestions(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=br&limit=5&addressdetails=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data: PlaceSuggestion[] = await res.json();
        if (type === 'origin') {
          setOriginSuggestions(data);
        } else {
          setDestSuggestions(data);
        }
      }
    } catch (err) {
      console.warn('Erro na busca de locais:', err);
    } finally {
      setIsSearchingSuggestions(false);
    }
  }, []);

  const handleOriginChange = (val: string) => {
    setOriginInput(val);
    setIsUsingGpsOrigin(false);
    setActiveSuggestionField('origin');
    searchPlaceNominatim(val, 'origin');
  };

  const handleDestChange = (val: string) => {
    setDestinationInput(val);
    setActiveSuggestionField('dest');
    searchPlaceNominatim(val, 'dest');
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
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

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
      audioPrompt = `Atenção: Radar à frente. Limite de ${reportFormData.speedLimit || 60} quilômetros por hora.`;
    } else if (type === 'speed_bump') {
      title = 'Lombada / Quebra-mola';
      audioPrompt = 'Lombada à frente. Reduza a velocidade.';
    } else if (type === 'pothole') {
      title = 'Buraco / Pista Irregular';
      audioPrompt = 'Atenção: Trecho com buracos e pista irregular.';
    } else if (type === 'police') {
      title = 'Fiscalização / Polícia Rodoviária';
      audioPrompt = 'Atenção: Fiscalização de trânsito à frente.';
    } else if (type === 'gas_station') {
      title = 'Posto de Combustível';
      audioPrompt = 'Posto de combustível próximo.';
    }

    const newHazard: RoadHazardAlert = {
      id: `hazard-${Date.now()}`,
      type,
      title,
      description: reportFormData.description.trim() || 'Reportado pelo motorista',
      lat: driverPos.lat,
      lng: driverPos.lng,
      speedLimit: reportFormData.speedLimit,
      audioPrompt,
    };

    setRoadHazards((prev) => [newHazard, ...prev]);
    setIsReportModalOpen(false);
    roadAlertsEngine.speak('Alerta registrado com sucesso no mapa.');
  };

  // ─── OFFLINE ROUTING FALLBACK GENERATOR (NO INTERNET NEEDED) ───
  const generateOfflineFallbackRoute = (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    destTitle?: string
  ): NavigationRoute => {
    const distM = computeDistanceMeters([start.lat, start.lng], [end.lat, end.lng]);
    const distanceKm = Number((distM / 1000 * 1.25).toFixed(1)); // 25% curve factor
    const durationMin = Math.max(2, Math.round((distanceKm / 55) * 60));

    // Generate smooth intermediate waypoints
    const intermediatePointsCount = 8;
    const coords: [number, number][] = [];
    for (let i = 0; i <= intermediatePointsCount; i++) {
      const frac = i / intermediatePointsCount;
      const lat = start.lat + (end.lat - start.lat) * frac + Math.sin(frac * Math.PI) * 0.003;
      const lng = start.lng + (end.lng - start.lng) * frac + Math.cos(frac * Math.PI) * 0.003;
      coords.push([lat, lng]);
    }

    const effectiveKmPerL = baseKmPerL;
    const litersNeeded = Number((distanceKm / effectiveKmPerL).toFixed(2));
    const costEstimatedBrl = Number((litersNeeded * fuelPricePerLiter).toFixed(2));

    const steps: RouteStep[] = [
      { instruction: 'Siga na via principal em direção ao destino (Modo Offline)', distance: distM * 0.4, name: 'Via Rodoviária', type: 'straight' },
      { instruction: 'Mantenha-se na pista principal', distance: distM * 0.4, name: 'Rodovia', type: 'straight' },
      { instruction: 'Você está chegando ao destino escolhido', distance: distM * 0.2, name: destTitle || 'Destino', type: 'arrive' },
    ];

    return {
      id: 'route-offline-eco',
      routeType: 'eco',
      routeName: '🌿 Rota Offline Local (Sem Internet)',
      originName: originInput,
      destinationName: destTitle || destinationInput || 'Destino Offline',
      distanceKm,
      durationMin,
      coordinates: coords,
      steps,
      litersNeeded,
      costEstimatedBrl,
      ecoScore: 92,
      fuelSufficiency: `Tanque suficiente! (${currentLitersInTank.toFixed(1)}L disponíveis, consome ~${litersNeeded.toFixed(1)}L)`,
    };
  };

  // Core Eco-Routes Engine: Calculate multiple routes via OSRM + Offline Fallback
  const handleCalculateAllRoutes = async (
    startPoint: { lat: number; lng: number } | null,
    endPoint: { lat: number; lng: number } | null,
    destTitle?: string
  ) => {
    const start =
      startPoint ||
      (isUsingGpsOrigin ? { lat: currentLat || -22.9194, lng: currentLng || -42.8186 } : originCoords);
    const end = endPoint || destinationCoords;

    if (!start || !end) {
      setRouteError('Defina um ponto de origem e um destino para traçar a rota.');
      return;
    }

    setIsCalculatingRoutes(true);
    setRouteError(null);
    stopLiveNavigation();

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
      
      let rawRoutes: any[] = [];
      try {
        const response = await fetch(osrmUrl, { signal: AbortSignal.timeout(4500) });
        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            rawRoutes = data.routes;
          }
        }
      } catch (netErr) {
        console.warn('OSRM Offline ou sem internet, ativando motor de rota offline local...', netErr);
      }

      // If offline or no network response, fallback to offline route engine
      if (rawRoutes.length === 0) {
        const offlineRoute = generateOfflineFallbackRoute(start, end, destTitle);
        setCalculatedRoutes([offlineRoute]);
        setSelectedRouteId(offlineRoute.id);
        setLiveRemainingDistanceKm(offlineRoute.distanceKm);
        setLiveRemainingDurationMin(offlineRoute.durationMin);
        renderRoutesOnMap([offlineRoute], offlineRoute.id, start, end, destTitle || destinationInput);
        setRouteError('Modo Offline: Rota calculada com base na malha viária armazenada no dispositivo.');
        return;
      }

      const parsedRoutes: NavigationRoute[] = rawRoutes.map((r: any, idx: number) => {
        const coords: [number, number][] = r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        const distanceKm = Number((r.distance / 1000).toFixed(1));
        const durationMin = Math.round(r.duration / 60);

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
        }));

        return {
          id: `route-${idx}`,
          routeType: 'alternative',
          routeName: idx === 0 ? 'Rota Principal' : `Alternativa ${idx}`,
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

      let minLitersIdx = 0;
      let minDurationIdx = 0;
      let shortestKmIdx = 0;

      parsedRoutes.forEach((route, idx) => {
        if (route.litersNeeded < parsedRoutes[minLitersIdx].litersNeeded) {
          minLitersIdx = idx;
        }
        if (route.durationMin < parsedRoutes[minDurationIdx].durationMin) {
          minDurationIdx = idx;
        }
        if (route.distanceKm < parsedRoutes[shortestKmIdx].distanceKm) {
          shortestKmIdx = idx;
        }
      });

      const maxLiters = Math.max(...parsedRoutes.map((r) => r.litersNeeded));

      parsedRoutes.forEach((route, idx) => {
        if (idx === minLitersIdx) {
          route.routeType = 'eco';
          route.isMostEconomical = true;
          route.routeName = '🍃 Rota Mais Econômica (Eco)';
          route.fuelSavingsLiters = Number((maxLiters - route.litersNeeded).toFixed(2));
          route.costSavingsBrl = Number(
            ((maxLiters - route.litersNeeded) * fuelPricePerLiter).toFixed(2)
          );
        } else if (idx === minDurationIdx) {
          route.routeType = 'fastest';
          route.routeName = '⚡ Rota Mais Rápida';
        } else if (idx === shortestKmIdx) {
          route.routeType = 'shortest';
          route.routeName = '🛣️ Rota Mais Curta';
        } else {
          route.routeType = 'alternative';
          route.routeName = `🛣️ Rota Alternativa ${idx + 1}`;
        }
      });

      parsedRoutes.sort((a, b) => {
        if (a.routeType === 'eco') return -1;
        if (b.routeType === 'eco') return 1;
        if (a.routeType === 'fastest') return -1;
        if (b.routeType === 'fastest') return 1;
        return 0;
      });

      setCalculatedRoutes(parsedRoutes);
      setSelectedRouteId(parsedRoutes[0].id);

      setLiveRemainingDistanceKm(parsedRoutes[0].distanceKm);
      setLiveRemainingDurationMin(parsedRoutes[0].durationMin);

      renderRoutesOnMap(parsedRoutes, parsedRoutes[0].id, start, end, destTitle || destinationInput);

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
    lastRerouteTimeRef.current = Date.now();
    offRouteCountRef.current = 0;

    roadAlertsEngine.speak('Recalculando nova rota...');

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${currentPos.lng},${currentPos.lat};${targetDest.lng},${targetDest.lat}?overview=full&geometries=geojson&steps=true&alternatives=false`;

      let rawRoute: any = null;
      try {
        const response = await fetch(osrmUrl, { signal: AbortSignal.timeout(3500) });
        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            rawRoute = data.routes[0];
          }
        }
      } catch (err) {
        console.warn('Falha OSRM em recálculo, ativando fallback local...', err);
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
        newRoute = generateOfflineFallbackRoute(currentPos, targetDest, destName);
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

    // 2. OFF-ROUTE DETECTION & 1-2 SECONDS AUTO REROUTE
    const distToRoute = minDistanceToRouteMeters(currentPos, route.coordinates);
    const now = Date.now();

    if (distToRoute > 42) {
      offRouteCountRef.current += 1;
      // If off route for 2 consecutive ticks (approx 1-2 seconds) and hasn't rerouted in the last 3.5s
      if (offRouteCountRef.current >= 2 && now - lastRerouteTimeRef.current > 3500) {
        handleAutoRerouteLive(currentPos, dest, route.destinationName);
      }
    } else {
      offRouteCountRef.current = 0;
    }

    // 3. PROGRESS UPDATE ALONG THE ROUTE (When driving normally)
    if (distToRoute <= 42) {
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
      const fractionRemaining = Math.max(0, 1 - closestIdx / totalCoords);
      const remKm = Math.max(0.1, Number((route.distanceKm * fractionRemaining).toFixed(1)));
      const remMin = Math.max(1, Math.round(route.durationMin * fractionRemaining));
      setLiveRemainingDistanceKm(remKm);
      setLiveRemainingDurationMin(remMin);

      const stepCount = route.steps?.length || 1;
      const estimatedStepIdx = Math.min(stepCount - 1, Math.floor((closestIdx / totalCoords) * stepCount));
      setCurrentStepIndex(estimatedStepIdx);

      const stepMeters = Math.max(25, Math.round((fractionRemaining * (route.distanceKm * 1000)) / stepCount));
      setDistanceToNextStepMeters(stepMeters);

      if (estimatedStepIdx !== lastSpokenStepIndexRef.current && route.steps?.[estimatedStepIdx]) {
        lastSpokenStepIndexRef.current = estimatedStepIdx;
        const currentInst = route.steps[estimatedStepIdx].instruction;
        const street = route.steps[estimatedStepIdx].name;
        roadAlertsEngine.speak(`Em ${stepMeters} metros, ${currentInst} ${street ? `na ${street}` : ''}`);
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
        if (route.routeType === 'eco') color = '#10b981';
        else if (route.routeType === 'fastest') color = '#38bdf8';
        else color = '#f59e0b';
        weight = 7;
        opacity = 0.95;
        dashArray = undefined;
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

    // Center map with driver zoom
    if (mapInstanceRef.current) {
      const startCoord = route.coordinates[0];
      mapInstanceRef.current.setView([startCoord[0], startCoord[1]], 17, { animate: true });
    }

    // Voice announcement
    const firstStep = route.steps?.[0];
    const initialAnnouncement = `Iniciando navegação para ${route.destinationName}. ${
      firstStep ? firstStep.instruction : 'Siga a rota traçada.'
    }`;
    roadAlertsEngine.speak(initialAnnouncement);

    if (simulateMode || (!gpsActive && liveNavSpeed === 0)) {
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

        const stepCount = route.steps?.length || 1;
        const estimatedStepIdx = Math.min(stepCount - 1, Math.floor(currentIndex / (totalCoords / stepCount)));
        setCurrentStepIndex(estimatedStepIdx);

        const stepMeters = Math.max(30, Math.round((fractionRemaining * (route.distanceKm * 1000)) / stepCount));
        setDistanceToNextStepMeters(stepMeters);

        if (estimatedStepIdx !== lastSpokenStepIndexRef.current && route.steps?.[estimatedStepIdx]) {
          lastSpokenStepIndexRef.current = estimatedStepIdx;
          const currentInst = route.steps[estimatedStepIdx].instruction;
          const street = route.steps[estimatedStepIdx].name;
          roadAlertsEngine.speak(`Em ${stepMeters} metros, ${currentInst} ${street ? `na ${street}` : ''}`);
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

  const renderManeuverIcon = (step?: RouteStep, size = 26) => {
    if (!step) return <ArrowUp size={size} className="text-emerald-400" />;
    const mod = step.modifier || '';
    const type = step.type || '';

    if (type.includes('roundabout')) return <RotateCw size={size} className="text-emerald-400" />;
    if (mod.includes('slight right') || mod.includes('right')) return <CornerUpRight size={size} className="text-emerald-400" />;
    if (mod.includes('slight left') || mod.includes('left')) return <CornerUpLeft size={size} className="text-emerald-400" />;
    if (mod.includes('sharp right')) return <CornerDownRight size={size} className="text-amber-400" />;
    if (mod.includes('sharp left')) return <CornerDownLeft size={size} className="text-amber-400" />;
    return <ArrowUp size={size} className="text-emerald-400" />;
  };

  const renderFavoriteIcon = (iconName?: string, size = 14) => {
    switch (iconName) {
      case 'home':
        return <Home size={size} className="text-emerald-400" />;
      case 'work':
        return <Briefcase size={size} className="text-sky-400" />;
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
        <div className="bg-[#0b0b12]/98 border-b border-[#1f1f2e] p-2 z-30 shadow-2xl backdrop-blur-md shrink-0 flex flex-col gap-1.5">
          {/* Compact Top Navigation Action Bar */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            {/* GPS Status / Activate Button & Real-time Clock */}
            <div className="flex items-center gap-2">
              {gpsActive ? (
                <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/40 px-2 py-1 rounded-lg text-emerald-400 text-xs font-black">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>GPS ATIVO</span>
                  {gpsAccuracy && <span className="text-[10px] text-emerald-300 font-bold opacity-80">(±{Math.round(gpsAccuracy)}m)</span>}
                </div>
              ) : (
                <button
                  onClick={onRequestGps}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-black px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all shadow-md active:scale-95 animate-pulse"
                  title="Ativar GPS Real do Carro"
                >
                  <LocateFixed size={13} />
                  <span>Ativar Meu GPS</span>
                </button>
              )}

              {/* Real-time Clock Display */}
              <div className="flex items-center gap-1.5 bg-[#141424] border border-[#2a2a3e] px-2.5 py-1 rounded-lg text-white text-xs font-black tracking-wider">
                <Clock size={12} className="text-amber-400 animate-spin" style={{ animationDuration: '60s' }} />
                <span>{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>

            {/* Quick Feature Controls */}
            <div className="flex items-center gap-1.5 ml-auto">
              {/* Botão de Áudio Voz */}
              <button
                onClick={() => setIsVoiceFeedbackEnabled(!isVoiceFeedbackEnabled)}
                className={`px-2 py-1 rounded-lg border text-xs font-black flex items-center gap-1 transition-all ${
                  isVoiceFeedbackEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
                title={isVoiceFeedbackEnabled ? 'Voz e Alertas Ativos' : 'Voz Silenciada'}
              >
                {isVoiceFeedbackEnabled ? <Volume2 size={13} className="text-emerald-400" /> : <VolumeX size={13} />}
                <span>{isVoiceFeedbackEnabled ? 'VOZ' : 'MUDO'}</span>
              </button>

              {/* Botão Centro de Mapas Offline */}
              <button
                onClick={() => setIsOfflineModalOpen(true)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black uppercase transition-all shadow-md active:scale-95 border ${
                  isOfflineModeActive
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/40'
                }`}
                title="Gerenciar download de mapas offline para todo o Brasil"
              >
                <Download size={13} className="text-cyan-400" />
                <span>OFFLINE</span>
              </button>

              {/* Gerenciar Favoritos Button */}
              <button
                onClick={() => setIsManageFavoritesOpen(true)}
                className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-lg text-xs font-black uppercase transition-all shadow-md active:scale-95"
                title="Abrir Destinos Favoritos Salvos"
              >
                <Star size={13} className="fill-amber-400 text-amber-400" />
                <span>FAVORITOS ({favorites.length})</span>
              </button>

              {/* Camadas */}
              <div className="relative">
                <button
                  onClick={() => setShowLayerMenu(!showLayerMenu)}
                  className="px-2 py-1 bg-[#161622] hover:bg-[#202030] text-zinc-300 border border-[#2a2a3e] rounded-lg text-xs font-bold flex items-center gap-1"
                  title="Alterar Camada do Mapa"
                >
                  <Layers size={13} className="text-emerald-400" />
                  <span className="hidden sm:inline">{mapTheme.toUpperCase()}</span>
                </button>

                {showLayerMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-[#12121e] border border-[#2a2a3e] rounded-xl p-1 shadow-2xl z-40 flex flex-col gap-0.5 w-44">
                    <button
                      onClick={() => {
                        setMapTheme('eco');
                        setShowLayerMenu(false);
                      }}
                      className={`p-1.5 text-left text-[10px] font-bold rounded-lg transition-colors flex items-center justify-between ${
                        mapTheme === 'eco' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-300 hover:bg-[#1c1c2e]'
                      }`}
                    >
                      <span>🌿 Eco (Recomendado)</span>
                      {mapTheme === 'eco' && <CheckCircle2 size={12} />}
                    </button>
                    <button
                      onClick={() => {
                        setMapTheme('dark');
                        setShowLayerMenu(false);
                      }}
                      className={`p-1.5 text-left text-[10px] font-bold rounded-lg transition-colors flex items-center justify-between ${
                        mapTheme === 'dark' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-300 hover:bg-[#1c1c2e]'
                      }`}
                    >
                      <span>🌙 Noturno / Dark Cockpit</span>
                      {mapTheme === 'dark' && <CheckCircle2 size={12} />}
                    </button>
                    <button
                      onClick={() => {
                        setMapTheme('satellite');
                        setShowLayerMenu(false);
                      }}
                      className={`p-1.5 text-left text-[10px] font-bold rounded-lg transition-colors flex items-center justify-between ${
                        mapTheme === 'satellite' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-300 hover:bg-[#1c1c2e]'
                      }`}
                    >
                      <span>🛰️ Satélite HD</span>
                      {mapTheme === 'satellite' && <CheckCircle2 size={12} />}
                    </button>
                    <button
                      onClick={() => {
                        setMapTheme('standard');
                        setShowLayerMenu(false);
                      }}
                      className={`p-1.5 text-left text-[10px] font-bold rounded-lg transition-colors flex items-center justify-between ${
                        mapTheme === 'standard' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-300 hover:bg-[#1c1c2e]'
                      }`}
                    >
                      <span>🗺️ Padrão OSM</span>
                      {mapTheme === 'standard' && <CheckCircle2 size={12} />}
                    </button>
                  </div>
                )}
              </div>

              {onClose && (
                <button
                  onClick={onClose}
                  className="px-2 py-1 text-zinc-400 hover:text-white rounded-lg bg-[#161622] hover:bg-red-900/40 border border-[#2a2a3e] text-xs font-bold"
                  title="Fechar"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* ─── GOOGLE MAPS STYLE ORIGIN & DESTINATION INPUT BOXES ─── */}
          <div className="bg-[#12121e] border border-[#222234] rounded-2xl p-2.5 shadow-inner relative flex flex-col gap-2">
            {/* Origin & Destination with Swap button */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center justify-between py-2 shrink-0">
                <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#12121e] shadow" />
                <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500 via-zinc-600 to-red-500 my-0.5" />
                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-[#12121e] shadow" />
              </div>

              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                {/* Origin Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={originInput}
                    onChange={(e) => handleOriginChange(e.target.value)}
                    onFocus={() => setActiveSuggestionField('origin')}
                    placeholder="Ponto de partida..."
                    className="w-full bg-[#181828] text-xs text-white placeholder-zinc-500 px-3 py-1.5 pr-8 rounded-xl border border-[#28283e] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                  {!isUsingGpsOrigin ? (
                    <button
                      onClick={handleSetOriginToGps}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-emerald-400 p-0.5"
                      title="Usar GPS atual como origem"
                    >
                      <LocateFixed size={14} />
                    </button>
                  ) : (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 text-[10px] font-black">
                      GPS
                    </span>
                  )}

                  {/* Origin Suggestions dropdown */}
                  {activeSuggestionField === 'origin' && originSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#161626] border border-[#2a2a3e] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                      {originSuggestions.map((place, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectSuggestion(place, 'origin')}
                          className="px-3 py-2 text-xs text-zinc-300 hover:bg-emerald-500/20 hover:text-emerald-200 cursor-pointer border-b border-[#222234] last:border-0 flex items-start gap-1.5"
                        >
                          <MapPin size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{place.display_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Destination Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={destinationInput}
                    onChange={(e) => handleDestChange(e.target.value)}
                    onFocus={() => setActiveSuggestionField('dest')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAiSmartSearch(destinationInput);
                      }
                    }}
                    placeholder="Para onde vamos? (ex: Praia de Ponta Negra, Niterói, Posto BR...)"
                    className="w-full bg-[#181828] text-xs text-white placeholder-zinc-500 px-3 py-1.5 pr-14 rounded-xl border border-[#28283e] focus:outline-none focus:border-red-500 font-medium"
                  />

                  {/* Botão de Favoritar Rápido no Destino */}
                  {destinationInput && (
                    <button
                      onClick={() => handleOpenSaveFavorite()}
                      className={`absolute right-7 top-1/2 -translate-y-1/2 p-1 transition-colors ${
                        isCurrentDestFavorited ? 'text-amber-400' : 'text-zinc-400 hover:text-amber-300'
                      }`}
                      title={isCurrentDestFavorited ? 'Destino já está nos Favoritos' : 'Salvar como Favorito'}
                    >
                      <Star size={13} className={isCurrentDestFavorited ? 'fill-amber-400' : ''} />
                    </button>
                  )}

                  {destinationInput && (
                    <button
                      onClick={() => {
                        setDestinationInput('');
                        setDestinationCoords(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}

                  {/* Dest Suggestions dropdown */}
                  {activeSuggestionField === 'dest' && destSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#161626] border border-[#2a2a3e] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                      {destSuggestions.map((place, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectSuggestion(place, 'dest')}
                          className="px-3 py-2 text-xs text-zinc-300 hover:bg-red-500/20 hover:text-red-200 cursor-pointer border-b border-[#222234] last:border-0 flex items-start gap-1.5"
                        >
                          <MapPin size={12} className="text-red-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{place.display_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Swap Origin/Dest Button */}
              <button
                onClick={handleSwapOriginAndDest}
                className="p-2 rounded-xl bg-[#1c1c2e] hover:bg-[#25253c] text-zinc-300 hover:text-white border border-[#2c2c44] shrink-0 transition-transform active:rotate-180"
                title="Inverter Origem e Destino"
              >
                <ArrowUpDown size={14} />
              </button>
            </div>

            {/* ─── FAVORITES SHORTCUT CHIPS BAR ─── */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar pt-0.5">
              <span className="text-[9px] font-black uppercase text-amber-400/80 shrink-0 flex items-center gap-1 pl-0.5">
                <Star size={10} className="fill-amber-400 text-amber-400" />
                FAVORITOS:
              </span>
              {favorites.map((fav) => (
                <button
                  key={fav.id}
                  onClick={() => handleSelectFavoriteDestination(fav)}
                  className="px-2 py-0.5 bg-[#18182c] hover:bg-[#242440] text-zinc-200 hover:text-white border border-[#2a2a44] hover:border-amber-400/40 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95 shadow-sm"
                  title={`${fav.name} - ${fav.address}`}
                >
                  {renderFavoriteIcon(fav.icon, 11)}
                  <span>{fav.name}</span>
                </button>
              ))}

              <button
                onClick={() => handleOpenSaveFavorite()}
                className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all"
                title="Adicionar Destino aos Favoritos"
              >
                <Plus size={10} />
                <span>Salvar Atual</span>
              </button>
            </div>

            {/* Quick Actions & AI Search Button */}
            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#1e1e30]">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAiSmartSearch('Posto de combustível mais próximo com GNV e gasolina')}
                  className="px-2 py-1 bg-[#1a1a2a] hover:bg-[#24243a] text-amber-300 rounded-lg text-[10px] font-bold border border-amber-500/30 flex items-center gap-1"
                >
                  <Fuel size={11} /> Postos Próximos
                </button>

                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-[10px] font-bold border border-red-500/40 flex items-center gap-1 shadow-sm"
                  title="Reportar radar móvel, lombada, buraco ou blitz"
                >
                  <Flag size={11} className="text-red-400" />
                  <span>Reportar na Pista</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {calculatedRoutes.length > 0 && (
                  <button
                    onClick={clearAllRoutes}
                    className="px-2 py-1 bg-[#1a1a28] hover:bg-red-950/40 text-zinc-400 hover:text-red-300 rounded-lg text-[10px] font-bold border border-[#2a2a3e]"
                  >
                    Limpar
                  </button>
                )}

                <button
                  onClick={() => handleCalculateAllRoutes(null, null)}
                  disabled={isCalculatingRoutes || !destinationInput}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-black text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  {isCalculatingRoutes ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Calculando...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={13} />
                      <span>Traçar Rotas</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ─── WAZE-STYLE DRIVER HUD COCKPIT OVERLAY WHEN LIVE DRIVING ─── */
        <div className="bg-[#080811]/98 border-b border-[#252538] p-3 z-30 shadow-2xl backdrop-blur-md shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            {/* Maneuver Card Banner */}
            <div className="flex items-center gap-3 flex-1 min-w-0 bg-[#121222] border border-[#2a2a44] p-2.5 rounded-2xl shadow-inner">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                {renderManeuverIcon(activeStep, 32)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-emerald-400 tracking-tight">
                    {distanceToNextStepMeters > 0
                      ? distanceToNextStepMeters >= 1000
                        ? `${(distanceToNextStepMeters / 1000).toFixed(1)} km`
                        : `${distanceToNextStepMeters} m`
                      : 'Siga'}
                  </span>
                  <span className="text-xs font-black uppercase text-white truncate">
                    {activeStep?.instruction || 'Siga o traçado da rota'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                  {activeStep?.name ? `Entrar em: ${activeStep.name}` : activeRoute.destinationName}
                </p>
              </div>
            </div>

            {/* Live Clock & Driver Quick Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="hidden sm:flex items-center gap-1 bg-[#141424] border border-[#2a2a3e] px-2.5 py-2 rounded-xl text-white text-xs font-black">
                <Clock size={13} className="text-amber-400" />
                <span>{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <button
                onClick={() => setIsVoiceFeedbackEnabled(!isVoiceFeedbackEnabled)}
                className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                  isVoiceFeedbackEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-[#181828] text-zinc-400 border-[#28283e]'
                }`}
                title={isVoiceFeedbackEnabled ? 'Voz Ligada' : 'Voz Silenciada'}
              >
                {isVoiceFeedbackEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                onClick={() => setIsReportModalOpen(true)}
                className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition-all shadow-sm"
                title="Reportar Radar ou Alerta"
              >
                <Flag size={16} className="text-red-400" />
              </button>

              <button
                onClick={stopLiveNavigation}
                className="px-3 py-2 bg-red-600/90 hover:bg-red-500 text-white font-black text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <Square size={13} />
                <span>Sair</span>
              </button>
            </div>
          </div>

          {/* Active Voice Prompt Banner */}
          {activeVoicePrompt && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-red-200 animate-pulse">
              <Siren size={15} className="text-red-400 shrink-0" />
              <span className="font-bold">{activeVoicePrompt}</span>
            </div>
          )}
        </div>
      )}

      {/* ─── MAIN LEAFLET MAP CONTAINER ─── */}
      <div className="relative flex-1 w-full min-h-0">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Dynamic Auto-Reroute Realtime Badge */}
        {isRecalculatingRoute && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-amber-500/90 text-black px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2 font-black text-xs uppercase tracking-wider animate-bounce border border-amber-300">
            <Loader2 size={16} className="animate-spin" />
            <span>Recalculando nova rota para o destino...</span>
          </div>
        )}

        {/* Proactive Nearby Hazards Alert Floating Pill (Waze Style) */}
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

        {/* Offline Mode Indicator Badge on Map */}
        {isOfflineModeActive && (
          <div className="absolute top-3 right-14 z-20 bg-cyan-950/90 border border-cyan-400/50 rounded-xl px-2.5 py-1 backdrop-blur-md flex items-center gap-1.5 text-cyan-300 text-[10px] font-black shadow-xl">
            <WifiOff size={12} className="text-cyan-400" />
            <span>MODO OFFLINE (IndexedDB)</span>
          </div>
        )}

        {/* Recenter floating button */}
        {!autoFollowCar && (
          <button
            onClick={recenterOnCar}
            className="absolute bottom-20 right-4 z-20 bg-emerald-600 text-black p-3 rounded-2xl shadow-2xl font-black text-xs flex items-center gap-2 hover:bg-emerald-500 active:scale-95 transition-all border border-emerald-400"
          >
            <LocateFixed size={18} />
            <span>Recentralizar</span>
          </button>
        )}
      </div>

      {/* ─── BOTTOM SECTION: ROUTE COMPARISON CARDS OR LIVE SPEEDOMETER ─── */}
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
                  🍃 Modo Econômico Renault Clio
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
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'bg-[#121220] border-[#222234] hover:border-[#383850]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">{route.routeName}</span>
                      <span className="text-xs font-black text-emerald-400">{route.durationMin} min</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-300 font-medium">
                      <span>{route.distanceKm} km</span>
                      <span>~{route.litersNeeded} L ({fuelTypeLabel})</span>
                      <span className="text-emerald-300 font-bold">R$ {route.costEstimatedBrl?.toFixed(2)}</span>
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
        /* Driver Live Trip Bottom Bar */
        <div className="bg-[#090910]/98 border-t border-[#1e1e2c] p-3 z-30 shadow-2xl backdrop-blur-md shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Chegada Prevista</span>
              <span className="text-lg font-black text-white">{calculateETA(liveRemainingDurationMin)}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Tempo Restante</span>
              <span className="text-lg font-black text-emerald-400">{liveRemainingDurationMin} min</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Distância</span>
              <span className="text-lg font-black text-white">{liveRemainingDistanceKm} km</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#121222] border border-emerald-500/40 rounded-2xl px-3 py-1.5 flex flex-col items-center">
              <span className="text-[9px] font-bold text-zinc-400">VELOCIDADE</span>
              <span className="text-xl font-black text-emerald-300">{Math.round(liveNavSpeed)} <span className="text-[10px] text-zinc-400">KM/H</span></span>
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
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'speed_camera', label: '📸 Radar de Velocidade' },
                  { type: 'speed_bump', label: '🛑 Lombada / Quebra-mola' },
                  { type: 'pothole', label: '🕳️ Buraco / Pista Ruim' },
                  { type: 'police', label: '👮 Fiscalização / Polícia' },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setReportFormData({ ...reportFormData, type: item.type as any })}
                    className={`p-2.5 rounded-xl border text-xs font-black transition-all ${
                      reportFormData.type === item.type
                        ? 'bg-red-500/20 border-red-400 text-red-300'
                        : 'bg-[#141424] border-[#222238] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {reportFormData.type === 'speed_camera' && (
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                    Limite de Velocidade do Radar (KM/H)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[40, 50, 60, 80].map((spd) => (
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
                        {spd} km/h
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
                  placeholder="Ex: Sentido bairro, na faixa da direita..."
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
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                >
                  Salvar Alerta
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
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'home', icon: Home, label: 'Casa' },
                    { id: 'work', icon: Briefcase, label: 'Trabalho' },
                    { id: 'gas', icon: Fuel, label: 'Posto' },
                    { id: 'beach', icon: Umbrella, label: 'Praia' },
                    { id: 'shopping', icon: ShoppingBag, label: 'Mercado' },
                    { id: 'gym', icon: Dumbbell, label: 'Academia' },
                    { id: 'heart', icon: Heart, label: 'Amor' },
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
