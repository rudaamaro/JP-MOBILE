// store.js
import { db } from './firebase-config.js';
import {
  collection, doc, getDocs, writeBatch, deleteDoc,
  getDoc, setDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const CACHE_PREFIX = 'romajiDeck_cache_';
const Q_UPSERT = 'romajiDeck_q_upserts_';
const Q_DELETE = 'romajiDeck_q_deletes_';
const Q_TOMBS  = 'romajiDeck_q_tombs_';

// ===== util =====
const readLS = (k, d=[]) => { try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }catch(_){ return d; } };
const writeLS = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){ /* noop */ } };
const isQuotaError = e => (e?.code === 'resource-exhausted') || /quota|exhausted|resource-exhausted/i.test(e?.message||'');
const byId = arr => { const m = new Map(arr.map(c => [String(c.id), c])); return m; };

function getCachedDeck(uid){ return readLS(CACHE_PREFIX+uid, []); }
export function cacheDeck(uid, deck){ writeLS(CACHE_PREFIX+uid, deck); }

function getQueues(uid){
  return {
    upserts: readLS(Q_UPSERT+uid, []),
    deletes: readLS(Q_DELETE+uid, []),
    tombs:   readLS(Q_TOMBS+uid, [])
  };
}
function applyQueuesToDeck(uid, deck){
  const {upserts, deletes} = getQueues(uid);
  if(deletes.length) deck = deck.filter(c => !deletes.includes(String(c.id)));
  if(upserts.length){
    const map = byId(deck);
    upserts.forEach(c => map.set(String(c.id), c));
    deck = [...map.values()];
  }
  return deck;
}

// ===========================
// Leitura
// ===========================
export async function loadUserDeck(uid){
  const hasUnsynced = localStorage.getItem('unsynced') === '1';
  if(hasUnsynced){
    let deck = getCachedDeck(uid);
    return applyQueuesToDeck(uid, deck);
  }
  try{
    const colRef = collection(db, `users/${uid}/decks/default/cards`);
    const snap = await getDocs(colRef);
    const deck = [];
    snap.forEach(d => deck.push(d.data()));
    const merged = applyQueuesToDeck(uid, deck); // preserva alterações locais
    cacheDeck(uid, merged);
    return merged;
  }catch(_e){
    let deck = getCachedDeck(uid);
    return applyQueuesToDeck(uid, deck);
  }
}

// ===========================
// “Espelho” do deck inteiro (seed/migração)
// ===========================
export async function saveUserDeck(uid, deck){
  const colRef = collection(db, `users/${uid}/decks/default/cards`);

  const currentSnap = await getDocs(colRef);
  const toDelete = new Set(currentSnap.docs.map(d => d.id));

  let batch = writeBatch(db);
  let ops = 0;
  async function flush(){
    if(ops===0) return;
    await batch.commit();
    batch = writeBatch(db);
    ops = 0;
  }

  for(const card of deck){
    const id = String(card.id || `${Date.now()}-${Math.random()}`);
    const ref = doc(colRef, id);
    batch.set(ref, { ...card, id }, { merge:true }); ops++;
    toDelete.delete(id);
    if (ops >= 450) await flush();
  }

  for (const id of toDelete){
    batch.delete(doc(colRef, id)); ops++;
    if (ops >= 450) await flush();
  }

  await flush();
  cacheDeck(uid, deck);
}

// ===========================
// Escritas leves
// ===========================
export async function upsertCard(uid, card){
  try{
    const id = String(card.id || `${Date.now()}-${Math.random()}`);
    const ref = doc(db, `users/${uid}/decks/default/cards/${id}`);
    await setDoc(ref, { ...card, id }, { merge: true });
    // remove da fila se estava lá
    const q = readLS(Q_UPSERT+uid, []);
    writeLS(Q_UPSERT+uid, q.filter(c => String(c.id)!==id));
  }catch(e){
    if(isQuotaError(e) || navigator.onLine===false){
      const id = String(card.id || `${Date.now()}-${Math.random()}`);
      const q = readLS(Q_UPSERT+uid, []);
      const merged = [...q.filter(c => String(c.id)!==id), { ...card, id }];
      writeLS(Q_UPSERT+uid, merged);
      localStorage.setItem('unsynced','1');
      return;
    }
    throw e;
  }
}

export async function upsertMany(uid, cards){
  if(!cards || !cards.length) return;

  // junta com a fila local (dedup por id)
  const queued = readLS(Q_UPSERT+uid, []);
  const map = new Map();
  [...queued, ...cards].forEach(c => {
    const id = String(c.id || `${Date.now()}-${Math.random()}`);
    map.set(id, { ...c, id });
  });
  const all = [...map.values()];

  let successCount = 0;
  try{
    for(let i=0; i<all.length; i+=450){
      const chunk = all.slice(i, i+450);
      let batch = writeBatch(db);
      chunk.forEach(card => {
        const id = String(card.id);
        batch.set(doc(db, `users/${uid}/decks/default/cards/${id}`), { ...card, id }, { merge:true });
      });
      await batch.commit();
      successCount += chunk.length;
    }
    // deu boa: limpa fila
    writeLS(Q_UPSERT+uid, []);
  }catch(e){
    // mantém o restante na fila
    const remaining = all.slice(successCount);
    writeLS(Q_UPSERT+uid, remaining);
    localStorage.setItem('unsynced','1');
    if(!isQuotaError(e)) throw e;
    const err = new Error('resource-exhausted'); err.code = 'resource-exhausted'; throw err;
  }finally{
    // cache otimista
    const cached = getCachedDeck(uid);
    const m = byId(cached);
    all.forEach(c => m.set(String(c.id), c));
    cacheDeck(uid, [...m.values()]);
  }
}

