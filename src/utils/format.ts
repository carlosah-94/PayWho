import type { Moneda } from '@/context/AppContext';

const SYMBOLS: Record<Moneda, string> = { PEN: 'S/', USD: '$', EUR: '€' };

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

export function formatMonto(monto: number, moneda: Moneda) {
  return `${SYMBOLS[moneda]} ${monto.toFixed(2)}`;
}

export function formatFechaHora(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  return `${fecha} · ${hora}`;
}

export function nombreMes(date: Date = new Date()) {
  return `${MESES[date.getMonth()]} ${date.getFullYear()}`;
}

export function nombreMesCorto(date: Date) {
  return MESES_CORTOS[date.getMonth()];
}
