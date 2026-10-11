/**
 * Único archivo de la app que habla con el servidor (Supabase) usando fetch.
 *
 * Supabase expone dos APIs REST:
 *   /auth/v1/...  -> cuentas: crear cuenta, iniciar y cerrar sesión.
 *   /rest/v1/...  -> tablas de la base de datos (perfil, operacion, ahorro, etc.).
 *
 * La dirección y la llave pública se leen del archivo .env (que no se sube al repo).
 */
import type { Moneda, Profile } from '@/context/AppContext';

const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const API_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const TIMEOUT_MS = 10000;

export interface Session {
  accessToken: string; // identifica al usuario en cada petición (dura alrededor de 1 hora)
  refreshToken: string; // sirve para pedir un accessToken nuevo sin volver a escribir la contraseña
  expiresAt: number; // momento en que vence el accessToken, en segundos
  userId: string;
  email: string;
}

/** Error con un mensaje en español listo para mostrar en pantalla. */
export class ApiError extends Error {
  status: number; // código HTTP; 0 = no hubo respuesta (sin internet o tiempo agotado)

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function errorMessage(e: unknown) {
  return e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

// Traducción de los códigos de error del servidor a mensajes para el usuario.
const ERROR_MESSAGES: Record<string, string> = {
  // Cuentas (Supabase Auth)
  invalid_credentials: 'Correo o contraseña incorrectos.',
  user_already_exists: 'Ya existe una cuenta con ese correo. Inicia sesión.',
  email_exists: 'Ya existe una cuenta con ese correo. Inicia sesión.',
  weak_password: 'La contraseña es muy débil. Usa al menos 6 caracteres.',
  email_address_invalid: 'El correo no es válido.',
  validation_failed: 'Revisa el correo y la contraseña.',
  email_not_confirmed: 'Debes confirmar tu correo antes de iniciar sesión.',
  signup_disabled: 'El registro de cuentas está desactivado.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  // Base de datos (PostgreSQL)
  '23505': 'Ese dato ya existe.',
  '23503': 'No se puede completar porque hay datos relacionados.',
  '23514': 'Hay un valor fuera de lo permitido.',
  '42501': 'No tienes permiso para hacer esto.',
};

function toApiError(status: number, body: unknown) {
  const data = body as { error_code?: string; code?: string | number } | null;
  const code = String(data?.error_code ?? data?.code ?? '');
  if (ERROR_MESSAGES[code]) return new ApiError(ERROR_MESSAGES[code], status);
  if (status === 401) return new ApiError('Tu sesión venció. Vuelve a iniciar sesión.', status);
  if (status === 429) return new ApiError('Demasiados intentos. Espera un momento e inténtalo de nuevo.', status);
  if (status >= 500) return new ApiError('El servidor no está disponible. Inténtalo más tarde.', status);
  return new ApiError(`No se pudo completar la operación (error ${status}).`, status);
}

// ---------------------------------------------------------------------------
// Sesión en memoria
// ---------------------------------------------------------------------------

let currentSession: Session | null = null;
let sessionListener: ((session: Session | null) => void) | null = null;
let refreshInProgress: Promise<void> | null = null;

/** AppContext la usa al abrir la app para restaurar la sesión guardada en AsyncStorage. */
export function setSession(session: Session | null) {
  currentSession = session;
}

/** AppContext se registra aquí para enterarse cuando el token se renueva o la sesión deja de ser válida. */
export function onSessionChange(listener: ((session: Session | null) => void) | null) {
  sessionListener = listener;
}

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

// ---------------------------------------------------------------------------
// Petición central
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean; // false = petición sin usuario (crear cuenta, iniciar sesión)
}

async function send(path: string, options: RequestOptions) {
  if (!BASE_URL || !API_KEY) {
    throw new ApiError('Falta configurar el archivo .env con la dirección y la llave de Supabase.', 0);
  }

  const headers: Record<string, string> = {
    apikey: API_KEY,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (options.auth !== false && currentSession) {
    headers.Authorization = `Bearer ${currentSession.accessToken}`;
  }

  // Si el servidor no responde en 10 segundos, se cancela la petición.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', 0);
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Todas las llamadas al servidor pasan por aquí: agrega la llave y el token,
 * renueva el token si ya venció y convierte los errores en ApiError.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const needsSession = options.auth !== false;
  if (needsSession) {
    if (!currentSession) throw new ApiError('Inicia sesión para continuar.', 401);
    // Si al token le queda menos de un minuto, se renueva antes de usarlo.
    if (currentSession.expiresAt - 60 <= nowInSeconds()) await refreshSession();
  }

  let response = await send(path, options);
  if (response.status === 401 && needsSession) {
    // El servidor rechazó el token: se renueva una vez y se repite la petición.
    await refreshSession();
    response = await send(path, options);
  }

  const body = await readBody(response);
  if (!response.ok) throw toApiError(response.status, body);
  return body as T;
}

// ---------------------------------------------------------------------------
// Cuentas (Supabase Auth)
// ---------------------------------------------------------------------------

interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: { id: string; email?: string };
}

function toSession(data: AuthResponse | null): Session | null {
  if (!data?.access_token || !data.refresh_token || !data.user) return null;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at ?? nowInSeconds() + (data.expires_in ?? 3600),
    userId: data.user.id,
    email: data.user.email ?? '',
  };
}

