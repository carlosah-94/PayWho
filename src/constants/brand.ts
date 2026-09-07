/**
 * Colores de marca de Pay Who, tomados EXACTAMENTE del prototipo
 * (Capturas del prototipo Pay Who.pdf): base blanco/negro minimalista,
 * con verde para ingresos, rojo para pagos y azul marino para ahorros.
 */
export const Brand = {
  ink: '#111318', // negro usado en botones, tarjeta de balance, estados seleccionados
  primary: '#111318', // alias: los botones principales son negros, no azules
  ingreso: '#1FAE59',
  ingresoTint: '#E7F7EC',
  pago: '#E5484D',
  pagoTint: '#FDEAEB',
  ahorro: '#16233F',
  ahorroTint: '#EEF1F7',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#E4E7EC',
  textPrimary: '#111318',
  textSecondary: '#6B7280',
  muted: '#C7CBD1',
  danger: '#E5484D',
} as const;
