import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Brand } from '@/constants/brand';
import { Common } from '@/constants/styles';
import type { Categoria } from '@/context/AppContext';

interface Props {
  value: string;
  onChangeText: (texto: string) => void;
  categorias: Categoria[]; // las que se ofrecen en la lista
  placeholder: string;
  disabled?: boolean;
}

/**
 * Campo de categoría: sirve para escribir y, con la flecha, despliega la lista de categorías.
 * Si lo escrito no está en la lista, la pantalla que lo usa crea esa categoría al guardar.
 */
export default function CategoriaInput({ value, onChangeText, categorias, placeholder, disabled }: Props) {
  const [abierto, setAbierto] = useState(false); // lista abierta con la flecha

  const texto = value.trim().toLowerCase();
  const yaElegida = categorias.some((c) => c.nombre.toLowerCase() === texto);
  // Con la flecha se ven todas. Al escribir, solo las que coinciden con lo escrito.
  const coincidencias = categorias.filter((c) => c.nombre.toLowerCase().includes(texto));
  const opciones = abierto ? categorias : texto && !yaElegida ? coincidencias : [];

  return (
    <View style={styles.wrap}>
      <View>
        <TextInput
          style={[Common.input, styles.input]}
          placeholder={placeholder}
          placeholderTextColor="#9AA1AC"
          value={value}
          onChangeText={(t) => {
            onChangeText(t);
            setAbierto(false);
          }}
          maxLength={40}
          editable={!disabled}
        />
        <TouchableOpacity
          style={styles.arrow}
          onPress={() => setAbierto((a) => !a)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Ver categorías"
        >
          <Text style={styles.arrowText}>{abierto ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {opciones.length > 0 ? (
        <View style={styles.list}>
          {opciones.map((c, i) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.option, i > 0 && styles.optionBorder]}
              onPress={() => {
                onChangeText(c.nombre);
                setAbierto(false);
              }}
              disabled={disabled}
              accessibilityRole="button"
            >
              <Text style={styles.optionText}>{c.nombre}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  input: { marginBottom: 0, paddingRight: 44 },
  arrow: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 11, color: Brand.textSecondary },
  list: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  option: { paddingHorizontal: 14, paddingVertical: 12 },
  optionBorder: { borderTopWidth: 1, borderTopColor: Brand.border },
  optionText: { fontSize: 15, color: Brand.textPrimary },
});
