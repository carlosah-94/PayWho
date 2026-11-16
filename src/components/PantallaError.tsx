import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '@/components/PrimaryButton';
import { Brand } from '@/constants/brand';
import { logger } from '@/utils/logger';

/**
 * Se muestra cuando una pantalla falla al dibujarse (ErrorBoundary de Expo Router).
 * En vez de cerrarse la app, el usuario ve este mensaje y puede reintentar.
 */
export default function PantallaError({ error, retry }: ErrorBoundaryProps) {
  // El error se guarda en el registro para poder revisarlo después.
  useEffect(() => {
    logger.error('app', 'Una pantalla falló y se mostró la pantalla de error', error);
  }, [error]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contenido}>
        <Text style={styles.icono}>⚠️</Text>
        <Text style={styles.titulo}>Algo salió mal</Text>
        <Text style={styles.texto}>
          Ocurrió un problema al mostrar esta pantalla. Tus datos están a salvo en tu cuenta.
        </Text>
        {/* El detalle técnico solo se ve mientras se desarrolla. */}
        {__DEV__ ? <Text style={styles.detalle}>{error.message}</Text> : null}
        <View style={styles.boton}>
          <PrimaryButton title="Reintentar" onPress={retry} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.background },
  contenido: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  icono: { fontSize: 40, marginBottom: 12 },
  titulo: { fontSize: 20, fontWeight: '800', color: Brand.textPrimary, marginBottom: 8 },
  texto: { fontSize: 14, color: Brand.textSecondary, textAlign: 'center', lineHeight: 20 },
  detalle: { fontSize: 11, color: Brand.danger, textAlign: 'center', marginTop: 12 },
  boton: { alignSelf: 'stretch', marginTop: 24 },
});
