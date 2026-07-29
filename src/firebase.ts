import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, doc, onSnapshot, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAxFmQtAjWqNoXpcGRnmAA_ouXsgw3RvT8",
  authDomain: "meus-apps---cerebro.firebaseapp.com",
  projectId: "meus-apps---cerebro",
  storageBucket: "meus-apps---cerebro.firebasestorage.app",
  messagingSenderId: "980266889768",
  appId: "1:980266889768:web:123d0e4b8f42dc61a53b1d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
    console.warn('Firebase persistence failed: multiple tabs open');
  } else if (err.code == 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn('Firebase persistence not supported by browser');
  }
});

export const carDocRef = doc(db, 'telemetry', 'my-clio');
