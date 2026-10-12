/**
 * Interruptor de funcionalidad para Ajustes.
 *
 * Mientras esta bandera está en `false`, la pantalla de Ajustes se puede
 * VISITAR y se ve igual (mismo diseño, mismos textos), pero los campos y el
 * botón "Guardar cambios" quedan deshabilitados. El botón "Cerrar sesión" no
 * depende de esta bandera: siempre funciona.
 *
 * Ingresos, Pagos y Ahorros ya funcionan completas y no dependen de esta bandera.
 *
 * Para activar Ajustes: cambia su valor a `true` en este archivo.
 */
export const FEATURES = {
  ajustes: false,
};
