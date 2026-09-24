import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { AppDataProvider, useAppData } from '@/contexts/app-data';
import { useAuth } from '@/contexts/auth';
import { usePalette } from '@/hooks/use-palette';

export default function TabsLayout() {
  return (
    <AppDataProvider>
      <RoleTabs />
    </AppDataProvider>
  );
}

/**
 * One codebase, two experiences — the tabs are the same four, but each screen
 * branches on role internally, which is where the two apps actually differ.
 */
function RoleTabs() {
  const c = usePalette();
  const { session } = useAuth();
  const { cover } = useAppData();

  const badge = session ? cover.badgeCount(session.profile) : 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textSecondary,
        // No explicit height — the navigator adds the home-indicator inset
        // itself, and overriding it clips the labels on some devices.
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Urnik',
          tabBarIcon: (props) => <TabIcon name="schedule" {...props} />,
        }}
      />
      <Tabs.Screen
        name="wishes"
        options={{
          title: 'Želje',
          tabBarIcon: (props) => <TabIcon name="wishes" {...props} />,
        }}
      />
      <Tabs.Screen
        name="swaps"
        options={{
          title: 'Menjave',
          tabBarIcon: (props) => <TabIcon name="swap" {...props} />,
          tabBarBadge: badge > 0 ? badge : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: (props) => <TabIcon name="profile" {...props} />,
        }}
      />
    </Tabs>
  );
}

/**
 * The selected tab gets a tinted tile behind its icon, the way the Xcode app
 * had it — the label colour alone is too quiet to answer "where am I?".
 */
function TabIcon({
  name,
  color,
  focused,
}: {
  name: IconName;
  color: ColorValue;
  focused: boolean;
}) {
  const c = usePalette();

  return (
    <View
      style={{
        width: 42,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? c.accent + '24' : 'transparent',
      }}>
      <Icon name={name} size={21} color={color} weight={focused ? 'semibold' : 'regular'} />
    </View>
  );
}
