import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Moneda = 'PEN' | 'USD' | 'EUR';

export interface Profile {
  apodo: string;
  moneda: Moneda;
  ahorroPct: number;
}

export interface Transaction {
  id: string;
  type: 'ingreso' | 'pago';
  categoria: string;
  monto: number;
  fecha: string; // ISO
  ahorroEntryId?: string;
}

export interface SavingsEntry {
  id: string;
  monto: number;
  fecha: string; // ISO
  origen: 'Automático' | 'Manual';
  metaId?: string;
  metaNombre?: string;
}

export interface Draft {
  apodo?: string;
  ahorroPct?: number;
  moneda?: Moneda;
}

interface PersistedState {
  profile: Profile | null;
  transactions: Transaction[];
  savingsEntries: SavingsEntry[];
}

interface AppContextValue extends PersistedState {
  loading: boolean;
  draft: Draft;
  setDraft: (updater: (d: Draft) => Draft) => void;
  registerProfile: (profile: Profile) => Promise<void>;
  updateProfile: (partial: Partial<Profile>) => Promise<void>;
  resetAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const STORAGE_KEY = '@paywho/state/v1';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsEntries, setSavingsEntries] = useState<SavingsEntry[]>([]);
  const [draft, setDraftState] = useState<Draft>({});

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data: Partial<PersistedState> = JSON.parse(raw);
          setProfile(data.profile ?? null);
          setTransactions(data.transactions ?? []);
          setSavingsEntries(data.savingsEntries ?? []);
        }
      } catch (e) {
        console.warn('No se pudo cargar el almacenamiento local', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: PersistedState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('No se pudo guardar el almacenamiento local', e);
    }
  }, []);

  const setDraft = useCallback((updater: (d: Draft) => Draft) => {
    setDraftState((prev) => updater(prev));
  }, []);

  const registerProfile = useCallback(
    async (p: Profile) => {
      setProfile(p);
      await persist({ profile: p, transactions, savingsEntries });
    },
    [transactions, savingsEntries, persist]
  );

  const updateProfile = useCallback(
    async (partial: Partial<Profile>) => {
      setProfile((prev) => {
        const next = prev ? { ...prev, ...partial } : null;
        persist({ profile: next, transactions, savingsEntries });
        return next;
      });
    },
    [transactions, savingsEntries, persist]
  );

  const resetAll = useCallback(async () => {
    setProfile(null);
    setTransactions([]);
    setSavingsEntries([]);
    setDraftState({});
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('No se pudo limpiar el almacenamiento local', e);
    }
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      loading,
      profile,
      transactions,
      savingsEntries,
      draft,
      setDraft,
      registerProfile,
      updateProfile,
      resetAll,
    }),
    [
      loading,
      profile,
      transactions,
      savingsEntries,
      draft,
      setDraft,
      registerProfile,
      updateProfile,
      resetAll,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
