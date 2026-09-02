// Firebase connection and account helpers for Chesso.
// The Firebase Web App config is safe to include in client-side code.
// Never put service-account private keys, passwords, or access tokens here.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCHs3YRchMn6SLb9BvS1YCt8CCJIY9I-OQ',
  authDomain: 'chesso-7bb56.firebaseapp.com',
  projectId: 'chesso-7bb56',
  storageBucket: 'chesso-7bb56.firebasestorage.app',
  messagingSenderId: '197752461435',
  appId: '1:197752461435:web:fc31bbda94aec4175f2ade'
};

export let db = null;
export let auth = null;
export let firebaseReady = false;
export let currentUser = null;

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseReady = true;
} catch (error) {
  console.error('Firebase setup failed:', error);
}

export const authReady = new Promise((resolve) => {
  if (!auth) {
    resolve(null);
    return;
  }

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    resolve(user);
  });
});

export function watchAuth(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

export async function register(email, password, username) {
  if (!auth || !db) throw new Error('Firebase is not configured.');

  const cleanUsername = username.trim();
  if (!cleanUsername) throw new Error('Choose a username.');

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

  await updateProfile(credential.user, { displayName: cleanUsername });
  await setDoc(doc(db, 'users', credential.user.uid), {
    username: cleanUsername,
    email: credential.user.email,
    createdAt: serverTimestamp()
  });

  currentUser = credential.user;
  return credential.user;
}

export async function login(email, password) {
  if (!auth) throw new Error('Firebase is not configured.');
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  currentUser = credential.user;
  return credential.user;
}

export async function logout() {
  if (!auth) return;
  await signOut(auth);
  currentUser = null;
}

export async function getUserProfile(uid) {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data() : null;
}
