import { doc, onSnapshot, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getFirebase } from './config.js';

// Read-only on the client. Balance changes only happen in Cloud Functions.
export function subscribeWallet(uid, onData, onError) {
  const { db } = getFirebase();
  return onSnapshot(
    doc(db, 'users', uid, 'wallet', 'main'),
    (snap) => onData(snap.exists() ? snap.data() : null),
    onError,
  );
}

export async function recentTransactions(uid, max = 20) {
  const { db } = getFirebase();
  const q = query(collection(db, 'users', uid, 'transactions'), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