/** Crea una cuenta nueva y deja la sesión iniciada. */
export async function signUp(email: string, password: string) {
  const data = await request<AuthResponse>('/auth/v1/signup', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  const session = toSession(data);
  if (!session) throw new ApiError('Cuenta creada. Confirma tu correo y luego inicia sesión.', 0);
  currentSession = session;
  return session;
}

/** Inicia sesión con correo y contraseña. */
export async function signIn(email: string, password: string) {
  const data = await request<AuthResponse>('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  const session = toSession(data);
  if (!session) throw new ApiError('El servidor no devolvió una sesión válida.', 0);
  currentSession = session;
  return session;
}

/** Cierra la sesión en el servidor. Si no hay internet, igual se cierra en el celular. */
export async function signOut() {
  try {
    if (currentSession) await send('/auth/v1/logout', { method: 'POST' });
  } catch {
    // Sin conexión: no se pudo avisar al servidor, pero la sesión local se borra de todos modos.
  }
  currentSession = null;
}

/** Pide un accessToken nuevo usando el refreshToken. Si varias peticiones lo necesitan a la vez, se hace una sola vez. */
function refreshSession() {
  if (!refreshInProgress) {
    refreshInProgress = (async () => {
      const response = await send('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: { refresh_token: currentSession?.refreshToken },
        auth: false,
      });
      const body = await readBody(response);
      const session = response.ok ? toSession(body as AuthResponse) : null;

      if (session) {
        currentSession = session;
        sessionListener?.(session);
        return;
      }
      if (response.status === 429 || response.status >= 500) throw toApiError(response.status, body);

      // El servidor ya no acepta esta sesión: se cierra y la app vuelve al login.
      currentSession = null;
      sessionListener?.(null);
      throw new ApiError('Tu sesión venció. Vuelve a iniciar sesión.', 401);
    })().finally(() => {
      refreshInProgress = null;
    });
  }
  return refreshInProgress;
}

// ---------------------------------------------------------------------------
// Tabla perfil
// ---------------------------------------------------------------------------

interface PerfilRow {
  apodo: string;
  moneda: Moneda;
  porcentaje_ahorro: number;
}

const PERFIL_COLUMNS = 'apodo,moneda,porcentaje_ahorro';

// La tabla usa porcentaje_ahorro y la app usa ahorroPct: aquí se convierte de un nombre al otro.
function toProfile(row: PerfilRow): Profile {
  return { apodo: row.apodo, moneda: row.moneda, ahorroPct: row.porcentaje_ahorro };
}

function toPerfilRow(profile: Partial<Profile>) {
  const row: Partial<PerfilRow> = {};
  if (profile.apodo !== undefined) row.apodo = profile.apodo;
  if (profile.moneda !== undefined) row.moneda = profile.moneda;
  if (profile.ahorroPct !== undefined) row.porcentaje_ahorro = profile.ahorroPct;
  return row;
}

/** GET: trae el perfil del usuario con sesión iniciada. Devuelve null si todavía no respondió las 3 preguntas. */
export async function getProfile() {
  const rows = await request<PerfilRow[]>(
    `/rest/v1/perfil?id=eq.${currentSession?.userId}&select=${PERFIL_COLUMNS}`
  );
  return rows.length > 0 ? toProfile(rows[0]) : null;
}

/** POST: guarda el perfil al terminar el registro. Si ya existía, lo reemplaza en vez de duplicarlo. */
export async function saveProfile(profile: Profile) {
  const rows = await request<PerfilRow[]>(`/rest/v1/perfil?select=${PERFIL_COLUMNS}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: { id: currentSession?.userId, ...toPerfilRow(profile) },
  });
  return toProfile(rows[0]);
}

/** PATCH: cambia solo los campos enviados del perfil (pantalla Ajustes). */
export async function updateProfile(partial: Partial<Profile>) {
  const rows = await request<PerfilRow[]>(
    `/rest/v1/perfil?id=eq.${currentSession?.userId}&select=${PERFIL_COLUMNS}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: toPerfilRow(partial),
    }
  );
  if (rows.length === 0) throw new ApiError('No se encontró tu perfil.', 404);
  return toProfile(rows[0]);
}
