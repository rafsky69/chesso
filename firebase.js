import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
  apiKey: 'AIzaSyCHs3YRchMn6SLb9BvS1YCt8CCJIY9I-OQ',
  authDomain: 'chesso-7bb56.firebaseapp.com',
  projectId: 'chesso-7bb56',
  storageBucket: 'chesso-7bb56.firebasestorage.app',
  messagingSenderId: '197752461435',
  appId: '1:197752461435:web:fc31bbda94aec4175f2ade'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let firebaseReadyResolve;
export const firebaseReady = new Promise(resolve => {
  firebaseReadyResolve = resolve;
});

onAuthStateChanged(auth, (user) => {
  firebaseReadyResolve(user);
});

import { setDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

export async function signup(email, password, username) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', user.uid), {
    username,
    email,
    createdAt: serverTimestamp()
  });
  return user;
}

export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export function logout() {
  return signOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
