import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Logo from '@/components/Logo';
import StepDots from '@/components/StepDots';
import PrimaryButton from '@/components/PrimaryButton';
import { useApp, type Moneda } from '@/context/AppContext';
import { Brand } from '@/constants/brand';

const OPCIONES: { value: Moneda; label: string; symbol: string }[] = [
  { value: 'PEN', label: 'Soles', symbol: 'S/' },
  { value: 'USD', label: 'Dólares', symbol: '$' },
  { value: 'EUR', label: 'Euros', symbol: '€' },
];

export default function RegistroMoneda() {
  const { draft, setDraft, registerProfile } = useApp();
  const [moneda, setMoneda] = useState<Moneda>(draft.moneda ?? 'PEN');

  const handleFinalizar = async () => {
    setDraft((d) => ({ ...d, moneda }));
    await registerProfile({
      apodo: draft.apodo ?? '',
      ahorroPct: draft.ahorroPct ?? 15,
      moneda,
    });
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Logo size={90} align="center" />
        <StepDots total={3} current={2} style={{ marginTop: 24 }} />
        <Text style={styles.title}>Elige tu moneda</Text>
        <Text style={styles.subtitle}>Todos tus registros se mostrarán en esta moneda.</Text>
        <View style={styles.list}>
          {OPCIONES.map((op) => {
            const selected = op.value === moneda;
            return (
              <TouchableOpacity
                key={op.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => setMoneda(op.value)}
                accessibilityRole="button"
              >
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {op.label} {op.symbol}
                </Text>
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="¡Empezar!" onPress={handleFinalizar} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'space-between' },
  content: { padding: 24, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: Brand.textPrimary, marginTop: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: Brand.textSecondary, marginTop: 8, marginBottom: 24, textAlign: 'center' },
  list: { width: '100%', gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
  },
  optionSelected: { backgroundColor: Brand.ink, borderColor: Brand.ink },
  optionLabel: { fontSize: 15, fontWeight: '600', color: Brand.textPrimary },
  optionLabelSelected: { color: '#FFFFFF' },
  check: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footer: { padding: 24 },
});
