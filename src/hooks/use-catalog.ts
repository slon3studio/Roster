import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Duty, Position } from '@/types';

/**
 * A manager curating their own restaurant's positions and duties.
 *
 * Nothing is ever deleted: `is_active = false` hides a row while the shifts and
 * wishes referencing it keep making sense.
 */
export function useCatalog() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Loads inactive rows too — this is the screen where you bring one back. */
  const load = useCallback(async () => {
    setLoading(true);
    const [positionsResult, dutiesResult] = await Promise.all([
      supabase.from('positions').select('*').order('sort_order', { ascending: true }),
      supabase.from('duties').select('*').order('sort_order', { ascending: true }),
    ]);
    setLoading(false);

    if (positionsResult.error || dutiesResult.error) {
      setError((positionsResult.error ?? dutiesResult.error)!.message);
      return;
    }
    setPositions((positionsResult.data ?? []) as Position[]);
    setDuties((dutiesResult.data ?? []) as Duty[]);
  }, []);

  const run = useCallback(
    // PostgREST builders are thenable but not real Promises, so the parameter
    // is typed as PromiseLike.
    async (action: () => PromiseLike<{ error: { message: string } | null }>, success: string) => {
      setWorking(true);
      setError(null);
      setNotice(null);
      const { error: actionError } = await action();
      setWorking(false);

      if (actionError) {
        setError(
          actionError.message.toLowerCase().includes('duplicate key')
            ? 'Tako ime že obstaja.'
            : actionError.message,
        );
        return;
      }
      setNotice(success);
      await load();
    },
    [load],
  );

  const usableLabel = (typed: string, name: string) => {
    const trimmed = typed.trim();
    if (trimmed) return trimmed.slice(0, 3).toUpperCase();
    return name.charAt(0).toUpperCase() || '?';
  };

  return {
    positions,
    duties,
    activePositions: positions.filter((p) => p.is_active),
    activeDuties: duties.filter((d) => d.is_active),
    loading,
    working,
    error,
    notice,
    load,
    clearMessages: () => {
      setError(null);
      setNotice(null);
    },

    // organization_id is set by a trigger, so the client never sends it.
    addPosition: (name: string, shortLabel: string, color: string) =>
      run(
        () =>
          supabase.from('positions').insert({
            name: name.trim(),
            short_label: usableLabel(shortLabel, name),
            color,
            sort_order: Math.max(0, ...positions.map((p) => p.sort_order)) + 1,
          }),
        'Delovno mesto je dodano.',
      ),

    updatePosition: (
      id: string,
      name: string,
      shortLabel: string,
      color: string,
      isActive: boolean,
    ) =>
      run(
        () =>
          supabase
            .from('positions')
            .update({
              name: name.trim(),
              short_label: usableLabel(shortLabel, name),
              color,
              is_active: isActive,
            })
            .eq('id', id),
        'Shranjeno.',
      ),

    addDuty: (name: string) =>
      run(
        () =>
          supabase.from('duties').insert({
            name: name.trim(),
            sort_order: Math.max(0, ...duties.map((d) => d.sort_order)) + 1,
          }),
        'Zadolžitev je dodana.',
      ),

    updateDuty: (id: string, name: string, isActive: boolean) =>
      run(
        () => supabase.from('duties').update({ name: name.trim(), is_active: isActive }).eq('id', id),
        'Shranjeno.',
      ),
  };
}

export type CatalogHook = ReturnType<typeof useCatalog>;
