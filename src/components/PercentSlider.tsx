import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/brand';

const MIN = 0;
const MAX = 75;

/**
 * Selector de porcentaje de ahorro automático: 0% a 75%, en cualquier valor
 * entero (11%, 12%, etc. — no está limitado a múltiplos de 5).
 */
export default function PercentSlider({
  value,
  onChange,
  showRangeLabels = true,
}: {
  value: number;
  onChange: (v: number) => void;
  showRangeLabels?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Slider
        style={styles.slider}
        minimumValue={MIN}
        maximumValue={MAX}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={Brand.ink}
        maximumTrackTintColor="#E4E7EC"
        thumbTintColor={Brand.ink}
      />

      {showRangeLabels ? (
        <View style={styles.rangeRow}>
          <Text style={styles.rangeText}>0% (desactivado)</Text>
          <Text style={styles.rangeText}>75%</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignSelf: 'stretch' },
  slider: { width: '100%', height: 32 },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  rangeText: { fontSize: 11, color: Brand.textSecondary },
});
