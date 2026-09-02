// Firebase is intentionally configured separately from the chess engine.
// 1. Create a Firebase project.
// 2. Add a Web app.
// 3. Paste its config below.
// 4. Enable Authentication > Anonymous and Firestore Database.
// 5. Set Firestore rules using the example in README.md.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'PASTE_YOUR_API_KEY',
  authDomain: 'PASTE_YOUR_PROJECT.firebaseapp.com',
  projectId: 'PASTE_YOUR_PROJECT_ID',
  storageBucket: 'PASTE_YOUR_PROJECT.firebasestorage.app',
  messagingSenderId: 'PASTE_YOUR_SENDER_ID',
  appId: 'PASTE_YOUR_APP_ID'
};

const configured = !Object.values(firebaseConfig).some(value => value.includes('PASTE_YOUR'));

export let db = null;
export let auth = null;
export let firebaseReady = false;

if (configured) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    await signInAnonymously(auth);
    firebaseReady = true;
  } catch (error) {
    console.error('Firebase setup failed:', error);
  }
}

export { configured };
