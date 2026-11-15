import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Brand } from '@/constants/brand';
import { Common } from '@/constants/styles';
import { logger } from '@/utils/logger';

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

interface Props {
  value: Coordenadas | null;
  onChange: (value: Coordenadas | null) => void;
  disabled?: boolean;
}

/** Enlace para abrir unas coordenadas en Google Maps. */
export function urlMapa({ latitud, longitud }: Coordenadas) {
  return `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`;
}

/**
 * Botón para guardar la ubicación (GPS) donde se registra la operación.
 * Pide el permiso de ubicación solo cuando el usuario lo pulsa.
 */
export default function UbicacionInput({ value, onChange, disabled }: Props) {
  const [buscando, setBuscando] = useState(false);
  // Dirección legible junto con las coordenadas a las que pertenece.
  const [direccion, setDireccion] = useState<{ texto: string; de: Coordenadas } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState(false); // el permiso fue rechazado y no se puede volver a pedir

  const handleUbicar = async () => {
    setError(null);
    setBuscando(true);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) {
        setBloqueado(!permiso.canAskAgain);
        setError('Sin permiso de ubicación no se puede guardar dónde hiciste el pago.');
        return;
      }
      let posicion: Location.LocationObject | null;
      try {
        posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      } catch (e) {
        // Respaldo: si el GPS no da una lectura en este momento (p. ej. bajo techo),
        // se usa la última ubicación conocida, siempre que tenga menos de 10 minutos.
        logger.info('ubicacion', 'Sin lectura actual del GPS; se intenta la última ubicación conocida', e);
        posicion = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
        if (!posicion) throw e;
      }
      const coords = { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude };
      onChange(coords);
      // Se intenta traducir las coordenadas a una dirección legible; si falla, se muestran los números.
      try {
        const [lugar] = await Location.reverseGeocodeAsync({ latitude: coords.latitud, longitude: coords.longitud });
        const partes = [lugar?.street, lugar?.district ?? lugar?.city].filter(Boolean);
        setDireccion(partes.length ? { texto: partes.join(', '), de: coords } : null);
      } catch (e) {
        logger.debug('ubicacion', 'No se pudo obtener la dirección', e);
        setDireccion(null);
      }
    } catch (e) {
      logger.warn('ubicacion', 'No se pudo obtener la ubicación', e);
      setError('No se pudo obtener la ubicación. Revisa que el GPS esté activado.');
    } finally {
      setBuscando(false);
    }
  };

  if (value) {
    // Solo se muestra la dirección si corresponde a estas coordenadas (al editar otro pago no se reutiliza).
    const textoDireccion =
      direccion && direccion.de.latitud === value.latitud && direccion.de.longitud === value.longitud
        ? direccion.texto
        : null;
    return (
      <View style={styles.fila}>
        <Text style={styles.icono}>📍</Text>
        <TouchableOpacity style={styles.texto} onPress={() => Linking.openURL(urlMapa(value))}>
          <Text style={styles.textoPrincipal} numberOfLines={1}>
            {textoDireccion ?? 'Ubicación guardada'}
          </Text>
          <Text style={styles.textoSecundario}>
            {value.latitud.toFixed(5)}, {value.longitud.toFixed(5)} · Ver en el mapa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            onChange(null);
            setDireccion(null);
          }}
          disabled={disabled}
        >
          <Text style={Common.actionDanger}>Quitar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity
        style={styles.boton}
        onPress={handleUbicar}
        disabled={disabled || buscando}
        accessibilityRole="button"
      >
        {buscando ? (
          <ActivityIndicator color={Brand.textSecondary} />
        ) : (
          <Text style={styles.botonTexto}>📍 Guardar ubicación del pago</Text>
        )}
      </TouchableOpacity>
      {error ? (
        <View style={styles.errorFila}>
          <Text style={[Common.error, styles.errorTexto]}>{error}</Text>
          {bloqueado ? (
            <TouchableOpacity onPress={() => Linking.openSettings()}>
              <Text style={Common.action}>Abrir ajustes</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  boton: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  botonTexto: { fontSize: 13, fontWeight: '600', color: Brand.textSecondary },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  icono: { fontSize: 20 },
  texto: { flex: 1 },
  textoPrincipal: { fontSize: 13, fontWeight: '600', color: Brand.textPrimary },
  textoSecundario: { fontSize: 11, color: Brand.textSecondary, marginTop: 2 },
  errorFila: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  errorTexto: { flex: 1, marginBottom: 0 },
});
