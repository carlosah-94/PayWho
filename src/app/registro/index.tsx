import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '@/components/Logo';
import StepDots from '@/components/StepDots';
import PrimaryButton from '@/components/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { Brand } from '@/constants/brand';

export default function RegistroApodo() {
  const { draft, setDraft } = useApp();
  const [apodo, setApodo] = useState(draft.apodo ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleContinuar = () => {
    if (!apodo.trim()) {
      setError('Ingresa un apodo para continuar.');
      return;
    }
    setDraft((d) => ({ ...d, apodo: apodo.trim() }));
    router.push('/registro/ahorro');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Logo size={100} align="center" />
        <StepDots total={3} current={0} style={{ marginTop: 32 }} />
        <Text style={styles.title}>¡Hola! ¿Cómo te llamas?</Text>
        <Text style={styles.subtitle}>Usaremos tu apodo para personalizar la experiencia.</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu apodo o nombre"
          placeholderTextColor="#9AA1AC"
          value={apodo}
          onChangeText={(t) => {
            setApodo(t);
            setError(null);
          }}
          maxLength={30}
          autoFocus
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Continuar" onPress={handleContinuar} disabled={!apodo.trim()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'space-between' },
  content: { padding: 24, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: Brand.textPrimary, marginTop: 8, textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    color: Brand.textSecondary,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: Brand.textPrimary,
  },
  error: { fontSize: 13, color: Brand.danger, marginTop: 10, alignSelf: 'flex-start' },
  footer: { padding: 24 },
});
