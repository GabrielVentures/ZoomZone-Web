/**
 * Firebase Configuration - Production Environment
 * Initialize Firebase services for ShelfTagSnap Web Admin
 * Project: zoom-zone-6619c
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration - Production Environment
const firebaseConfig = {
  apiKey: "AIzaSyDo-f-tgX-gNJF5hgyDF_RiHwelYfdegU8",
  authDomain: "zoom-zone-6619c.firebaseapp.com",
  projectId: "zoom-zone-6619c",
  storageBucket: "zoom-zone-6619c.firebasestorage.app",
  messagingSenderId: "96055637685",
  appId: "1:96055637685:web:35b93bd2fa9c877ea6b0fc",
  measurementId: "G-H43KFJYF5P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Enable offline persistence for Firestore
// This allows the app to work offline and sync when connection is restored
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.warn('⚠️ Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The current browser doesn't support persistence
    console.warn('⚠️ Firestore persistence not supported in this browser');
  } else {
    console.error('❌ Failed to enable Firestore persistence:', err);
  }
});

export default app;
