import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { Sheet, SheetFootnote, SheetRow } from '@/components/sheet';
import { Message } from '@/components/ui/auth-parts';
import { AppBackground, Card, EmptyHint, PositionBadge, SectionTitle } from '@/components/ui/design';
import { useCatalog } from '@/hooks/use-catalog';
import { usePalette } from '@/hooks/use-palette';
import { positionColors, radius } from '@/lib/theme';
import type { Duty, Position } from '@/types';

/**
 * Manager screen for the restaurant's own vocabulary.
 *
 * Šank / Rajon / Priprava are seeded because they are *this* restaurant's
 * words. Another customer needs Peč, Dostava, Kuhinja — and without this
 * screen the only way to change them is editing rows in Supabase by hand.
 */
export default function CatalogScreen() {
  const c = usePalette();
  const catalog = useCatalog();

  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editingDuty, setEditingDuty] = useState<Duty | null>(null);
  const [addingPosition, setAddingPosition] = useState(false);
  const [addingDuty, setAddingDuty] = useState(false);

  useEffect(() => {
    void catalog.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <AppBackground />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 56, gap: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={catalog.loading} onRefresh={() => void catalog.load()} />
        }>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={{ fontSize: 22, color: c.accent }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 26, fontWeight: '700', color: c.text }}>Delovna mesta</Text>
        </View>

        {catalog.error ? <Message text={catalog.error} kind="error" /> : null}
        {catalog.notice ? <Message text={catalog.notice} kind="notice" /> : null}

        <Card>
          <SectionTitle text="Delovna mesta" trailing="Šank, Rajon …" />
          <View style={{ height: 12 }} />

          {catalog.positions.length === 0 ? (
            <EmptyHint text="Ni delovnih mest." />
          ) : (
            catalog.positions.map((position, index) => (
              <Pressable key={position.id} onPress={() => setEditingPosition(position)}>
                {index > 0 ? (
                  <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <PositionBadge position={position} size={10} />
                  <Text
                    style={{
                      fontSize: 15,
                      color: position.is_active ? c.text : c.textSecondary,
                    }}>
                    {position.name}
                  </Text>
                  {!position.is_active ? <HiddenPill /> : null}
                  <View style={{ flex: 1 }} />
                  <Text style={{ fontSize: 14, color: c.textTertiary }}>›</Text>
                </View>
              </Pressable>
            ))
          )}

          <View style={{ height: 1, backgroundColor: c.border, marginVertical: 12 }} />

          <Pressable
            onPress={() => {
              catalog.clearMessages();
              setAddingPosition(true);
            }}
            disabled={catalog.working}>
            <Text style={{ fontSize: 15, fontWeight: '500', color: c.accent }}>
              + Dodaj delovno mesto
            </Text>
          </Pressable>
        </Card>

        <Card>
          <SectionTitle text="Zadolžitve" trailing="Priprava, Roba …" />
          <View style={{ height: 12 }} />

          {catalog.duties.length === 0 ? (
            <EmptyHint text="Ni zadolžitev." />
          ) : (
            catalog.duties.map((duty, index) => (
              <Pressable key={duty.id} onPress={() => setEditingDuty(duty)}>
                {index > 0 ? (
                  <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text
                    style={{ fontSize: 15, color: duty.is_active ? c.text : c.textSecondary }}>
                    {duty.name}
                  </Text>
                  {!duty.is_active ? <HiddenPill /> : null}
                  <View style={{ flex: 1 }} />
                  <Text style={{ fontSize: 14, color: c.textTertiary }}>›</Text>
                </View>
              </Pressable>
            ))
          )}

          <View style={{ height: 1, backgroundColor: c.border, marginVertical: 12 }} />

          <Pressable
            onPress={() => {
              catalog.clearMessages();
              setAddingDuty(true);
            }}
            disabled={catalog.working}>
            <Text style={{ fontSize: 15, fontWeight: '500', color: c.accent }}>
              + Dodaj zadolžitev
            </Text>
          </Pressable>
        </Card>

        <Text style={{ fontSize: 12, color: c.textTertiary, textAlign: 'center' }}>
          Skritega ni izbrisano — smene in želje, ki se nanj sklicujejo, ostanejo nedotaknjene.
        </Text>
      </ScrollView>

      {editingPosition || addingPosition ? (
        <PositionSheet
          key={editingPosition?.id ?? 'new-position'}
          position={editingPosition}
          onClose={() => {
            setEditingPosition(null);
            setAddingPosition(false);
          }}
          onSave={(name, label, color, active) => {
            if (editingPosition) {
              void catalog.updatePosition(editingPosition.id, name, label, color, active);
            } else {
              void catalog.addPosition(name, label, color);
            }
          }}
        />
      ) : null}

      {editingDuty || addingDuty ? (
        <DutySheet
          key={editingDuty?.id ?? 'new-duty'}
          duty={editingDuty}
          onClose={() => {
            setEditingDuty(null);
            setAddingDuty(false);
          }}
          onSave={(name, active) => {
            if (editingDuty) void catalog.updateDuty(editingDuty.id, name, active);
            else void catalog.addDuty(name);
          }}
        />
      ) : null}
    </View>
  );
}

function HiddenPill() {
  const c = usePalette();
  return (
    <View
      style={{
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: c.fill,
      }}>
      <Text style={{ fontSize: 9, fontWeight: '800', color: c.textSecondary }}>SKRITO</Text>
    </View>
  );
}

const PALETTE = [
  'blue',
  'green',
  'orange',
  'purple',
  'red',
  'pink',
  'teal',
  'brown',
  'gray',
] as const;

function PositionSheet({
  position,
  onClose,
  onSave,
}: {
  position: Position | null;
  onClose: () => void;
  onSave: (name: string, shortLabel: string, color: string, isActive: boolean) => void;
}) {
  const c = usePalette();
  // Mounted with a key, so props are the initial state and nothing has to be
  // synced back in afterwards.
  const [name, setName] = useState(position?.name ?? '');
  const [shortLabel, setShortLabel] = useState(position?.short_label ?? '');
  const [color, setColor] = useState(position?.color ?? 'blue');
  const [isActive, setIsActive] = useState(position?.is_active ?? true);

  const previewLabel =
    shortLabel.trim().slice(0, 3).toUpperCase() || name.charAt(0).toUpperCase() || '?';

  return (
    <Sheet
      visible
      title={position ? 'Uredi' : 'Novo delovno mesto'}
      confirmDisabled={!name.trim()}
      onClose={onClose}
      onConfirm={() => {
        onSave(name, shortLabel, color, isActive);
        onClose();
      }}>
      <Card>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ime, npr. Šank"
          placeholderTextColor={c.textTertiary}
          autoCapitalize="words"
          style={{ fontSize: 16, color: c.text, minHeight: 40 }}
        />
        <View style={{ height: 1, backgroundColor: c.border }} />
        <SheetRow label="Oznaka">
          <TextInput
            value={shortLabel}
            onChangeText={setShortLabel}
            placeholder={previewLabel}
            placeholderTextColor={c.textTertiary}
            autoCapitalize="characters"
            maxLength={3}
            style={{ fontSize: 16, color: c.text, minWidth: 60, textAlign: 'right' }}
          />
        </SheetRow>
      </Card>
      <SheetFootnote text="Oznaka je tisto, kar piše poleg imena na urniku — največ trije znaki. Če je ne vpišeš, vzame prvo črko imena." />

      <SectionTitle text="Barva" />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {PALETTE.map((option) => (
            <Pressable key={option} onPress={() => setColor(option)}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: positionColors[option],
                  borderWidth: color === option ? 3 : 0,
                  borderColor: c.text,
                }}
              />
            </Pressable>
          ))}
        </View>
      </Card>
      {/* The palette is fixed rather than free hex so a badge stays legible in
          both light and dark mode. */}
      <SheetFootnote text="Nabor je omejen, da je oznaka berljiva v svetlem in temnem načinu." />

      <Card>
        <SheetRow label="Predogled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>Ana Kovač</Text>
            <View
              style={{
                paddingHorizontal: 4,
                paddingVertical: 1.5,
                borderRadius: radius.pill,
                backgroundColor: positionColors[color] ?? positionColors.gray,
              }}>
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff' }}>{previewLabel}</Text>
            </View>
          </View>
        </SheetRow>
      </Card>

      {position ? (
        <>
          <Card>
            <SheetRow label="V uporabi">
              <Switch value={isActive} onValueChange={setIsActive} />
            </SheetRow>
          </Card>
          <SheetFootnote text="Izklopljeno delovno mesto se ne pojavi več pri oddaji želja in pri razporejanju. Obstoječi vnosi ostanejo." />
        </>
      ) : null}
    </Sheet>
  );
}

