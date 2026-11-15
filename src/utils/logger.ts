/**
 * Registro de eventos de la app (logging).
 * Cada línea lleva la hora, el nivel y el módulo que la escribe, por ejemplo:
 *   [19:42:07] ERROR api: POST /storage/v1/object/... falló
 * Los mensajes "debug" solo se muestran mientras se desarrolla; en la app publicada se omiten.
 */
type Nivel = 'debug' | 'info' | 'warn' | 'error';

function escribir(nivel: Nivel, modulo: string, mensaje: string, detalle?: unknown) {
  if (nivel === 'debug' && !__DEV__) return;
  const hora = new Date().toTimeString().slice(0, 8);
  const linea = `[${hora}] ${nivel.toUpperCase()} ${modulo}: ${mensaje}`;
  // Mientras se desarrolla todo va a la terminal con console.log: console.warn y console.error
  // abren un aviso encima de la app. El nivel igual queda escrito al inicio de cada línea.
  const salida = __DEV__ ? console.log : nivel === 'error' ? console.error : nivel === 'warn' ? console.warn : console.log;
  if (detalle === undefined) salida(linea);
  else salida(linea, detalle instanceof Error ? `${detalle.name}: ${detalle.message}` : detalle);
}

export const logger = {
  debug: (modulo: string, mensaje: string, detalle?: unknown) => escribir('debug', modulo, mensaje, detalle),
  info: (modulo: string, mensaje: string, detalle?: unknown) => escribir('info', modulo, mensaje, detalle),
  warn: (modulo: string, mensaje: string, detalle?: unknown) => escribir('warn', modulo, mensaje, detalle),
  error: (modulo: string, mensaje: string, detalle?: unknown) => escribir('error', modulo, mensaje, detalle),
};
