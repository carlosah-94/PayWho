import { SafeAreaView, StyleSheet } from 'react-native';
import { Brand } from '@/constants/brand';

export default function Ingresos() {
  return <SafeAreaView style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.background },
});
