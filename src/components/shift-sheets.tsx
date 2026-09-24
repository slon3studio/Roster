import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { DestructiveButton, Sheet, SheetFootnote, SheetRow } from '@/components/sheet';
import { Card, PositionChips, SectionTitle } from '@/components/ui/design';
import { Message } from '@/components/ui/auth-parts';
import { usePalette } from '@/hooks/use-palette';
import { parseDecimal } from '@/lib/format';
import { radius } from '@/lib/theme';
import * as time from '@/lib/time';
import { dayName } from '@/lib/week';
import type { Duty, Position, ScheduleConflict, Shift, ShiftSlot } from '@/types';
import { conflictExplanation, slotLabel } from '@/types';

function TimeField({ value, onChange }: { value: Date; onChange: (next: Date) => void }) {
  const c = usePalette();
  const [open, setOpen] = useState(Platform.OS === 'ios');

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="time"
        display="compact"
        onChange={(_, next) => next && onChange(next)}
      />
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: radius.sm,
          backgroundColor: c.fill,
        }}>
        <Text style={{ fontSize: 15, color: c.text }}>{time.fromDate(value).slice(0, 5)}</Text>
      </Pressable>

      {open ? (
        <DateTimePicker
          value={value}
          mode="time"
          onChange={(_, next) => {
            setOpen(false);
            if (next) onChange(next);
          }}
        />
      ) : null}
    </>
  );
}

/** Edit one person's shift: hours, position, duty. Where "do 15" comes from. */
export function ShiftEditorSheet({
  shift,
  workerName,
  conflict,
  positions,
  duties,
  onSave,
  onDelete,
  onClose,
}: {
  shift: Shift;
  workerName: string;
  conflict: ScheduleConflict | null;
  positions: Position[];
  duties: Duty[];
  onSave: (start: string, end: string, positionId: string | null, dutyId: string | null) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const c = usePalette();
  // The parent mounts this with `key={shift.id}`, so a different shift is a
  // different component and the initial state is simply the shift's own values.
  // That is the React-recommended alternative to mirroring props into state.
  const [start, setStart] = useState(() => time.toDate(shift.start_time));
  const [end, setEnd] = useState(() => time.toDate(shift.end_time));
  const [positionId, setPositionId] = useState<string | null>(shift.position_id);
  const [dutyId, setDutyId] = useState<string | null>(shift.duty_id);

  return (
    <Sheet
      visible
      title={workerName}
      onClose={onClose}
      onConfirm={() => {
        onSave(time.fromDate(start), time.fromDate(end), positionId, dutyId);
        onClose();
      }}>
      <>
          <Card>
            <SheetRow label="Dan" value={dayName(shift.day_of_week)} />
            <SheetRow label="Smena" value={slotLabel[shift.slot]} />
          </Card>

          {conflict ? (
            <>
              <Message
                text={`${workerName} ${conflictExplanation[conflict.kind]}.`}
                kind="error"
              />
              <SheetFootnote text="Ni prepovedano — samo opozorilo, da preveriš." />
            </>
          ) : null}

          <SectionTitle text="Delovni čas" />
          <Card>
            <SheetRow label="Začetek">
              <TimeField value={start} onChange={setStart} />
            </SheetRow>
            <SheetRow label="Konec">
              <TimeField value={end} onChange={setEnd} />
            </SheetRow>
          </Card>
          <SheetFootnote text="Privzeti čas smene lahko tu spremeniš samo za to osebo — npr. pride ob 18:00 ali gre domov ob 15:00." />

          <SectionTitle text="Delovno mesto" />
          <Card>
            <PositionChips positions={positions} value={positionId} onChange={setPositionId} />
          </Card>

          <SectionTitle text="Zadolžitev" />
          <Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <DutyChip label="Ni določena" selected={dutyId === null} onPress={() => setDutyId(null)} />
              {duties.map((duty) => (
                <DutyChip
                  key={duty.id}
                  label={duty.name}
                  selected={dutyId === duty.id}
                  onPress={() => setDutyId(duty.id)}
                />
              ))}
            </View>
            {positions.length === 0 && duties.length === 0 ? (
              <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 8 }}>
                Ta restavracija nima nastavljenih delovnih mest ne zadolžitev.
              </Text>
            ) : null}
          </Card>

          <DestructiveButton
            title="Odstrani z urnika"
            onPress={() => {
              onDelete();
              onClose();
            }}
          />
      </>
    </Sheet>
  );
}

function DutyChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = usePalette();

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: selected ? c.accent : c.fill,
      }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? '#fff' : c.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Add someone to an empty cell. */
export function AddShiftSheet({
  target,
  candidates,
  positions,
  duties,
  onAdd,
  onClose,
}: {
  target: { day: number; slot: ShiftSlot };
  candidates: { id: string; full_name: string }[];
  positions: Position[];
  duties: Duty[];
  onAdd: (workerId: string, positionId: string | null, dutyId: string | null) => void;
  onClose: () => void;
}) {
  const c = usePalette();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [positionId, setPositionId] = useState<string | null>(null);
  const [dutyId, setDutyId] = useState<string | null>(null);

  return (
    <Sheet
      visible
      title="Dodaj na urnik"
      confirmLabel="Dodaj"
      confirmDisabled={!workerId}
      onClose={onClose}
      onConfirm={() => {
        if (workerId) onAdd(workerId, positionId, dutyId);
        onClose();
      }}>
      <>
          <Card>
            <SheetRow label="Dan" value={dayName(target.day)} />
            <SheetRow label="Smena" value={slotLabel[target.slot]} />
          </Card>

          <SectionTitle text="Kdo dela" />
          <Card>
            {candidates.length === 0 ? (
              <Text style={{ fontSize: 15, color: c.textSecondary }}>
                Vsi sodelavci so že razporejeni v to smeno.
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {candidates.map((person) => (
                  <DutyChip
                    key={person.id}
                    label={person.full_name}
                    selected={workerId === person.id}
                    onPress={() => setWorkerId(person.id)}
                  />
                ))}
              </View>
            )}
          </Card>

          <SectionTitle text="Delovno mesto" />
          <Card>
            <PositionChips positions={positions} value={positionId} onChange={setPositionId} />
          </Card>

          <SectionTitle text="Zadolžitev" />
          <Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <DutyChip label="Ni določena" selected={dutyId === null} onPress={() => setDutyId(null)} />
              {duties.map((duty) => (
                <DutyChip
                  key={duty.id}
                  label={duty.name}
                  selected={dutyId === duty.id}
                  onPress={() => setDutyId(duty.id)}
                />
              ))}
            </View>
          </Card>

          <SheetFootnote text="Delovni čas bo privzet za to smeno. Po dodajanju ga lahko spremeniš s klikom na ime." />
      </>
    </Sheet>
  );
}

/**
 * Worker taps their own shift: ask to be covered, or take the request back.
 *
 * The sheet waits for the result and only closes on success. Firing the request
 * and dismissing in the same breath made a refusal from the server — an
 * unpublished week, a missing migration — look exactly like nothing happening.
 */
