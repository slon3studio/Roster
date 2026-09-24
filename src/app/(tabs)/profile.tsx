import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { JoinCode } from '@/components/ui/join-code';
import { ShiftLogEditorSheet } from '@/components/shift-sheets';
import { Message } from '@/components/ui/auth-parts';
import {
  AppBackground,
  Card,
  EmptyHint,
  InitialsAvatar,
  RoleBadge,
  SectionTitle,
  StatTile,
} from '@/components/ui/design';
import { useAppData } from '@/contexts/app-data';
import { useAuth } from '@/contexts/auth';
import { useEarnings } from '@/hooks/use-earnings';
import { usePalette } from '@/hooks/use-palette';
import { dayAndDate, hours, money, monthLabel, parseDecimal, shiftCount } from '@/lib/format';
import { radius, semantic } from '@/lib/theme';
import * as time from '@/lib/time';
import type { Profile, ShiftLog } from '@/types';

export default function ProfileScreen() {
  const c = usePalette();
  const { session, signOut, busy } = useAuth();
  const { team } = useAppData();
  const earnings = useEarnings();

  // Derived, not mirrored: `typedRateText` is null until the user edits, so
  // there is no effect syncing the stored rate into state.
  const [typedRateText, setTypedRateText] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<ShiftLog | null>(null);
  const [armedForRemoval, setArmedForRemoval] = useState<string | null>(null);

  const isManager = session?.profile.role === 'manager';

  const load = useCallback(async () => {
    if (!session || isManager) return;
    await earnings.load(session.profile.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.profile.id, isManager]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arming expires on its own, so a stray tap does not leave a delete button
  // sitting there waiting to be hit by accident.
  useEffect(() => {
    if (!armedForRemoval) return;
    const timer = setTimeout(() => setArmedForRemoval(null), 3000);
    return () => clearTimeout(timer);
  }, [armedForRemoval]);

  if (!session) return null;
  const { profile, organization } = session;

  const rateText =
    typedRateText ?? (earnings.hourlyRate != null ? earnings.hourlyRate.toFixed(2).replace('.', ',') : '');
  const typedRate = parseDecimal(rateText);
  const rateChanged =
    typedRate == null
      ? rateText.length > 0
      : earnings.hourlyRate == null || Math.abs(typedRate - earnings.hourlyRate) > 0.001;

  const currentMonth = earnings.months[0];

  return (
    <View style={{ flex: 1 }}>
      <AppBackground />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 56, gap: 16, paddingBottom: 32 }}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={earnings.loading || team.loading}
            onRefresh={() => {
              void load();
              void team.load();
            }}
          />
        }>
        <Text style={{ fontSize: 26, fontWeight: '700', color: c.text }}>Profil</Text>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <InitialsAvatar name={profile.full_name} size={56} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: '700', color: c.text }}>
                {profile.full_name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <RoleBadge role={profile.role} />
                <Text numberOfLines={1} style={{ fontSize: 12, color: c.textSecondary }}>
                  {organization.name}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {isManager ? (
          <>
            <Card>
              <SectionTitle text="Koda za pridružitev" />
              <JoinCode code={team.rotatedJoinCode ?? organization.join_code} />

              <Pressable
                onPress={() => void team.rotateJoinCode()}
                disabled={team.working}
                style={{ paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Icon name="swap" size={14} color={c.accent} />
                  <Text style={{ fontSize: 13, fontWeight: '500', color: c.accent }}>
                    Zamenjaj kodo
                  </Text>
                </View>
              </Pressable>

              <Text style={{ fontSize: 12, color: c.textSecondary }}>
                Daj jo sodelavcem, da se pridružijo. Zamenjaj jo, ko nekdo odide — stara takoj
                preneha veljati.
              </Text>
            </Card>

            <Pressable onPress={() => router.push('/catalog')}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Icon name="tag" size={19} color={c.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, color: c.text }}>
                      Delovna mesta in zadolžitve
                    </Text>
                    <Text style={{ fontSize: 12, color: c.textSecondary }}>
                      Šank, Rajon, Priprava …
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: c.textTertiary }}>›</Text>
                </View>
              </Card>
            </Pressable>
          </>
        ) : (
          <>
            {/* The month you are actually in is the number people look for. */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatTile
                title="Ta mesec"
                value={currentMonth ? hours(currentMonth.actual_hours) : '0 h'}
                caption={
                  currentMonth
                    ? Math.abs(currentMonth.actual_hours - currentMonth.planned_hours) > 0.01
                      ? `načrt ${hours(currentMonth.planned_hours)}`
                      : shiftCount(currentMonth.shift_count)
                    : 'ni smen'
                }
              />
              <StatTile
                title="Zaslužek"
                value={
                  currentMonth && earnings.hourlyRate != null
                    ? money(currentMonth.actual_hours * earnings.hourlyRate)
                    : '—'
                }
                caption={
                  earnings.hourlyRate == null
                    ? 'vpiši postavko'
                    : (currentMonth?.tips ?? 0) > 0
                      ? `+ ${money(currentMonth!.tips)} napitnine`
                      : 'ocena'
                }
                // A green dash reads as a stray line rather than "no value
                // yet"; the placeholder should look inert.
                tint={earnings.hourlyRate == null ? c.textSecondary : semantic.green}
              />
            </View>

            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: c.text }}>
                  Urna postavka
                </Text>
                <View style={{ flex: 1 }} />
                <TextInput
                  value={rateText}
                  onChangeText={setTypedRateText}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor={c.textTertiary}
                  style={{
                    minWidth: 80,
                    textAlign: 'right',
                    fontSize: 16,
                    color: c.text,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: radius.sm,
                    backgroundColor: c.fill,
                  }}
                />
                <Text style={{ fontSize: 15, color: c.textSecondary }}>€/h</Text>
              </View>

              {rateChanged ? (
                <Pressable
                  onPress={() => {
                    if (typedRate != null) {
                      void earnings.saveRate(typedRate, profile.id).then(() =>
                        setTypedRateText(null),
                      );
                    }
                  }}
                  disabled={earnings.saving || typedRate == null}
                  style={{
                    marginTop: 10,
                    minHeight: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.sm,
                    backgroundColor: c.accent,
                    opacity: typedRate == null ? 0.5 : 1,
                  }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                    {earnings.saving ? 'Shranjujem…' : 'Shrani postavko'}
                  </Text>
                </Pressable>
              ) : null}

              {earnings.error ? (
                <View style={{ marginTop: 10 }}>
                  <Message text={earnings.error} kind="error" />
                </View>
              ) : earnings.notice ? (
                <View style={{ marginTop: 10 }}>
                  <Message text={earnings.notice} kind="notice" />
                </View>
              ) : null}

              <Text style={{ fontSize: 12, color: c.textTertiary, marginTop: 10 }}>
                Postavko vidiš samo ti.
              </Text>
            </Card>

            {/* The worker's own record. Seeded from the published schedule,
                edited only by them, read by nobody else. */}
            <Card>
              <SectionTitle text="Oddelane smene" trailing="samo zate" />
              <View style={{ height: 12 }} />

              {earnings.logs.length === 0 ? (
                <EmptyHint text="Ko mine objavljena smena, se pojavi tukaj." />
              ) : (
                earnings.logs.slice(0, 8).map((log, index) => (
                  <Pressable key={log.id} onPress={() => setEditingLog(log)}>
                    {index > 0 ? (
                      <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, color: c.text }}>
                          {dayAndDate(log.work_date)}
                        </Text>
                        <Text style={{ fontSize: 12, color: c.textSecondary }}>
                          {time.range(log.clock_in, log.clock_out)}
                          {log.shift_id === null ? '  · izven urnika' : ''}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>
                          {hours(time.hoursBetween(log.clock_in, log.clock_out))}
                        </Text>
                        {log.tips_earned ? (
                          <Text style={{ fontSize: 12, color: semantic.green }}>
                            {money(log.tips_earned)}
                          </Text>
                        ) : null}
                      </View>

                      <Text style={{ fontSize: 14, color: c.textTertiary, marginLeft: 8 }}>›</Text>
                    </View>
                  </Pressable>
                ))
              )}

              <Text style={{ fontSize: 12, color: c.textTertiary, marginTop: 12 }}>
                Popravi čas, če si delal drugače kot po urniku. Vpisano vidiš samo ti.
              </Text>
            </Card>

            <Card>
              <SectionTitle text="Ure po mesecih" />
              <View style={{ height: 12 }} />

              {earnings.months.length === 0 ? (
                <EmptyHint text="Zaenkrat ni objavljenih ur." />
              ) : (
                earnings.months.map((month, index) => (
                  <View key={month.month}>
                    {index > 0 ? (
                      <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, color: c.text }}>
                          {monthLabel(month.month)}
                        </Text>
                        <Text style={{ fontSize: 12, color: c.textSecondary }}>
                          {shiftCount(month.shift_count)}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>
                          {hours(month.actual_hours)}
                        </Text>
                        {/* Only worth printing the plan when reality disagreed. */}
                        {Math.abs(month.actual_hours - month.planned_hours) > 0.01 ? (
                          <Text style={{ fontSize: 11, color: c.textTertiary }}>
                            načrt {hours(month.planned_hours)}
                          </Text>
                        ) : null}
                        {earnings.hourlyRate != null ? (
                          <Text style={{ fontSize: 12, color: semantic.green }}>
                            {money(month.actual_hours * earnings.hourlyRate)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ))
              )}

              <Text style={{ fontSize: 12, color: c.textTertiary, marginTop: 12 }}>
                Štejejo se samo smene iz objavljenih urnikov.
              </Text>
            </Card>
          </>
        )}

        <Card>
          <SectionTitle text="Ekipa" trailing={organization.name} />
          <View style={{ height: 12 }} />

          {team.members.length === 0 ? (
            <EmptyHint text="Ni sodelavcev." />
          ) : (
            <>
              {team.active.map((person, index) => (
                <MemberRow
                  key={person.id}
                  person={person}
                  isFormer={false}
                  showDivider={index > 0}
                  canManage={isManager && person.id !== profile.id}
                  armed={armedForRemoval === person.id}
                  working={team.working}
                  onArm={() => setArmedForRemoval(person.id)}
                  onConfirm={() => {
                    setArmedForRemoval(null);
                    void team.setActive(false, person.id);
                  }}
                  onRestore={() => void team.setActive(true, person.id)}
                />
              ))}

              {team.inactive.length > 0 ? (
                <>
                  <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '600',
                      letterSpacing: 0.4,
                      color: c.textTertiary,
                    }}>
                    NEKDANJI
                  </Text>
                  {team.inactive.map((person) => (
                    <MemberRow
                      key={person.id}
                      person={person}
                      isFormer
                      showDivider={false}
                      canManage={isManager && person.id !== profile.id}
                      armed={false}
                      working={team.working}
                      onArm={() => {}}
                      onConfirm={() => {}}
                      onRestore={() => void team.setActive(true, person.id)}
                    />
                  ))}
                </>
              ) : null}
            </>
          )}

          {team.error ? (
            <View style={{ marginTop: 10 }}>
              <Message text={team.error} kind="error" />
            </View>
          ) : team.notice ? (
            <View style={{ marginTop: 10 }}>
              <Message text={team.notice} kind="notice" />
            </View>
          ) : null}
        </Card>

        <Pressable
          onPress={() =>
            Alert.alert('Se res želiš odjaviti?', undefined, [
              { text: 'Prekliči', style: 'cancel' },
              { text: 'Odjava', style: 'destructive', onPress: () => void signOut() },
            ])
          }
          disabled={busy}
          style={{
            minHeight: 46,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: semantic.red + '40',
            backgroundColor: semantic.red + '14',
          }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: semantic.red }}>Odjava</Text>
        </Pressable>
      </ScrollView>

      {editingLog ? (
        <ShiftLogEditorSheet
          key={editingLog.id}
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSave={(clockIn, clockOut, tips, notes) =>
            void earnings.updateLog(editingLog.id, clockIn, clockOut, tips, notes, profile.id)
          }
        />
      ) : null}
    </View>
  );
}

