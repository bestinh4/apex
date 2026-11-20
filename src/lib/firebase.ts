import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  collection,
  query,
  where,
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  BetEntry,
  TreasuryEntry,
  FreebetEntry,
  FreeSpinEntry,
  AppSettings,
  BetStatus,
  BetFundType,
  TreasuryType
} from '../types';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

// Helpers
export function sanitizeFirestoreId(rawId?: string): string {
  if (rawId) {
    const cleaned = String(rawId)
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 128);
    if (cleaned.length >= 1) return cleaned;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const clampStr = (val: unknown, fallback: string, maxLen: number): string => {
  const str = val === undefined || val === null ? '' : String(val).trim();
  const clean = !str || str === 'undefined' || str === 'null' ? fallback : str;
  return clean.slice(0, maxLen);
};

const safeNum = (val: unknown, fallback = 0): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const ALLOWED_BET_TYPES: BetFundType[] = ['Saldo Real', 'Freebet', 'Bônus Rollover'];
const ALLOWED_BET_STATUSES: BetStatus[] = [
  'GREEN',
  'RED',
  'HALF_GREEN',
  'HALF_RED',
  'VOID',
  'CASHOUT',
  'PENDENTE'
];
const ALLOWED_TREASURY_TYPES: TreasuryType[] = ['DEPOSIT', 'WITHDRAW', 'BONUS'];
const ALLOWED_TREASURY_STATUSES: TreasuryEntry['status'][] = ['Compensado', 'Pendente', 'Processando'];
const ALLOWED_FREEBET_STATUSES: FreebetEntry['status'][] = [
  'Ao Vivo',
  'Creditado',
  'Pendente',
  'Expirado'
];

export function timestampToMillis(ts: unknown): number {
  if (ts instanceof Timestamp) return ts.toMillis();
  if (ts && typeof (ts as { toMillis?: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await firebaseSignOut(auth);
}

export function buildUserProfilePayload(
  user: User,
  settings: AppSettings,
  isCreate: boolean
) {
  const base = {
    uid: sanitizeFirestoreId(user.uid),
    email: clampStr(user.email, 'usuario@google.com', 256),
    name: clampStr(user.displayName || user.email?.split('@')[0], 'Apostador', 120),
    initialBankroll: Math.max(0, safeNum(settings.initialBankroll, 1000)),
    unitValue: Math.max(0.01, safeNum(settings.unitValue, 25)),
    kellyFraction: clampStr(settings.kellyFraction, '1/4 Kelly (Conservador)', 120),
    maxDrawdownLimitPct: Math.max(0, safeNum(settings.maxDrawdownLimitPct, 25)),
    monthlyTargetPct: Math.max(0, safeNum(settings.monthlyTargetPct, 30)),
    updatedAt: serverTimestamp()
  };

  if (isCreate) {
    return {
      ...base,
      createdAt: serverTimestamp()
    };
  }
  return base;
}

export async function ensureUserProfileDoc(
  user: User,
  localSettings: AppSettings
): Promise<Partial<AppSettings> | null> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, buildUserProfilePayload(user, localSettings, true));
      return null;
    }
    const data = snap.data();
    return {
      initialBankroll: safeNum(data.initialBankroll, localSettings.initialBankroll),
      unitValue: Math.max(0.01, safeNum(data.unitValue, localSettings.unitValue)),
      kellyFraction: clampStr(data.kellyFraction, localSettings.kellyFraction, 120),
      maxDrawdownLimitPct: safeNum(data.maxDrawdownLimitPct, localSettings.maxDrawdownLimitPct),
      monthlyTargetPct: safeNum(data.monthlyTargetPct, localSettings.monthlyTargetPct)
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateUserProfileSettings(
  user: User,
  settings: AppSettings
): Promise<void> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    await updateDoc(userRef, {
      email: clampStr(user.email, 'usuario@google.com', 256),
      name: clampStr(user.displayName || user.email?.split('@')[0], 'Apostador', 120),
      initialBankroll: Math.max(0, safeNum(settings.initialBankroll, 1000)),
      unitValue: Math.max(0.01, safeNum(settings.unitValue, 25)),
      kellyFraction: clampStr(settings.kellyFraction, '1/4 Kelly (Conservador)', 120),
      maxDrawdownLimitPct: Math.max(0, safeNum(settings.maxDrawdownLimitPct, 25)),
      monthlyTargetPct: Math.max(0, safeNum(settings.monthlyTargetPct, 30)),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

function serializeBetForCreate(bet: BetEntry, uid: string) {
  const type: BetFundType = ALLOWED_BET_TYPES.includes(bet.type) ? bet.type : 'Saldo Real';
  const status: BetStatus = ALLOWED_BET_STATUSES.includes(bet.status) ? bet.status : 'PENDENTE';
  const payload: Record<string, unknown> = {
    userId: uid,
    date: clampStr(bet.date, new Date().toLocaleDateString('pt-BR'), 40),
    sport: clampStr(bet.sport, 'Futebol', 80),
    event: clampStr(bet.event, 'Evento Esportivo', 200),
    market: clampStr(bet.market, 'Mercado Principal', 200),
    odd: Math.max(1, safeNum(bet.odd, 1)),
    stake: Math.max(0, safeNum(bet.stake, 0)),
    units: Math.max(0, safeNum(bet.units, 0)),
    type,
    status,
    gross: safeNum(bet.gross, 0),
    pl: safeNum(bet.pl, 0),
    bookmaker: clampStr(bet.bookmaker, '1win', 80),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (bet.closingOdd !== undefined && Number.isFinite(Number(bet.closingOdd)) && Number(bet.closingOdd) >= 1) {
    payload.closingOdd = Number(bet.closingOdd);
  }
  return payload;
}

function serializeTreasuryForCreate(tx: TreasuryEntry, uid: string) {
  const type: TreasuryType = ALLOWED_TREASURY_TYPES.includes(tx.type) ? tx.type : 'DEPOSIT';
  const status = ALLOWED_TREASURY_STATUSES.includes(tx.status) ? tx.status : 'Compensado';
  const payload: Record<string, unknown> = {
    userId: uid,
    date: clampStr(tx.date, new Date().toLocaleDateString('pt-BR'), 40),
    type,
    desc: clampStr(tx.desc, 'Movimentação', 200),
    amount: Math.max(0, safeNum(tx.amount, 0)),
    status,
    createdAt: serverTimestamp()
  };
  if (tx.details && String(tx.details).trim()) {
    payload.details = clampStr(tx.details, '', 300);
  }
  return payload;
}

function serializeFreebetForCreate(fb: FreebetEntry, uid: string) {
  const status = ALLOWED_FREEBET_STATUSES.includes(fb.status) ? fb.status : 'Pendente';
  return {
    userId: uid,
    bookmaker: clampStr(fb.bookmaker, '1win', 80),
    event: clampStr(fb.event, 'Evento Promocional', 200),
    selection: clampStr(fb.selection, 'Seleção', 200),
    bonusAmount: Math.max(0, safeNum(fb.bonusAmount, 0)),
    odd: Math.max(1, safeNum(fb.odd, 1)),
    netReturn: safeNum(fb.netReturn, 0),
    status,
    date: clampStr(fb.date, new Date().toLocaleDateString('pt-BR'), 40),
    createdAt: serverTimestamp()
  };
}

function serializeFreeSpinForCreate(spin: FreeSpinEntry, uid: string) {
  return {
    userId: uid,
    provider: clampStr(spin.provider, 'Pragmatic Play', 100),
    game: clampStr(spin.game, 'Slot', 150),
    bookmaker: clampStr(spin.bookmaker, '1win', 80),
    spinsCount: Math.max(0, safeNum(spin.spinsCount, 0)),
    netProfit: safeNum(spin.netProfit, 0),
    date: clampStr(spin.date, new Date().toLocaleDateString('pt-BR'), 40),
    createdAt: serverTimestamp()
  };
}

export async function createBetInFirestore(bet: BetEntry, uid: string): Promise<void> {
  const docId = sanitizeFirestoreId(bet.id);
  const path = `users/${uid}/bets/${docId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'bets', docId), serializeBetForCreate(bet, uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBetInFirestore(bet: BetEntry, uid: string): Promise<void> {
  const docId = sanitizeFirestoreId(bet.id);
  const path = `users/${uid}/bets/${docId}`;
  const type: BetFundType = ALLOWED_BET_TYPES.includes(bet.type) ? bet.type : 'Saldo Real';
  const status: BetStatus = ALLOWED_BET_STATUSES.includes(bet.status) ? bet.status : 'PENDENTE';
  try {
    const updatePayload: Record<string, unknown> = {
      date: clampStr(bet.date, new Date().toLocaleDateString('pt-BR'), 40),
      sport: clampStr(bet.sport, 'Futebol', 80),
      event: clampStr(bet.event, 'Evento Esportivo', 200),
      market: clampStr(bet.market, 'Mercado Principal', 200),
      odd: Math.max(1, safeNum(bet.odd, 1)),
      stake: Math.max(0, safeNum(bet.stake, 0)),
      units: Math.max(0, safeNum(bet.units, 0)),
      type,
      status,
      gross: safeNum(bet.gross, 0),
      pl: safeNum(bet.pl, 0),
      bookmaker: clampStr(bet.bookmaker, '1win', 80),
      closingOdd:
        bet.closingOdd !== undefined &&
        Number.isFinite(Number(bet.closingOdd)) &&
        Number(bet.closingOdd) >= 1
          ? Number(bet.closingOdd)
          : deleteField(),
      updatedAt: serverTimestamp()
    };
    await updateDoc(doc(db, 'users', uid, 'bets', docId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBetInFirestore(betId: string, uid: string): Promise<void> {
  const docId = sanitizeFirestoreId(betId);
  const path = `users/${uid}/bets/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'bets', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createTreasuryInFirestore(tx: TreasuryEntry, uid: string): Promise<void> {
  const docId = sanitizeFirestoreId(tx.id);
  const path = `users/${uid}/treasury/${docId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'treasury', docId), serializeTreasuryForCreate(tx, uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteTreasuryInFirestore(txId: string, uid: string): Promise<void> {
  const docId = sanitizeFirestoreId(txId);
  const path = `users/${uid}/treasury/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'treasury', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createFreebetInFirestore(fb: FreebetEntry, uid: string): Promise<void> {
  const docId = sanitizeFirestoreId(fb.id);
  const path = `users/${uid}/freebets/${docId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'freebets', docId), serializeFreebetForCreate(fb, uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFreebetStatusInFirestore(
  fbId: string,
  status: FreebetEntry['status'],
  uid: string
): Promise<void> {
  const docId = sanitizeFirestoreId(fbId);
  const path = `users/${uid}/freebets/${docId}`;
  const validStatus = ALLOWED_FREEBET_STATUSES.includes(status) ? status : 'Pendente';
  try {
    await updateDoc(doc(db, 'users', uid, 'freebets', docId), { status: validStatus });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFreebetInFirestore(fbId: string, uid: string): Promise<void> {
  const docId = sanitizeFirestoreId(fbId);
  const path = `users/${uid}/freebets/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'freebets', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createFreeSpinInFirestore(spin: FreeSpinEntry, uid: string): Promise<void> {
  const docId = sanitizeFirestoreId(spin.id);
  const path = `users/${uid}/free_spins/${docId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'free_spins', docId), serializeFreeSpinForCreate(spin, uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteFreeSpinInFirestore(spinId: string, uid: string): Promise<void> {
  const docId = sanitizeFirestoreId(spinId);
  const path = `users/${uid}/free_spins/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'free_spins', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function hasAnyCloudRecords(uid: string): Promise<boolean> {
  const subcollections = ['bets', 'treasury', 'freebets', 'free_spins'] as const;
  for (const sub of subcollections) {
    const path = `users/${uid}/${sub}`;
    try {
      const q = query(collection(db, 'users', uid, sub), where('userId', '==', uid), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }
  return false;
}

async function commitOperationsInChunks(
  operations: Array<(batch: ReturnType<typeof writeBatch>) => void>,
  path: string
) {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((op) => op(batch));
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function pushAllStateToFirestore(
  user: User,
  state: {
    bets: BetEntry[];
    treasury: TreasuryEntry[];
    freebets: FreebetEntry[];
    freeSpins: FreeSpinEntry[];
    settings: AppSettings;
  },
  clearExisting = false
): Promise<void> {
  const uid = user.uid;
  await ensureUserProfileDoc(user, state.settings);
  await updateUserProfileSettings(user, state.settings);

  if (clearExisting) {
    await clearAllUserSubcollectionsInFirestore(uid);
  }

  const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  state.bets.forEach((bet) => {
    const docId = sanitizeFirestoreId(bet.id);
    const ref = doc(db, 'users', uid, 'bets', docId);
    ops.push((batch) => batch.set(ref, serializeBetForCreate(bet, uid)));
  });

  state.treasury.forEach((tx) => {
    const docId = sanitizeFirestoreId(tx.id);
    const ref = doc(db, 'users', uid, 'treasury', docId);
    ops.push((batch) => batch.set(ref, serializeTreasuryForCreate(tx, uid)));
  });

  state.freebets.forEach((fb) => {
    const docId = sanitizeFirestoreId(fb.id);
    const ref = doc(db, 'users', uid, 'freebets', docId);
    ops.push((batch) => batch.set(ref, serializeFreebetForCreate(fb, uid)));
  });

  state.freeSpins.forEach((spin) => {
    const docId = sanitizeFirestoreId(spin.id);
    const ref = doc(db, 'users', uid, 'free_spins', docId);
    ops.push((batch) => batch.set(ref, serializeFreeSpinForCreate(spin, uid)));
  });

  if (ops.length > 0) {
    await commitOperationsInChunks(ops, `users/${uid}`);
  }
}

export async function clearAllUserSubcollectionsInFirestore(uid: string): Promise<void> {
  const subcollections = ['bets', 'treasury', 'freebets', 'free_spins'] as const;
  const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  for (const sub of subcollections) {
    const path = `users/${uid}/${sub}`;
    try {
      const q = query(collection(db, 'users', uid, sub), where('userId', '==', uid));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        ops.push((batch) => batch.delete(d.ref));
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  if (ops.length > 0) {
    await commitOperationsInChunks(ops, `users/${uid}`);
  }
}
