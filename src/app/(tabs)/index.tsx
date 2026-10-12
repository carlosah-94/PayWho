import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { formatFechaHora, formatMonto, nombreMes, nombreMesCorto } from '@/utils/format';
import Card from '@/components/Card';
import EvolucionFinanciera, { type MonthDatum } from '@/components/EvolucionFinanciera';
import Logo from '@/components/Logo';
import { Brand } from '@/constants/brand';

function isSameMonth(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
}

export default function Inicio() {
  const { profile, operaciones, ahorros, syncing, syncError, refreshData } = useApp();
  const now = new Date();
  const moneda = profile?.moneda ?? 'PEN';

  const { totalIngreso, totalGasto, totalAhorro } = useMemo(() => {
    let ingreso = 0;
    let gasto = 0;
    for (const t of operaciones) {
      if (!isSameMonth(t.fecha, now)) continue;
      if (t.categoria.tipo === 'ingreso') ingreso += t.monto;
      else gasto += t.monto;
    }
    let ahorro = 0;
    for (const e of ahorros) {
      if (isSameMonth(e.fecha, now)) ahorro += e.monto;
    }
    return { totalIngreso: ingreso, totalGasto: gasto, totalAhorro: ahorro };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operaciones, ahorros]);

  const balance = totalIngreso - totalGasto;

  const evolucion: MonthDatum[] = useMemo(() => {
    const meses: Date[] = [];
    for (let i = 5; i >= 0; i--) {
      meses.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }
    return meses.map((mesRef) => {
      let ingreso = 0;
      let gasto = 0;
      let ahorro = 0;
      for (const t of operaciones) {
        if (!isSameMonth(t.fecha, mesRef)) continue;
        if (t.categoria.tipo === 'ingreso') ingreso += t.monto;
        else gasto += t.monto;
      }
      for (const e of ahorros) {
        if (isSameMonth(e.fecha, mesRef)) ahorro += e.monto;
      }
      return { label: nombreMesCorto(mesRef), ingreso, gasto, ahorro };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operaciones, ahorros]);

  const movimientos = useMemo(
    () =>
      operaciones
        .slice()
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 6),
    [operaciones]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        // Deslizar hacia abajo vuelve a traer los datos del servidor.
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshData} tintColor={Brand.primary} />}
      >
        {syncError ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{syncError} Se muestra lo último guardado en el celular.</Text>
          </View>
        ) : null}

        <View style={styles.header}>
          <View>
            <Text style={styles.month}>{nombreMes(now)}</Text>
            <Text style={styles.greeting}>Hola, {profile?.apodo || 'invitado'} 👋</Text>
          </View>
          <Logo size={70} align="flex-end" />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <View style={styles.statLabelRow}>
              <View style={[styles.dot, { backgroundColor: Brand.ingreso }]} />
              <Text style={styles.statLabel}>INGRESOS</Text>
            </View>
            <Text style={styles.statValue}>{formatMonto(totalIngreso, moneda)}</Text>
          </View>
          <View style={styles.statChip}>
            <View style={styles.statLabelRow}>
              <View style={[styles.dot, { backgroundColor: Brand.pago }]} />
              <Text style={styles.statLabel}>GASTOS</Text>
            </View>
            <Text style={styles.statValue}>{formatMonto(totalGasto, moneda)}</Text>
          </View>
          <View style={styles.statChip}>
            <View style={styles.statLabelRow}>
              <View style={[styles.dot, { backgroundColor: Brand.ahorro }]} />
              <Text style={styles.statLabel}>AHORRO</Text>
            </View>
            <Text style={styles.statValue}>{formatMonto(totalAhorro, moneda)}</Text>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Balance del mes</Text>
          <Text style={styles.balanceValue}>{formatMonto(balance, moneda)}</Text>
          <Text style={styles.balanceSub}>
            Disponible tras {formatMonto(totalGasto, moneda)} en pagos y {formatMonto(totalAhorro, moneda)} apartados.
          </Text>
        </View>

        <Card>
          <Text style={styles.cardTitle}>Evolución financiera</Text>
          <EvolucionFinanciera data={evolucion} />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Movimientos recientes</Text>
          {movimientos.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Text style={{ fontSize: 18 }}>$</Text>
              </View>
              <Text style={styles.emptyTitle}>Sin actividad reciente</Text>
              <Text style={styles.emptySubtitle}>Registra un ingreso o pago para comenzar.</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {movimientos.map((m) => (
                <View key={m.id} style={styles.movRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.movCategoria}>{m.categoria.nombre}</Text>
                    <Text style={styles.movFecha}>{formatFechaHora(m.fecha)}</Text>
                  </View>
                  <Text style={[styles.movMonto, { color: m.categoria.tipo === 'ingreso' ? Brand.ingreso : Brand.pago }]}>
                    {m.categoria.tipo === 'ingreso' ? '+' : '-'}
                    {formatMonto(m.monto, moneda)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.background },
  scroll: { padding: 20, gap: 14 },
  notice: { backgroundColor: Brand.pagoTint, borderRadius: 12, padding: 12 },
  noticeText: { fontSize: 12, color: Brand.danger },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  month: { fontSize: 12, color: Brand.textSecondary },
  greeting: { fontSize: 22, fontWeight: '800', color: Brand.textPrimary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    padding: 10,
  },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statLabel: { fontSize: 10, fontWeight: '700', color: Brand.textSecondary, letterSpacing: 0.3 },
  statValue: { fontSize: 14, fontWeight: '700', color: Brand.textPrimary, marginTop: 6 },
  balanceCard: { backgroundColor: Brand.ink, borderRadius: 18, padding: 20 },
  balanceLabel: { color: '#C6C9D0', fontSize: 13, fontWeight: '600' },
  balanceValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginTop: 6 },
  balanceSub: { color: '#9AA0AC', fontSize: 12, marginTop: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Brand.textPrimary, marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 16 },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 13, fontWeight: '600', color: Brand.textPrimary },
  emptySubtitle: { fontSize: 12, color: Brand.textSecondary, marginTop: 4, textAlign: 'center' },
  movRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  movCategoria: { fontSize: 14, fontWeight: '600', color: Brand.textPrimary },
  movFecha: { fontSize: 11, color: Brand.textSecondary, marginTop: 2 },
  movMonto: { fontSize: 14, fontWeight: '700' },
});
