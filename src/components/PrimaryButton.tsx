import type { GestureResponderEvent } from 'react-native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Brand } from '@/constants/brand';

interface Props {
  title: string;
  onPress: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ahorro';
  loading?: boolean;
}

/**
 * Botón principal: negro sólido (variant="primary"), igual al prototipo.
 * "ahorro" = azul marino (usado en el botón "Ahorrar" de la pantalla Ahorros).
 */
export default function PrimaryButton({ title, onPress, disabled, variant = 'primary', loading }: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        variant === 'ahorro' && styles.ahorro,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? Brand.textPrimary : '#FFFFFF'} />
      ) : (
        <Text style={[styles.text, variant === 'secondary' && styles.textSecondary]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Brand.ink,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { backgroundColor: '#EEF1F5' },
  danger: { backgroundColor: Brand.danger },
  ahorro: { backgroundColor: Brand.ahorro },
  disabled: { backgroundColor: Brand.muted },
  text: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  textSecondary: { color: Brand.textPrimary },
});
