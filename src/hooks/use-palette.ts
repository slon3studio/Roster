import { useColorScheme } from 'react-native';

import { palette, type Palette } from '@/lib/theme';

/** The colour set for the active appearance. */
export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}
