import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { logger } from '@/utils/logger';

// Fuerza mínima para considerar que el celular se agitó (en reposo el acelerómetro marca cerca de 1).
const UMBRAL = 1.8;
// Tiempo mínimo entre dos sacudidas, para que un solo movimiento no cuente varias veces.
const ESPERA_MS = 1000;

/**
 * Hook propio: escucha el acelerómetro y llama a `alAgitar` cuando el usuario agita el celular.
 * Al salir de la pantalla deja de escuchar el sensor para no gastar batería.
 */
export function useAgitar(alAgitar: () => void, activo = true) {
  // Se guarda la función en una referencia para no reiniciar el sensor cada vez que cambia.
  const callback = useRef(alAgitar);
  callback.current = alAgitar;

  useEffect(() => {
    if (!activo) return;
    let ultima = 0;
    let suscripcion: { remove: () => void } | null = null;
    let cancelado = false;

    const escuchar = () => {
      suscripcion?.remove();
      Accelerometer.setUpdateInterval(150);
      suscripcion = Accelerometer.addListener(({ x, y, z }) => {
        const fuerza = Math.sqrt(x * x + y * y + z * z);
        const ahora = Date.now();
        if (fuerza > UMBRAL && ahora - ultima > ESPERA_MS) {
          ultima = ahora;
          callback.current();
        }
      });
    };

    Accelerometer.isAvailableAsync()
      .then((disponible) => {
        if (!disponible || cancelado) {
          if (!disponible) logger.info('sensores', 'El acelerómetro no está disponible en este dispositivo');
          return;
        }
        escuchar();
      })
      .catch((e) => logger.warn('sensores', 'No se pudo iniciar el acelerómetro', e));

    // Android apaga el sensor cuando la app pasa a segundo plano; al volver se vuelve a escuchar.
    const estadoApp = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && suscripcion && !cancelado) escuchar();
    });

    // Limpieza: se deja de escuchar el sensor al salir de la pantalla.
    return () => {
      cancelado = true;
      estadoApp.remove();
      suscripcion?.remove();
    };
  }, [activo]);
}