export async function deleteCard(uid, id){
  id = String(id);
  try{
    await deleteDoc(doc(db, `users/${uid}/decks/default/cards/${id}`));
    // e remove de um possível upsert pendente
    const q = readLS(Q_UPSERT+uid, []);
    writeLS(Q_UPSERT+uid, q.filter(c => String(c.id)!==id));
  }catch(e){
    if(isQuotaError(e) || navigator.onLine===false){
      const qd = readLS(Q_DELETE+uid, []);
      if(!qd.includes(id)) qd.push(id);
      writeLS(Q_DELETE+uid, qd);
      localStorage.setItem('unsynced','1');
      return;
    }
    throw e;
  }finally{
    // cache
    const cached = getCachedDeck(uid).filter(c => String(c.id)!==id);
    cacheDeck(uid, cached);
  }
}

export async function deleteMany(uid, ids){
  if(!ids || !ids.length) return;

  const queued = readLS(Q_DELETE+uid, []);
  const set = new Set([...queued, ...ids.map(String)]);
  const all = [...set];

  let successCount = 0;
  try{
    for(let i=0; i<all.length; i+=450){
      const chunk = all.slice(i, i+450);
      let batch = writeBatch(db);
      chunk.forEach(id => batch.delete(doc(db, `users/${uid}/decks/default/cards/${String(id)}`)));
      await batch.commit();
      successCount += chunk.length;
    }
    writeLS(Q_DELETE+uid, []);
  }catch(e){
    const remaining = all.slice(successCount);
    writeLS(Q_DELETE+uid, remaining);
    localStorage.setItem('unsynced','1');
    if(!isQuotaError(e)) throw e;
    const err = new Error('resource-exhausted'); err.code = 'resource-exhausted'; throw err;
  }finally{
    // garante que um delete não seja "ressuscitado" por um upsert pendente
    const upQ = readLS(Q_UPSERT+uid, []);
    writeLS(Q_UPSERT+uid, upQ.filter(c => !all.includes(String(c.id))));
    // cache
    const cached = getCachedDeck(uid).filter(c => !all.includes(String(c.id)));
    cacheDeck(uid, cached);
  }
}

// ===========================
// Tombstones (para não reimportar do JSON)
// ===========================
export async function markDeletedRomaji(uid, romajiNorm){
  try{
    const metaRef = doc(db, `users/${uid}/meta/deleted`);
    await setDoc(metaRef, { romaji: arrayUnion(romajiNorm) }, { merge:true });
  }catch(e){
    if(isQuotaError(e) || navigator.onLine===false){
      const q = readLS(Q_TOMBS+uid, []);
      if(!q.includes(romajiNorm)) q.push(romajiNorm);
      writeLS(Q_TOMBS+uid, q);
      localStorage.setItem('unsynced','1');
      return;
    }
    throw e;
  }
}

export async function markDeletedRomajiMany(uid, list){
  if(!list || !list.length) return;
  try{
    const metaRef = doc(db, `users/${uid}/meta/deleted`);
    await setDoc(metaRef, { romaji: arrayUnion(...list) }, { merge:true });
  }catch(e){
    if(isQuotaError(e) || navigator.onLine===false){
      const q = readLS(Q_TOMBS+uid, []);
      const set = new Set([...q, ...list]);
      writeLS(Q_TOMBS+uid, [...set]);
      localStorage.setItem('unsynced','1');
      return;
    }
    throw e;
  }
}

export async function getDeletedRomajiSet(uid){
  try{
    const metaRef = doc(db, `users/${uid}/meta/deleted`);
    const snap = await getDoc(metaRef);
    const arr = snap.exists() ? (snap.data().romaji || []) : [];
    const pend = readLS(Q_TOMBS+uid, []);
    return new Set([...arr, ...pend]);
  }catch(_){
    return new Set(readLS(Q_TOMBS+uid, []));
  }
}

// ===========================
// Migração (1ª vez)
// ===========================
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
    const cached = getCachedDeck(uid);
    if(Array.isArray(cached)) deck = cached;
  }
  return deck;
}

// ===========================
// (Opcional) tentar drenar as filas
// ===========================
export async function drainQueues(uid){
  const up = JSON.parse(localStorage.getItem('romajiDeck_q_upserts_'+uid) || '[]');
  const del = JSON.parse(localStorage.getItem('romajiDeck_q_deletes_'+uid) || '[]');
  const tb  = JSON.parse(localStorage.getItem('romajiDeck_q_tombs_'+uid)  || '[]');
  if(up.length) await upsertMany(uid, up);
  if(del.length) await deleteMany(uid, del);
  if(tb.length)  await markDeletedRomajiMany(uid, tb);
  const left =
    (JSON.parse(localStorage.getItem('romajiDeck_q_upserts_'+uid) || '[]').length) +
    (JSON.parse(localStorage.getItem('romajiDeck_q_deletes_'+uid) || '[]').length) +
    (JSON.parse(localStorage.getItem('romajiDeck_q_tombs_'+uid)  || '[]').length);
  if(left===0) try{ localStorage.removeItem('unsynced'); }catch(_){ }
}
