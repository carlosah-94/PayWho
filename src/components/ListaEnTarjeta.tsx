import type { ReactElement, ReactNode, Ref } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/brand';
import { Common } from '@/constants/styles';

interface Props<T extends { id: number }> {
  encabezado: ReactElement; // todo lo que va arriba de la lista (título, total, formularios)
  titulo: string; // título de la tarjeta de la lista, ej. "Historial (3)"
  extraTitulo?: ReactNode; // algo debajo del título, ej. un mensaje de error
  datos: T[];
  vacio: string; // texto cuando la lista está vacía
  renderFila: (item: T) => ReactElement;
  extraData?: unknown; // valores que cambian cómo se ve una fila (ej. cuál se está eliminando)
  refreshing: boolean;
  onRefresh: () => void;
  listaRef?: Ref<FlatList<T>>;
}

/**
 * Pantalla con formulario arriba y un historial abajo, dentro de una tarjeta.
 * Usa FlatList: solo dibuja las filas que se ven en pantalla (y unas pocas más),
 * así la pantalla no se pone lenta aunque haya cientos de registros.
 */
export default function ListaEnTarjeta<T extends { id: number }>({
  encabezado,
  titulo,
  extraTitulo,
  datos,
  vacio,
  renderFila,
  extraData,
  refreshing,
  onRefresh,
  listaRef,
}: Props<T>) {
  return (
    <FlatList
      ref={listaRef}
      data={datos}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <View style={styles.medio}>{renderFila(item)}</View>}
      extraData={extraData}
      ListHeaderComponent={
        <View style={styles.encabezado}>
          {encabezado}
          {/* Parte de arriba de la tarjeta del historial */}
          <View style={styles.arriba}>
            <Text style={[Common.cardTitle, styles.titulo]}>{titulo}</Text>
            {extraTitulo}
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.medio}>
          <Text style={[Common.empty, Common.row]}>{vacio}</Text>
        </View>
      }
      // Parte de abajo de la tarjeta (bordes redondeados).
      ListFooterComponent={<View style={styles.abajo} />}
      contentContainerStyle={styles.contenido}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.primary} />}
      // Rendimiento: cuántas filas se dibujan al inicio y en cada tanda al desplazarse.
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={7}
    />
  );
}

const BORDE = '#E4E7EC'; // mismo borde que Card
const styles = StyleSheet.create({
  contenido: { padding: 20, paddingBottom: 40 },
  encabezado: { gap: 14 }, // misma separación que tenían las tarjetas en el ScrollView
  titulo: { marginBottom: 12 },
  arriba: {
    backgroundColor: '#FFFFFF',
    borderColor: BORDE,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  medio: {
    backgroundColor: '#FFFFFF',
    borderColor: BORDE,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 16,
  },
  abajo: {
    height: 16,
    backgroundColor: '#FFFFFF',
    borderColor: BORDE,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
});
