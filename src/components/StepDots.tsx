import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Brand } from '@/constants/brand';

export default function StepDots({
  total,
  current,
  style,
}: {
  total: number;
  current: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i === current ? styles.dotActive : styles.dotInactive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: Brand.primary },
  dotInactive: { width: 8, backgroundColor: '#D9DEE7' },
});
