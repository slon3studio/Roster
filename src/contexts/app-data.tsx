import { createContext, useContext, useEffect } from 'react';

import { useCover, type CoverHook } from '@/hooks/use-cover';
import { useTeam, type TeamHook } from '@/hooks/use-team';

/**
 * Team and cover requests, owned once for the whole signed-in shell.
 *
 * The Swift app kept these in `MainTabView` for the same reason: the tab badge,
 * the red cells on the schedule and the Menjave list all have to read the same
 * data, and three separate copies would drift.
 */
type AppData = { team: TeamHook; cover: CoverHook };

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const team = useTeam();
  const cover = useCover();

  useEffect(() => {
    void team.load();
    void cover.load();
    // Loaded once when the shell mounts; screens refresh them on pull.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AppDataContext.Provider value={{ team, cover }}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData must be used inside AppDataProvider');
  return value;
}
