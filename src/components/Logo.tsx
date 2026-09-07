import { Image, StyleSheet, View } from 'react-native';

const ASPECT_RATIO = 689 / 407;

/**
 * Logo real de Pay Who (assets/images/paywho-logo.png, fondo transparente
 * para que no se vea como una imagen "pegada" sobre las tarjetas/fondos).
 * `size` controla la altura; el ancho se calcula con el aspect ratio real.
 */
export default function Logo({
  size = 40,
  align = 'flex-start',
}: {
  size?: number;
  align?: 'flex-start' | 'center' | 'flex-end';
}) {
  return (
    <View style={[styles.wrap, { alignItems: align }]}>
      {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
      <Image
        source={require('@/assets/images/paywho-logo.png')}
        style={{ height: size, width: size * ASPECT_RATIO }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'column' },
});
