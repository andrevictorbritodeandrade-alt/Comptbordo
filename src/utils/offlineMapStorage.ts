// IndexedDB & CacheStorage Engine for 100% Offline OpenStreetMap tiles across Brazil

const DB_NAME = 'clio_offline_maps_v1';
const DB_VERSION = 1;
const STORE_TILES = 'map_tiles';
const STORE_REGIONS = 'cached_regions';

export interface OfflineRegion {
  id: string;
  name: string;
  description: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  zoomLevels: number[];
  tilesCount: number;
  sizeBytes: number;
  downloadedAt: number;
  status: 'ready' | 'downloading' | 'error';
}

export interface RoadHazardAlert {
  id: string;
  type:
    | 'speed_camera'
    | 'mobile_camera'
    | 'speed_bump'
    | 'sharp_curve'
    | 'pothole'
    | 'police'
    | 'gas_station'
    | 'traffic'
    | 'construction'
    | 'accident'
    | 'stopped_vehicle';
  title: string;
  description: string;
  lat: number;
  lng: number;
  speedLimit?: number;
  distanceMeters?: number;
  audioPrompt: string;
}

// Pre-packaged Brazil Regions ready for 1-click offline download
export const PRESET_BRAZIL_REGIONS: Omit<OfflineRegion, 'tilesCount' | 'sizeBytes' | 'downloadedAt' | 'status'>[] = [
  {
    id: 'region-marica-niteroi-rio',
    name: 'Maricá, Niterói & Rio de Janeiro (Metropolitana)',
    description: 'Região dos Lagos, Região Oceânica, Niterói, Ponte Rio-Niterói e Capital',
    centerLat: -22.9194,
    centerLng: -42.8186,
    radiusKm: 45,
    zoomLevels: [11, 12, 13, 14, 15],
  },
  {
    id: 'region-regiao-dos-lagos',
    name: 'Região dos Lagos (Saquarema, Araruama, Cabo Frio, Búzios)',
    description: 'RJ-106, RJ-102 e litorais de Saquarema até Arraial do Cabo e Búzios',
    centerLat: -22.8800,
    centerLng: -42.0200,
    radiusKm: 50,
    zoomLevels: [11, 12, 13, 14, 15],
  },
  {
    id: 'region-sp-capital-litoral',
    name: 'São Paulo (Capital, ABC & Baixada Santista)',
    description: 'Marginais, Rodoanel, Imigrantes, Anchieta e Santos',
    centerLat: -23.5505,
    centerLng: -46.6333,
    radiusKm: 50,
    zoomLevels: [11, 12, 13, 14],
  },
  {
    id: 'region-mg-bh-estrada-real',
    name: 'Minas Gerais (Belo Horizonte & Região)',
    description: 'BR-040, BR-381, Anel Rodoviário e Cidades Históricas',
    centerLat: -19.9167,
    centerLng: -43.9345,
    radiusKm: 40,
    zoomLevels: [11, 12, 13, 14],
  },
  {
    id: 'region-br-rodovias-principais',
    name: 'Corredores Rodoviários Brasil (BR-101 / BR-116 / Dutra)',
    description: 'Principais rodovias federais e estaduais para longas viagens',
    centerLat: -22.9068,
    centerLng: -43.1729,
    radiusKm: 120,
    zoomLevels: [8, 9, 10, 11, 12],
  },
];

class OfflineMapManager {
  private db: IDBDatabase | null = null;
  private isInitPromise: Promise<IDBDatabase> | null = null;

