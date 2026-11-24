import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode
} from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import {
  BetEntry,
  BetDateRecoveryCandidate,
  TreasuryEntry,
  FreebetEntry,
  FreeSpinEntry,
  PromoConversionEntry,
  AppSettings,
  BetStatus
} from '../types';
import {
  initialBets,
  initialTreasury,
  initialFreebets,
  initialFreeSpins,
  initialPromoConversions,
  demoBets,
  demoTreasury,
  demoFreebets,
  demoFreeSpins,
  defaultSettings
} from '../data/initialData';
import {
  auth,
  db,
  signInWithGooglePopup,
  signOutFirebase,
  ensureUserProfileDoc,
  updateUserProfileSettings,
  createBetInFirestore,
  previewBetDateRecoveryInFirestore,
  applyBetDateRecoveryInFirestore,
  updateBetInFirestore,
  deleteBetInFirestore,
  createTreasuryInFirestore,
  updateTreasuryStatusInFirestore,
  deleteTreasuryInFirestore,
  createFreebetInFirestore,
  updateFreebetInFirestore,
  deleteFreebetInFirestore,
  createFreeSpinInFirestore,
  deleteFreeSpinInFirestore,
  createPromoConversionInFirestore,
  deletePromoConversionInFirestore,
  hasAnyCloudRecords,
  pushAllStateToFirestore,
  clearAllUserSubcollectionsInFirestore,
  sanitizeFirestoreId,
  timestampToMillis
} from '../lib/firebase';
import {
  getCurrentSession,
  getOrCreateDefaultSession,
  DEFAULT_USER,
  localLogin,
  localRegister,
  localResetPassword,
  localSignOut
} from '../lib/localAuth';
import {
  TURNOVER_POLICY_DOC,
  calculateBetSettlement,
  calculateFreebetRealizedReturn,
  computeFinancialMetrics,
  deduplicateFreeSpins,
  deduplicatePromoConversions,
  finiteNumber,
  findLinkedBetForFreebet,
  findLinkedFreebetForBet,
  mapBetStatusToFreebetStatus,
  mapFreebetStatusToBetStatus,
  normalizeBetEntry,
  normalizeFreebetEntry,
  PromoConversionRequest,
  roundCurrency,
  validatePromoConversion
} from '../lib/financialEngine';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
}

export type CloudSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

export interface PromoConversionActionResult {
  success: boolean;
  error?: string;
  entry?: PromoConversionEntry;
}