function DutySheet({
  duty,
  onClose,
  onSave,
}: {
  duty: Duty | null;
  onClose: () => void;
  onSave: (name: string, isActive: boolean) => void;
}) {
  const c = usePalette();
  const [name, setName] = useState(duty?.name ?? '');
  const [isActive, setIsActive] = useState(duty?.is_active ?? true);

  return (
    <Sheet
      visible
      title={duty ? 'Uredi' : 'Nova zadolžitev'}
      confirmDisabled={!name.trim()}
      onClose={onClose}
      onConfirm={() => {
        onSave(name, isActive);
        onClose();
      }}>
      <Card>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ime, npr. Priprava"
          placeholderTextColor={c.textTertiary}
          style={{ fontSize: 16, color: c.text, minHeight: 40 }}
        />
      </Card>
      <SheetFootnote text="Zadolžitev se na urniku izpiše pod imenom osebe." />

      {duty ? (
        <>
          <Card>
            <SheetRow label="V uporabi">
              <Switch value={isActive} onValueChange={setIsActive} />
            </SheetRow>
          </Card>
          <SheetFootnote text="Izklopljena zadolžitev se ne pojavi več pri razporejanju. Obstoječi vnosi ostanejo." />
        </>
      ) : null}
    </Sheet>
  );
}
