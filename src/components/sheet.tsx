import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { usePalette } from '@/hooks/use-palette';
import { radius } from '@/lib/theme';

/**
 * A modal sheet with a title bar, standing in for SwiftUI's `.sheet`.
 *
 * `Modal` keeps the state co-located with the screen that opens it, which
 * avoids threading sheet state through the router for what is really local UI.
 */
export function Sheet({
  visible,
  title,
  onClose,
  onConfirm,
  confirmLabel = 'Shrani',
  confirmDisabled,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  children: React.ReactNode;
}) {
  const c = usePalette();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 18,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
          }}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ fontSize: 16, color: c.accent }}>Prekliči</Text>
          </Pressable>

          <Text
            numberOfLines={1}
            style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: c.text }}>
            {title}
          </Text>

          {onConfirm ? (
            <Pressable onPress={onConfirm} disabled={confirmDisabled} hitSlop={8}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: confirmDisabled ? c.textTertiary : c.accent,
                }}>
                {confirmLabel}
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function SheetRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  const c = usePalette();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
        gap: 12,
      }}>
      <Text style={{ fontSize: 15, color: c.text }}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value ? <Text style={{ fontSize: 15, color: c.textSecondary }}>{value}</Text> : null}
      {children}
    </View>
  );
}

export function SheetFootnote({ text }: { text: string }) {
  const c = usePalette();
  return <Text style={{ fontSize: 13, color: c.textSecondary, lineHeight: 18 }}>{text}</Text>;
}

export function DestructiveButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        minHeight: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: '#FF3B3040',
        backgroundColor: '#FF3B3014',
      }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#FF3B30' }}>{title}</Text>
    </Pressable>
  );
}
