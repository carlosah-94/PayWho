# Pay Who

App móvil de finanzas personales para registrar ingresos, pagos y ahorros.
Cada ingreso aparta automáticamente un porcentaje al ahorro, y el ahorro se puede dirigir a metas.

Proyecto del curso **Desarrollo de Aplicaciones Móviles** (UTP).

## Funciones

- **Cuenta:** crear cuenta e iniciar sesión con correo y contraseña.
- **Registro:** apodo, porcentaje de ahorro automático y moneda (PEN, USD o EUR).
- **Inicio:** resumen del mes, balance, gráfico de los últimos 6 meses y movimientos recientes.
- **Ingresos y Pagos:** registrar, editar y eliminar, con categorías predefinidas o propias.
- **Ahorros:** metas con avance, depósito manual y lista de movimientos.
- **Ajustes:** cambiar apodo, moneda y porcentaje de ahorro; cerrar sesión.
- **Sin internet:** la app abre y muestra los últimos datos guardados en el celular.

## Tecnologías

- React Native con Expo SDK 57 y Expo Router (rutas por archivos).
- TypeScript.
- Context API para el estado global.
- AsyncStorage para guardar la sesión, el perfil y la caché de las listas.
- Supabase (PostgreSQL) como base de datos, consumida por su API REST con `fetch`.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/app` | Pantallas. Cada archivo es una ruta. |
| `src/components` | Componentes reutilizables (botón, tarjeta, logo, campo de categoría). |
| `src/context` | Estado global de la app y tipos de datos. |
| `src/services` | Comunicación con el servidor (`api.ts`). |
| `src/hooks` | Hooks propios. |
| `src/constants` | Colores de marca y estilos compartidos. |
| `src/utils` | Funciones de formato de montos y fechas. |

## Cómo ejecutar

1. Instalar las dependencias:

   ```bash
   npm install
   ```

2. Crear un archivo `.env` en la raíz del proyecto con estas dos variables
   (los valores se piden al equipo; el archivo no se sube al repositorio):

   ```
   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_KEY=
   ```

3. Iniciar el proyecto:

   ```bash
   npx expo start
   ```

4. Abrirlo con Expo Go escaneando el código QR, o con un emulador de Android.

Si se cambia el archivo `.env`, hay que reiniciar con `npx expo start -c`.

## Ramas

- `main`: entregas (cada avance lleva una etiqueta, por ejemplo `avance-01`).
- `develop`: trabajo del equipo.
- Cada tarea se hace en una rama propia que sale de `develop` y vuelve por Pull Request.
