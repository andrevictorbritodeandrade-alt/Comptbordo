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
  ArrowUp,
  Maximize2,
  Minimize2,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { CarConfig, NavigationRoute, RouteStep } from '../types';

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

export const OpenStreetMapViewer: React.FC<OpenStreetMapViewerProps> = ({
  currentLat,
  currentLng,
  speed,
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

  // Routes comparison states
  const [calculatedRoutes, setCalculatedRoutes] = useState<NavigationRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [aiCopilotData, setAiCopilotData] = useState<{
    copilotMessage?: string;
    ecoTip?: string;
    category?: string;
  } | null>(null);

  // Navigation mode states
  const [isLiveNavigating, setIsLiveNavigating] = useState(false);
  const [showTurnByTurn, setShowTurnByTurn] = useState(false);
  const [autoFollowCar, setAutoFollowCar] = useState(true);

  // Clio fuel calculations base
  const fuelType = carConfig.currentFuel || 'ethanol';
  const fuelTypeLabel = fuelType === 'ethanol' ? 'Etanol' : 'Gasolina';
  const fuelPricePerLiter = fuelType === 'ethanol' ? 4.29 : 6.19; // Estimativa média de mercado
  const baseKmPerL =
    fuelType === 'ethanol'
      ? carConfig.avgConsumptionEthanol || 8.9
      : carConfig.avgConsumptionGasoline || 12.6;
  const currentLitersInTank = (carConfig.tankCapacity * carConfig.fuelLevel) / 100;

  // Real or default fallback coordinates (Maricá - RJ)
  const defaultLat = currentLat || -22.9194;
  const defaultLng = currentLng || -42.8186;

  // Initialize Map
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

    const tileLayer = getTileLayer(mapTheme);
    tileLayer.addTo(map);
    setTileLayerRef(tileLayer);

    // Car position marker
    const carIcon = createCarIcon(speed);
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

    // Map click sets destination or origin
    map.on('click', (e: L.LeafletMouseEvent) => {
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

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Helper: Tile layers
  function getTileLayer(theme: string): L.TileLayer {
    if (theme === 'eco') {
      return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'osm-eco-filter',
      });
    } else if (theme === 'dark') {
      return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        className: 'osm-cockpit-filter',
      });
    } else if (theme === 'satellite') {
      return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{n}', {
        maxZoom: 19,
      });
    } else {
      return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      });
    }
  }

  // Update Tile Layer when mapTheme changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef) {
      mapInstanceRef.current.removeLayer(tileLayerRef);
    }
    const newLayer = getTileLayer(mapTheme);
    newLayer.addTo(mapInstanceRef.current);
    setTileLayerRef(newLayer);
  }, [mapTheme]);

  // Create or update Car Icon
  function createCarIcon(currSpeed: number) {
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

  // Update car marker position and speed
  useEffect(() => {
    if (!mapInstanceRef.current || !carMarkerRef.current) return;

    const lat = currentLat || -22.9194;
    const lng = currentLng || -42.8186;

    carMarkerRef.current.setLatLng([lat, lng]);
    const iconEl = carMarkerRef.current.getElement();
    if (iconEl) {
      const speedBadge = iconEl.querySelector('.text-emerald-300');
      if (speedBadge) {
        speedBadge.textContent = `${Math.round(speed)} KM/H`;
      }
    }

    if (trailPolylineRef.current) {
      if (breadcrumbTrail && breadcrumbTrail.length > 0) {
        trailPolylineRef.current.setLatLngs(breadcrumbTrail);
      } else {
        trailPolylineRef.current.setLatLngs([[lat, lng]]);
      }
    }

    if (autoFollowCar) {
      mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
    }
  }, [currentLat, currentLng, speed, breadcrumbTrail, autoFollowCar]);

  // Autocomplete place search via Nominatim
  const searchPlaceNominatim = useCallback(async (query: string, type: 'origin' | 'dest') => {
    if (!query || query.length < 3 || query.startsWith('📍')) {
      if (type === 'origin') setOriginSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    setIsSearchingSuggestions(true);
    try {
      // Prioritize region around Rio de Janeiro / Maricá
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

  // Debounced input search for Origin
  const handleOriginChange = (val: string) => {
    setOriginInput(val);
    setIsUsingGpsOrigin(false);
    setActiveSuggestionField('origin');
    searchPlaceNominatim(val, 'origin');
  };

  // Debounced input search for Destination
  const handleDestChange = (val: string) => {
    setDestinationInput(val);
    setActiveSuggestionField('dest');
    searchPlaceNominatim(val, 'dest');
  };

  // Select origin from GPS
  const handleSetOriginToGps = () => {
    setIsUsingGpsOrigin(true);
    setOriginInput('📍 Meu Local Atual (GPS)');
    setOriginCoords(null);
    setActiveSuggestionField(null);
    if (onRequestGps && !gpsActive) {
      onRequestGps();
    }
  };

  // Select suggestion
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

    // If both origin and destination are ready, calculate routes
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

  // Swap Origin and Destination
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

  // Core Eco-Routes Engine: Calculate multiple routes via OSRM + Eco Comparison
  const handleCalculateAllRoutes = async (
    startPoint: { lat: number; lng: number } | null,
    endPoint: { lat: number; lng: number } | null,
    destTitle?: string
  ) => {
    const start = startPoint || (isUsingGpsOrigin ? { lat: currentLat || -22.9194, lng: currentLng || -42.8186 } : originCoords);
    const end = endPoint || destinationCoords;

    if (!start || !end) {
      setRouteError('Defina um ponto de origem e um destino para traçar a rota.');
      return;
    }

    setIsCalculatingRoutes(true);
    setRouteError(null);

    try {
      // Call OSRM with alternatives=true to get primary and alternative paths
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
      const response = await fetch(osrmUrl);

      if (!response.ok) {
        throw new Error('Falha ao conectar com o serviço de rotas OpenStreetMap.');
      }

      const data = await response.json();
      if (!data.routes || data.routes.length === 0) {
        throw new Error('Nenhuma rota rodoviária encontrada entre esses dois pontos.');
      }

      // Process each route and calculate fuel consumption & eco score
      const rawRoutes = data.routes;
      const parsedRoutes: NavigationRoute[] = rawRoutes.map((r: any, idx: number) => {
        const coords: [number, number][] = r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        const distanceKm = Number((r.distance / 1000).toFixed(1));
        const durationMin = Math.round(r.duration / 60);

        // Calculate implicit average speed in km/h
        const avgSpeedKmh = distanceKm / (durationMin / 60 || 0.1);

        // Eco efficiency factor based on speed & stop penalties
        // Clio 1.0 16V is most efficient between 55-80 km/h
        let efficiencyMultiplier = 1.0;
        if (avgSpeedKmh > 95) {
          efficiencyMultiplier = 1.14; // Higher aerodynamic drag on highways
        } else if (avgSpeedKmh < 28) {
          efficiencyMultiplier = 1.22; // Stop & go urban traffic penalty
        } else if (avgSpeedKmh >= 55 && avgSpeedKmh <= 80) {
          efficiencyMultiplier = 0.92; // Sweet spot for Clio 1.0 Hi-Flex
        }

        const effectiveKmPerL = baseKmPerL / efficiencyMultiplier;
        const litersNeeded = Number((distanceKm / effectiveKmPerL).toFixed(2));
        const costEstimatedBrl = Number((litersNeeded * fuelPricePrice(fuelType)).toFixed(2));

        // Eco Score: 100 = most fuel efficient
        const ecoScore = Math.max(20, Math.min(100, Math.round(100 - (litersNeeded * 10) + (avgSpeedKmh >= 50 && avgSpeedKmh <= 80 ? 15 : 0))));

        const fuelSufficiency =
          currentLitersInTank >= litersNeeded
            ? `Tanque suficiente! (${currentLitersInTank.toFixed(1)}L disponíveis, consome ~${litersNeeded.toFixed(1)}L)`
            : `Atenção: Combustível insuficiente (${currentLitersInTank.toFixed(1)}L disponíveis vs ${litersNeeded.toFixed(1)}L necessários). Abasteça antes!`;

        const routeSteps: RouteStep[] = (r.legs?.[0]?.steps || []).map((s: any) => ({
          instruction: formatManeuver(s.maneuver),
          distance: s.distance,
          name: s.name || 'Via de Acesso',
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

      // Classify routes: Find the most economical (least litersNeeded) and the fastest (least durationMin)
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
          route.costSavingsBrl = Number(((maxLiters - route.litersNeeded) * fuelPricePrice(fuelType)).toFixed(2));
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

      // Sort so the Eco route is first, then fastest, then others
      parsedRoutes.sort((a, b) => {
        if (a.routeType === 'eco') return -1;
        if (b.routeType === 'eco') return 1;
        if (a.routeType === 'fastest') return -1;
        if (b.routeType === 'fastest') return 1;
        return 0;
      });

      setCalculatedRoutes(parsedRoutes);
      setSelectedRouteId(parsedRoutes[0].id);

      // Render all routes on map
      renderRoutesOnMap(parsedRoutes, parsedRoutes[0].id, start, end, destTitle || destinationInput);

      // Request AI Copilot advice in background
      fetchAiEcoAdvice(originInput, destTitle || destinationInput, parsedRoutes[0]);
    } catch (err: any) {
      console.error('Erro no cálculo de rotas:', err);
      setRouteError(err?.message || 'Não foi possível calcular as rotas.');
    } finally {
      setIsCalculatingRoutes(false);
    }
  };

  function fuelPricePrice(type: 'ethanol' | 'gasoline') {
    return type === 'ethanol' ? 4.29 : 6.19;
  }

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

    // Clear old polylines
    routePolylinesRef.current.forEach((r) => map.removeLayer(r.polyline));
    routePolylinesRef.current = [];

    if (originMarkerRef.current) map.removeLayer(originMarkerRef.current);
    if (destMarkerRef.current) map.removeLayer(destMarkerRef.current);

    const polylinesList: { id: string; polyline: L.Polyline }[] = [];

    // Draw inactive routes first (so active sits on top)
    routes.forEach((route) => {
      const isSelected = route.id === activeId;
      let color = '#64748b'; // Slate gray for secondary
      let weight = 4;
      let opacity = 0.5;
      let dashArray: string | undefined = '4, 8';

      if (isSelected) {
        if (route.routeType === 'eco') color = '#10b981'; // Emerald Green
        else if (route.routeType === 'fastest') color = '#38bdf8'; // Sky Blue
        else color = '#f59e0b'; // Amber Gold
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

      // Clicking polyline selects the route
      poly.on('click', () => {
        handleSelectRoute(route.id);
      });

      polylinesList.push({ id: route.id, polyline: poly });
    });

    routePolylinesRef.current = polylinesList;

    // Origin Marker (Green Pin)
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

    // Destination Marker (Red Pin)
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

    // Fit map bounds to show complete route
    const activePolyline = polylinesList.find((p) => p.id === activeId)?.polyline;
    if (activePolyline) {
      map.fitBounds(activePolyline.getBounds(), { padding: [50, 50] });
    }
    setAutoFollowCar(false);
  };

  // Switch selected route
  const handleSelectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    if (!mapInstanceRef.current || calculatedRoutes.length === 0) return;

    routePolylinesRef.current.forEach((item) => {
      const isSelected = item.id === routeId;
      const targetRoute = calculatedRoutes.find((r) => r.id === item.id);
      if (isSelected && targetRoute) {
        let color = '#10b981';
        if (targetRoute.routeType === 'fastest') color = '#38bdf8';
        else if (targetRoute.routeType !== 'eco') color = '#f59e0b';

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

  // AI Eco Advice & Smart Search
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
          ecoTip: data.ecoTip || 'Mantenha rotações entre 2.000 e 2.800 RPM no Clio 1.0 para maximizar a economia.',
          category: data.category,
        });
      }
    } catch (err) {
      console.warn('AI Co-pilot offline:', err);
    }
  };

  // Smart Search Trigger (Prompt)
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
        // Fallback to nominatim
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

  const clearAllRoutes = () => {
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
    setIsLiveNavigating(false);
    setShowTurnByTurn(false);
    setAutoFollowCar(true);
  };

  const recenterOnCar = () => {
    setAutoFollowCar(true);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([currentLat || -22.9194, currentLng || -42.8186], 16);
    }
  };

  const activeRoute = calculatedRoutes.find((r) => r.id === selectedRouteId) || calculatedRoutes[0];

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-[#07070b] overflow-hidden ${
        isEmbedded ? 'rounded-2xl border border-[#1e1e28]' : 'fixed inset-0 z-50'
      }`}
    >
      {/* Top Bar: Google Maps-like Route Planner & Eco Navigation */}
      <div className="bg-[#0b0b12]/98 border-b border-[#1f1f2e] p-2.5 z-30 shadow-2xl backdrop-blur-md shrink-0 flex flex-col gap-2">
        {/* Header Title & GPS Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 flex items-center justify-center">
              <Leaf size={16} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-black uppercase text-white tracking-wider">
                  OpenStreetMap • Rotas Econômicas (Eco-Routes)
                </h2>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/40">
                  CLIO 1.0 HI-FLEX
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Comparador inteligente de consumo de combustível • Estilo Google Maps
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {gpsActive ? (
              <div className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/40 px-2 py-1 rounded-lg text-emerald-400 text-[10px] font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                GPS ATIVO {gpsAccuracy ? `(±${Math.round(gpsAccuracy)}m)` : ''}
              </div>
            ) : (
              <button
                onClick={onRequestGps}
                className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all shadow-md active:scale-95 animate-pulse"
                title="Ativar GPS Real do dispositivo"
              >
                <LocateFixed size={12} />
                ATIVAR MEU GPS
              </button>
            )}

            {/* Layer selector */}
            <div className="relative">
              <button
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                className="px-2 py-1 bg-[#161622] hover:bg-[#202030] text-zinc-300 border border-[#2a2a3e] rounded-lg text-[10px] font-bold flex items-center gap-1"
                title="Alterar Camada do Mapa"
              >
                <Layers size={12} className="text-emerald-400" />
                <span className="hidden md:inline">{mapTheme.toUpperCase()}</span>
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
                    <span>🌿 Eco (Verde / Cinza / Azul)</span>
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
                    <span>🌑 Dark Night Nav</span>
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
                    <span>🛰️ Satélite Híbrido</span>
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
                    <span>🗺️ OpenStreetMap Clássico</span>
                    {mapTheme === 'standard' && <CheckCircle2 size={12} />}
                  </button>
                </div>
              )}
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 bg-[#161622] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-[#2a2a3e] rounded-lg transition-colors"
                title="Fechar Mapa"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Google Maps-Style Dual Search Box (ORIGEM & DESTINO) */}
        <div className="flex items-center gap-2 relative">
          <div className="flex-1 flex flex-col gap-1.5">
            {/* Origin Input */}
            <div className="relative flex items-center">
              <div className="absolute left-2.5 flex items-center justify-center text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400 bg-[#050508]" />
              </div>
              <input
                type="text"
                value={originInput}
                onChange={(e) => handleOriginChange(e.target.value)}
                onFocus={() => setActiveSuggestionField('origin')}
                placeholder="Ponto de Partida (ou 'Meu Local Atual')"
                className="w-full bg-[#141422] border border-[#2a2a3e] rounded-xl py-1.5 pl-8 pr-16 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400 font-medium"
              />
              {!isUsingGpsOrigin && (
                <button
                  onClick={handleSetOriginToGps}
                  className="absolute right-2 px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[9px] font-black rounded border border-emerald-500/30 uppercase"
                  title="Usar GPS atual como partida"
                >
                  GPS
                </button>
              )}
            </div>

            {/* Destination Input */}
            <div className="relative flex items-center">
              <div className="absolute left-2.5 flex items-center justify-center text-red-500">
                <MapPin size={13} />
              </div>
              <input
                type="text"
                value={destinationInput}
                onChange={(e) => handleDestChange(e.target.value)}
                onFocus={() => setActiveSuggestionField('dest')}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSmartSearch()}
                placeholder="Onde você quer ir? (Destino, endereço, ponto turístico ou posto)..."
                className="w-full bg-[#141422] border border-[#2a2a3e] rounded-xl py-1.5 pl-8 pr-8 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400 font-medium"
              />
              {destinationInput && (
                <button
                  onClick={() => {
                    setDestinationInput('');
                    setDestinationCoords(null);
                  }}
                  className="absolute right-2.5 text-zinc-500 hover:text-zinc-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Swap Origin/Dest Button */}
          <button
            onClick={handleSwapOriginAndDest}
            className="p-2 bg-[#181828] hover:bg-[#222238] border border-[#2c2c40] text-zinc-300 hover:text-emerald-400 rounded-xl transition-all shadow-md flex items-center justify-center shrink-0 self-center"
            title="Inverter Origem e Destino"
          >
            <ArrowUpDown size={15} />
          </button>

          {/* Traçar Rota Mais Econômica Button */}
          <button
            onClick={() => handleAiSmartSearch()}
            disabled={isCalculatingRoutes || !destinationInput.trim()}
            className="px-3.5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-lg shrink-0 self-stretch active:scale-95"
            title="Calcular rotas rodoviárias e comparar consumo"
          >
            {isCalculatingRoutes ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
            <span className="hidden sm:inline">Traçar</span> Rota Eco
          </button>
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {activeSuggestionField && (activeSuggestionField === 'origin' ? originSuggestions : destSuggestions).length > 0 && (
          <div className="absolute top-[120px] left-3 right-3 sm:right-32 bg-[#12121e] border border-[#2e2e46] rounded-2xl shadow-2xl z-50 max-h-52 overflow-y-auto custom-scrollbar p-1">
            {(activeSuggestionField === 'origin' ? originSuggestions : destSuggestions).map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(item, activeSuggestionField)}
                className="p-2 hover:bg-[#1f1f32] rounded-xl cursor-pointer text-xs text-zinc-200 flex items-start gap-2 transition-colors border-b border-[#1c1c2c] last:border-0"
              >
                <MapPin size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-relaxed">{item.display_name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick 1-Tap Destination Chips */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pt-0.5">
          <span className="text-[9px] font-black uppercase text-emerald-400 shrink-0 mr-0.5">Sugestões Eco:</span>
          {[
            { label: '⛽ Posto de Etanol Barato', query: 'Posto de combustível com etanol mais próximo' },
            { label: '🏢 Centro de Maricá', query: 'Praça Central Centro de Maricá RJ' },
            { label: '🏖️ Praia de Itaipuaçu', query: 'Praia de Itaipuaçu Maricá' },
            { label: '🏖️ Farol de Ponta Negra', query: 'Farol de Ponta Negra Maricá' },
            { label: '🛒 Supermercado', query: 'Supermercado mais próximo' },
            { label: '🏥 UPA / Hospital', query: 'Hospital ou UPA de Maricá' },
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDestinationInput(chip.query);
                handleAiSmartSearch(chip.query);
              }}
              className="text-[9px] font-bold text-zinc-300 hover:text-white bg-[#151524] hover:bg-[#202034] border border-[#252538] hover:border-emerald-500/40 px-2 py-0.5 rounded-full whitespace-nowrap transition-all shrink-0 flex items-center gap-1"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Canvas & Overlays */}
      <div className="relative flex-1 w-full h-full min-h-0">
        <div ref={mapContainerRef} className="w-full h-full min-h-[300px]" />

        {/* Floating Quick Action Controls */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          <button
            onClick={recenterOnCar}
            className={`p-2 rounded-xl border shadow-xl flex items-center justify-center transition-all ${
              autoFollowCar
                ? 'bg-emerald-600 text-black border-emerald-500'
                : 'bg-[#0f0f18]/90 text-zinc-200 border-[#2a2a3e] hover:text-white'
            }`}
            title="Centralizar no meu carro"
          >
            <LocateFixed size={18} />
          </button>

          {calculatedRoutes.length > 0 && (
            <button
              onClick={clearAllRoutes}
              className="p-2 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/60 rounded-xl shadow-xl transition-all"
              title="Limpar rotas"
            >
              <RotateCcw size={18} />
            </button>
          )}

          {activeRoute?.steps && (
            <button
              onClick={() => setShowTurnByTurn(!showTurnByTurn)}
              className={`p-2 rounded-xl border shadow-xl flex items-center justify-center transition-all ${
                showTurnByTurn
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-[#0f0f18]/90 text-zinc-200 border-[#2a2a3e]'
              }`}
              title="Ver passo a passo da rota"
            >
              <Navigation size={18} />
            </button>
          )}
        </div>

        {/* Live HUD Speedometer & Remaining Fuel Overlay */}
        <div className="absolute top-3 left-3 z-20 bg-[#08080d]/92 border border-[#222234] backdrop-blur-md rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-emerald-400 uppercase">VELOCIDADE</span>
            <span className="text-xl sm:text-2xl font-black text-white leading-none font-mono">
              {Math.round(speed)}
            </span>
            <span className="text-[8px] font-bold text-zinc-400 uppercase">KM/H</span>
          </div>

          <div className="w-[1px] h-8 bg-[#222234]" />

          <div className="flex flex-col">
            <span className="text-[8px] font-black text-emerald-400 uppercase">TANQUE DO CLIO</span>
            <span className="text-xs sm:text-sm font-black text-white">
              {currentLitersInTank.toFixed(1)}L ({carConfig.fuelLevel.toFixed(0)}%)
            </span>
            <span className="text-[8px] text-zinc-400 font-bold">
              Autonomia: ~{Math.round(currentLitersInTank * baseKmPerL)} km ({fuelTypeLabel})
            </span>
          </div>
        </div>

        {/* Turn-by-Turn Directions Drawer */}
        {showTurnByTurn && activeRoute?.steps && (
          <div className="absolute top-16 left-3 z-20 w-80 sm:w-96 max-h-[60vh] bg-[#0c0c16]/95 border border-[#28283c] rounded-2xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-2.5 bg-[#141422] border-b border-[#222234] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-white uppercase">
                <Navigation size={14} className="text-emerald-400" />
                <span>Instruções de Manobra</span>
              </div>
              <button onClick={() => setShowTurnByTurn(false)} className="text-zinc-400 hover:text-white">
                <X size={14} />
              </button>
            </div>

            <div className="p-2 overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
              {activeRoute.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-[#12121e] border border-[#1e1e2c] rounded-xl flex items-start gap-2 text-xs text-zinc-200"
                >
                  <div className="p-1 rounded bg-[#1c1c2e] text-emerald-400 shrink-0 mt-0.5">
                    {step.modifier?.includes('right') ? (
                      <CornerUpRight size={14} />
                    ) : step.modifier?.includes('left') ? (
                      <CornerUpLeft size={14} />
                    ) : (
                      <ArrowUp size={14} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white leading-tight">{step.instruction}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {step.name ? `em ${step.name} • ` : ''}
                      {step.distance > 1000 ? `${(step.distance / 1000).toFixed(1)} km` : `${Math.round(step.distance)} m`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GOOGLE MAPS STYLE: Routes Comparison Panel */}
        {calculatedRoutes.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-[430px] z-20 bg-[#090912]/96 border border-[#2a2a3e] rounded-3xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-white">
                    {calculatedRoutes.length} Opções de Rota Encontradas
                  </h3>
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-300 font-black px-1.5 py-0.2 rounded border border-emerald-500/40 uppercase">
                    COMPARADOR ECO
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Destino: <span className="text-zinc-200 font-bold">{activeRoute?.destinationName}</span>
                </p>
              </div>

              <button
                onClick={clearAllRoutes}
                className="text-zinc-400 hover:text-white p-1 rounded-lg bg-[#151522]"
                title="Fechar rotas"
              >
                <X size={14} />
              </button>
            </div>

            {/* List of Alternative Routes Cards */}
            <div className="flex flex-col gap-1.5">
              {calculatedRoutes.map((route) => {
                const isSelected = route.id === selectedRouteId;
                const isEco = route.routeType === 'eco';
                const isFastest = route.routeType === 'fastest';

                return (
                  <div
                    key={route.id}
                    onClick={() => handleSelectRoute(route.id)}
                    className={`p-2.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? isEco
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/30'
                          : isFastest
                          ? 'bg-sky-950/40 border-sky-400 shadow-lg shadow-sky-950/30'
                          : 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/30'
                        : 'bg-[#12121e] border-[#222234] hover:border-[#383850]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {isEco ? (
                          <span className="flex items-center gap-1 text-[9px] font-black bg-emerald-500 text-black px-2 py-0.5 rounded-full uppercase shadow">
                            <Leaf size={10} /> Rota Mais Econômica
                          </span>
                        ) : isFastest ? (
                          <span className="flex items-center gap-1 text-[9px] font-black bg-sky-400 text-black px-2 py-0.5 rounded-full uppercase shadow">
                            <Clock size={10} /> Rota Mais Rápida
                          </span>
                        ) : (
                          <span className="text-[9px] font-black bg-[#202030] text-zinc-300 px-2 py-0.5 rounded-full uppercase">
                            Rota Alternativa
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[9px] font-black text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 size={11} /> ATIVA
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-white font-mono">
                          R$ {route.costEstimatedBrl.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 py-1 px-1.5 bg-[#0a0a14] rounded-xl border border-[#1b1b2a] text-center mb-1.5">
                      <div>
                        <span className="text-[8px] text-zinc-400 font-bold uppercase block">DISTÂNCIA</span>
                        <span className="text-xs font-black text-white font-mono">{route.distanceKm} km</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-zinc-400 font-bold uppercase block">TEMPO</span>
                        <span className="text-xs font-black text-white font-mono">{route.durationMin} min</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-emerald-400 font-bold uppercase block">CONSUMO</span>
                        <span className="text-xs font-black text-emerald-300 font-mono">
                          ~{route.litersNeeded.toFixed(1)} L
                        </span>
                      </div>
                    </div>

                    {/* Savings comparison badge */}
                    {isEco && route.fuelSavingsLiters && route.fuelSavingsLiters > 0 && (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded-lg">
                        <TrendingDown size={11} className="text-emerald-400" />
                        <span>
                          Economiza <b>{route.fuelSavingsLiters}L</b> de {fuelTypeLabel} (<b>R$ {route.costSavingsBrl?.toFixed(2)}</b>) comparado à outra rota!
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* AI Smart Copilot Advice */}
            {aiCopilotData && (
              <div className="bg-[#121220] border border-[#28283e] p-2 rounded-2xl flex items-start gap-2">
                <Sparkles size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  {aiCopilotData.copilotMessage && (
                    <p className="text-[10px] text-zinc-200 leading-relaxed font-medium">
                      {aiCopilotData.copilotMessage}
                    </p>
                  )}
                  {aiCopilotData.ecoTip && (
                    <p className="text-[9px] text-emerald-300 font-bold mt-1 bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-500/30">
                      💡 Dica Eco Clio: {aiCopilotData.ecoTip}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Fuel sufficiency status */}
            <div className="flex items-center justify-between text-[9px] font-bold px-2 py-1.5 rounded-xl bg-[#0a0a12] border border-[#202030] text-zinc-300">
              <span className="flex items-center gap-1">
                <Fuel size={12} className="text-emerald-400" /> {activeRoute?.fuelSufficiency}
              </span>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isCalculatingRoutes && (
          <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center backdrop-blur-xs">
            <div className="bg-[#0e0e18] border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3 shadow-2xl">
              <Loader2 size={24} className="text-emerald-400 animate-spin" />
              <div>
                <div className="text-xs font-black text-white uppercase">Calculando Rotas OpenStreetMap...</div>
                <div className="text-[10px] text-zinc-400">Comparando consumo de combustível e menor custo</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Popup */}
        {routeError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-red-950/95 border border-red-600/70 text-red-200 text-xs px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md max-w-md">
            <AlertTriangle size={15} className="text-red-400 shrink-0" />
            <span className="flex-1">{routeError}</span>
            <button onClick={() => setRouteError(null)} className="ml-1 text-zinc-400 hover:text-white">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="bg-[#09090e] border-t border-[#1a1a26] px-3 py-1 flex items-center justify-between text-[9px] text-zinc-400 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span>Lat: {currentLat ? currentLat.toFixed(5) : '-22.91940'}</span>
          <span>Lng: {currentLng ? currentLng.toFixed(5) : '-42.81860'}</span>
          <span className="hidden sm:inline">• Trilha: {breadcrumbTrail.length} pontos gravados</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400">
          <span>© OpenStreetMap • OSRM Routing Machine • Eco Engine Clio 1.0</span>
        </div>
      </div>
    </div>
  );
};
