import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp, type Moneda } from '@/context/AppContext';
import PrimaryButton from '@/components/PrimaryButton';
import PercentSlider from '@/components/PercentSlider';
import Logo from '@/components/Logo';
import { Brand } from '@/constants/brand';
import { FEATURES } from '@/constants/features';
import { errorMessage } from '@/services/api';

const OPCIONES: { value: Moneda; symbol: string }[] = [
  { value: 'PEN', symbol: 'S/' },
  { value: 'USD', symbol: '$' },
  { value: 'EUR', symbol: '€' },
];

export default function Ajustes() {
  const { profile, updateProfile, signOut } = useApp();
  const [apodo, setApodo] = useState(profile?.apodo ?? '');
  const [moneda, setMoneda] = useState<Moneda>(profile?.moneda ?? 'PEN');
  const [pct, setPct] = useState(profile?.ahorroPct ?? 15);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleGuardar = async () => {
    if (!FEATURES.ajustes) return; // Funcionalidad aún no habilitada.
    if (!apodo.trim()) {
      setError('El apodo no puede estar vacío.');
      return;
    }
    setError(null);
    try {
      await updateProfile({ apodo: apodo.trim(), moneda, ahorroPct: pct });
    } catch (e) {
      setError(errorMessage(e));
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCerrarSesion = () => {
    // El cierre de sesión funciona siempre, aunque el resto de Ajustes todavía esté bloqueado.
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir? Tus datos quedan guardados en tu cuenta.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        // Al quedar sin sesión, _layout.tsx muestra el login.
        onPress: signOut,
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Ajustes</Text>

        <View style={styles.card}>
          <Text style={styles.label}>APODO</Text>
          <TextInput
            style={[styles.input, !FEATURES.ajustes && styles.inputDisabled]}
            editable={FEATURES.ajustes}
            value={apodo}
            onChangeText={(t) => {
              setApodo(t);
              setError(null);
            }}
          />

          <Text style={[styles.label, styles.labelSpaced]}>MONEDA</Text>
          <View style={styles.segmented}>
            {OPCIONES.map((op) => {
              const selected = op.value === moneda;
              return (
                <TouchableOpacity
                  key={op.value}
                  style={[styles.segment, selected && styles.segmentSelected]}
                  onPress={() => FEATURES.ajustes && setMoneda(op.value)}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{op.symbol}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.rowBetween, styles.labelSpaced]}>
            <Text style={styles.label}>AHORRO AUTOMÁTICO</Text>
            <Text style={styles.pctValue}>{pct}%</Text>
          </View>
          <View pointerEvents={FEATURES.ajustes ? 'auto' : 'none'} style={!FEATURES.ajustes && styles.sliderDisabled}>
            <PercentSlider value={pct} onChange={setPct} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {saved ? <Text style={styles.saved}>Cambios guardados ✓</Text> : null}

          <View style={styles.spacer} />
          <PrimaryButton title="Guardar cambios" onPress={handleGuardar} disabled={!FEATURES.ajustes} />
        </View>

        <View style={styles.footer}>
          <Logo size={28} align="center" />
          <Text style={styles.footerCaption}>Pay Who v1.0 · Gestión financiero personal</Text>
          <TouchableOpacity onPress={handleCerrarSesion} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.background },
  scroll: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '800', color: Brand.textPrimary, marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: Brand.border, padding: 16 },
  label: { fontSize: 11, fontWeight: '700', color: Brand.textSecondary, letterSpacing: 0.4, marginBottom: 8 },
  labelSpaced: { marginTop: 20 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Brand.textPrimary,
  },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: '#FFFFFF',
  },
  segmentSelected: { backgroundColor: Brand.ink, borderColor: Brand.ink },
  segmentText: { fontSize: 15, fontWeight: '700', color: Brand.textPrimary },
  segmentTextSelected: { color: '#FFFFFF' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pctValue: { fontSize: 14, fontWeight: '800', color: Brand.textPrimary },
  inputDisabled: { backgroundColor: Brand.background, color: '#9AA1AC' },
  sliderDisabled: { opacity: 0.4 },
  error: { fontSize: 13, color: Brand.danger, marginTop: 16 },
  saved: { fontSize: 13, color: Brand.ingreso, marginTop: 16 },
  spacer: { height: 20 },
  footer: { alignItems: 'center', marginTop: 28, gap: 6 },
  footerCaption: { fontSize: 11, color: Brand.textSecondary },
  logoutBtn: { marginTop: 18 },
  logoutText: { fontSize: 13, fontWeight: '700', color: Brand.danger },
});
