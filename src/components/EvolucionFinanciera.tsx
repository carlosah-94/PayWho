import { StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/brand';

export interface MonthDatum {
  label: string;
  ingreso: number;
  gasto: number;
  ahorro: number;
}

const TRACK_HEIGHT = 70;

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

export default function EvolucionFinanciera({ data }: { data: MonthDatum[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.ingreso, d.gasto, d.ahorro]));

  return (
    <View>
      <View style={styles.legendRow}>
        <LegendDot color={Brand.ingreso} label="Ing" />
        <LegendDot color={Brand.pago} label="Gas" />
        <LegendDot color={Brand.ahorro} label="Aho" />
      </View>

      <View style={styles.chartRow}>
        {data.map((d) => (
          <View key={d.label} style={styles.monthGroup}>
            <View style={styles.barsRow}>
              <View
                style={[
                  styles.miniBar,
                  { height: Math.max(2, (d.ingreso / max) * TRACK_HEIGHT), backgroundColor: Brand.ingreso },
                ]}
              />
              <View
                style={[
                  styles.miniBar,
                  { height: Math.max(2, (d.gasto / max) * TRACK_HEIGHT), backgroundColor: Brand.pago },
                ]}
              />
              <View
                style={[
                  styles.miniBar,
                  { height: Math.max(2, (d.ahorro / max) * TRACK_HEIGHT), backgroundColor: Brand.ahorro },
                ]}
              />
            </View>
            <Text style={styles.monthLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legendRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 11, color: Brand.textSecondary },
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: TRACK_HEIGHT + 22 },
  monthGroup: { alignItems: 'center', width: 36 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: TRACK_HEIGHT },
  miniBar: { width: 5, borderRadius: 3 },
  monthLabel: { fontSize: 10, color: Brand.textSecondary, marginTop: 6 },
});
