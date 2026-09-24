// `expo-sqlite/localStorage/install` provides the `localStorage` global that
// Supabase needs to persist a session across app launches. This is what the
// current Expo guide recommends — not AsyncStorage, and the `URL` polyfill
// Supabase's own quickstart mentions is unnecessary because Expo ships one.
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Why the client could not be built, if it could not. */
export const configError: string | null = (() => {
  if (!url || !publishableKey) {
    return 'V datoteki .env manjkata EXPO_PUBLIC_SUPABASE_URL in EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.';
  }
  if (publishableKey === 'ZAMENJAJ_ME') {
    return 'V .env je še privzeta vrednost. Vpiši publishable key iz Supabase (Project Settings → API).';
  }
  // Catching a pasted secret key is cheap and the mistake is expensive.
  if (publishableKey.startsWith('sb_secret_')) {
    return 'V .env je tajni (secret) ključ. Ta obide vsa varnostna pravila in ne sme biti v aplikaciji — uporabi publishable ključ.';
  }
  if (!url.startsWith('https://')) {
    return `"${url}" ni veljaven naslov. Pričakovana oblika: https://xxxx.supabase.co`;
  }
  return null;
})();

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', publishableKey ?? 'placeholder', {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session handoff on a phone; the app owns the session.
    detectSessionInUrl: false,
  },
});
