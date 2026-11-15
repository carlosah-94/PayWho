import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import { Brand } from '@/constants/brand';
import { Common } from '@/constants/styles';
import { useApp, type Ahorro, type EstadoMeta, type MetaAhorro } from '@/context/AppContext';
import { useAviso } from '@/hooks/use-aviso';
import * as api from '@/services/api';
import { formatFechaHora, formatMonto, parseMonto } from '@/utils/format';

type Seccion = 'meta' | 'deposito' | 'lista';

// Una meta está "completada" cuando lo ahorrado alcanza el objetivo; si no, sigue "activa".
function estadoSegunAhorro(meta: MetaAhorro, ahorrado: number, objetivo = meta.meta): EstadoMeta {
  if (meta.estado === 'cancelada') return 'cancelada';
  return ahorrado >= objetivo ? 'completada' : 'activa';
}

export default function Ahorros() {
  const { profile, metas, ahorros, syncing, refreshData } = useApp();
  // Depósito manual
  const [monto, setMonto] = useState('');
  const [destino, setDestino] = useState<number | null>(null); // null = ahorro general, sin meta
  // Formulario de meta (crear o editar)
  const [formMeta, setFormMeta] = useState(false);
  const [metaEditando, setMetaEditando] = useState<MetaAhorro | null>(null);
  const [metaNombre, setMetaNombre] = useState('');
  const [metaMonto, setMetaMonto] = useState('');
  // Estado general de la pantalla
  const [porEliminar, setPorEliminar] = useState<string | null>(null); // ej. "meta-3" o "ahorro-7"
  const [error, setError] = useState<{ en: Seccion; texto: string } | null>(null);
  const [guardando, setGuardando] = useState<Seccion | null>(null); // qué formulario se está guardando
  const ocupado = guardando !== null;
  const [aviso, setAviso] = useAviso();

  const moneda = profile?.moneda ?? 'PEN';

  const total = useMemo(() => ahorros.reduce((suma, a) => suma + a.monto, 0), [ahorros]);

  // Cuánto se ha juntado para cada meta (suma de los ahorros que apuntan a ella).
  const ahorradoPorMeta = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const a of ahorros) {
      if (a.metaId !== null) mapa.set(a.metaId, (mapa.get(a.metaId) ?? 0) + a.monto);
    }
    return mapa;
  }, [ahorros]);

  const metasActivas = useMemo(() => metas.filter((m) => m.estado === 'activa'), [metas]);

  const mostrarError = (en: Seccion, e: unknown) => setError({ en, texto: api.errorMessage(e) });

  const cerrarFormMeta = () => {
    setFormMeta(false);
    setMetaEditando(null);
    setMetaNombre('');
    setMetaMonto('');
  };

  const handleNuevaMeta = () => {
    if (formMeta) {
      cerrarFormMeta();
      return;
    }
    setError(null);
    setFormMeta(true);
  };

  const handleEditarMeta = (meta: MetaAhorro) => {
    setMetaEditando(meta);
    setMetaNombre(meta.nombre);
    setMetaMonto(String(meta.meta));
    setFormMeta(true);
    setError(null);
    setPorEliminar(null);
  };

  const handleGuardarMeta = async () => {
    const nombre = metaNombre.trim();
    const objetivo = parseMonto(metaMonto);
    if (!nombre) {
      setError({ en: 'meta', texto: 'Escribe el nombre de la meta.' });
      return;
    }
    if (objetivo === null) {
      setError({ en: 'meta', texto: 'Escribe un monto objetivo mayor que 0.' });
      return;
    }
    setError(null);
    setGuardando('meta');
    try {
      if (metaEditando) {
        // Si cambia el objetivo, puede cambiar también si la meta ya está completada o no.
        const estado = estadoSegunAhorro(metaEditando, ahorradoPorMeta.get(metaEditando.id) ?? 0, objetivo);
        await api.updateMeta(metaEditando.id, { nombre, meta: objetivo, estado });
        setAviso('Meta actualizada ✓');
      } else {
        await api.createMeta({ nombre, meta: objetivo });
        setAviso('Meta creada ✓');
      }
      cerrarFormMeta();
    } catch (e) {
      mostrarError('meta', e);
    } finally {
      await refreshData();
      setGuardando(null);
    }
  };

  const handleEliminarMeta = async (meta: MetaAhorro) => {
    setPorEliminar(null);
    setError(null);
    try {
      // El servidor conserva los ahorros de la meta y los deja como ahorro general.
      await api.deleteMeta(meta.id);
      if (destino === meta.id) setDestino(null);
      if (metaEditando?.id === meta.id) cerrarFormMeta();
      setAviso('Meta eliminada ✓ Sus ahorros quedaron como ahorro general.');
    } catch (e) {
      mostrarError('meta', e);
    }
    await refreshData();
  };

  const handleAhorrar = async () => {
    const valor = parseMonto(monto);
    if (valor === null) {
      setError({ en: 'deposito', texto: 'Escribe un monto mayor que 0.' });
      return;
    }
    setError(null);
    setGuardando('deposito');
    try {
      await api.createAhorro({ monto: valor, metaId: destino });
      const meta = metas.find((m) => m.id === destino);
      let completada = false;
      if (meta) {
        const estado = estadoSegunAhorro(meta, (ahorradoPorMeta.get(meta.id) ?? 0) + valor);
        if (estado !== meta.estado) await api.updateMeta(meta.id, { estado });
        completada = estado === 'completada';
      }
      setAviso(completada && meta ? `¡Meta “${meta.nombre}” completada! 🎉` : 'Ahorro registrado ✓');
      setMonto('');
      if (completada) setDestino(null);
    } catch (e) {
      mostrarError('deposito', e);
    } finally {
      await refreshData();
      setGuardando(null);
    }
  };

  const handleEliminarAhorro = async (ahorro: Ahorro) => {
    setPorEliminar(null);
    setError(null);
    try {
      await api.deleteAhorro(ahorro.id);
      // Si el ahorro era de una meta, puede que esa meta deje de estar completada.
      const meta = metas.find((m) => m.id === ahorro.metaId);
      if (meta) {
        const estado = estadoSegunAhorro(meta, (ahorradoPorMeta.get(meta.id) ?? 0) - ahorro.monto);
        if (estado !== meta.estado) await api.updateMeta(meta.id, { estado });
      }
      setAviso('Ahorro eliminado ✓');
    } catch (e) {
      mostrarError('lista', e);
    }
    await refreshData();
  };

  return (
    <SafeAreaView style={Common.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={Common.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshData} tintColor={Brand.primary} />}
      >
        <Text style={Common.title}>Ahorros</Text>

        <View style={[Common.totalCard, styles.totalCard]}>
          <Text style={[Common.totalLabel, styles.totalLabel]}>TOTAL AHORRADO</Text>
          <Text style={[Common.totalValue, styles.totalValue]}>{formatMonto(total, moneda)}</Text>
        </View>

        {aviso ? <Text style={[Common.aviso, styles.avisoTop]}>{aviso}</Text> : null}

        <Card>
          <View style={styles.cardHeader}>
            <Text style={[Common.cardTitle, styles.cardTitleInline]}>Metas de ahorro</Text>
            <TouchableOpacity style={styles.newBtn} onPress={handleNuevaMeta} disabled={ocupado}>
              <Text style={styles.newBtnText}>{formMeta ? 'Cerrar' : '+ Nueva meta'}</Text>
            </TouchableOpacity>
          </View>

          {formMeta ? (
            <View style={styles.metaForm}>
              <TextInput
                style={Common.input}
                placeholder="Nombre de la meta (ej. Viaje)"
                placeholderTextColor="#9AA1AC"
                value={metaNombre}
                onChangeText={(t) => {
                  setMetaNombre(t);
                  setError(null);
                }}
                maxLength={40}
                editable={!ocupado}
              />
              <TextInput
                style={Common.input}
                placeholder="Monto objetivo"
                placeholderTextColor="#9AA1AC"
                value={metaMonto}
                onChangeText={(t) => {
                  setMetaMonto(t);
                  setError(null);
                }}
                keyboardType="decimal-pad"
                editable={!ocupado}
              />
              <PrimaryButton
                title={metaEditando ? 'Guardar cambios' : 'Crear meta'}
                variant="ahorro"
                onPress={handleGuardarMeta}
                disabled={ocupado}
                loading={guardando === 'meta'}
              />
            </View>
          ) : null}
          {error?.en === 'meta' ? <Text style={[Common.error, styles.errorSpaced]}>{error.texto}</Text> : null}

          {metas.length === 0 ? (
            <Text style={[Common.empty, Common.row]}>Sin metas aún.</Text>
          ) : (
            metas.map((meta) => {
              const ahorrado = ahorradoPorMeta.get(meta.id) ?? 0;
              const avance = Math.min(100, (ahorrado / meta.meta) * 100);
              const completada = meta.estado === 'completada';
              return (
                <View key={meta.id} style={Common.row}>
                  <View style={Common.rowTop}>
                    <View style={Common.rowMain}>
                      <Text style={Common.rowTitle}>
                        {meta.icon} {meta.nombre}
                      </Text>
                      <Text style={Common.rowSub}>
                        {formatMonto(ahorrado, moneda)} de {formatMonto(meta.meta, moneda)}
                      </Text>
                    </View>
                    <Text style={[styles.badge, completada && styles.badgeDone]}>
                      {completada ? 'Completada ✓' : `${Math.floor(avance)}%`}
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${avance}%`, backgroundColor: completada ? Brand.ingreso : Brand.ahorro },
                      ]}
                    />
                  </View>

                  {porEliminar === `meta-${meta.id}` ? (
                    <View style={Common.rowActions}>
                      <Text style={Common.actionMuted}>¿Eliminar esta meta?</Text>
                      <TouchableOpacity onPress={() => handleEliminarMeta(meta)}>
                        <Text style={Common.actionDanger}>Sí, eliminar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setPorEliminar(null)}>
                        <Text style={Common.action}>No</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={Common.rowActions}>
                      <TouchableOpacity onPress={() => handleEditarMeta(meta)} disabled={ocupado}>
                        <Text style={Common.action}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setPorEliminar(`meta-${meta.id}`)} disabled={ocupado}>
                        <Text style={Common.actionDanger}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </Card>

        <Card>
          <Text style={Common.cardTitle}>Depósito manual</Text>
          <View style={styles.depositRow}>
            <TextInput
              style={[Common.input, styles.depositInput]}
              placeholder="Monto a ahorrar"
              placeholderTextColor="#9AA1AC"
              value={monto}
              onChangeText={(t) => {
                setMonto(t);
                setError(null);
              }}
              keyboardType="decimal-pad"
              editable={!ocupado}
            />
            <View style={styles.depositBtn}>
              <PrimaryButton title="Ahorrar" variant="ahorro" onPress={handleAhorrar} loading={guardando === 'deposito'} disabled={ocupado} />
            </View>
          </View>

          {metasActivas.length > 0 ? (
            <>
              <Text style={Common.hint}>¿A dónde va este ahorro?</Text>
              <View style={Common.chips}>
                <TouchableOpacity
                  style={[Common.chip, destino === null && Common.chipSelected]}
                  onPress={() => setDestino(null)}
                  disabled={ocupado}
                >
                  <Text style={[Common.chipText, destino === null && Common.chipTextSelected]}>General</Text>
                </TouchableOpacity>
                {metasActivas.map((meta) => {
                  const selected = destino === meta.id;
                  return (
                    <TouchableOpacity
                      key={meta.id}
                      style={[Common.chip, selected && Common.chipSelected]}
                      onPress={() => setDestino(meta.id)}
                      disabled={ocupado}
                    >
                      <Text style={[Common.chipText, selected && Common.chipTextSelected]}>
                        {meta.icon} {meta.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}
          {error?.en === 'deposito' ? <Text style={Common.error}>{error.texto}</Text> : null}
        </Card>

        <Card>
          <Text style={Common.cardTitle}>Movimientos ({ahorros.length})</Text>
          {error?.en === 'lista' ? <Text style={Common.error}>{error.texto}</Text> : null}
          {ahorros.length === 0 ? (
            <Text style={[Common.empty, Common.row]}>Sin movimientos aún.</Text>
          ) : (
            ahorros.map((a) => {
              const automatico = a.operacionId !== null;
              const meta = metas.find((m) => m.id === a.metaId);
              return (
                <View key={a.id} style={Common.row}>
                  <View style={Common.rowTop}>
                    <View style={Common.rowMain}>
                      <Text style={Common.rowTitle}>
                        {automatico ? `Automático · ${a.porcentaje}%` : 'Manual'}
                        {meta ? ` → ${meta.nombre}` : ''}
                      </Text>
                      <Text style={Common.rowSub}>{formatFechaHora(a.fecha)}</Text>
                    </View>
                    <Text style={[Common.rowAmount, { color: Brand.ahorro }]}>+{formatMonto(a.monto, moneda)}</Text>
                  </View>

                  {automatico ? (
                    <View style={Common.rowActions}>
                      <Text style={Common.actionMuted}>Viene de un ingreso</Text>
                    </View>
                  ) : porEliminar === `ahorro-${a.id}` ? (
                    <View style={Common.rowActions}>
                      <Text style={Common.actionMuted}>¿Eliminar este ahorro?</Text>
                      <TouchableOpacity onPress={() => handleEliminarAhorro(a)}>
                        <Text style={Common.actionDanger}>Sí, eliminar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setPorEliminar(null)}>
                        <Text style={Common.action}>No</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={Common.rowActions}>
                      <TouchableOpacity onPress={() => setPorEliminar(`ahorro-${a.id}`)} disabled={ocupado}>
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
  totalCard: { backgroundColor: Brand.ahorro },
  totalLabel: { color: '#C6CDE0' },
  totalValue: { color: '#FFFFFF' },
  avisoTop: { marginBottom: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitleInline: { marginBottom: 0 },
  newBtn: { backgroundColor: Brand.ahorroTint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  newBtnText: { fontSize: 12, fontWeight: '700', color: Brand.ahorro },
  metaForm: { marginBottom: 12 },
  errorSpaced: { marginTop: 2 },
  badge: { fontSize: 12, fontWeight: '700', color: Brand.ahorro },
  badgeDone: { color: Brand.ingreso },
  track: { height: 6, borderRadius: 3, backgroundColor: Brand.border, marginTop: 8, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  depositRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  depositInput: { flex: 1, paddingVertical: 14 },
  depositBtn: { width: 110 },
});