interface BankrollContextType {
  currentUser: AuthUser | null;
  authLoading: boolean;
  isCloudAuthenticated: boolean;
  cloudSyncStatus: CloudSyncStatus;
  cloudSyncError: string | null;
  unauthorizedDomain: string | null;
  lastSyncedAt: Date | null;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  uploadLocalToCloud: () => Promise<boolean>;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  signOut: () => Promise<void>;
  bets: BetEntry[];
  treasury: TreasuryEntry[];
  freebets: FreebetEntry[];
  freeSpins: FreeSpinEntry[];
  promoConversions: PromoConversionEntry[];
  settings: AppSettings;
  addBet: (bet: Omit<BetEntry, 'id' | 'gross' | 'pl'> & { gross?: number; pl?: number }) => BetEntry;
  updateBet: (id: string, updated: Partial<BetEntry>) => void;
  deleteBet: (id: string) => void;
  resolveBet: (id: string, status: BetStatus, cashoutReturn?: number) => void;
  addTreasury: (tx: Omit<TreasuryEntry, 'id'>) => void;
  updateTreasuryStatus: (id: string, status: TreasuryEntry['status']) => void;
  deleteTreasury: (id: string) => void;
  addFreebet: (
    fb: Omit<FreebetEntry, 'id' | 'netReturn'> & { netReturn?: number },
    options?: { syncToLedger?: boolean; sport?: string }
  ) => FreebetEntry;
  updateFreebetStatus: (
    id: string,
    status: FreebetEntry['status'],
    explicitSettledPl?: number
  ) => void;
  deleteFreebet: (id: string) => void;
  addFreeSpin: (spin: Omit<FreeSpinEntry, 'id'>) => FreeSpinEntry | null;
  deleteFreeSpin: (id: string) => void;
  convertPromoToReal: (req: PromoConversionRequest) => PromoConversionActionResult;
  deletePromoConversion: (id: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetData: () => void;
  loadDemoData: () => void;
  importBackup: (data: {
    bets?: BetEntry[];
    treasury?: TreasuryEntry[];
    freebets?: FreebetEntry[];
    freeSpins?: FreeSpinEntry[];
    promoConversions?: PromoConversionEntry[];
    settings?: AppSettings;
  }) => void;
  syncNow: () => Promise<boolean>;
  previewBetDateRecovery: () => Promise<{
    success: boolean;
    candidates: BetDateRecoveryCandidate[];
    error?: string;
  }>;
  applyBetDateRecovery: (candidates: BetDateRecoveryCandidate[]) => Promise<{
    success: boolean;
    recovered: number;
    skipped: number;
    error?: string;
  }>;

  // Métricas Financeiras (Fase 1.1)
  totalDeposits: number;
  totalWithdrawals: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  bonusCredits: number;
  pendingBonusCredits: number;
  realBetProfit: number;
  netBetProfit: number;
  totalSpinsProfit: number;
  totalFreebetsProfit: number;
  rolloverBetProfit: number;
  rolloverTurnover: number;
  rolloverRoi: number;
  freebetExtractionRate: number;
  promoBetProfit: number;
  promoTurnover: number;
  promoRoi: number;
  promoBalance: number;
  availablePromoBalance: number;
  promoExposure: number;
  totalConvertedPromo: number;
  realEquity: number;
  currentEquity: number;
  realExposure: number;
  activeExposure: number;
  availableRealBalance: number;
  openPositionsCount: number;
  settledBetsCount: number;
  winCount: number;
  lossCount: number;
  voidCount: number;
  cashoutCount: number;
  winRate: number;
  realTurnover: number;
  realVoidVolume: number;
  turnoverVolume: number;
  roi: number;
  turnoverPolicyDoc: string;
  bettingDrawdownPct: number;
  maxDrawdownPct: number;
  currentStreakText: string;
  maxWinStreak: number;
  maxLossStreak: number;
  monthlyTargetAmount: number;
  stopLossDistance: number;
  unitValue: number;
}

const BankrollContext = createContext<BankrollContextType | undefined>(undefined);

const STORAGE_VERSION = 'apex_bankroll_v3_';

function getStorageKey(userId: string, key: string): string {
  return `${STORAGE_VERSION}${userId}_${key}`;
}

function normalizeTreasuryEntry(raw: any): TreasuryEntry {
  const allowedTypes: TreasuryEntry['type'][] = ['DEPOSIT', 'WITHDRAW', 'BONUS'];
  const allowedStatuses: TreasuryEntry['status'][] = ['Compensado', 'Pendente', 'Processando'];
  return {
    id: sanitizeFirestoreId(raw?.id),
    date: String(raw?.date || new Date().toLocaleDateString('pt-BR')),
    type: allowedTypes.includes(raw?.type) ? raw.type : 'DEPOSIT',
    desc: String(raw?.desc || 'Movimentação'),
    details: raw?.details ? String(raw.details) : undefined,
    amount: Math.max(0, roundCurrency(finiteNumber(raw?.amount, 0))),
    status: allowedStatuses.includes(raw?.status) ? raw.status : 'Compensado'
  };
}

function readLocalStateForUid(uid: string): {
  settings: AppSettings;
  bets: BetEntry[];
  treasury: TreasuryEntry[];
  freebets: FreebetEntry[];
  freeSpins: FreeSpinEntry[];
  promoConversions: PromoConversionEntry[];
} {
  try {
    let savedSettings = localStorage.getItem(getStorageKey(uid, 'settings'));
    if (!savedSettings) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('settings') && k !== getStorageKey(uid, 'settings')) {
          const val = localStorage.getItem(k);
          if (val) {
            savedSettings = val;
            break;
          }
        }
      }
    }
    const parsedSettings = savedSettings ? JSON.parse(savedSettings) : null;
    const userSettings: AppSettings = parsedSettings
      ? {
          ...defaultSettings,
          ...parsedSettings,
          initialBankroll: Math.max(
            0,
            finiteNumber(parsedSettings.initialBankroll, defaultSettings.initialBankroll)
          ),
          initialPromoBalance: Math.max(
            0,
            finiteNumber(parsedSettings.initialPromoBalance, defaultSettings.initialPromoBalance ?? 0)
          ),
          unitValue: Math.max(0.01, finiteNumber(parsedSettings.unitValue, defaultSettings.unitValue))
        }
      : defaultSettings;

    let savedBets = localStorage.getItem(getStorageKey(uid, 'bets'));
    let parsedBets = savedBets ? JSON.parse(savedBets) : null;
    if (!parsedBets || (Array.isArray(parsedBets) && parsedBets.length === 0)) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('bets') && k !== getStorageKey(uid, 'bets')) {
          try {
            const candidate = JSON.parse(localStorage.getItem(k) || '');
            if (Array.isArray(candidate) && candidate.length > 0) {
              parsedBets = candidate;
              break;
            }
          } catch {}
        }
      }
    }
    const userBets: BetEntry[] =
      parsedBets && Array.isArray(parsedBets)
        ? parsedBets.map((item) => normalizeBetEntry(item, userSettings.unitValue, sanitizeFirestoreId))
        : initialBets;

    let savedTreasury = localStorage.getItem(getStorageKey(uid, 'treasury'));
    if (!savedTreasury) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('treasury') && k !== getStorageKey(uid, 'treasury')) {
          const v = localStorage.getItem(k);
          if (v) {
            savedTreasury = v;
            break;
          }
        }
      }
    }
    const parsedTreasury = savedTreasury ? JSON.parse(savedTreasury) : null;
    const userTreasury: TreasuryEntry[] = Array.isArray(parsedTreasury)
      ? parsedTreasury.map(normalizeTreasuryEntry)
      : initialTreasury;

    const savedFreebets = localStorage.getItem(getStorageKey(uid, 'freebets'));
    const parsedFreebets = savedFreebets ? JSON.parse(savedFreebets) : null;
    const userFreebets: FreebetEntry[] = Array.isArray(parsedFreebets)
      ? parsedFreebets.map((fb) => normalizeFreebetEntry(fb, sanitizeFirestoreId))
      : initialFreebets;

    const savedSpins = localStorage.getItem(getStorageKey(uid, 'freespins'));
    const parsedSpins = savedSpins ? JSON.parse(savedSpins) : null;
    const userFreeSpins: FreeSpinEntry[] = Array.isArray(parsedSpins)
      ? deduplicateFreeSpins(parsedSpins)
      : initialFreeSpins;

    const savedConversions = localStorage.getItem(getStorageKey(uid, 'promo_conversions'));
    const parsedConversions = savedConversions ? JSON.parse(savedConversions) : null;
    const userConversions: PromoConversionEntry[] = Array.isArray(parsedConversions)
      ? deduplicatePromoConversions(parsedConversions)
      : initialPromoConversions;

    return {
      settings: userSettings,
      bets: Array.isArray(userBets) ? userBets : initialBets,
      treasury: Array.isArray(userTreasury) ? userTreasury : initialTreasury,
      freebets: Array.isArray(userFreebets) ? userFreebets : initialFreebets,
      freeSpins: Array.isArray(userFreeSpins) ? userFreeSpins : initialFreeSpins,
      promoConversions: Array.isArray(userConversions) ? userConversions : initialPromoConversions
    };
  } catch {
    return {
      settings: defaultSettings,
      bets: initialBets,
      treasury: initialTreasury,
      freebets: initialFreebets,
      freeSpins: initialFreeSpins,
      promoConversions: initialPromoConversions
    };
  }
}

