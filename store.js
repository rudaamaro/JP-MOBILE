// store.js
import { db } from './firebase-config.js';
import {
  collection, doc, getDocs, writeBatch, deleteDoc,
  getDoc, setDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const CACHE_PREFIX = 'romajiDeck_cache_';

// ---------------------------
// Leitura
// ---------------------------
export async function loadUserDeck(uid){
  try{
    const colRef = collection(db, `users/${uid}/decks/default/cards`);
    const snap = await getDocs(colRef);
    const deck = [];
    snap.forEach(d => deck.push(d.data()));
    localStorage.setItem(`${CACHE_PREFIX}${uid}`, JSON.stringify(deck));
    return deck;
  }catch(e){
    try{
      const cached = JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${uid}`));
      if(Array.isArray(cached)) return cached;
    }catch(_){}
    return [];
  }
}

// ---------------------------
// “Espelho” do deck inteiro (use só em seed/migração)
// ---------------------------
export async function saveUserDeck(uid, deck){
  const colRef = collection(db, `users/${uid}/decks/default/cards`);

  // ids atuais no Firestore
  const currentSnap = await getDocs(colRef);
  const toDelete = new Set(currentSnap.docs.map(d => d.id));

  // batch com chunk
  let batch = writeBatch(db);
  let ops = 0;
  async function flush(){
    await batch.commit();
    batch = writeBatch(db);
    ops = 0;
  }

  // upserts
  for(const card of deck){
    const id = String(card.id || `${Date.now()}-${Math.random()}`);
    const ref = doc(colRef, id);
    batch.set(ref, { ...card, id }, { merge:true }); ops++;
    toDelete.delete(id);
    if (ops >= 450) await flush();
  }

  // deletes
  for (const id of toDelete){
    batch.delete(doc(colRef, id)); ops++;
    if (ops >= 450) await flush();
  }

  await flush();
  localStorage.setItem(`${CACHE_PREFIX}${uid}`, JSON.stringify(deck));
}

// ---------------------------
// Escritas leves
// ---------------------------
export async function upsertCard(uid, card){
  const id = String(card.id || `${Date.now()}-${Math.random()}`);
  const ref = doc(db, `users/${uid}/decks/default/cards/${id}`);
  await setDoc(ref, { ...card, id }, { merge: true });
}

export async function upsertMany(uid, cards){
  if(!cards || !cards.length) return;
  let batch = writeBatch(db);
  let ops = 0;
  async function flush(){
    await batch.commit();
    batch = writeBatch(db);
    ops = 0;
  }
  for(const card of cards){
    const id = String(card.id || `${Date.now()}-${Math.random()}`);
    batch.set(doc(db, `users/${uid}/decks/default/cards/${id}`), { ...card, id }, { merge:true });
    ops++;
    if (ops >= 450) await flush();
  }
  await flush();
}

export async function deleteCard(uid, id){
  await deleteDoc(doc(db, `users/${uid}/decks/default/cards/${String(id)}`));
}

export async function deleteMany(uid, ids){
  if(!ids || !ids.length) return;
  let batch = writeBatch(db);
  let ops = 0;
  async function flush(){
    await batch.commit();
    batch = writeBatch(db);
    ops = 0;
  }
  for (const id of ids){
    batch.delete(doc(db, `users/${uid}/decks/default/cards/${String(id)}`));
    ops++;
    if (ops >= 450) await flush();
  }
  await flush();
}

// cache local do deck
export function cacheDeck(uid, deck){
  localStorage.setItem(`${CACHE_PREFIX}${uid}`, JSON.stringify(deck));
}

// ---------------------------
// Tombstones (para não reimportar do JSON)
// ---------------------------
export async function markDeletedRomaji(uid, romajiNorm){
  const metaRef = doc(db, `users/${uid}/meta/deleted`);
  await setDoc(metaRef, { romaji: arrayUnion(romajiNorm) }, { merge:true });
}

export async function markDeletedRomajiMany(uid, list){
  if(!list || !list.length) return;
  const metaRef = doc(db, `users/${uid}/meta/deleted`);
  await setDoc(metaRef, { romaji: arrayUnion(...list) }, { merge:true });
}

export async function getDeletedRomajiSet(uid){
  const metaRef = doc(db, `users/${uid}/meta/deleted`);
  const snap = await getDoc(metaRef);
  const arr = snap.exists() ? (snap.data().romaji || []) : [];
  return new Set(arr);
}

// ---------------------------
// Migração (1ª vez)
// ---------------------------
export async function migrateFromLocalStorage(uid){
  let deck = [];
  try{
    const raw = JSON.parse(localStorage.getItem('romajiDeck_v8'));
    if(Array.isArray(raw) && raw.length){
      await saveUserDeck(uid, raw);
      localStorage.removeItem('romajiDeck_v8');
      deck = raw;
    }
  }catch(_){}

  if(!deck.length){
    try{
      const cached = JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${uid}`));
      if(Array.isArray(cached)) deck = cached;
    }catch(_){}
  }
  return deck;
}
