const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const isCloudSyncedState = `
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  // Sync with Cloud on mount
  useEffect(() => {
    const syncCloud = async () => {
      try {
        const docSnap = await getDoc(carDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.carConfig) setCarConfig(data.carConfig);
          if (data.activeTripKey) setActiveTripKey(data.activeTripKey);
          if (data.trips) setTrips(data.trips);
          if (data.mode && data.mode !== 'pending') setMode(data.mode);
        }
      } catch (err) {
        console.error("Error fetching from Firebase", err);
      } finally {
        setIsCloudSynced(true);
      }
    };
    syncCloud();
  }, []);
`;

content = content.replace(
  "  const [prevSpeed, setPrevSpeed] = useState<number>(0);",
  isCloudSyncedState + "\n  const [prevSpeed, setPrevSpeed] = useState<number>(0);"
);

const oldSaveEffect = `  // Save telemetry state to localStorage cache whenever changed
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
  }, [carConfig, activeTripKey, trips, mode]);`;

const newSaveEffect = `  // Save telemetry state to localStorage AND Firebase whenever changed
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
  }, [carConfig, activeTripKey, trips, mode, isCloudSynced]);`;

content = content.replace(oldSaveEffect, newSaveEffect);
fs.writeFileSync('src/App.tsx', content);
