// store.js
import { db } from './firebase-config.js';
import {
  collection, doc, getDocs, writeBatch, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const CACHE_PREFIX = 'romajiDeck_cache_';

export async function loadUserDeck(uid){
  try {
    const colRef = collection(db, `users/${uid}/decks/default/cards`);
    const snap = await getDocs(colRef);
    const deck = [];
    snap.forEach(d => deck.push(d.data()));
    localStorage.setItem(`${CACHE_PREFIX}${uid}`, JSON.stringify(deck));
    return deck;
  } catch (e) {
    // fallback em cache local (offline/primeiro boot)
    try {
      const cached = JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${uid}`));
      if (Array.isArray(cached)) return cached;
    } catch(_) {}
    return [];
  }
}

export async function saveUserDeck(uid, deck){
  const colRef = collection(db, `users/${uid}/decks/default/cards`);
  const batch = writeBatch(db);
  deck.forEach(card => {
    // garante id string
    const id = String(card.id || `${Date.now()}-${Math.random()}`);
    const ref = doc(colRef, id);
    batch.set(ref, { ...card, id }, { merge: true });
  });
  await batch.commit();
  localStorage.setItem(`${CACHE_PREFIX}${uid}`, JSON.stringify(deck));
}

export function watchUserDeck(uid, cb){
  const colRef = collection(db, `users/${uid}/decks/default/cards`);
  return onSnapshot(colRef, snap => {
    const deck = [];
    snap.forEach(d => deck.push(d.data()));
    localStorage.setItem(`${CACHE_PREFIX}${uid}`, JSON.stringify(deck));
    cb(deck);
  });
}

export async function migrateFromLocalStorage(uid){
  let deck = [];
  try{
    const raw = JSON.parse(localStorage.getItem('romajiDeck_v8'));
    if (Array.isArray(raw) && raw.length){
      await saveUserDeck(uid, raw);
      localStorage.removeItem('romajiDeck_v8');
      deck = raw;
    }
  } catch(_) {}

  if (!deck.length){
    try{
      const cached = JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${uid}`));
      if (Array.isArray(cached)) deck = cached;
    } catch(_) {}
  }
  return deck;
}
