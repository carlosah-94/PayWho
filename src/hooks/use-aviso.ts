import { useEffect, useState } from 'react';

/**
 * Hook propio: guarda un mensaje de confirmación (por ejemplo "Ingreso registrado ✓")
 * y lo borra solo después de unos segundos.
 */
export function useAviso(duracionMs = 3000) {
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const reloj = setTimeout(() => setAviso(null), duracionMs);
    // Si el mensaje cambia o la pantalla se cierra antes de tiempo, se cancela el reloj.
    return () => clearTimeout(reloj);
  }, [aviso, duracionMs]);

  return [aviso, setAviso] as const;
}