  async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.isInitPromise) return this.isInitPromise;

    this.isInitPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e: any) => {
        const db = e.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_TILES)) {
          db.createObjectStore(STORE_TILES, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_REGIONS)) {
          db.createObjectStore(STORE_REGIONS, { keyPath: 'id' });
        }
      };

      req.onsuccess = () => {
        this.db = req.result;
        resolve(req.result);
      };

      req.onerror = () => {
        console.error('IndexedDB open error:', req.error);
        reject(req.error);
      };
    });

    return this.isInitPromise;
  }

  // Get tile from cache or fetch & save
  async getTile(tileUrl: string): Promise<Blob | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_TILES, 'readonly');
        const store = tx.objectStore(STORE_TILES);
        const req = store.get(tileUrl);

        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            resolve(req.result.blob);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async saveTile(tileUrl: string, blob: Blob): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_TILES, 'readwrite');
      const store = tx.objectStore(STORE_TILES);
      store.put({ key: tileUrl, blob, timestamp: Date.now() });
    } catch (e) {
      console.warn('Erro ao salvar tile no cache:', e);
    }
  }

  async getCachedTilesCount(): Promise<number> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_TILES, 'readonly');
        const store = tx.objectStore(STORE_TILES);
        const countReq = store.count();
        countReq.onsuccess = () => resolve(countReq.result || 0);
        countReq.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }

  async clearAllTiles(): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction([STORE_TILES, STORE_REGIONS], 'readwrite');
      tx.objectStore(STORE_TILES).clear();
      tx.objectStore(STORE_REGIONS).clear();
    } catch (e) {
      console.warn('Erro ao limpar cache offline:', e);
    }
  }

  // Calculate tiles for a lat/lng bounding box at zoom levels
  getTilesForBounds(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    zooms: number[]
  ): { x: number; y: number; z: number; url: string }[] {
    const tiles: { x: number; y: number; z: number; url: string }[] = [];

    const lat2tile = (lat: number, zoom: number) =>
      Math.floor(
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
          Math.pow(2, zoom)
      );

    const lon2tile = (lon: number, zoom: number) =>
      Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));

    for (const z of zooms) {
      const xMin = lon2tile(minLng, z);
      const xMax = lon2tile(maxLng, z);
      const yMin = lat2tile(maxLat, z);
      const yMax = lat2tile(minLat, z);

      for (let x = Math.min(xMin, xMax); x <= Math.max(xMin, xMax); x++) {
        for (let y = Math.min(yMin, yMax); y <= Math.max(yMin, yMax); y++) {
          const subdomains = ['a', 'b', 'c'];
          const s = subdomains[(x + y) % subdomains.length];
          const url = `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
          tiles.push({ x, y, z, url });
        }
      }
    }

    return tiles;
  }

  // Download whole region with progress callback
  async downloadRegion(
    region: OfflineRegion,
    onProgress: (progressPct: number, current: number, total: number) => void
  ): Promise<void> {
    const latDelta = region.radiusKm / 111.0;
    const lngDelta = region.radiusKm / (111.0 * Math.cos((region.centerLat * Math.PI) / 180));

    const minLat = region.centerLat - latDelta;
    const maxLat = region.centerLat + latDelta;
    const minLng = region.centerLng - lngDelta;
    const maxLng = region.centerLng + lngDelta;

    const tiles = this.getTilesForBounds(minLat, maxLat, minLng, maxLng, region.zoomLevels);
    const total = tiles.length;
    let completed = 0;
    let totalBytes = 0;

    // Download in concurrency chunks of 6
    const CHUNK_SIZE = 6;
    for (let i = 0; i < tiles.length; i += CHUNK_SIZE) {
      const chunk = tiles.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (tile) => {
          try {
            // Check if already in cache
            const existing = await this.getTile(tile.url);
            if (existing) {
              completed++;
              totalBytes += existing.size;
              onProgress(Math.round((completed / total) * 100), completed, total);
              return;
            }

            const res = await fetch(tile.url, { mode: 'cors' });
            if (res.ok) {
              const blob = await res.blob();
              totalBytes += blob.size;
              await this.saveTile(tile.url, blob);
            }
          } catch (e) {
            console.warn(`Erro no tile ${tile.url}:`, e);
          } finally {
            completed++;
            onProgress(Math.round((completed / total) * 100), completed, total);
          }
        })
      );
    }

    // Save region entry
    const db = await this.initDB();
    const tx = db.transaction(STORE_REGIONS, 'readwrite');
    const store = tx.objectStore(STORE_REGIONS);
    store.put({
      ...region,
      tilesCount: completed,
      sizeBytes: totalBytes,
      downloadedAt: Date.now(),
      status: 'ready',
    });
  }

  async getDownloadedRegions(): Promise<OfflineRegion[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_REGIONS, 'readonly');
        const store = tx.objectStore(STORE_REGIONS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }
}

export const offlineMapManager = new OfflineMapManager();
