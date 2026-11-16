import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Brand } from '@/constants/brand';
import * as notificaciones from '@/services/notificaciones';
import { logger } from '@/utils/logger';

const formatHora = (hora: number) => `${String(hora).padStart(2, '0')}:00`;

/**
 * Tarjeta de Ajustes para activar las notificaciones locales y elegir la hora del recordatorio diario.
 * Al activarla se pide el permiso de notificaciones del sistema.
 */
export default function NotificacionesCard() {
  const [cargando, setCargando] = useState(true);
  const [activas, setActivas] = useState(false);
  const [hora, setHora] = useState(20);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState(false); // permiso negado de forma permanente
  const [enviandoPush, setEnviandoPush] = useState(false);

  // Al abrir Ajustes se lee la preferencia guardada y se revisa si el permiso sigue concedido.
  useEffect(() => {
    let activo = true;
    (async () => {
      const preferencia = await notificaciones.leerPreferencia();
      const permiso = preferencia.activas ? await notificaciones.tienePermiso() : true;
      if (!activo) return;
      setHora(preferencia.hora);
      setActivas(preferencia.activas && permiso);
      // Se vuelve a registrar el celular para push por si su token cambió.
      if (preferencia.activas && permiso) notificaciones.registrarPush();
      if (preferencia.activas && !permiso) {
        // El usuario quitó el permiso desde los ajustes del celular.
        setBloqueado(true);
        setMensaje('Las notificaciones están desactivadas en los ajustes del celular.');
      }
      setCargando(false);
    })();
    return () => {
      activo = false;
    };
  }, []);

  const aplicar = async (nuevasActivas: boolean, nuevaHora: number) => {
    setOcupado(true);
    setMensaje(null);
    setBloqueado(false);
    try {
      if (nuevasActivas) {
        const permiso = await notificaciones.pedirPermiso();
        if (permiso !== 'concedido') {
          setBloqueado(permiso === 'bloqueado');
          setMensaje('Sin permiso de notificaciones no podemos enviarte recordatorios.');
          return;
        }
        await notificaciones.programarRecordatorio(nuevaHora);
        // Push: se registra el celular en segundo plano (no hace esperar al usuario).
        if (!activas) notificaciones.registrarPush();
      } else {
        await notificaciones.cancelarRecordatorio();
      }
      await notificaciones.guardarPreferencia({ activas: nuevasActivas, hora: nuevaHora });
      setActivas(nuevasActivas);
      setHora(nuevaHora);
      if (nuevasActivas) setMensaje(`Te recordaremos todos los días a las ${formatHora(nuevaHora)} ✓`);
    } catch (e) {
      logger.warn('notificaciones', 'No se pudo cambiar la configuración', e);
      setMensaje('No se pudo programar la notificación. Inténtalo otra vez.');
    } finally {
      setOcupado(false);
    }
  };

  const handlePushPrueba = async () => {
    setEnviandoPush(true);
    setMensaje(null);
    setBloqueado(false);
    try {
      await notificaciones.enviarPushDePrueba();
      setMensaje('Push enviada ✓ Debe llegar en unos segundos.');
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo enviar la notificación push.');
    } finally {
      setEnviandoPush(false);
    }
  };

  // Cambia la hora del recordatorio (de 0 a 23, dando la vuelta).
  const cambiarHora = (delta: number) => aplicar(true, (hora + delta + 24) % 24);

  return (
    <View style={styles.card}>
      <View style={styles.fila}>
        <View style={styles.textos}>
          <Text style={styles.label}>NOTIFICACIONES</Text>
          <Text style={styles.descripcion}>Recordatorio diario y aviso al completar una meta.</Text>
        </View>
        {cargando ? (
          <ActivityIndicator color={Brand.textSecondary} />
        ) : (
          <Switch
            value={activas}
            onValueChange={(valor) => aplicar(valor, hora)}
            disabled={ocupado}
            trackColor={{ true: Brand.ingreso, false: Brand.border }}
            thumbColor="#FFFFFF"
          />
        )}
      </View>

      {activas ? (
        <View style={[styles.fila, styles.filaHora]}>
          <Text style={styles.descripcion}>Hora del recordatorio</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.paso} onPress={() => cambiarHora(-1)} disabled={ocupado}>
              <Text style={styles.pasoTexto}>−</Text>
            </TouchableOpacity>
            <Text style={styles.hora}>{formatHora(hora)}</Text>
            <TouchableOpacity style={styles.paso} onPress={() => cambiarHora(1)} disabled={ocupado}>
              <Text style={styles.pasoTexto}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {activas ? (
        <TouchableOpacity style={styles.pushBoton} onPress={handlePushPrueba} disabled={ocupado || enviandoPush}>
          {enviandoPush ? (
            <ActivityIndicator color={Brand.textSecondary} />
          ) : (
            <Text style={styles.pushTexto}>🚀 Enviar notificación push de prueba</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {mensaje ? (
        <View style={styles.mensajeFila}>
          <Text style={[styles.mensaje, (bloqueado || !activas) && styles.mensajeError]}>{mensaje}</Text>
          {bloqueado ? (
            <TouchableOpacity onPress={() => Linking.openSettings()}>
              <Text style={styles.accion}>Abrir ajustes</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.border,
    padding: 16,
    marginTop: 16,
  },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  filaHora: { marginTop: 16 },
  textos: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', color: Brand.textSecondary, letterSpacing: 0.4, marginBottom: 4 },
  descripcion: { fontSize: 13, color: Brand.textPrimary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paso: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoTexto: { fontSize: 18, fontWeight: '700', color: Brand.textPrimary },
  hora: { fontSize: 16, fontWeight: '800', color: Brand.textPrimary, minWidth: 54, textAlign: 'center' },
  pushBoton: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  pushTexto: { fontSize: 13, fontWeight: '600', color: Brand.textSecondary },
  mensajeFila: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  mensaje: { flex: 1, fontSize: 12, color: Brand.ingreso },
  mensajeError: { color: Brand.danger },
  accion: { fontSize: 13, fontWeight: '700', color: Brand.primary },
});
