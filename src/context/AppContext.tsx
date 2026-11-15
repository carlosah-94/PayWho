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

export type TipoOperacion = 'ingreso' | 'pago';
export type EstadoMeta = 'activa' | 'completada' | 'cancelada';

// Los siguientes tipos corresponden, uno a uno, a las tablas de la base de datos.

/** Tabla categoria_operacion. */
export interface Categoria {
  id: number;
  nombre: string;
  icon: string;
  tipo: TipoOperacion;
  predefinida: boolean; // true = viene con la app; false = la creó el usuario
}

/** Tabla operacion: un ingreso o un pago. El tipo se lee de su categoría. */
export interface Operacion {
  id: number;
  categoria: Categoria;
  monto: number;
  descripcion: string | null;
  fecha: string; // ISO
}

/** Tabla meta_ahorro. */
export interface MetaAhorro {
  id: number;
  nombre: string;
  icon: string;
  meta: number; // monto objetivo
  estado: EstadoMeta;
  creadoEn: string; // ISO
}

/** Tabla ahorro. */
export interface Ahorro {
  id: number;
  operacionId: number | null; // con valor = automático (lo generó ese ingreso); null = manual
  metaId: number | null; // null = ahorro general, sin meta
  monto: number;
  porcentaje: number | null; // solo en los automáticos
  fecha: string; // ISO
}

export interface Draft {
  apodo?: string;
  ahorroPct?: number;
  moneda?: Moneda;
}

// Las cuatro listas que se traen del servidor y se guardan en el celular como caché.
interface DataLists {
  categorias: Categoria[];
  operaciones: Operacion[];
  metas: MetaAhorro[];
  ahorros: Ahorro[];
}

interface AppContextValue extends DataLists {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  syncing: boolean; // true mientras se están trayendo las listas del servidor
  syncError: string | null; // mensaje si la última actualización falló (se sigue mostrando la caché)
  refreshData: () => Promise<void>;
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
const DATA_KEY = '@paywho/data/v1';

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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [metas, setMetas] = useState<MetaAhorro[]>([]);
  const [ahorros, setAhorros] = useState<Ahorro[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [draft, setDraftState] = useState<Draft>({});

  const setLists = useCallback((data: DataLists) => {
    setCategorias(data.categorias);
    setOperaciones(data.operaciones);
    setMetas(data.metas);
    setAhorros(data.ahorros);
  }, []);

  // Borra del celular todo lo del usuario (al cerrar sesión o cuando la sesión deja de ser válida).
  const clearLocalData = useCallback(async () => {
    setSession(null);
    setProfile(null);
    setLists({ categorias: [], operaciones: [], metas: [], ahorros: [] });
    setSyncError(null);
    setDraftState({});
    await Promise.all([store(SESSION_KEY, null), store(PROFILE_KEY, null), store(DATA_KEY, null)]);
  }, [setLists]);

  /**
   * Trae las cuatro listas del servidor y las guarda en el celular.
   * Las pantallas la llaman después de crear, editar o eliminar algo.
   * Si falla (por ejemplo, sin internet) se conserva lo que ya estaba en pantalla.
   */
  const refreshData = useCallback(async () => {
    const userId = api.getUserId();
    if (!userId) return;
    setSyncing(true);
    try {
      const [nextCategorias, nextOperaciones, nextMetas, nextAhorros] = await Promise.all([
        api.getCategorias(),
        api.getOperaciones(),
        api.getMetas(),
        api.getAhorros(),
      ]);
      // Si mientras tanto se cerró la sesión o entró otra cuenta, la respuesta se descarta.
      if (api.getUserId() !== userId) return;
      const data: DataLists = {
        categorias: nextCategorias,
        operaciones: nextOperaciones,
        metas: nextMetas,
        ahorros: nextAhorros,
      };
      setLists(data);
      setSyncError(null);
      await store(DATA_KEY, data);
    } catch (e) {
      if (api.getUserId() === userId) setSyncError(api.errorMessage(e));
    } finally {
      setSyncing(false);
    }
  }, [setLists]);

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
      const [savedSession, savedProfile, savedData] = await Promise.all([
        readStored<Session>(SESSION_KEY),
        readStored<Profile>(PROFILE_KEY),
        readStored<DataLists>(DATA_KEY),
      ]);
      if (!active) return;

      api.setSession(savedSession);
      setSession(savedSession);
      setProfile(savedProfile);
      // Las listas guardadas se muestran de inmediato; luego se actualizan desde el servidor.
      if (savedSession && savedData) setLists(savedData);
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
  }, [setLists]);

  // Cuando hay un usuario con perfil (al abrir la app, al iniciar sesión o al terminar el registro)
  // se traen sus listas del servidor.
  const userId = session?.userId;
  const hasProfile = !!profile;
  useEffect(() => {
    if (userId && hasProfile) refreshData();
  }, [userId, hasProfile, refreshData]);

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
      categorias,
      operaciones,
      metas,
      ahorros,
      syncing,
      syncError,
      refreshData,
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
      categorias,
      operaciones,
      metas,
      ahorros,
      syncing,
      syncError,
      refreshData,
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
