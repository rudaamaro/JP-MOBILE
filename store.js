// store.js  —  versão offline-first estável
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
const setUnsynced = () => { try{ localStorage.setItem('unsynced','1'); }catch(_){ } };
const clearUnsynced = () => { try{ localStorage.removeItem('unsynced'); }catch(_){ } };

const isQuotaError = e =>
  (e?.code === 'resource-exhausted') || /quota|exhausted|resource-exhausted/i.test(e?.message||'');

const byId = arr => { const m = new Map((arr||[]).map(c => [String(c.id), c])); return m; };

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
  let out = Array.isArray(deck) ? deck.slice() : [];
  if(deletes.length) out = out.filter(c => !deletes.includes(String(c.id)));
  if(upserts.length){
    const m = byId(out);
    upserts.forEach(c => m.set(String(c.id), c));
    out = [...m.values()];
  }
  return out;
}

// ===========================
// Leitura
// ===========================
export async function loadUserDeck(uid){
  // Se houve alterações locais, confie no cache (evita bater no Firestore na inicialização)
  const hasUnsynced = localStorage.getItem('unsynced') === '1';
  if(hasUnsynced){
    const deck = applyQueuesToDeck(uid, getCachedDeck(uid));
    return deck;
  }
  // Tenta buscar do Firestore; se falhar, volta ao cache
  try{
    const colRef = collection(db, `users/${uid}/decks/default/cards`);
    const snap = await getDocs(colRef);
    const deck = [];
    snap.forEach(d => deck.push(d.data()));
    const merged = applyQueuesToDeck(uid, deck);
    cacheDeck(uid, merged);
    return merged;
  }catch(_){
    const deck = applyQueuesToDeck(uid, getCachedDeck(uid));
    return deck;
  }
}

// ===========================
// “Espelho” do deck inteiro (seed/migração)
// ===========================
export async function saveUserDeck(uid, deck){
  const colRef = collection(db, `users/${uid}/decks/default/cards`);
  try{
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

    for(const card of (deck||[])){
      const id = String(card.id || `${Date.now()}-${Math.random()}`);
      const ref = doc(colRef, id);
      batch.set(ref, { ...card, id }, { merge:true });
      ops++; toDelete.delete(id);
      if (ops >= 450) await flush();
    }

    for (const id of toDelete){
      batch.delete(doc(colRef, id));
      ops++;
      if (ops >= 450) await flush();
    }

    await flush();
    cacheDeck(uid, deck||[]);
  }catch(e){
    // Fallback: joga tudo na fila de upsert; cacheia
    const q = readLS(Q_UPSERT+uid, []);
    const merged = [...byId([...q, ...(deck||[])]).values()];
    writeLS(Q_UPSERT+uid, merged);
    const qDel = readLS(Q_DELETE+uid, []);
    writeLS(Q_UPSERT+uid, merged.filter(c => !qDel.includes(String(c.id))));
    cacheDeck(uid, deck||[]);
    setUnsynced();
    if(!isQuotaError(e)) throw e;
  }
}

// ===========================
// Escritas leves (upsert/delete) com fila
// ===========================
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
    writeLS(Q_UPSERT+uid, []);  // sucesso -> limpa fila
  }catch(e){
    const remaining = all.slice(successCount);
    writeLS(Q_UPSERT+uid, remaining);
    setUnsynced();
    if(!isQuotaError(e)) throw e;
  }finally{
    // cache otimista
    const cached = getCachedDeck(uid);
    const m = byId(cached);
    all.forEach(c => m.set(String(c.id), c));
    cacheDeck(uid, [...m.values()]);
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
    setUnsynced();
    if(!isQuotaError(e)) throw e;
  }finally{
    // evita ressuscitar item deletado
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
export async function markDeletedRomajiMany(uid, list){
  if(!list || !list.length) return;
  try{
    const metaRef = doc(db, `users/${uid}/meta/deleted`);
    await setDoc(metaRef, { romaji: arrayUnion(...list) }, { merge:true });
  }catch(e){
    const q = readLS(Q_TOMBS+uid, []);
    const set = new Set([...q, ...list]);
    writeLS(Q_TOMBS+uid, [...set]);
    setUnsynced();
    if(!isQuotaError(e)) throw e;
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
// Drenar filas (chamar no boot, ao ficar online e no botão “Atualizar”)
// ===========================
export async function drainQueues(uid){
  const up = readLS(Q_UPSERT+uid, []);
  const del = readLS(Q_DELETE+uid, []);
  const tb = readLS(Q_TOMBS+uid, []);
  if(up.length) await upsertMany(uid, up);
  if(del.length) await deleteMany(uid, del);
  if(tb.length)  await markDeletedRomajiMany(uid, tb);
  const left = readLS(Q_UPSERT+uid, []).length + readLS(Q_DELETE+uid, []).length + readLS(Q_TOMBS+uid, []).length;
  if(left===0) clearUnsynced();
}
