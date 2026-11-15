import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '@/components/Logo';
import StepDots from '@/components/StepDots';
import PrimaryButton from '@/components/PrimaryButton';
import PercentSlider from '@/components/PercentSlider';
import { useApp } from '@/context/AppContext';
import { Brand } from '@/constants/brand';

export default function RegistroAhorro() {
  const { draft, setDraft } = useApp();
  const [pct, setPct] = useState(draft.ahorroPct ?? 15);

  const handleContinuar = () => {
    setDraft((d) => ({ ...d, ahorroPct: pct }));
    router.push('/registro/moneda');
  };

  const ejemplo = (1000 * pct) / 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Logo size={90} align="center" />
        <StepDots total={3} current={1} style={{ marginTop: 24 }} />
        <Text style={styles.title}>Ahorro automático</Text>
        <Text style={styles.subtitle}>
          Cada ingreso que registres apartará este porcentaje a tus ahorros. Puedes dejarlo en 0% para omitirlo.
        </Text>

        <View style={styles.pctRow}>
          <Text style={styles.pctLabel}>Porcentaje</Text>
          <Text style={styles.pctValue}>{pct}%</Text>
        </View>
        <PercentSlider value={pct} onChange={setPct} />

        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            Por cada S/1,000 de ingreso, apartas S/{ejemplo.toFixed(0)} automáticamente.
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Continuar" onPress={handleContinuar} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'space-between' },
  content: { padding: 24, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: Brand.textPrimary, marginTop: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: Brand.textSecondary, marginTop: 8, marginBottom: 28, textAlign: 'center' },
  pctRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  pctLabel: { fontSize: 13, fontWeight: '700', color: Brand.textPrimary },
  pctValue: { fontSize: 15, fontWeight: '800', color: Brand.textPrimary },
  hintBox: { backgroundColor: Brand.background, borderRadius: 12, padding: 14, marginTop: 24, width: '100%' },
  hintText: { fontSize: 12, color: Brand.textSecondary, textAlign: 'center' },
  footer: { padding: 24 },
});
