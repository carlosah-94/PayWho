import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CamaraComprobante from '@/components/CamaraComprobante';
import Card from '@/components/Card';
import UbicacionInput, { urlMapa, type Coordenadas } from '@/components/UbicacionInput';
import CategoriaInput from '@/components/CategoriaInput';
import ListaEnTarjeta from '@/components/ListaEnTarjeta';
import PrimaryButton from '@/components/PrimaryButton';
import { Brand } from '@/constants/brand';
import { Common } from '@/constants/styles';
import { useApp, type Operacion } from '@/context/AppContext';
import { useAviso } from '@/hooks/use-aviso';
import * as api from '@/services/api';
import { formatFechaHora, formatMonto, parseMonto } from '@/utils/format';

const ICONO_CATEGORIA_NUEVA = '🧾';

/** Pagos funciona igual que Ingresos, pero con las categorías de tipo 'pago' y sin ahorro automático. */
export default function Pagos() {
  const { profile, categorias, operaciones, syncing, refreshData } = useApp();
  const [tipo, setTipo] = useState('');
  const [monto, setMonto] = useState('');
  const [editando, setEditando] = useState<Operacion | null>(null);
  const [porEliminar, setPorEliminar] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useAviso();
  // Comprobante del pago
  const [fotoNueva, setFotoNueva] = useState<string | null>(null); // foto recién tomada, aún en el celular
  const [fotoGuardada, setFotoGuardada] = useState<string | null>(null); // foto que ya tenía el pago en edición
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [viendo, setViendo] = useState<string | null>(null); // enlace del comprobante abierto desde el historial
  const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null); // GPS del pago
  const listaRef = useRef<FlatList<Operacion>>(null);

  const moneda = profile?.moneda ?? 'PEN';
  const nombre = tipo.trim();

  // De todas las operaciones, esta pantalla solo usa las que son pagos.
  const pagos = useMemo(() => operaciones.filter((op) => op.categoria.tipo === 'pago'), [operaciones]);
  const total = useMemo(() => pagos.reduce((suma, op) => suma + op.monto, 0), [pagos]);

  const categoriasPago = useMemo(() => categorias.filter((c) => c.tipo === 'pago'), [categorias]);
  const categoriaEscrita = categoriasPago.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase());

  const limpiarFormulario = () => {
    setTipo('');
    setMonto('');
    setEditando(null);
    setFotoNueva(null);
    setFotoGuardada(null);
    setUbicacion(null);
  };

  const handleGuardar = async () => {
    const valor = parseMonto(monto);
    if (!nombre) {
      setError('Escribe o elige el tipo de pago.');
      return;
    }
    if (valor === null) {
      setError('Escribe un monto mayor que 0.');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      // Si la categoría escrita no existe todavía, se crea para este usuario.
      const categoria =
        categoriaEscrita ?? (await api.createCategoria({ nombre, icon: ICONO_CATEGORIA_NUEVA, tipo: 'pago' }));

      // Si se tomó una foto, primero se sube; su ruta se guarda junto con el pago.
      const comprobante = fotoNueva ? await api.uploadComprobante(fotoNueva) : fotoGuardada;
      const coords = { latitud: ubicacion?.latitud ?? null, longitud: ubicacion?.longitud ?? null };

      if (editando) {
        await api.updateOperacion(editando.id, { categoriaId: categoria.id, monto: valor, comprobante, ...coords });
        // Si la foto anterior se quitó o se reemplazó, se borra del almacén.
        if (editando.comprobante && editando.comprobante !== comprobante) {
          api.deleteComprobante(editando.comprobante).catch(() => {});
        }
        setAviso('Pago actualizado ✓');
      } else {
        await api.createOperacion({ categoriaId: categoria.id, monto: valor, comprobante, ...coords });
        setAviso('Pago registrado ✓');
      }
      limpiarFormulario();
    } catch (e) {
      setError(api.errorMessage(e));
    } finally {
      // Pase lo que pase, se vuelven a traer las listas para mostrar lo que quedó guardado.
      await refreshData();
      setGuardando(false);
    }
  };

  const handleVerComprobante = async (path: string) => {
    setError(null);
    try {
      // La foto es privada: se pide al servidor un enlace temporal para mostrarla.
      setViendo(await api.getComprobanteUrl(path));
    } catch (e) {
      setError(api.errorMessage(e));
    }
  };

  const handleEditar = (op: Operacion) => {
    setEditando(op);
    setTipo(op.categoria.nombre);
    setMonto(String(op.monto));
    setFotoNueva(null);
    setFotoGuardada(op.comprobante ?? null);
    setUbicacion(op.latitud !== null && op.longitud !== null ? { latitud: op.latitud, longitud: op.longitud } : null);
    setError(null);
    setPorEliminar(null);
    listaRef.current?.scrollToOffset({ offset: 0, animated: true }); // sube al formulario
  };

  const handleEliminar = async (op: Operacion) => {
    const id = op.id;
    setPorEliminar(null);
    setError(null);
    try {
      await api.deleteOperacion(id);
      // La foto del comprobante ya no hace falta: se borra del almacén.
      if (op.comprobante) api.deleteComprobante(op.comprobante).catch(() => {});
      if (editando?.id === id) limpiarFormulario();
      setAviso('Pago eliminado ✓');
    } catch (e) {
      setError(api.errorMessage(e));
    }
    await refreshData();
  };

  return (
    <SafeAreaView style={Common.container} edges={['top']}>
      <ListaEnTarjeta
        listaRef={listaRef}
        datos={pagos}
        titulo={`Historial (${pagos.length})`}
        vacio="Sin pagos registrados."
        extraData={[porEliminar, guardando, moneda]}
        refreshing={syncing}
        onRefresh={refreshData}
        encabezado={
          <>
            <Text style={Common.title}>Pagos</Text>

            <View style={[Common.totalCard, styles.totalCard]}>
              <Text style={[Common.totalLabel, { color: Brand.pago }]}>TOTAL GASTADO</Text>
              <Text style={Common.totalValue}>{formatMonto(total, moneda)}</Text>
            </View>

            <Card>
              <Text style={Common.cardTitle}>{editando ? 'Editar pago' : 'Nuevo pago'}</Text>
              {/* Se puede escribir la categoría o elegirla de la lista que abre la flecha. */}
              <CategoriaInput
                value={tipo}
                onChangeText={(t) => {
                  setTipo(t);
                  setError(null);
                }}
                categorias={categoriasPago}
                placeholder="Tipo (ej. Alquiler, Comida)"
                disabled={guardando}
              />
              {nombre && !categoriaEscrita ? (
                <Text style={Common.hint}>Se creará la categoría “{nombre}”.</Text>
              ) : null}

              <TextInput
                style={Common.input}
                placeholder="Monto"
                placeholderTextColor="#9AA1AC"
                value={monto}
                onChangeText={(t) => {
                  setMonto(t);
                  setError(null);
                }}
                keyboardType="decimal-pad"
                editable={!guardando}
              />

              {/* Comprobante: foto tomada con la cámara (opcional). */}
              {fotoNueva || fotoGuardada ? (
                <View style={styles.fotoRow}>
                  {fotoNueva ? (
                    <Image source={{ uri: fotoNueva }} style={styles.fotoMini} />
                  ) : (
                    <View style={[styles.fotoMini, styles.fotoMiniVacia]}>
                      <Text>📷</Text>
                    </View>
                  )}
                  <Text style={styles.fotoTexto}>Comprobante adjunto</Text>
                  <TouchableOpacity onPress={() => setCamaraAbierta(true)} disabled={guardando}>
                    <Text style={Common.action}>Cambiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setFotoNueva(null);
                      setFotoGuardada(null);
                    }}
                    disabled={guardando}
                  >
                    <Text style={Common.actionDanger}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.fotoBoton}
                  onPress={() => setCamaraAbierta(true)}
                  disabled={guardando}
                  accessibilityRole="button"
                >
                  <Text style={styles.fotoBotonTexto}>📷 Tomar foto del comprobante</Text>
                </TouchableOpacity>
              )}

              {/* Ubicación (GPS) donde se hizo el pago (opcional). */}
              <UbicacionInput value={ubicacion} onChange={setUbicacion} disabled={guardando} />

              {error ? <Text style={Common.error}>{error}</Text> : null}
              {aviso ? <Text style={Common.aviso}>{aviso}</Text> : null}

              <PrimaryButton
                title={editando ? 'Guardar cambios' : 'Registrar pago'}
                onPress={handleGuardar}
                loading={guardando}
              />
              {editando ? (
                <TouchableOpacity style={Common.link} onPress={limpiarFormulario} disabled={guardando}>
                  <Text style={Common.linkText}>Cancelar edición</Text>
                </TouchableOpacity>
              ) : null}
            </Card>
          </>
        }
        renderFila={(op) => (
          <View style={Common.row}>
            <View style={Common.rowTop}>
              <View style={Common.rowMain}>
                <Text style={Common.rowTitle}>
                  {op.categoria.icon} {op.categoria.nombre}
                </Text>
                <Text style={Common.rowSub}>{formatFechaHora(op.fecha)}</Text>
                {op.comprobante ? (
                  <TouchableOpacity onPress={() => handleVerComprobante(op.comprobante ?? '')}>
                    <Text style={styles.verFoto}>📷 Ver comprobante</Text>
                  </TouchableOpacity>
                ) : null}
                {op.latitud !== null && op.longitud !== null ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(urlMapa({ latitud: op.latitud ?? 0, longitud: op.longitud ?? 0 }))}
                  >
                    <Text style={styles.verFoto}>📍 Ver ubicación</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={[Common.rowAmount, { color: Brand.pago }]}>-{formatMonto(op.monto, moneda)}</Text>
            </View>

            {porEliminar === op.id ? (
              <View style={Common.rowActions}>
                <Text style={Common.actionMuted}>¿Eliminar este pago?</Text>
                <TouchableOpacity onPress={() => handleEliminar(op)}>
                  <Text style={Common.actionDanger}>Sí, eliminar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPorEliminar(null)}>
                  <Text style={Common.action}>No</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={Common.rowActions}>
                <TouchableOpacity onPress={() => handleEditar(op)} disabled={guardando}>
                  <Text style={Common.action}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPorEliminar(op.id)} disabled={guardando}>
                  <Text style={Common.actionDanger}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

      <CamaraComprobante
        visible={camaraAbierta}
        onCancel={() => setCamaraAbierta(false)}
        onCapture={(uri) => {
          setFotoNueva(uri);
          setCamaraAbierta(false);
        }}
      />

      {/* Comprobante de un pago del historial, a pantalla completa. */}
      <Modal visible={viendo !== null} animationType="fade" onRequestClose={() => setViendo(null)}>
        <SafeAreaView style={styles.visor}>
          <TouchableOpacity style={styles.visorCerrar} onPress={() => setViendo(null)} accessibilityRole="button">
            <Text style={styles.visorCerrarTexto}>Cerrar</Text>
          </TouchableOpacity>
          {viendo ? (
            <Image source={{ uri: viendo }} style={styles.visorFoto} resizeMode="contain" />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  totalCard: { backgroundColor: Brand.pagoTint },
  fotoBoton: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  fotoBotonTexto: { fontSize: 13, fontWeight: '600', color: Brand.textSecondary },
  fotoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  fotoMini: { width: 44, height: 44, borderRadius: 8, backgroundColor: Brand.border },
  fotoMiniVacia: { alignItems: 'center', justifyContent: 'center' },
  fotoTexto: { flex: 1, fontSize: 13, color: Brand.textPrimary },
  verFoto: { fontSize: 11, fontWeight: '600', color: Brand.ahorro, marginTop: 4 },
  visor: { flex: 1, backgroundColor: '#000000' },
  visorCerrar: { alignSelf: 'flex-end', padding: 16 },
  visorCerrarTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  visorFoto: { flex: 1 },
});
