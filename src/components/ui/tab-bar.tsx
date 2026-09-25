import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, Text, View, type DimensionValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { usePalette } from '@/hooks/use-palette';
import { radius, semantic } from '@/lib/theme';

/**
 * The tab bar, written by hand rather than configured.
 *
 * Two reasons the stock one could not do this:
 *
 * 1. The selected tab has to read as one button around both the icon and the
 *    label, the way the Xcode app had it. The stock bar renders icon and label
 *    as separate pieces with no shared container to put a border on.
 *
 * 2. The home-indicator strip. `expo-router` hands `SafeAreaProvider` a hard
 *    `insets: { bottom: 0 }` on web, so `useSafeAreaInsets()` can never report
 *    it there and the stock bar has nothing to pad with — which is why the
 *    installed app kept sitting under the indicator. Here the web path reads
 *    `env(safe-area-inset-bottom)` straight from CSS instead, and the bar's own
 *    background fills the strip rather than leaving a black band under it.
 *
 * Kept in normal flow, not floating, so the screen above can never be
 * overlapped: whatever height this ends up, the scroll view gets the rest.
 */

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Urnik', icon: 'schedule' },
  { name: 'wishes', label: 'Želje', icon: 'wishes' },
  { name: 'swaps', label: 'Menjave', icon: 'swap' },
  { name: 'profile', label: 'Profil', icon: 'profile' },
];

/** Exactly what the navigator passes its `tabBar`, so this cannot drift out
 *  of step with the version of expo-router in use. */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

type Props = TabBarProps & {
  /** Route name → count. Only routes listed here get a badge. */
  badges?: Partial<Record<string, number>>;
};

export function TabBar({ state, navigation, badges }: Props) {
  const c = usePalette();
  const insets = useSafeAreaInsets();

  // On native the inset is a real measurement; on web it has to come from CSS.
  const bottomPadding: DimensionValue =
    Platform.OS === 'web'
      ? ('calc(10px + env(safe-area-inset-bottom, 0px))' as unknown as DimensionValue)
      : 10 + insets.bottom;

  return (
    <View
      style={{
        flexDirection: 'row',
        paddingTop: 10,
        paddingBottom: bottomPadding,
        paddingHorizontal: 8,
        backgroundColor: c.card,
        borderTopWidth: 1,
        borderTopColor: c.border,
      }}>
      {state.routes.map((route, index) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;

        const focused = state.index === index;
        const badge = badges?.[route.name] ?? 0;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={tab.label}
            onPress={() => {
              // Let the navigator cancel it, which is how "tap the active tab
              // to scroll to top" and similar behaviours stay possible.
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented && !focused) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: 'center' }}>
            <View
              style={{
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: radius.md,
                borderWidth: 1.5,
                // Transparent rather than absent, so selecting a tab does not
                // change its size and shift the row.
                borderColor: focused ? c.accent : 'transparent',
                backgroundColor: focused ? c.accentSoft : 'transparent',
              }}>
              <View>
                <Icon
                  name={tab.icon}
                  size={22}
                  color={focused ? c.accent : c.textSecondary}
                  weight={focused ? 'semibold' : 'regular'}
                />

                {badge > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -11,
                      minWidth: 17,
                      height: 17,
                      paddingHorizontal: 4,
                      borderRadius: radius.pill,
                      backgroundColor: semantic.red,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>
                      {badge > 9 ? '9+' : badge}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                numberOfLines={1}
                style={{
                  fontSize: 11,
                  fontWeight: focused ? '700' : '500',
                  color: focused ? c.accent : c.textSecondary,
                }}>
                {tab.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
