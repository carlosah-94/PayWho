import { StyleSheet } from 'react-native';
import { Brand } from '@/constants/brand';

/**
 * Estilos que comparten las pantallas Ingresos, Pagos y Ahorros,
 * para que las tres se vean iguales sin repetir el mismo código.
 */
export const Common = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.background },
  scroll: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: Brand.textPrimary },

  // Tarjeta de total (cada pantalla le pone su color de fondo)
  totalCard: { borderRadius: 16, padding: 16 },
  totalLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  totalValue: { fontSize: 24, fontWeight: '800', color: Brand.textPrimary, marginTop: 4 },

  cardTitle: { fontSize: 15, fontWeight: '700', color: Brand.textPrimary, marginBottom: 12 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Brand.textPrimary,
    marginBottom: 10,
  },
  error: { fontSize: 13, color: Brand.danger, marginBottom: 10 },
  aviso: { fontSize: 13, color: Brand.ingreso, marginBottom: 10 },
  hint: { fontSize: 12, color: Brand.textSecondary, marginBottom: 10 },
  empty: { fontSize: 13, color: Brand.textSecondary, textAlign: 'center', paddingVertical: 18 },

  // Botones pequeños para elegir (categorías sugeridas, destino del ahorro)
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  chipSelected: { backgroundColor: Brand.ink, borderColor: Brand.ink },
  chipText: { fontSize: 12, fontWeight: '600', color: Brand.textPrimary },
  chipTextSelected: { color: '#FFFFFF' },

  // Filas de los historiales
  row: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: Brand.border },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: Brand.textPrimary },
  rowSub: { fontSize: 11, color: Brand.textSecondary, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '700' },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 6 },
  action: { fontSize: 12, fontWeight: '700', color: Brand.textPrimary },
  actionDanger: { fontSize: 12, fontWeight: '700', color: Brand.danger },
  actionMuted: { fontSize: 12, color: Brand.textSecondary },
  link: { alignItems: 'center', marginTop: 12 },
  linkText: { fontSize: 13, fontWeight: '700', color: Brand.textSecondary },
});
