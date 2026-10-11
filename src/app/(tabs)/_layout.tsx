import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Brand } from '@/constants/brand';

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{symbol}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: '#9AA1AC',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: ({ focused }) => <TabIcon symbol="🏠" focused={focused} /> }}
      />
      <Tabs.Screen
        name="ingresos"
        options={{ title: 'Ingresos', tabBarIcon: ({ focused }) => <TabIcon symbol="⬆️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="pagos"
        options={{ title: 'Pagos', tabBarIcon: ({ focused }) => <TabIcon symbol="⬇️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="ahorros"
        options={{ title: 'Ahorros', tabBarIcon: ({ focused }) => <TabIcon symbol="🎯" focused={focused} /> }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{ title: 'Ajustes', tabBarIcon: ({ focused }) => <TabIcon symbol="⚙️" focused={focused} /> }}
      />
    </Tabs>
  );
}
