// Firebase connection for Chesso.
// The Firebase Web App config is safe to include in client-side code.
// Keep private service-account keys, passwords, and other secrets out of this file.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

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

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  await signInAnonymously(auth);
  firebaseReady = true;
} catch (error) {
  console.error('Firebase setup failed:', error);
}

export const configured = true;
