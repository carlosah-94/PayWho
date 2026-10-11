import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Logo from '@/components/Logo';
import PrimaryButton from '@/components/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { Brand } from '@/constants/brand';
import { errorMessage } from '@/services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

export default function Login() {
  const { signIn, signUp } = useApp();
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const repetirRef = useRef<TextInput>(null);

  const esCrear = modo === 'crear';
  const incompleto = !email.trim() || !password || (esCrear && !repetir);

  const validar = () => {
    if (!EMAIL_REGEX.test(email.trim())) return 'Escribe un correo válido.';
    if (password.length < MIN_PASSWORD) return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
    if (esCrear && password !== repetir) return 'Las contraseñas no coinciden.';
    return null;
  };

  const handleEnviar = async () => {
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      if (esCrear) await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
      // No hace falta navegar: al haber sesión, _layout.tsx muestra la pantalla que corresponde.
    } catch (e) {
      setError(errorMessage(e));
      setEnviando(false);
    }
  };

  const handleCambiarModo = () => {
    setModo(esCrear ? 'entrar' : 'crear');
    setRepetir('');
    setError(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Logo size={100} align="center" />
          <Text style={styles.title}>{esCrear ? 'Crea tu cuenta' : '¡Bienvenido de nuevo!'}</Text>
          <Text style={styles.subtitle}>
            {esCrear
              ? 'Regístrate con tu correo para guardar tus ingresos, pagos y ahorros.'
              : 'Inicia sesión para ver tus ingresos, pagos y ahorros.'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#9AA1AC"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!enviando}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <View style={styles.passwordRow}>
            <TextInput
              ref={passwordRef}
              style={[styles.input, styles.passwordInput]}
              placeholder="Contraseña"
              placeholderTextColor="#9AA1AC"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError(null);
              }}
              secureTextEntry={!verPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!enviando}
              returnKeyType={esCrear ? 'next' : 'done'}
              onSubmitEditing={() => (esCrear ? repetirRef.current?.focus() : handleEnviar())}
            />
            <TouchableOpacity
              style={styles.toggle}
              onPress={() => setVerPassword((v) => !v)}
              accessibilityRole="button"
            >
              <Text style={styles.toggleText}>{verPassword ? 'Ocultar' : 'Ver'}</Text>
            </TouchableOpacity>
          </View>

          {esCrear ? (
            <TextInput
              ref={repetirRef}
              style={styles.input}
              placeholder="Repite tu contraseña"
              placeholderTextColor="#9AA1AC"
              value={repetir}
              onChangeText={(t) => {
                setRepetir(t);
                setError(null);
              }}
              secureTextEntry={!verPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!enviando}
              returnKeyType="done"
              onSubmitEditing={handleEnviar}
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            title={esCrear ? 'Crear cuenta' : 'Iniciar sesión'}
            onPress={handleEnviar}
            disabled={incompleto}
            loading={enviando}
          />
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={handleCambiarModo}
            disabled={enviando}
            accessibilityRole="button"
          >
            <Text style={styles.switchText}>
              {esCrear ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
              <Text style={styles.switchTextStrong}>{esCrear ? 'Inicia sesión' : 'Crea una'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  content: { padding: 24, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: Brand.textPrimary, marginTop: 32, textAlign: 'center' },
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
    marginBottom: 12,
  },
  passwordRow: { width: '100%', justifyContent: 'center' },
  passwordInput: { paddingRight: 76 },
  toggle: { position: 'absolute', right: 14, top: 0, bottom: 12, justifyContent: 'center' },
  toggleText: { fontSize: 13, fontWeight: '700', color: Brand.textSecondary },
  error: { fontSize: 13, color: Brand.danger, marginTop: 4, alignSelf: 'flex-start' },
  footer: { padding: 24 },
  switchBtn: { alignItems: 'center', marginTop: 16 },
  switchText: { fontSize: 13, color: Brand.textSecondary },
  switchTextStrong: { fontWeight: '700', color: Brand.textPrimary },
});