export function CoverRequestSheet({
  shift,
  existing,
  positionName,
  working,
  errorMessage,
  onRequest,
  onCancelRequest,
  onClose,
}: {
  shift: Shift;
  existing: { id: string; status: string } | null;
  positionName: string | null;
  working: boolean;
  errorMessage: string | null;
  onRequest: (note: string) => Promise<boolean>;
  onCancelRequest: (id: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const c = usePalette();
  const [note, setNote] = useState('');

  const run = async (action: () => Promise<boolean>) => {
    if (await action()) onClose();
  };

  return (
    <Sheet visible title="Moja smena" onClose={onClose}>
      <>
          <Card>
            <SheetRow label="Dan" value={dayName(shift.day_of_week)} />
            <SheetRow label="Čas" value={time.range(shift.start_time, shift.end_time)} />
            {positionName ? <SheetRow label="Delovno mesto" value={positionName} /> : null}
          </Card>

          {errorMessage ? <Message text={errorMessage} kind="error" /> : null}

          {existing ? (
            <>
              <Message
                text={
                  existing.status === 'claimed'
                    ? 'Sodelavec je smeno prevzel. Čaka se potrditev vodje.'
                    : 'Prošnja je objavljena. Sodelavci jo vidijo v zavihku Menjave.'
                }
                kind="notice"
              />
              <DestructiveButton
                title={working ? 'Pošiljam…' : 'Prekliči prošnjo'}
                disabled={working}
                onPress={() => void run(() => onCancelRequest(existing.id))}
              />
            </>
          ) : (
            <>
              <SectionTitle text="Zakaj ne moreš" />
              <Card>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Razlog (neobvezno)"
                  placeholderTextColor={c.textTertiary}
                  multiline
                  style={{ minHeight: 60, fontSize: 15, color: c.text }}
                />
              </Card>
              <SheetFootnote text="Prošnjo vidijo vsi sodelavci. Ko jo kdo prevzame, mora menjavo potrditi še vodja." />

              <Pressable
                onPress={() => void run(() => onRequest(note))}
                disabled={working}
                style={{
                  minHeight: 50,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.md,
                  backgroundColor: c.accent,
                  opacity: working ? 0.6 : 1,
                }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                  {working ? 'Pošiljam…' : 'Zaprosi za menjavo'}
                </Text>
              </Pressable>
            </>
          )}
      </>
    </Sheet>
  );
}

/** Worker corrects one of their own logged shifts. */
export function ShiftLogEditorSheet({
  log,
  onSave,
  onClose,
}: {
  log: { id: string; work_date: string; clock_in: string; clock_out: string; tips_earned: number | null; notes: string | null; shift_id: string | null };
  onSave: (clockIn: string, clockOut: string, tips: number | null, notes: string) => void;
  onClose: () => void;
}) {
  const c = usePalette();
  const [start, setStart] = useState(() => time.toDate(log.clock_in));
  const [end, setEnd] = useState(() => time.toDate(log.clock_out));
  const [tips, setTips] = useState(
    log.tips_earned != null ? String(log.tips_earned).replace('.', ',') : '',
  );
  const [notes, setNotes] = useState(log.notes ?? '');

  const computedHours = time.hoursBetween(time.fromDate(start), time.fromDate(end));

  return (
    <Sheet
      visible
      title="Popravi smeno"
      onClose={onClose}
      onConfirm={() => {
        onSave(time.fromDate(start), time.fromDate(end), parseDecimal(tips), notes);
        onClose();
      }}>
      <>
          <Card>
            <SheetRow label="Ur skupaj" value={`${String(Number(computedHours.toFixed(2))).replace('.', ',')} h`} />
            {log.shift_id === null ? (
              <SheetFootnote text="Ta smena ni bila na urniku." />
            ) : null}
          </Card>

          <SectionTitle text="Dejanski čas" />
          <Card>
            <SheetRow label="Prišel">
              <TimeField value={start} onChange={setStart} />
            </SheetRow>
            <SheetRow label="Odšel">
              <TimeField value={end} onChange={setEnd} />
            </SheetRow>
          </Card>
          <SheetFootnote text="Če si delal čez polnoč, vpiši uro odhoda normalno — ure se preračunajo same." />

          <SectionTitle text="Napitnina" />
          <Card>
            <SheetRow label="Znesek">
              <TextInput
                value={tips}
                onChangeText={setTips}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={c.textTertiary}
                style={{ fontSize: 15, color: c.text, minWidth: 70, textAlign: 'right' }}
              />
            </SheetRow>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Opomba (neobvezno)"
              placeholderTextColor={c.textTertiary}
              multiline
              style={{ minHeight: 50, fontSize: 15, color: c.text, marginTop: 8 }}
            />
          </Card>
          <SheetFootnote text="Napitnino in opombo vidiš samo ti. Vodja ne." />
      </>
    </Sheet>
  );
}
