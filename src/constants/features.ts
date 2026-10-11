/**
 * Interruptor de funcionalidad para Ajustes.
 *
 * Mientras esta bandera está en `false`, la pantalla de Ajustes se puede
 * VISITAR y se ve igual (mismo diseño, mismos textos), pero los campos y el
 * botón "Guardar cambios" quedan deshabilitados. El botón "Cerrar sesión" no
 * depende de esta bandera: siempre funciona.
 *
 * Ingresos, Pagos y Ahorros todavía no tienen código propio: son pantallas
 * en blanco a propósito. Cada integrante va a escribir esa pantalla desde
 * cero en su tarjeta (ver la guía del equipo).
 *
 * Para activar Ajustes: cambia su valor a `true` en este archivo.
 */
export const FEATURES = {
  ajustes: false,
};
