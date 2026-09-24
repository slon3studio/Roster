import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/**
 * One icon vocabulary for the whole app.
 *
 * Names are what the icon *means* here, not what the platform calls it — so a
 * screen asks for `swap` and gets an SF Symbol on iOS (the same one the Xcode
 * app used) and a Material symbol on Android, without either screen knowing.
 * The Ionicons entry is the last resort: it renders if a platform has no
 * symbol under that name, which keeps a missing glyph from becoming a hole in
 * the layout.
 */
const ICONS = {
  schedule: { ios: 'calendar', android: 'calendar_month', ion: 'calendar-outline' },
  wishes: { ios: 'hand.raised', android: 'back_hand', ion: 'hand-left-outline' },
  swap: {
    ios: 'arrow.triangle.2.circlepath',
    android: 'swap_horiz',
    ion: 'swap-horizontal',
  },
  profile: { ios: 'person.crop.circle', android: 'account_circle', ion: 'person-circle-outline' },
  person: { ios: 'person', android: 'person', ion: 'person-outline' },
  mail: { ios: 'envelope', android: 'mail', ion: 'mail-outline' },
  lock: { ios: 'lock', android: 'lock', ion: 'lock-closed-outline' },
  home: { ios: 'house', android: 'home', ion: 'home-outline' },
  tag: { ios: 'tag', android: 'label', ion: 'pricetag-outline' },
  trash: { ios: 'trash', android: 'delete', ion: 'trash-outline' },
  warning: {
    ios: 'exclamationmark.triangle.fill',
    android: 'warning',
    ion: 'warning',
  },
  info: { ios: 'info.circle', android: 'info', ion: 'information-circle-outline' },
  check: { ios: 'checkmark', android: 'check', ion: 'checkmark' },
  more: { ios: 'ellipsis', android: 'more_horiz', ion: 'ellipsis-horizontal' },
  layout: { ios: 'square.grid.3x3', android: 'grid_view', ion: 'grid-outline' },
  pencil: { ios: 'pencil', android: 'edit', ion: 'pencil-outline' },
  code: { ios: 'number', android: 'numbers', ion: 'keypad-outline' },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color,
  weight = 'regular',
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  const icon = ICONS[name];

  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.android }}
      size={size}
      tintColor={color}
      weight={weight}
      fallback={<Ionicons name={icon.ion} size={size} color={color as string} />}
    />
  );
}
