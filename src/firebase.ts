import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firebase persistence warning: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firebase persistence not supported by browser');
  }
});

export const carDocRef = doc(db, 'telemetry', 'my-clio');