export function BankrollProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const session = getCurrentSession();
      if (session?.user?.id) {
        return {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name
        };
      }
    } catch {}
    return DEFAULT_USER;
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isCloudAuthenticated, setIsCloudAuthenticated] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('local');
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [bets, setBets] = useState<BetEntry[]>(initialBets);
  const [treasury, setTreasury] = useState<TreasuryEntry[]>(initialTreasury);
  const [freebets, setFreebets] = useState<FreebetEntry[]>(initialFreebets);
  const [freeSpins, setFreeSpins] = useState<FreeSpinEntry[]>(initialFreeSpins);
  const [promoConversions, setPromoConversions] = useState<PromoConversionEntry[]>(
    initialPromoConversions
  );

  const loadedUserRef = useRef<string | null>(null);
  const firebaseUserRef = useRef<User | null>(null);
  const unsubscribesRef = useRef<Unsubscribe[]>([]);
  const authFlowSeqRef = useRef<number>(0);
  const pendingSpinKeysRef = useRef<Set<string>>(new Set());
  const pendingConversionKeysRef = useRef<Set<string>>(new Set());

  const stateRef = useRef({ bets, treasury, freebets, freeSpins, promoConversions, settings });
  stateRef.current = { bets, treasury, freebets, freeSpins, promoConversions, settings };

  const loadLocalUserData = useCallback((uid: string) => {
    const localData = readLocalStateForUid(uid);
    setSettings(localData.settings);
    setBets(localData.bets);
    setTreasury(localData.treasury);
    setFreebets(localData.freebets);
    setFreeSpins(localData.freeSpins);
    setPromoConversions(localData.promoConversions);
    loadedUserRef.current = uid;
  }, []);

  const cleanupFirestoreListeners = useCallback(() => {
    unsubscribesRef.current.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    unsubscribesRef.current = [];
  }, []);

  const attachCloudListeners = useCallback(
    (fbUser: User) => {
      cleanupFirestoreListeners();
      const uid = fbUser.uid;
      loadedUserRef.current = uid;

      const handleListenerError = (path: string) => (err: Error) => {
        console.error(`Firestore snapshot error at ${path}:`, err);
        setCloudSyncStatus('error');
        setCloudSyncError(err.message || 'Erro de sincronização com a nuvem.');
      };

      const unsubUser = onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setSettings((prev) => ({
              ...prev,
              initialBankroll: Math.max(0, finiteNumber(d.initialBankroll, prev.initialBankroll)),
              initialPromoBalance: Math.max(
                0,
                finiteNumber(d.initialPromoBalance, prev.initialPromoBalance ?? 0)
              ),
              unitValue: Math.max(0.01, finiteNumber(d.unitValue, prev.unitValue)),
              kellyFraction: String(d.kellyFraction || prev.kellyFraction),
              maxDrawdownLimitPct: finiteNumber(d.maxDrawdownLimitPct, prev.maxDrawdownLimitPct),
              monthlyTargetPct: finiteNumber(d.monthlyTargetPct, prev.monthlyTargetPct)
            }));
          }
          setCloudSyncStatus('synced');
          setLastSyncedAt(new Date());
        },
        handleListenerError(`users/${uid}`)
      );

      const unsubBets = onSnapshot(
        query(collection(db, 'users', uid, 'bets'), where('userId', '==', uid)),
        (snap) => {
          const rows = snap.docs
            .map((d) => ({
              data: d.data(),
              id: d.id,
              ts: timestampToMillis(d.data().createdAt)
            }))
            .sort((a, b) => b.ts - a.ts)
            .map((item) =>
              normalizeBetEntry(
                { ...item.data, id: item.id },
                stateRef.current.settings.unitValue,
                sanitizeFirestoreId
              )
            );
          setBets(rows);
          setCloudSyncStatus('synced');
          setLastSyncedAt(new Date());
        },
        handleListenerError(`users/${uid}/bets`)
      );

      const unsubTreasury = onSnapshot(
        query(collection(db, 'users', uid, 'treasury'), where('userId', '==', uid)),
        (snap) => {
          const rows = snap.docs
            .map((d) => ({
              data: d.data(),
              id: d.id,
              ts: timestampToMillis(d.data().createdAt)
            }))
            .sort((a, b) => b.ts - a.ts)
            .map((item) => normalizeTreasuryEntry({ ...item.data, id: item.id }));
          setTreasury(rows);
          setCloudSyncStatus('synced');
          setLastSyncedAt(new Date());
        },
        handleListenerError(`users/${uid}/treasury`)
      );

      const unsubFreebets = onSnapshot(
        query(collection(db, 'users', uid, 'freebets'), where('userId', '==', uid)),
        (snap) => {
          const rows = snap.docs
            .map((d) => ({
              data: d.data(),
              id: d.id,
              ts: timestampToMillis(d.data().createdAt)
            }))
            .sort((a, b) => b.ts - a.ts)
            .map((item) =>
              normalizeFreebetEntry({ ...item.data, id: item.id }, sanitizeFirestoreId)
            );
          setFreebets(rows);
          setCloudSyncStatus('synced');
          setLastSyncedAt(new Date());
        },
        handleListenerError(`users/${uid}/freebets`)
      );

      const unsubFreeSpins = onSnapshot(
        query(collection(db, 'users', uid, 'free_spins'), where('userId', '==', uid)),
        (snap) => {
          const rows = snap.docs
            .map((d) => ({
              data: d.data(),
              id: d.id,
              ts: timestampToMillis(d.data().createdAt)
            }))
            .sort((a, b) => b.ts - a.ts)
            .map((item) => ({
              id: item.id,
              provider: String(item.data.provider || ''),
              game: String(item.data.game || ''),
              bookmaker: String(item.data.bookmaker || '1win'),
              spinsCount: finiteNumber(item.data.spinsCount, 0),
              netProfit: finiteNumber(item.data.netProfit, 0),
              date: String(item.data.date || ''),
              ...(item.data.idempotencyKey
                ? { idempotencyKey: String(item.data.idempotencyKey) }
                : {})
            }));
          setFreeSpins(deduplicateFreeSpins(rows));
          setCloudSyncStatus('synced');
          setLastSyncedAt(new Date());
        },
        handleListenerError(`users/${uid}/free_spins`)
      );

      const unsubPromoConversions = onSnapshot(
        query(collection(db, 'users', uid, 'promo_conversions'), where('userId', '==', uid)),
        (snap) => {
          const rows: PromoConversionEntry[] = snap.docs
            .map((d) => ({
              data: d.data(),
              id: d.id,
              ts: timestampToMillis(d.data().createdAt)
            }))
            .sort((a, b) => b.ts - a.ts)
            .map((item) => ({
              id: item.id,
              amount: roundCurrency(finiteNumber(item.data.amount, 0)),
              date: String(item.data.date || ''),
              origin: String(item.data.origin || 'Saldo Promocional'),
              promotionName: String(item.data.promotionName || 'Conversão Manual'),
              ...(item.data.bookmaker ? { bookmaker: String(item.data.bookmaker) } : {}),
              ...(item.data.notes ? { notes: String(item.data.notes) } : {}),
              ...(item.data.idempotencyKey
                ? { idempotencyKey: String(item.data.idempotencyKey) }
                : {}),
              ...(item.data.sourceId ? { sourceId: String(item.data.sourceId) } : {}),
              ...(item.data.createdAtIso ? { createdAtIso: String(item.data.createdAtIso) } : {})
            }));
          setPromoConversions(deduplicatePromoConversions(rows));
          setCloudSyncStatus('synced');
          setLastSyncedAt(new Date());
        },
        handleListenerError(`users/${uid}/promo_conversions`)
      );

      unsubscribesRef.current = [
        unsubUser,
        unsubBets,
        unsubTreasury,
        unsubFreebets,
        unsubFreeSpins,
        unsubPromoConversions
      ];
    },
    [cleanupFirestoreListeners]
  );

  // Firebase Auth listener with graceful non-blocking local fallback
  useEffect(() => {
    try {
      const localSession = getCurrentSession() || getOrCreateDefaultSession();
      setCurrentUser({
        id: localSession.user.id,
        email: localSession.user.email,
        name: localSession.user.name
      });
      loadLocalUserData(localSession.user.id);
    } catch (e) {
      console.warn('Local session init fallback:', e);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      const seq = ++authFlowSeqRef.current;

      if (!fbUser) {
        cleanupFirestoreListeners();
        firebaseUserRef.current = null;
        setIsCloudAuthenticated(false);
        setCloudSyncStatus('local');
        setCloudSyncError(null);

        try {
          const session = getCurrentSession() || getOrCreateDefaultSession();
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name
          });
          loadLocalUserData(session.user.id);
        } catch {}
        setAuthLoading(false);
        return;
      }

      cleanupFirestoreListeners();
      firebaseUserRef.current = fbUser;
      setIsCloudAuthenticated(true);
      setCloudSyncStatus('syncing');
      setCloudSyncError(null);
      setUnauthorizedDomain(null);

      const localFallback = readLocalStateForUid(loadedUserRef.current || DEFAULT_USER.id);
      const localSnapshot = {
        bets: stateRef.current.bets.length > 0 ? stateRef.current.bets : localFallback.bets,
        treasury:
          stateRef.current.treasury.length > 0
            ? stateRef.current.treasury
            : localFallback.treasury,
        freebets:
          stateRef.current.freebets.length > 0
            ? stateRef.current.freebets
            : localFallback.freebets,
        freeSpins:
          stateRef.current.freeSpins.length > 0
            ? stateRef.current.freeSpins
            : localFallback.freeSpins,
        promoConversions:
          stateRef.current.promoConversions.length > 0
            ? stateRef.current.promoConversions
            : localFallback.promoConversions,
        settings: stateRef.current.settings
      };

      setCurrentUser({
        id: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Apostador',
        photoURL: fbUser.photoURL || undefined
      });

      try {
        await ensureUserProfileDoc(fbUser, localSnapshot.settings);
        if (seq !== authFlowSeqRef.current) return;

        const cloudHasData = await hasAnyCloudRecords(fbUser.uid);
        if (seq !== authFlowSeqRef.current) return;

        const hasLocalRecords =
          localSnapshot.bets.length > 0 ||
          localSnapshot.treasury.length > 0 ||
          localSnapshot.freebets.length > 0 ||
          localSnapshot.freeSpins.length > 0 ||
          localSnapshot.promoConversions.length > 0;

        if (!cloudHasData && hasLocalRecords) {
          await pushAllStateToFirestore(fbUser, localSnapshot, false);
          if (seq !== authFlowSeqRef.current) return;
        }

        attachCloudListeners(fbUser);
        setCloudSyncStatus('synced');
        setLastSyncedAt(new Date());
      } catch (err: any) {
        if (seq !== authFlowSeqRef.current) return;
        console.error('Firebase cloud init error:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Erro ao inicializar sincronização na nuvem.');
      } finally {
        if (seq === authFlowSeqRef.current) {
          setAuthLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      cleanupFirestoreListeners();
    };
  }, [attachCloudListeners, cleanupFirestoreListeners, loadLocalUserData]);

  // Cache state to user-scoped localStorage for instant reloads & offline resilience
  useEffect(() => {
    if (!currentUser?.id || loadedUserRef.current !== currentUser.id) return;
    localStorage.setItem(getStorageKey(currentUser.id, 'bets'), JSON.stringify(bets));
  }, [bets, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || loadedUserRef.current !== currentUser.id) return;
    localStorage.setItem(getStorageKey(currentUser.id, 'treasury'), JSON.stringify(treasury));
  }, [treasury, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || loadedUserRef.current !== currentUser.id) return;
    localStorage.setItem(getStorageKey(currentUser.id, 'freebets'), JSON.stringify(freebets));
  }, [freebets, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || loadedUserRef.current !== currentUser.id) return;
    localStorage.setItem(getStorageKey(currentUser.id, 'freespins'), JSON.stringify(freeSpins));
  }, [freeSpins, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || loadedUserRef.current !== currentUser.id) return;
    localStorage.setItem(
      getStorageKey(currentUser.id, 'promo_conversions'),
      JSON.stringify(promoConversions)
    );
  }, [promoConversions, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || loadedUserRef.current !== currentUser.id) return;
    localStorage.setItem(getStorageKey(currentUser.id, 'settings'), JSON.stringify(settings));
  }, [settings, currentUser?.id]);

  const signInWithGoogle = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      setCloudSyncError(null);
      setUnauthorizedDomain(null);
      await signInWithGooglePopup();
      return { success: true };
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'Login com Google cancelado.' };
      }
      if (code === 'auth/popup-blocked') {
        return {
          success: false,
          error:
            'O navegador bloqueou o pop-up do Google. Permita pop-ups para este site e tente novamente.'
        };
      }
      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        const msg = host
          ? `Domínio "${host}" ainda não autorizado no Firebase Auth. Adicione este domínio em Authentication → Settings → Authorized domains no Console do Firebase.`
          : 'Domínio não autorizado no Firebase Authentication.';
        setUnauthorizedDomain(host || 'domínio atual');
        setCloudSyncError(msg);
        return { success: false, error: msg };
      }
      const fallbackMsg = err?.message || 'Não foi possível conectar com a conta Google.';
      setCloudSyncError(fallbackMsg);
      return { success: false, error: fallbackMsg };
    }
  }, []);

  const uploadLocalToCloud = useCallback(async (): Promise<boolean> => {
    const fbUser = firebaseUserRef.current;
    if (!fbUser) return false;
    try {
      setCloudSyncStatus('syncing');
      const localDefault = readLocalStateForUid(DEFAULT_USER.id);
      const mergedPayload = {
        bets: stateRef.current.bets.length > 0 ? stateRef.current.bets : localDefault.bets,
        treasury:
          stateRef.current.treasury.length > 0
            ? stateRef.current.treasury
            : localDefault.treasury,
        freebets:
          stateRef.current.freebets.length > 0
            ? stateRef.current.freebets
            : localDefault.freebets,
        freeSpins:
          stateRef.current.freeSpins.length > 0
            ? stateRef.current.freeSpins
            : localDefault.freeSpins,
        promoConversions:
          stateRef.current.promoConversions.length > 0
            ? stateRef.current.promoConversions
            : localDefault.promoConversions,
        settings: stateRef.current.settings
      };
      await pushAllStateToFirestore(fbUser, mergedPayload, false);
      setCloudSyncStatus('synced');
      setLastSyncedAt(new Date());
      return true;
    } catch (err: any) {
      setCloudSyncStatus('error');
      setCloudSyncError(err?.message || 'Erro ao enviar dados locais para a nuvem.');
      return false;
    }
  }, []);

  const syncNow = useCallback(async (): Promise<boolean> => {
    const fbUser = firebaseUserRef.current;
    if (!fbUser) return false;
    try {
      setCloudSyncStatus('syncing');
      await ensureUserProfileDoc(fbUser, stateRef.current.settings);
      attachCloudListeners(fbUser);
      setCloudSyncStatus('synced');
      setLastSyncedAt(new Date());
      return true;
    } catch {
      setCloudSyncStatus('error');
      return false;
    }
  }, [attachCloudListeners]);


  const previewBetDateRecovery = useCallback(async () => {
    const fbUser = firebaseUserRef.current;
    if (!fbUser) {
      return {
        success: false,
        candidates: [],
        error: 'Conecte sua conta Google para consultar os registros originais na nuvem.'
      };
    }
    try {
      const candidates = await previewBetDateRecoveryInFirestore(fbUser.uid);
      return { success: true, candidates };
    } catch (err: any) {
      return {
        success: false,
        candidates: [],
        error: err?.message || 'Não foi possível analisar as datas das apostas.'
      };
    }
  }, []);

  const applyBetDateRecovery = useCallback(async (candidates: BetDateRecoveryCandidate[]) => {
    const fbUser = firebaseUserRef.current;
    if (!fbUser) {
      return {
        success: false,
        recovered: 0,
        skipped: candidates.length,
        error: 'Conecte sua conta Google antes de recuperar as datas.'
      };
    }
    try {
      setCloudSyncStatus('syncing');
      const result = await applyBetDateRecoveryInFirestore(fbUser.uid, candidates);
      const recoveredIds = new Set(result.recoveredIds);
      const recoveredDates = new Map(
        candidates
          .filter((candidate) => recoveredIds.has(candidate.id))
          .map((candidate) => [candidate.id, candidate.recoveredDate])
      );
      setBets((previous) =>
        previous.map((bet) =>
          recoveredDates.has(bet.id)
            ? { ...bet, date: recoveredDates.get(bet.id)! }
            : bet
        )
      );
      setCloudSyncStatus('synced');
      setLastSyncedAt(new Date());
      return { success: true, ...result };
    } catch (err: any) {
      setCloudSyncStatus('error');
      setCloudSyncError(err?.message || 'Falha ao recuperar datas das apostas.');
      return {
        success: false,
        recovered: 0,
        skipped: candidates.length,
        error: err?.message || 'Falha ao recuperar datas das apostas.'
      };
    }
  }, []);

  const signUp = async (
    email: string,
    pass: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await localRegister(email, pass, name);
      if (res.error || !res.user) {
        return { success: false, error: res.error || 'Erro ao criar conta.' };
      }
      const userObj: AuthUser = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name
      };
      setCurrentUser(userObj);
      loadLocalUserData(userObj.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao criar conta.' };
    }
  };

  const signIn = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await localLogin(email, pass);
      if (res.error || !res.user) {
        return { success: false, error: res.error || 'Credenciais inválidas.' };
      }
      const userObj: AuthUser = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name
      };
      setCurrentUser(userObj);
      loadLocalUserData(userObj.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao realizar login.' };
    }
  };

  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await localResetPassword(email);
      if (!res.success) {
        return { success: false, error: res.error || 'Conta não encontrada com este e-mail.' };
      }
      return {
        success: true,
        message: 'Senha temporária definida como: 123456. Você já pode fazer login e alterá-la.'
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao redefinir senha.' };
    }
  };

  const signOut = async () => {
    cleanupFirestoreListeners();
    if (firebaseUserRef.current) {
      try {
        await signOutFirebase();
      } catch {}
      firebaseUserRef.current = null;
    }
    localSignOut();
    loadedUserRef.current = null;
    setIsCloudAuthenticated(false);
    setCloudSyncStatus('local');
    setCloudSyncError(null);
    const session = getOrCreateDefaultSession();
    setCurrentUser(session.user);
    loadLocalUserData(session.user.id);
  };

  const syncLinkedFreebetForBet = useCallback((finalBet: BetEntry) => {
    if (finalBet.type !== 'Freebet') return;
    const linkedFb = findLinkedFreebetForBet(finalBet, stateRef.current.freebets);
    if (!linkedFb) return;

    const nextStatus = mapBetStatusToFreebetStatus(finalBet.status, finalBet.pl);
    const nextReturn =
      nextStatus === 'Creditado' ? roundCurrency(Math.max(0, finalBet.pl)) : 0;

    const updatedFb: FreebetEntry = {
      ...linkedFb,
      status: nextStatus,
      netReturn: nextReturn,
      linkedBetId: finalBet.id
    };

    setFreebets((prev) => prev.map((f) => (f.id === linkedFb.id ? updatedFb : f)));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      updateFreebetInFirestore(updatedFb, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao sincronizar Freebet na nuvem.');
      });
    }
  }, []);

  const addBet = (
    newBet: Omit<BetEntry, 'id' | 'gross' | 'pl'> & { gross?: number; pl?: number }
  ): BetEntry => {
    const settled = calculateBetSettlement({
      stake: newBet.stake,
      odd: newBet.odd,
      status: newBet.status,
      type: newBet.type,
      cashoutReturn: newBet.cashoutReturn
    });

    const safeUnit = stateRef.current.settings.unitValue > 0 ? stateRef.current.settings.unitValue : 25;
    const entry: BetEntry = {
      ...newBet,
      id: sanitizeFirestoreId(),
      stake: roundCurrency(Math.max(0, finiteNumber(newBet.stake, 0))),
      odd: Math.max(1, finiteNumber(newBet.odd, 1)),
      units: Number((finiteNumber(newBet.stake, 0) / safeUnit).toFixed(2)),
      gross: settled.gross,
      pl: settled.pl,
      ...(settled.cashoutReturn !== undefined
        ? { cashoutReturn: settled.cashoutReturn }
        : { cashoutReturn: undefined })
    };
    if (entry.status !== 'CASHOUT') {
      delete entry.cashoutReturn;
    }

    setBets((prev) => [entry, ...prev]);
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      createBetInFirestore(entry, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao salvar aposta na nuvem.');
      });
    }
    return entry;
  };

  const updateBet = (id: string, updated: Partial<BetEntry>) => {
    const existing = stateRef.current.bets.find((b) => b.id === id);
    if (!existing) return;

    const merged: BetEntry = { ...existing, ...updated };
    if (merged.status !== 'CASHOUT') {
      delete merged.cashoutReturn;
    }

    const settled = calculateBetSettlement({
      stake: merged.stake,
      odd: merged.odd,
      status: merged.status,
      type: merged.type,
      cashoutReturn: merged.cashoutReturn
    });

    const safeUnit = stateRef.current.settings.unitValue > 0 ? stateRef.current.settings.unitValue : 25;
    const finalBet: BetEntry = {
      ...merged,
      stake: roundCurrency(Math.max(0, finiteNumber(merged.stake, 0))),
      odd: Math.max(1, finiteNumber(merged.odd, 1)),
      units: Number((finiteNumber(merged.stake, 0) / safeUnit).toFixed(2)),
      gross: settled.gross,
      pl: settled.pl
    };
    if (settled.cashoutReturn !== undefined) {
      finalBet.cashoutReturn = settled.cashoutReturn;
    } else {
      delete finalBet.cashoutReturn;
    }

    setBets((prev) => prev.map((bet) => (bet.id === id ? finalBet : bet)));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      updateBetInFirestore(finalBet, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao atualizar aposta na nuvem.');
      });
    }

    syncLinkedFreebetForBet(finalBet);
  };

  const deleteBet = (id: string) => {
    const target = stateRef.current.bets.find((b) => b.id === id);
    setBets((prev) => prev.filter((bet) => bet.id !== id));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      deleteBetInFirestore(id, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao excluir aposta na nuvem.');
      });
    }

    if (target?.type === 'Freebet') {
      const linkedFb = findLinkedFreebetForBet(target, stateRef.current.freebets);
      if (linkedFb && linkedFb.linkedBetId) {
        const unlinked: FreebetEntry = { ...linkedFb };
        delete unlinked.linkedBetId;
        setFreebets((prev) => prev.map((f) => (f.id === linkedFb.id ? unlinked : f)));
      }
    }
  };

  const resolveBet = (id: string, status: BetStatus, cashoutReturn?: number) => {
    const existing = stateRef.current.bets.find((b) => b.id === id);
    if (!existing) return;

    const settled = calculateBetSettlement({
      stake: existing.stake,
      odd: existing.odd,
      status,
      type: existing.type,
      cashoutReturn: status === 'CASHOUT' ? cashoutReturn ?? existing.cashoutReturn : undefined
    });

    const finalBet: BetEntry = {
      ...existing,
      status,
      gross: settled.gross,
      pl: settled.pl
    };
    if (settled.cashoutReturn !== undefined) {
      finalBet.cashoutReturn = settled.cashoutReturn;
    } else {
      delete finalBet.cashoutReturn;
    }

    setBets((prev) => prev.map((bet) => (bet.id === id ? finalBet : bet)));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      updateBetInFirestore(finalBet, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao liquidar aposta na nuvem.');
      });
    }

    syncLinkedFreebetForBet(finalBet);
  };

  const addTreasury = (tx: Omit<TreasuryEntry, 'id'>) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const entry: TreasuryEntry = normalizeTreasuryEntry({
      ...tx,
      id: `TX-${Date.now().toString(36)}-${randomSuffix}`
    });
    setTreasury((prev) => [entry, ...prev]);
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      createTreasuryInFirestore(entry, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao salvar movimentação na nuvem.');
      });
    }
  };

  const updateTreasuryStatus = (id: string, status: TreasuryEntry['status']) => {
    const existing = stateRef.current.treasury.find((tx) => tx.id === id);
    if (!existing) return;
    const updated: TreasuryEntry = { ...existing, status };
    setTreasury((prev) => prev.map((tx) => (tx.id === id ? updated : tx)));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      updateTreasuryStatusInFirestore(id, status, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao atualizar status da movimentação na nuvem.');
      });
    }
  };

  const deleteTreasury = (id: string) => {
    setTreasury((prev) => prev.filter((tx) => tx.id !== id));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      deleteTreasuryInFirestore(id, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao excluir movimentação na nuvem.');
      });
    }
  };

  const addFreebet = (
    fb: Omit<FreebetEntry, 'id' | 'netReturn'> & { netReturn?: number },
    options?: { syncToLedger?: boolean; sport?: string }
  ): FreebetEntry => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const fbId = `FB-${Date.now().toString(36)}-${randomSuffix}`;
    const realizedNetReturn = calculateFreebetRealizedReturn(
      fb.bonusAmount,
      fb.odd,
      fb.status,
      fb.status === 'Creditado' ? fb.netReturn : undefined
    );

    let linkedBetId = fb.linkedBetId;
    let betToCreate: BetEntry | null = null;

    if (options?.syncToLedger) {
      const betStatus = mapFreebetStatusToBetStatus(fb.status);
      const settled = calculateBetSettlement({
        stake: fb.bonusAmount,
        odd: fb.odd,
        status: betStatus,
        type: 'Freebet'
      });
      const safeUnit =
        stateRef.current.settings.unitValue > 0 ? stateRef.current.settings.unitValue : 25;
      linkedBetId = sanitizeFirestoreId();
      betToCreate = {
        id: linkedBetId,
        date: fb.date,
        type: 'Freebet',
        bookmaker: fb.bookmaker,
        sport: options.sport || 'Futebol',
        event: fb.event,
        market: fb.selection || 'Aposta Grátis',
        odd: Math.max(1, finiteNumber(fb.odd, 1)),
        stake: roundCurrency(Math.max(0, finiteNumber(fb.bonusAmount, 0))),
        units: Number((finiteNumber(fb.bonusAmount, 0) / safeUnit).toFixed(2)),
        status: betStatus,
        gross: settled.gross,
        pl: settled.pl,
        freebetId: fbId
      };
    }

    const entry: FreebetEntry = {
      ...fb,
      id: fbId,
      bonusAmount: roundCurrency(Math.max(0, finiteNumber(fb.bonusAmount, 0))),
      odd: Math.max(1, finiteNumber(fb.odd, 1)),
      netReturn: realizedNetReturn,
      ...(linkedBetId ? { linkedBetId } : {})
    };

    setFreebets((prev) => [entry, ...prev]);
    if (betToCreate) {
      setBets((prev) => [betToCreate!, ...prev]);
    }

    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      createFreebetInFirestore(entry, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao salvar freebet na nuvem.');
      });
      if (betToCreate) {
        createBetInFirestore(betToCreate, uid).catch((err) => {
          setCloudSyncStatus('error');
          setCloudSyncError(err?.message || 'Falha ao sincronizar aposta de freebet na nuvem.');
        });
      }
    }

    return entry;
  };

  const updateFreebetStatus = (
    id: string,
    status: FreebetEntry['status'],
    explicitSettledPl?: number
  ) => {
    const existing = stateRef.current.freebets.find((fb) => fb.id === id);
    if (!existing) return;

    const linkedBet = findLinkedBetForFreebet(existing, stateRef.current.bets);
    const nextReturn = calculateFreebetRealizedReturn(
      existing.bonusAmount,
      existing.odd,
      status,
      explicitSettledPl
    );

    const updated: FreebetEntry = {
      ...existing,
      status,
      netReturn: nextReturn,
      ...(linkedBet ? { linkedBetId: linkedBet.id } : {})
    };

    setFreebets((prev) => prev.map((fb) => (fb.id === id ? updated : fb)));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      updateFreebetInFirestore(updated, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao atualizar freebet na nuvem.');
      });
    }

    if (linkedBet) {
      const nextBetStatus = mapFreebetStatusToBetStatus(status);
      const settled = calculateBetSettlement({
        stake: linkedBet.stake,
        odd: linkedBet.odd,
        status: nextBetStatus,
        type: 'Freebet'
      });

      const updatedBet: BetEntry = {
        ...linkedBet,
        status: nextBetStatus,
        freebetId: existing.id,
        gross:
          status === 'Creditado' &&
          explicitSettledPl !== undefined &&
          Number.isFinite(explicitSettledPl)
            ? roundCurrency(Math.max(0, explicitSettledPl))
            : settled.gross,
        pl:
          status === 'Creditado' &&
          explicitSettledPl !== undefined &&
          Number.isFinite(explicitSettledPl)
            ? roundCurrency(Math.max(0, explicitSettledPl))
            : settled.pl
      };
      delete updatedBet.cashoutReturn;

      setBets((prev) => prev.map((b) => (b.id === linkedBet.id ? updatedBet : b)));
      if (uid) {
        updateBetInFirestore(updatedBet, uid).catch((err) => {
          setCloudSyncStatus('error');
          setCloudSyncError(err?.message || 'Falha ao atualizar aposta vinculada à freebet.');
        });
      }
    }
  };

  const deleteFreebet = (id: string) => {
    const existing = stateRef.current.freebets.find((fb) => fb.id === id);
    const linkedBet = existing
      ? findLinkedBetForFreebet(existing, stateRef.current.bets)
      : undefined;

    setFreebets((prev) => prev.filter((fb) => fb.id !== id));
    if (linkedBet) {
      setBets((prev) => prev.filter((b) => b.id !== linkedBet.id));
    }

    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      deleteFreebetInFirestore(id, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao excluir freebet na nuvem.');
      });
      if (linkedBet) {
        deleteBetInFirestore(linkedBet.id, uid).catch((err) => {
          setCloudSyncStatus('error');
          setCloudSyncError(err?.message || 'Falha ao excluir aposta vinculada na nuvem.');
        });
      }
    }
  };

  const addFreeSpin = (spin: Omit<FreeSpinEntry, 'id'>): FreeSpinEntry | null => {
    if (spin.idempotencyKey) {
      if (
        pendingSpinKeysRef.current.has(spin.idempotencyKey) ||
        stateRef.current.freeSpins.some((s) => s.idempotencyKey === spin.idempotencyKey)
      ) {
        return null;
      }
      pendingSpinKeysRef.current.add(spin.idempotencyKey);
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const entry: FreeSpinEntry = {
      ...spin,
      id: `FS-${Date.now().toString(36)}-${randomSuffix}`,
      spinsCount: Math.max(0, finiteNumber(spin.spinsCount, 0)),
      netProfit: roundCurrency(finiteNumber(spin.netProfit, 0))
    };

    setFreeSpins((prev) => deduplicateFreeSpins([entry, ...prev]));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      createFreeSpinInFirestore(entry, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao salvar giro grátis na nuvem.');
      });
    }
    return entry;
  };

  const deleteFreeSpin = (id: string) => {
    setFreeSpins((prev) => prev.filter((fs) => fs.id !== id));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      deleteFreeSpinInFirestore(id, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao excluir giro grátis na nuvem.');
      });
    }
  };

  const metrics = useMemo(() => {
    return computeFinancialMetrics({
      bets,
      treasury,
      freebets,
      freeSpins,
      promoConversions,
      settings: {
        initialBankroll: settings.initialBankroll,
        initialPromoBalance: settings.initialPromoBalance
      }
    });
  }, [bets, treasury, freebets, freeSpins, promoConversions, settings.initialBankroll, settings.initialPromoBalance]);

  const convertPromoToReal = (req: PromoConversionRequest): PromoConversionActionResult => {
    if (req.idempotencyKey && pendingConversionKeysRef.current.has(req.idempotencyKey)) {
      return {
        success: false,
        error: 'Solicitação de conversão já está em processamento (duplicidade bloqueada).'
      };
    }

    const latestMetrics = computeFinancialMetrics({
      bets: stateRef.current.bets,
      treasury: stateRef.current.treasury,
      freebets: stateRef.current.freebets,
      freeSpins: stateRef.current.freeSpins,
      promoConversions: stateRef.current.promoConversions,
      settings: {
        initialBankroll: stateRef.current.settings.initialBankroll,
        initialPromoBalance: stateRef.current.settings.initialPromoBalance
      }
    });

    const validation = validatePromoConversion(
      req,
      latestMetrics.availablePromoBalance,
      stateRef.current.promoConversions
    );

    if (!validation.valid || !validation.normalizedAmount) {
      return { success: false, error: validation.error || 'Conversão promocional inválida.' };
    }

    if (req.idempotencyKey) {
      pendingConversionKeysRef.current.add(req.idempotencyKey);
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const entry: PromoConversionEntry = {
      id: `CONV-${Date.now().toString(36)}-${randomSuffix}`,
      amount: validation.normalizedAmount,
      date: req.date || new Date().toLocaleDateString('pt-BR'),
      origin: req.origin.trim(),
      promotionName: req.promotionName.trim(),
      ...(req.bookmaker && req.bookmaker.trim() ? { bookmaker: req.bookmaker.trim() } : {}),
      ...(req.notes && req.notes.trim() ? { notes: req.notes.trim() } : {}),
      ...(req.idempotencyKey ? { idempotencyKey: req.idempotencyKey } : {}),
      ...(req.sourceId ? { sourceId: req.sourceId } : {}),
      createdAtIso: new Date().toISOString()
    };

    setPromoConversions((prev) => deduplicatePromoConversions([entry, ...prev]));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      createPromoConversionInFirestore(entry, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao registrar conversão promocional na nuvem.');
      });
    }

    return { success: true, entry };
  };

  const deletePromoConversion = (id: string) => {
    setPromoConversions((prev) => prev.filter((c) => c.id !== id));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      deletePromoConversionInFirestore(id, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao excluir conversão promocional na nuvem.');
      });
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const merged = { ...stateRef.current.settings, ...newSettings };
    setSettings(merged);
    const fbUser = firebaseUserRef.current;
    if (fbUser) {
      updateUserProfileSettings(fbUser, merged).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao salvar ajustes na nuvem.');
      });
    }
  };

  const resetData = () => {
    setBets([]);
    setTreasury([]);
    setFreebets([]);
    setFreeSpins([]);
    setPromoConversions([]);
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      clearAllUserSubcollectionsInFirestore(uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao limpar dados na nuvem.');
      });
    }
  };

  const loadDemoData = () => {
    const sanitizedDemoBets = demoBets.map((b) =>
      normalizeBetEntry({ ...b, id: sanitizeFirestoreId(b.id) }, stateRef.current.settings.unitValue, sanitizeFirestoreId)
    );
    const sanitizedDemoFreebets = demoFreebets.map((fb) =>
      normalizeFreebetEntry(fb, sanitizeFirestoreId)
    );
    setBets(sanitizedDemoBets);
    setTreasury(demoTreasury);
    setFreebets(sanitizedDemoFreebets);
    setFreeSpins(demoFreeSpins);
    setPromoConversions([]);
    const fbUser = firebaseUserRef.current;
    if (fbUser) {
      pushAllStateToFirestore(
        fbUser,
        {
          bets: sanitizedDemoBets,
          treasury: demoTreasury,
          freebets: sanitizedDemoFreebets,
          freeSpins: demoFreeSpins,
          promoConversions: [],
          settings: stateRef.current.settings
        },
        true
      ).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao carregar exemplo na nuvem.');
      });
    }
  };

  const importBackup = (data: {
    bets?: BetEntry[];
    treasury?: TreasuryEntry[];
    freebets?: FreebetEntry[];
    freeSpins?: FreeSpinEntry[];
    promoConversions?: PromoConversionEntry[];
    settings?: AppSettings;
  }) => {
    const nextSettings: AppSettings =
      data.settings && typeof data.settings === 'object'
        ? {
            ...stateRef.current.settings,
            ...data.settings,
            initialBankroll: Math.max(
              0,
              finiteNumber(data.settings.initialBankroll, stateRef.current.settings.initialBankroll)
            ),
            initialPromoBalance: Math.max(
              0,
              finiteNumber(
                data.settings.initialPromoBalance,
                stateRef.current.settings.initialPromoBalance ?? 0
              )
            ),
            unitValue: Math.max(
              0.01,
              finiteNumber(data.settings.unitValue, stateRef.current.settings.unitValue)
            )
          }
        : stateRef.current.settings;

    const nextBets = Array.isArray(data.bets)
      ? data.bets.map((b) => normalizeBetEntry(b, nextSettings.unitValue, sanitizeFirestoreId))
      : stateRef.current.bets;
    const nextTreasury = Array.isArray(data.treasury)
      ? data.treasury.map(normalizeTreasuryEntry)
      : stateRef.current.treasury;
    const nextFreebets = Array.isArray(data.freebets)
      ? data.freebets.map((f) => normalizeFreebetEntry(f, sanitizeFirestoreId))
      : stateRef.current.freebets;
    const nextFreeSpins = Array.isArray(data.freeSpins)
      ? deduplicateFreeSpins(data.freeSpins.map((s) => ({ ...s, id: sanitizeFirestoreId(s.id) })))
      : stateRef.current.freeSpins;
    const nextPromoConversions = Array.isArray(data.promoConversions)
      ? deduplicatePromoConversions(
          data.promoConversions.map((c) => ({ ...c, id: sanitizeFirestoreId(c.id) }))
        )
      : stateRef.current.promoConversions;

    setBets(nextBets);
    setTreasury(nextTreasury);
    setFreebets(nextFreebets);
    setFreeSpins(nextFreeSpins);
    setPromoConversions(nextPromoConversions);
    setSettings(nextSettings);

    const fbUser = firebaseUserRef.current;
    if (fbUser) {
      pushAllStateToFirestore(
        fbUser,
        {
          bets: nextBets,
          treasury: nextTreasury,
          freebets: nextFreebets,
          freeSpins: nextFreeSpins,
          promoConversions: nextPromoConversions,
          settings: nextSettings
        },
        true
      ).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao importar backup para a nuvem.');
      });
    }
  };

  const monthlyTargetAmount =
    (finiteNumber(settings.initialBankroll, 1000) * finiteNumber(settings.monthlyTargetPct, 30)) /
    100;
  const stopLossDistance =
    (finiteNumber(settings.initialBankroll, 1000) *
      finiteNumber(settings.maxDrawdownLimitPct, 25)) /
    100;

  return (
    <BankrollContext.Provider
      value={{
        currentUser,
        authLoading,
        isCloudAuthenticated,
        cloudSyncStatus,
        cloudSyncError,
        unauthorizedDomain,
        lastSyncedAt,
        signInWithGoogle,
        uploadLocalToCloud,
        signIn,
        signUp,
        resetPassword,
        signOut,
        bets,
        treasury,
        freebets,
        freeSpins,
        promoConversions,
        settings,
        addBet,
        updateBet,
        deleteBet,
        resolveBet,
        addTreasury,
        updateTreasuryStatus,
        deleteTreasury,
        addFreebet,
        updateFreebetStatus,
        deleteFreebet,
        addFreeSpin,
        deleteFreeSpin,
        convertPromoToReal,
        deletePromoConversion,
        updateSettings,
        resetData,
        loadDemoData,
        importBackup,
        syncNow,
        previewBetDateRecovery,
        applyBetDateRecovery,
        ...metrics,
        turnoverPolicyDoc: TURNOVER_POLICY_DOC,
        monthlyTargetAmount,
        stopLossDistance,
        unitValue: finiteNumber(settings.unitValue, 25)
      }}
    >
      {children}
    </BankrollContext.Provider>
  );
}

export function useBankroll() {
  const context = useContext(BankrollContext);
  if (!context) {
    throw new Error('useBankroll must be used within a BankrollProvider');
  }
  return context;
}
