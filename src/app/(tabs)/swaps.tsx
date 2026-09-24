import { useCallback, useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Message } from '@/components/ui/auth-parts';
import {
  AppBackground,
  Card,
  EmptyHint,
  InitialsAvatar,
  PersonChip,
  PositionBadge,
  SectionTitle,
} from '@/components/ui/design';
import { useAppData } from '@/contexts/app-data';
import { useAuth } from '@/contexts/auth';
import { usePalette } from '@/hooks/use-palette';
import { useSchedule } from '@/hooks/use-schedule';
import { radius, semantic } from '@/lib/theme';
import * as time from '@/lib/time';
import { addWeeks, dayName, mondayOf } from '@/lib/week';
import type { CoverRequest, CoverStatus } from '@/types';
import { coverStatusLabel } from '@/types';

export default function SwapsScreen() {
  const c = usePalette();
  const { session } = useAuth();
  const { team, cover } = useAppData();
  const schedule = useSchedule();

  const isManager = session?.profile.role === 'manager';

  /**
   * Cover requests can point at shifts in any week, so the schedule is loaded
   * for this week and the next two to resolve day and time. Anything further
   * out shows without its details rather than not at all.
   */
  const loadNearbyWeeks = useCallback(async () => {
    const thisWeek = mondayOf(new Date());
    await schedule.loadWeeks([thisWeek, addWeeks(1, thisWeek), addWeeks(2, thisWeek)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void schedule.loadLookups();
    void loadNearbyWeeks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    cover.clearMessages();
    await Promise.all([loadNearbyWeeks(), cover.load(), team.load()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) return null;
  const me = session.profile.id;

  /** Whether the signed-in worker already works that day and slot, which is
   *  what makes a claim unapprovable. */
  const alreadyWorking = (request: CoverRequest) => {
    const shift = schedule.shiftById(request.shift_id);
    if (!shift) return false;

    return schedule.shifts.some(
      (other) =>
        other.id !== shift.id &&
        other.week_start_date === shift.week_start_date &&
        other.day_of_week === shift.day_of_week &&
        other.slot === shift.slot &&
        other.assigned_worker_id === me,
    );
  };

  const waiting = cover.requests.filter((r) => r.status === 'claimed');
  const unclaimed = cover.requests.filter((r) => r.status === 'open');
  const available = cover.openForOthers(me);
  const mine = cover.mine(me);
  const inProgress = cover.active.filter(
    (r) => r.status === 'claimed' && r.requested_by !== me && r.claimed_by !== me,
  );

  const card = (request: CoverRequest, actions: React.ReactNode) => {
    const shift = schedule.shiftById(request.shift_id);
    const isMine = request.requested_by === me;

    return (
      <View key={request.id} style={{ position: 'relative' }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <InitialsAvatar name={team.nameOf(request.requested_by)} size={38} />

            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: c.text }}>
                  {team.nameOf(request.requested_by)}
                </Text>
                {shift ? (
                  <PositionBadge position={schedule.positionOf(shift.position_id)} />
                ) : null}
              </View>

              <Text style={{ fontSize: 12, color: shift ? c.textSecondary : c.textTertiary }}>
                {shift
                  ? `${dayName(shift.day_of_week)} · ${time.range(shift.start_time, shift.end_time)}`
                  : 'Smena iz drugega tedna'}
              </Text>
            </View>

            <StatusPill status={request.status} />
          </View>

          {request.note ? (
            <Text
              style={{
                fontSize: 12,
                fontStyle: 'italic',
                color: c.textSecondary,
                backgroundColor: c.fill,
                borderRadius: radius.sm,
                padding: 10,
                marginTop: 12,
              }}>
              „{request.note}”
            </Text>
          ) : null}

          {request.claimed_by ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: c.textSecondary }}>→</Text>
              <PersonChip name={team.nameOf(request.claimed_by)} highlighted />
            </View>
          ) : null}

          {actions ? (
            <View
              style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              {actions}
            </View>
          ) : null}
        </Card>

        <View
          style={{
            position: 'absolute',
            left: 1,
            top: 14,
            bottom: 14,
            width: 4,
            borderRadius: 2,
            backgroundColor: isMine ? c.accent : statusTint(request.status),
          }}
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <AppBackground />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 56, gap: 14, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={cover.loading} onRefresh={refresh} />}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: c.text }}>Menjave</Text>

        {cover.error ? <Message text={cover.error} kind="error" /> : null}
        {cover.notice ? <Message text={cover.notice} kind="notice" /> : null}

        {isManager ? (
          <>
            <SectionTitle
              text="Za odobritev"
              trailing={waiting.length ? String(waiting.length) : undefined}
            />
            {waiting.length === 0 ? (
              <Card>
                <EmptyHint text="Nič ne čaka na tvojo odločitev." />
              </Card>
            ) : (
              waiting.map((request) =>
                card(
                  request,
                  <>
                    <ActionChip
                      label="Odobri"
                      tint={semantic.green}
                      filled
                      onPress={() => void cover.resolve(request.id, true)}
                      disabled={cover.working}
                    />
                    <ActionChip
                      label="Zavrni"
                      tint={semantic.red}
                      onPress={() => void cover.resolve(request.id, false)}
                      disabled={cover.working}
                    />
                  </>,
                ),
              )
            )}

            <SectionTitle text="Še nihče ni prevzel" />
            {unclaimed.length === 0 ? (
              <Card>
                <EmptyHint text="Ni odprtih prošenj." />
              </Card>
            ) : (
              unclaimed.map((request) =>
                card(
                  request,
                  <ActionChip
                    label="Zavrni"
                    tint={semantic.red}
                    onPress={() => void cover.resolve(request.id, false)}
                    disabled={cover.working}
                  />,
                ),
              )
            )}
          </>
        ) : (
          <>
            <SectionTitle
              text="Na voljo za prevzem"
              trailing={available.length ? String(available.length) : undefined}
            />
            {available.length === 0 ? (
              <Card>
                <EmptyHint
                  text={
                    cover.active.length === 0
                      ? 'V restavraciji ni nobene aktivne menjave.'
                      : 'Trenutno ni smen, ki bi jih lahko prevzel.'
                  }
                />
              </Card>
            ) : (
              available.map((request) =>
                card(
                  request,
                  alreadyWorking(request) ? (
                    // The database refuses this too, but saying so up front
                    // beats letting someone tap and be told no.
                    <Text style={{ fontSize: 12, color: c.textSecondary }}>
                      Že delaš to smeno
                    </Text>
                  ) : (
                    <ActionChip
                      label="Prevzamem"
                      tint={c.accent}
                      filled
                      onPress={() => void cover.claim(request.id)}
                      disabled={cover.working}
                    />
                  ),
                ),
              )
            )}

            {inProgress.length > 0 ? (
              <>
                <SectionTitle text="V teku pri sodelavcih" />
                {inProgress.map((request) => card(request, null))}
              </>
            ) : null}

            <SectionTitle text="Moje menjave" />
            {mine.length === 0 ? (
              <Card>
                <EmptyHint text="Nimaš aktivnih menjav." />
              </Card>
            ) : (
              mine.map((request) =>
                card(
                  request,
                  <ActionChip
                    label={request.requested_by === me ? 'Prekliči' : 'Umakni se'}
                    tint={semantic.red}
                    onPress={() =>
                      void (request.requested_by === me
                        ? cover.cancel(request.id)
                        : cover.unclaim(request.id))
                    }
                    disabled={cover.working}
                  />,
                ),
              )
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function statusTint(status: CoverStatus): string {
  if (status === 'open') return semantic.red;
  if (status === 'claimed') return semantic.orange;
  if (status === 'approved') return semantic.green;
  return '#8E8E93';
}

function StatusPill({ status }: { status: CoverStatus }) {
  const tint = statusTint(status);

  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.pill,
        backgroundColor: tint + '2B',
      }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: tint }}>
        {coverStatusLabel[status]}
      </Text>
    </View>
  );
}

function ActionChip({
  label,
  tint,
  filled,
  onPress,
  disabled,
}: {
  label: string;
  tint: string;
  filled?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: filled ? tint : tint + '24',
        opacity: disabled ? 0.5 : 1,
      }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: filled ? '#fff' : tint }}>
        {label}
      </Text>
    </Pressable>
  );
}
