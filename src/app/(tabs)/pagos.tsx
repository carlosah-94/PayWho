import { useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/Card';
import CategoriaInput from '@/components/CategoriaInput';
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
  const scrollRef = useRef<ScrollView>(null);

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

      if (editando) {
        await api.updateOperacion(editando.id, { categoriaId: categoria.id, monto: valor });
        setAviso('Pago actualizado ✓');
      } else {
        await api.createOperacion({ categoriaId: categoria.id, monto: valor });
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

  const handleEditar = (op: Operacion) => {
    setEditando(op);
    setTipo(op.categoria.nombre);
    setMonto(String(op.monto));
    setError(null);
    setPorEliminar(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleEliminar = async (id: number) => {
    setPorEliminar(null);
    setError(null);
    try {
      await api.deleteOperacion(id);
      if (editando?.id === id) limpiarFormulario();
      setAviso('Pago eliminado ✓');
    } catch (e) {
      setError(api.errorMessage(e));
    }
    await refreshData();
  };

  return (
    <SafeAreaView style={Common.container} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={Common.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshData} tintColor={Brand.primary} />}
      >
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

        <Card>
          <Text style={Common.cardTitle}>Historial ({pagos.length})</Text>
          {pagos.length === 0 ? (
            <Text style={[Common.empty, Common.row]}>Sin pagos registrados.</Text>
          ) : (
            pagos.map((op) => (
              <View key={op.id} style={Common.row}>
                <View style={Common.rowTop}>
                  <View style={Common.rowMain}>
                    <Text style={Common.rowTitle}>
                      {op.categoria.icon} {op.categoria.nombre}
                    </Text>
                    <Text style={Common.rowSub}>{formatFechaHora(op.fecha)}</Text>
                  </View>
                  <Text style={[Common.rowAmount, { color: Brand.pago }]}>-{formatMonto(op.monto, moneda)}</Text>
                </View>

                {porEliminar === op.id ? (
                  <View style={Common.rowActions}>
                    <Text style={Common.actionMuted}>¿Eliminar este pago?</Text>
                    <TouchableOpacity onPress={() => handleEliminar(op.id)}>
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
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  totalCard: { backgroundColor: Brand.pagoTint },
});
