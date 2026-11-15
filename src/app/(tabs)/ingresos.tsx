import { useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/Card';
import CategoriaInput from '@/components/CategoriaInput';
import PrimaryButton from '@/components/PrimaryButton';
import { Brand } from '@/constants/brand';
import { Common } from '@/constants/styles';
import { useApp, type Ahorro, type Operacion } from '@/context/AppContext';
import { useAviso } from '@/hooks/use-aviso';
import * as api from '@/services/api';
import { formatFechaHora, formatMonto, parseMonto, redondear } from '@/utils/format';

const ICONO_CATEGORIA_NUEVA = '💰';

export default function Ingresos() {
  const { profile, categorias, operaciones, ahorros, syncing, refreshData } = useApp();
  const [tipo, setTipo] = useState('');
  const [monto, setMonto] = useState('');
  const [editando, setEditando] = useState<Operacion | null>(null);
  const [porEliminar, setPorEliminar] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useAviso();
  const scrollRef = useRef<ScrollView>(null);

  const moneda = profile?.moneda ?? 'PEN';
  const ahorroPct = profile?.ahorroPct ?? 0;
  const nombre = tipo.trim();

  // De todas las operaciones, esta pantalla solo usa las que son ingresos.
  const ingresos = useMemo(() => operaciones.filter((op) => op.categoria.tipo === 'ingreso'), [operaciones]);
  const total = useMemo(() => ingresos.reduce((suma, op) => suma + op.monto, 0), [ingresos]);

  // Ahorro automático de cada ingreso, para mostrarlo en el historial y recalcularlo al editar.
  const ahorroPorIngreso = useMemo(() => {
    const mapa = new Map<number, Ahorro>();
    for (const a of ahorros) {
      if (a.operacionId !== null) mapa.set(a.operacionId, a);
    }
    return mapa;
  }, [ahorros]);

  const categoriasIngreso = useMemo(() => categorias.filter((c) => c.tipo === 'ingreso'), [categorias]);
  const categoriaEscrita = categoriasIngreso.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase());

  const limpiarFormulario = () => {
    setTipo('');
    setMonto('');
    setEditando(null);
  };

  const handleGuardar = async () => {
    const valor = parseMonto(monto);
    if (!nombre) {
      setError('Escribe o elige el tipo de ingreso.');
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
        categoriaEscrita ??
        (await api.createCategoria({ nombre, icon: ICONO_CATEGORIA_NUEVA, tipo: 'ingreso' }));

      if (editando) {
        await api.updateOperacion(editando.id, { categoriaId: categoria.id, monto: valor });
        // El ahorro automático se recalcula con el porcentaje que se usó el día del ingreso.
        const ahorro = ahorroPorIngreso.get(editando.id);
        if (ahorro?.porcentaje) {
          const apartado = redondear((valor * ahorro.porcentaje) / 100);
          if (apartado > 0) await api.updateAhorro(ahorro.id, { monto: apartado });
          else await api.deleteAhorro(ahorro.id);
        }
        setAviso('Ingreso actualizado ✓');
      } else {
        const ingreso = await api.createOperacion({ categoriaId: categoria.id, monto: valor });
        // Ahorro automático: se aparta el porcentaje configurado en el perfil.
        let apartado = redondear((valor * ahorroPct) / 100);
        if (apartado > 0) {
          try {
            await api.createAhorro({ operacionId: ingreso.id, porcentaje: ahorroPct, monto: apartado });
          } catch {
            apartado = 0;
            setError('El ingreso se guardó, pero no se pudo apartar el ahorro automático.');
          }
        }
        setAviso(
          apartado > 0
            ? `Ingreso registrado ✓ Se apartaron ${formatMonto(apartado, moneda)} de ahorro.`
            : 'Ingreso registrado ✓'
        );
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
      // El servidor borra también el ahorro automático de ese ingreso.
      await api.deleteOperacion(id);
      if (editando?.id === id) limpiarFormulario();
      setAviso('Ingreso eliminado ✓');
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
        <Text style={Common.title}>Ingresos</Text>

        <View style={[Common.totalCard, styles.totalCard]}>
          <View>
            <Text style={[Common.totalLabel, { color: Brand.ingreso }]}>TOTAL REGISTRADO</Text>
            <Text style={Common.totalValue}>{formatMonto(total, moneda)}</Text>
          </View>
          <View style={styles.autoBox}>
            <Text style={styles.autoLabel}>Ahorro auto</Text>
            <Text style={styles.autoValue}>{ahorroPct}%</Text>
          </View>
        </View>

        <Card>
          <Text style={Common.cardTitle}>{editando ? 'Editar ingreso' : 'Nuevo ingreso'}</Text>
          {/* Se puede escribir la categoría o elegirla de la lista que abre la flecha. */}
          <CategoriaInput
            value={tipo}
            onChangeText={(t) => {
              setTipo(t);
              setError(null);
            }}
            categorias={categoriasIngreso}
            placeholder="Tipo (ej. Sueldo, Venta)"
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
            title={editando ? 'Guardar cambios' : 'Registrar ingreso'}
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
          <Text style={Common.cardTitle}>Historial ({ingresos.length})</Text>
          {ingresos.length === 0 ? (
            <Text style={[Common.empty, Common.row]}>Sin ingresos aún. ¡Registra tu primero!</Text>
          ) : (
            ingresos.map((op) => {
              const ahorro = ahorroPorIngreso.get(op.id);
              return (
                <View key={op.id} style={Common.row}>
                  <View style={Common.rowTop}>
                    <View style={Common.rowMain}>
                      <Text style={Common.rowTitle}>
                        {op.categoria.icon} {op.categoria.nombre}
                      </Text>
                      <Text style={Common.rowSub}>{formatFechaHora(op.fecha)}</Text>
                      {ahorro ? (
                        <Text style={styles.rowAhorro}>
                          Ahorro: {formatMonto(ahorro.monto, moneda)} ({ahorro.porcentaje}%)
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[Common.rowAmount, { color: Brand.ingreso }]}>+{formatMonto(op.monto, moneda)}</Text>
                  </View>

                  {porEliminar === op.id ? (
                    <View style={Common.rowActions}>
                      <Text style={Common.actionMuted}>¿Eliminar este ingreso?</Text>
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
              );
            })
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  totalCard: {
    backgroundColor: Brand.ingresoTint,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoBox: {
    backgroundColor: Brand.ahorroTint,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  autoLabel: { fontSize: 11, fontWeight: '700', color: Brand.ahorro },
  autoValue: { fontSize: 15, fontWeight: '800', color: Brand.ahorro, marginTop: 2 },
  rowAhorro: { fontSize: 11, fontWeight: '600', color: Brand.ahorro, marginTop: 2 },
});
