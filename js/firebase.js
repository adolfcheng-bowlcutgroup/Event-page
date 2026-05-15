import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAgczU9stXCm4QWc2zh25SSjgMFdu7HGDs",
  authDomain: "event-page-30aea.firebaseapp.com",
  projectId: "event-page-30aea",
  storageBucket: "event-page-30aea.firebasestorage.app",
  messagingSenderId: "658004683036",
  appId: "1:658004683036:web:3cb5e28403062009ac72d9",
  measurementId: "G-G3G0KML7B8"
};

export const app = initializeApp(firebaseConfig);
export let analytics = null;

isAnalyticsSupported().then((supported) => {
  if (supported) analytics = getAnalytics(app);
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
  arrayUnion
};
