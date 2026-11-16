import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Image, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '@/components/PrimaryButton';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onCapture: (uri: string) => void; // ubicación de la foto tomada, dentro del celular
}

/**
 * Cámara a pantalla completa para fotografiar un comprobante.
 * Primero pide el permiso de cámara; luego toma la foto y deja revisarla antes de usarla.
 */
export default function CamaraComprobante({ visible, onCancel, onCapture }: Props) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [foto, setFoto] = useState<string | null>(null); // foto tomada, pendiente de aceptar
  const [tomando, setTomando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const camara = useRef<CameraView>(null);

  const cerrar = () => {
    setFoto(null);
    setError(null);
    onCancel();
  };

  const handleTomar = async () => {
    if (tomando) return;
    setTomando(true);
    setError(null);
    try {
      // quality 0.5 reduce el peso de la foto para que suba más rápido.
      const resultado = await camara.current?.takePictureAsync({ quality: 0.5 });
      if (resultado?.uri) setFoto(resultado.uri);
    } catch {
      setError('No se pudo tomar la foto. Inténtalo de nuevo.');
    } finally {
      setTomando(false);
    }
  };

  const handleUsar = () => {
    if (!foto) return;
    onCapture(foto);
    setFoto(null);
  };

  let contenido;
  if (!permiso) {
    // Todavía se está consultando el estado del permiso.
    contenido = <View style={styles.fill} />;
  } else if (!permiso.granted) {
    contenido = (
      <View style={styles.permiso}>
        <Text style={styles.permisoTitulo}>Permiso de cámara</Text>
        <Text style={styles.permisoTexto}>
          Pay Who usa la cámara solo para fotografiar los comprobantes de tus pagos.
        </Text>
        {permiso.canAskAgain ? (
          <PrimaryButton title="Permitir cámara" variant="secondary" onPress={pedirPermiso} />
        ) : (
          <>
            <Text style={styles.permisoTexto}>
              El permiso fue rechazado. Para activarlo, abre los ajustes del celular y permite la cámara.
            </Text>
            <PrimaryButton title="Abrir ajustes" variant="secondary" onPress={() => Linking.openSettings()} />
          </>
        )}
      </View>
    );
  } else if (foto) {
    contenido = (
      <>
        <Image source={{ uri: foto }} style={styles.fill} resizeMode="contain" />
        <View style={styles.barra}>
          <TouchableOpacity style={styles.barraBoton} onPress={() => setFoto(null)} accessibilityRole="button">
            <Text style={styles.barraTexto}>Repetir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.barraBoton} onPress={handleUsar} accessibilityRole="button">
            <Text style={[styles.barraTexto, styles.barraTextoFuerte]}>Usar foto</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  } else {
    contenido = (
      <>
        <CameraView ref={camara} style={styles.fill} facing="back" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.barra}>
          <TouchableOpacity
            style={[styles.disparador, tomando && styles.disparadorOcupado]}
            onPress={handleTomar}
            disabled={tomando}
            accessibilityRole="button"
            accessibilityLabel="Tomar foto"
          />
        </View>
      </>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cerrar}>
      <SafeAreaView style={styles.container}>
        <View style={styles.cabecera}>
          <Text style={styles.titulo}>Foto del comprobante</Text>
          <TouchableOpacity onPress={cerrar} accessibilityRole="button">
            <Text style={styles.cancelar}>Cancelar</Text>
          </TouchableOpacity>
        </View>
        {contenido}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  fill: { flex: 1 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  titulo: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cancelar: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  permiso: { flex: 1, justifyContent: 'center', padding: 28, gap: 16 },
  permisoTitulo: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  permisoTexto: { color: '#C6C9D0', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  barra: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 20 },
  barraBoton: { paddingVertical: 10, paddingHorizontal: 20 },
  barraTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  barraTextoFuerte: { fontWeight: '800' },
  disparador: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#9AA1AC',
  },
  disparadorOcupado: { opacity: 0.5 },
  error: { color: '#FF8A8E', fontSize: 13, textAlign: 'center', paddingTop: 10 },
});
