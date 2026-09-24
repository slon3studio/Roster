import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { configError, supabase } from '@/lib/supabase';
import type { AppSession, Organization, Profile } from '@/types';

type Status = 'loading' | 'misconfigured' | 'signedOut' | 'signedIn';

type OrganizationChoice =
  | { kind: 'create'; name: string }
  | { kind: 'join'; code: string };

type AuthValue = {
  status: Status;
  session: AppSession | null;
  configProblem: string | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  clearMessages: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (args: {
    email: string;
    password: string;
    fullName: string;
    organization: OrganizationChoice;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Outcome of loading the signed-in user's profile + restaurant.
 *
 * Keeping "there is no profile row" apart from "the query failed" is the whole
 * point. The Swift app collapsed them once, and a missing migration then got
 * reported to the user as "you do not belong to a restaurant" — wrong, and
 * impossible to act on. Same trap exists here.
 */
type Load =
  | { kind: 'loaded'; session: AppSession }
  | { kind: 'noProfile' }
  | { kind: 'failed'; message: string };

async function fetchSession(): Promise<Load> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { kind: 'failed', message: 'Seja ni na voljo.' };

  // `maybeSingle` rather than `single`: an empty result is a normal answer
  // here, not an error to be caught.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle<Profile>();

  if (profileError) return { kind: 'failed', message: slovenian(profileError.message) };
  if (!profile) return { kind: 'noProfile' };

  // `*` rather than a column list, so adding columns in a later migration
  // cannot break sign-in on a database that has not run it.
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .maybeSingle<Organization>();

  if (orgError) return { kind: 'failed', message: slovenian(orgError.message) };
  if (!organization) return { kind: 'noProfile' };

  return { kind: 'loaded', session: { profile, organization } };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(configError ? 'misconfigured' : 'loading');
  const [session, setSession] = useState<AppSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const reload = useCallback(async () => {
    const result = await fetchSession();

    if (result.kind === 'loaded') {
      setSession(result.session);
      setStatus('signedIn');
      return;
    }

    if (result.kind === 'noProfile') {
      // Signup created the account but never attached a restaurant. Rare, and
      // there is no screen to recover on, so end the session cleanly rather
      // than stranding the user.
      await supabase.auth.signOut();
      setSession(null);
      setStatus('signedOut');
      setNotice(
        'Ta račun ni povezan z nobeno restavracijo. Registriraj se znova ali prosi vodjo za kodo.',
      );
      return;
    }

    setSession(null);
    setStatus('signedOut');
    setError(result.message);
  }, []);

  useEffect(() => {
    if (configError) return;

    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        setStatus('signedOut');
        return;
      }
      await reload();
    })();

    return () => {
      cancelled = true;
    };
  }, [reload]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      clearMessages();
      const trimmed = email.trim();

      if (!trimmed || !password) {
        setError('Vnesi e-pošto in geslo.');
        return;
      }

      setBusy(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      setBusy(false);

      if (signInError) {
        setError(slovenian(signInError.message));
        return;
      }
      await reload();
    },
    [clearMessages, reload],
  );

  const signUp = useCallback<AuthValue['signUp']>(
    async ({ email, password, fullName, organization }) => {
      clearMessages();
      const trimmedEmail = email.trim();
      const trimmedName = fullName.trim();

      if (!trimmedEmail || !password) {
        setError('Vnesi e-pošto in geslo.');
        return;
      }
      if (password.length < 6) {
        setError('Geslo mora imeti vsaj 6 znakov.');
        return;
      }
      if (!trimmedName) {
        setError('Vnesi ime in priimek.');
        return;
      }
      if (organization.kind === 'create' && !organization.name.trim()) {
        setError('Vnesi ime restavracije.');
        return;
      }
      if (organization.kind === 'join' && !organization.code.trim()) {
        setError('Vnesi kodo restavracije.');
        return;
      }

      setBusy(true);

      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (signUpError) {
        setBusy(false);
        setError(slovenian(signUpError.message));
        return;
      }

      // With "Confirm email" on, signUp returns no session, so the restaurant
      // cannot be attached yet. The user confirms by email and signs in.
      const { data: after } = await supabase.auth.getSession();
      if (!after.session) {
        setBusy(false);
        setStatus('signedOut');
        setNotice('Račun je ustvarjen. Potrdi e-pošto, nato se prijavi.');
        return;
      }

      const rpc =
        organization.kind === 'create'
          ? supabase.rpc('create_organization', {
              org_name: organization.name.trim(),
              manager_name: trimmedName,
            })
          : supabase.rpc('join_organization', {
              code: organization.code.trim().toUpperCase(),
              worker_name: trimmedName,
            });

      const { error: rpcError } = await rpc;
      setBusy(false);

      if (rpcError) {
        setError(slovenian(rpcError.message));
        return;
      }
      await reload();
    },
    [clearMessages, reload],
  );

  const signOut = useCallback(async () => {
    clearMessages();
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    setSession(null);
    setStatus('signedOut');
  }, [clearMessages]);

  const requestPasswordReset = useCallback(
    async (email: string) => {
      clearMessages();
      const trimmed = email.trim();

      if (!trimmed.includes('@')) {
        setError('Vnesi svojo e-pošto.');
        return false;
      }

      setBusy(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed);
      setBusy(false);

      if (resetError) {
        setError(slovenian(resetError.message));
        return false;
      }
      setNotice('Poslali smo ti e-pošto za ponastavitev gesla.');
      return true;
    },
    [clearMessages],
  );

  const value = useMemo<AuthValue>(
    () => ({
      status,
      session,
      configProblem: configError,
      busy,
      error,
      notice,
      clearMessages,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      reload,
    }),
    [status, session, busy, error, notice, clearMessages, signIn, signUp, signOut, requestPasswordReset, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

/**
 * Supabase errors arrive in English. The ones a user can actually hit get a
 * Slovenian message; messages raised by our own SQL functions are already
 * Slovenian and fall through untouched.
 */
function slovenian(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes('invalid login credentials')) return 'Napačna e-pošta ali geslo.';
  if (lower.includes('email not confirmed')) return 'E-pošta še ni potrjena. Preveri svoj predal.';
  if (lower.includes('already registered') || lower.includes('user already'))
    return 'Ta e-pošta je že registrirana. Prijavi se.';
  if (lower.includes('unable to validate email') || lower.includes('invalid format'))
    return 'E-pošta ni v veljavni obliki.';
  if (lower.includes('password should be')) return 'Geslo mora imeti vsaj 6 znakov.';
  if (lower.includes('rate limit') || lower.includes('too many requests'))
    return 'Preveč poskusov. Počakaj minuto in poskusi znova.';
  if (lower.includes('network') || lower.includes('fetch failed'))
    return 'Ni povezave s strežnikom. Preveri internet.';

  return raw;
}
