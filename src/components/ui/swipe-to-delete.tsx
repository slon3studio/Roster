import { useCallback, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { usePalette } from '@/hooks/use-palette';
import { radius, semantic } from '@/lib/theme';

const ACTION_WIDTH = 92;
/** How far you have to pull before letting go leaves it open. */
const OPEN_THRESHOLD = ACTION_WIDTH / 2;

/**
 * Drag a row left to uncover a delete button on the right.
 *
 * Built on `PanResponder` rather than `react-native-gesture-handler`'s
 * `Swipeable`: this version of the library ships only the legacy one, which
 * wants a `GestureHandlerRootView` above the whole app. PanResponder is part
 * of React Native, works through react-native-web with a mouse as well as a
 * finger, and needs nothing added at the root.
 *
 * The row only claims the gesture once the drag is clearly horizontal, so
 * scrolling a long list still works.
 */
export function SwipeToDelete({
  children,
  onDelete,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  accessibilityLabel: string;
}) {
  const c = usePalette();

  // In state, not a ref: it has to be created exactly once and read while
  // rendering, and the React Compiler rules forbid touching `ref.current`
  // during render.
  const [translateX] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState(false);

  const settle = useCallback(
    (to: number) => {
      setOpen(to !== 0);
      Animated.spring(translateX, {
        toValue: to,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start();
    },
    [translateX],
  );

  const [responder] = useState(() => {
    // Where the row rested when this drag started. A plain closure variable
    // rather than a React ref — the gesture is the only thing that reads it,
    // and a ref would be render-state the compiler rightly objects to.
    let base = 0;

    const close = (to: number) => {
      base = to;
      settle(to);
    };

    return PanResponder.create({
      // Not on start: claiming the gesture immediately would swallow taps on
      // whatever the row contains.
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,

      onPanResponderMove: (_, g) => {
        // Left only, and never further than the button is wide.
        translateX.setValue(Math.max(-ACTION_WIDTH, Math.min(0, base + g.dx)));
      },

      onPanResponderRelease: (_, g) => {
        // A flick counts even when it did not travel far.
        if (g.vx < -0.5) return close(-ACTION_WIDTH);
        if (g.vx > 0.5) return close(0);
        close(base + g.dx < -OPEN_THRESHOLD ? -ACTION_WIDTH : 0);
      },

      onPanResponderTerminate: () => close(base),
    });
  });

  return (
    <View
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radius.sm,
        // The revealed button needs room for its icon and label, and 44 is the
        // smallest comfortable touch target anyway. Without it a short row
        // clipped the word off the bottom of the button.
        minHeight: 44,
      }}>
      {/* Sits underneath, uncovered by the row sliding off it. */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: ACTION_WIDTH,
          backgroundColor: semantic.red,
          // Matches the container's own corners. A transformed sibling is not
          // always clipped to a rounded parent the same way an untransformed
          // one is, and a square red corner peeking past the row is the
          // artefact that causes.
          borderTopRightRadius: radius.sm,
          borderBottomRightRadius: radius.sm,
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={onDelete}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Icon name="trash" size={19} color="#fff" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Izbriši</Text>
        </Pressable>
      </View>

      <Animated.View
        {...responder.panHandlers}
        style={{
          transform: [{ translateX }],
          backgroundColor: c.card,
          minHeight: 44,
          justifyContent: 'center',
        }}>
        {/* While it is open, a tap anywhere on the row closes it instead of
            opening whatever the row would normally open. */}
        {open ? (
          <Pressable onPress={() => settle(0)} style={{ width: '100%' }}>
            <View pointerEvents="none">{children}</View>
          </Pressable>
        ) : (
          children
        )}
      </Animated.View>
    </View>
  );
}
