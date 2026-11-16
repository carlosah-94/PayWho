import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

/**
 * Notificaciones locales de Pay Who: las programa el propio celular, no necesitan internet.
 * - Recordatorio diario para registrar los gastos, a la hora que elija el usuario.
 * - Aviso cuando una meta de ahorro se completa.
 */

// Cómo se muestran las notificaciones cuando la app está abierta: como banner y en la lista.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// En Android cada notificación pertenece a un "canal"; el usuario puede silenciarlo desde los ajustes.
const CANAL = 'recordatorios';
const ID_RECORDATORIO = 'recordatorio-diario';
const PREFERENCIA_KEY = '@paywho/notificaciones/v1';

export interface PreferenciaNotificaciones {
  activas: boolean;
  hora: number; // 0 a 23: hora del recordatorio diario
}

const PREFERENCIA_INICIAL: PreferenciaNotificaciones = { activas: false, hora: 20 };

export type EstadoPermiso = 'concedido' | 'denegado' | 'bloqueado';

let canalCreado = false;
/** Crea el canal de Android. Devuelve false si no se pudo (p. ej. en Expo Go): se usa el canal por defecto. */
async function prepararCanal() {
  if (Platform.OS !== 'android') return false;
  if (canalCreado) return true;
  try {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Recordatorios y metas',
      importance: Notifications.AndroidImportance.HIGH,
    });
    canalCreado = true;
  } catch (e) {
    logger.info('notificaciones', 'No se pudo crear el canal; se usará el canal por defecto', e);
  }
  return canalCreado;
}

// En Android se indica el canal solo si se pudo crear.
const canal = (listo: boolean) => (listo ? { channelId: CANAL } : {});

/**
 * Pide el permiso de notificaciones (Android 13+ e iOS lo exigen).
 * 'bloqueado' = el usuario lo rechazó y el sistema ya no deja volver a preguntar: hay que ir a Ajustes.
 */
export async function pedirPermiso(): Promise<EstadoPermiso> {
  // En Android el canal debe existir antes de pedir el permiso para que aparezca el cuadro del sistema.
  await prepararCanal();
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return 'concedido';
  if (!actual.canAskAgain) return 'bloqueado';
  const respuesta = await Notifications.requestPermissionsAsync();
  if (respuesta.granted) return 'concedido';
  return respuesta.canAskAgain ? 'denegado' : 'bloqueado';
}

/** true si el permiso ya está concedido (no muestra ningún cuadro). */
export async function tienePermiso() {
  const actual = await Notifications.getPermissionsAsync();
  return actual.granted;
}

/** Programa (o reprograma) el recordatorio que se repite todos los días a la hora indicada. */
export async function programarRecordatorio(hora: number) {
  const listo = await prepararCanal();
  await cancelarRecordatorio();
  await Notifications.scheduleNotificationAsync({
    identifier: ID_RECORDATORIO,
    content: {
      title: 'Pay Who',
      body: '¿Registraste tus pagos de hoy? Anótalos para no perder el control de tu dinero.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: hora, minute: 0, ...canal(listo) },
  });
  logger.info('notificaciones', `Recordatorio diario programado a las ${hora}:00`);
}

export async function cancelarRecordatorio() {
  try {
    await Notifications.cancelScheduledNotificationAsync(ID_RECORDATORIO);
  } catch (e) {
    logger.debug('notificaciones', 'No había recordatorio que cancelar', e);
  }
}

/** Muestra de inmediato el aviso de meta completada (solo si el usuario activó las notificaciones). */
export async function avisarMetaCompletada(nombreMeta: string) {
  try {
    const preferencia = await leerPreferencia();
    if (!preferencia.activas || !(await tienePermiso())) return;
    const listo = await prepararCanal();
    await Notifications.scheduleNotificationAsync({
      content: { title: '¡Meta completada! 🎉', body: `Juntaste todo lo que necesitabas para “${nombreMeta}”.` },
      trigger: listo ? { channelId: CANAL } : null, // null = mostrar ahora
    });
  } catch (e) {
    // Si la notificación falla, la meta igual queda guardada; solo se registra el error.
    logger.warn('notificaciones', 'No se pudo mostrar el aviso de meta completada', e);
  }
}

// La preferencia es de este celular (no de la cuenta), por eso se guarda en AsyncStorage.
export async function leerPreferencia(): Promise<PreferenciaNotificaciones> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCIA_KEY);
    return raw ? { ...PREFERENCIA_INICIAL, ...JSON.parse(raw) } : PREFERENCIA_INICIAL;
  } catch (e) {
    logger.warn('notificaciones', 'No se pudo leer la preferencia', e);
    return PREFERENCIA_INICIAL;
  }
}

export async function guardarPreferencia(preferencia: PreferenciaNotificaciones) {
  await AsyncStorage.setItem(PREFERENCIA_KEY, JSON.stringify(preferencia));
}

/** Al cerrar sesión: se cancelan las notificaciones pendientes y se olvida la preferencia. */
export async function limpiarNotificaciones() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(PREFERENCIA_KEY);
  } catch (e) {
    logger.warn('notificaciones', 'No se pudieron limpiar las notificaciones', e);
  }
}