function MemberRow({
  person,
  isFormer,
  showDivider,
  canManage,
  armed,
  working,
  onArm,
  onConfirm,
  onRestore,
}: {
  person: Profile;
  isFormer: boolean;
  showDivider: boolean;
  canManage: boolean;
  armed: boolean;
  working: boolean;
  onArm: () => void;
  onConfirm: () => void;
  onRestore: () => void;
}) {
  const c = usePalette();

  return (
    <View>
      {showDivider ? (
        <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
        <View style={{ opacity: isFormer ? 0.45 : 1 }}>
          <InitialsAvatar name={person.full_name} size={32} />
        </View>

        <Text style={{ flex: 1, fontSize: 15, color: isFormer ? c.textSecondary : c.text }}>
          {person.full_name}
        </Text>

        {!isFormer ? <RoleBadge role={person.role} /> : null}

        {canManage ? (
          isFormer ? (
            // Restoring someone is harmless, so it needs no arming.
            <Pressable
              onPress={onRestore}
              disabled={working}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.accentSoft,
              }}>
              <Text style={{ fontSize: 13 }}>↩︎</Text>
            </Pressable>
          ) : (
            // Two taps, no dialog: the first turns the dots into a bin, the
            // second removes. The armed bin is itself the warning.
            <Pressable
              onPress={armed ? onConfirm : onArm}
              disabled={working}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: armed ? semantic.red : c.fill,
              }}>
              <Icon
                name={armed ? 'trash' : 'more'}
                size={15}
                color={armed ? '#fff' : c.textSecondary}
              />
            </Pressable>
          )
        ) : null}
      </View>
    </View>
  );
}
