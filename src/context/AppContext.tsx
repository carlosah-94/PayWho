import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '@/services/api';
import type { Session } from '@/services/api';

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

interface AppContextValue {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  transactions: Transaction[];
  savingsEntries: SavingsEntry[];
  draft: Draft;
  setDraft: (updater: (d: Draft) => Draft) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  registerProfile: (profile: Profile) => Promise<void>;
  updateProfile: (partial: Partial<Profile>) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// Cada dato se guarda en su propia clave de AsyncStorage.
const SESSION_KEY = '@paywho/session/v1';
const PROFILE_KEY = '@paywho/profile/v1';

async function readStored<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (e) {
    console.warn('No se pudo cargar el almacenamiento local', e);
    return null;
  }
}

async function store(key: string, value: unknown) {
  try {
    if (value === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('No se pudo guardar el almacenamiento local', e);
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsEntries, setSavingsEntries] = useState<SavingsEntry[]>([]);
  const [draft, setDraftState] = useState<Draft>({});

  // Borra del celular todo lo del usuario (al cerrar sesión o cuando la sesión deja de ser válida).
  const clearLocalData = useCallback(async () => {
    setSession(null);
    setProfile(null);
    setTransactions([]);
    setSavingsEntries([]);
    setDraftState({});
    await Promise.all([store(SESSION_KEY, null), store(PROFILE_KEY, null)]);
  }, []);

  // api.ts avisa aquí cuando renueva el token (cada hora aprox.) o cuando el servidor ya no acepta la sesión.
  useEffect(() => {
    api.onSessionChange((next) => {
      if (next) {
        setSession(next);
        store(SESSION_KEY, next);
      } else {
        clearLocalData();
      }
    });
    return () => api.onSessionChange(null);
  }, [clearLocalData]);

  // Al abrir la app: se restaura lo guardado en el celular y luego se actualiza el perfil desde el servidor.
  useEffect(() => {
    let active = true;
    (async () => {
      const [savedSession, savedProfile] = await Promise.all([
        readStored<Session>(SESSION_KEY),
        readStored<Profile>(PROFILE_KEY),
      ]);
      if (!active) return;

      api.setSession(savedSession);
      setSession(savedSession);
      setProfile(savedProfile);
      // Con perfil guardado se entra de inmediato, aunque no haya internet.
      if (!savedSession || savedProfile) setLoading(false);

      if (savedSession) {
        try {
          const remoteProfile = await api.getProfile();
          if (active) {
            setProfile(remoteProfile);
            store(PROFILE_KEY, remoteProfile);
          }
        } catch {
          // Sin internet se sigue usando el perfil guardado en el celular.
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const setDraft = useCallback((updater: (d: Draft) => Draft) => {
    setDraftState((prev) => updater(prev));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const nextSession = await api.signIn(email, password);
    let nextProfile: Profile | null;
    try {
      nextProfile = await api.getProfile();
    } catch (e) {
      // Si no se pudo saber si ya tiene perfil, no se deja la sesión a medias.
      api.setSession(null);
      throw e;
    }
    setSession(nextSession);
    setProfile(nextProfile);
    await Promise.all([store(SESSION_KEY, nextSession), store(PROFILE_KEY, nextProfile)]);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const nextSession = await api.signUp(email, password);
    setSession(nextSession);
    setProfile(null);
    setDraftState({});
    await store(SESSION_KEY, nextSession);
  }, []);

  const signOut = useCallback(async () => {
    await api.signOut();
    await clearLocalData();
  }, [clearLocalData]);

  const registerProfile = useCallback(async (p: Profile) => {
    const saved = await api.saveProfile(p);
    setProfile(saved);
    await store(PROFILE_KEY, saved);
  }, []);

  const updateProfile = useCallback(async (partial: Partial<Profile>) => {
    const saved = await api.updateProfile(partial);
    setProfile(saved);
    await store(PROFILE_KEY, saved);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      loading,
      session,
      profile,
      transactions,
      savingsEntries,
      draft,
      setDraft,
      signIn,
      signUp,
      signOut,
      registerProfile,
      updateProfile,
    }),
    [
      loading,
      session,
      profile,
      transactions,
      savingsEntries,
      draft,
      setDraft,
      signIn,
      signUp,
      signOut,
      registerProfile,
      updateProfile,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
