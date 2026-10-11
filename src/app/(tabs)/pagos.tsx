import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from '@/constants/brand';

export default function Pagos() {
  return <SafeAreaView style={styles.container} edges={['top']} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.background },
});
