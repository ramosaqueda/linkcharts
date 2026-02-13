'use client';

import { useEffect } from 'react';
import { useGraphStore } from '@/lib/store';

export default function ThemeInitializer() {
  const theme = useGraphStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return null;
}
