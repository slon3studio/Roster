# Rotaly — React Native (Expo)

Port of the SwiftUI app at `~/Desktop/Rotaly`. **The Supabase backend is
shared and unchanged** — same project, same 14 migrations, same 12 RPCs. Only
the UI is being rewritten.

## Run it

```bash
npx expo start          # then scan the QR with Expo Go, or press i / a
npx tsc --noEmit        # typecheck
npx expo lint           # lint
npx expo-doctor         # dependency / config sanity
```

## Configuration

`.env` (gitignored, `.env.example` is the template):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Both are public by design — RLS is what protects the data. A `sb_secret_` key
must never go here; `src/lib/supabase.ts` refuses to start if it sees one.

## Where things live

```
src/app/                 routes (Expo Router — every file is a screen)
  _layout.tsx            auth gate via Stack.Protected
  login.tsx
  register.tsx
  (tabs)/                the signed-in shell
src/contexts/auth.tsx    session, role, org — the AuthService counterpart
src/lib/supabase.ts      the single client
src/lib/theme.ts         palette; the four semantic colours are load-bearing
src/types/index.ts       row shapes, mirroring the Postgres tables
src/components/ui/       shared pieces
```

Keep non-route code out of `src/app/` — Expo Router treats every file there as
a screen.

## Notes carried over from the Swift app

**Dates and times cross the boundary as strings**, never as `Date`. Postgres
`date` and `time` have no zone, so parsing them into a local date object is how
you end up storing the wrong Monday, or halving someone's hours.

**The client never sends `organization_id`.** Triggers derive it from
`auth.uid()`. If you find yourself typing it, something is wrong.

**"No rows" is not an error.** Use `maybeSingle()`, not `single()`. Collapsing
the two once meant a missing migration was reported to the user as "you do not
belong to a restaurant" — wrong, and unfixable from the UI.

## What is ported

The whole finished Swift app, not a staged subset. Every screen it had exists
here:

| Screen | Route | Verified in the simulator |
| --- | --- | --- |
| Login | `app/login.tsx` | yes — signs in, rejects bad credentials |
| Registracija | `app/register.tsx` | yes — signs straight in, no extra step |
| Urnik, week grid | `(tabs)/index.tsx` + `components/schedule-grid.tsx` | yes |
| Urnik, vertical grid | `components/schedule-day-grid.tsx` | yes — days down, slots across, same design |
| Shift editor sheet | `components/shift-sheets.tsx` | yes — times, position, duty, conflict warning, delete |
| Add-shift sheet | `components/shift-sheets.tsx` | yes — active workers only, `Dodaj` gated on a pick |
| Želje (worker + manager) | `(tabs)/wishes.tsx` | yes (manager side; worker side not re-checked since the port) |
| Menjave | `(tabs)/swaps.tsx` | yes — both manager sections render, with their empty states |
| Profil | `(tabs)/profile.tsx` | yes — join code, rotate, team list, role badges |
| Delovna mesta in zadolžitve | `app/catalog.tsx` | yes — including the position editor (label, 9-colour palette, live preview, `V uporabi`) |

Not verified by clicking, because they only appear for a worker account and I
have no worker password: the cover-request sheet, the shift-log editor, and the
hours + hourly-rate section of the profile. The code is there and typechecks;
sign in as `ivo1` to exercise it.

## Not built (deliberate)

- **Swap UI.** Migration 0014 has `shift_swaps` plus propose / respond /
  cancel / resolve. Testable via SQL; no screen yet.
- **Push notifications.** `expo-notifications` needs an Apple Developer
  account. Nothing written for it would have survived the port, so it waited.
- **Drag and drop.** The grids are tap-to-move, as agreed.
- Copy-last-week, a submission deadline, export/share, the chat feed, and the
  manager team-hours view.

## Known rough edges

- The brand mark and the tab bar use emoji as placeholders. The real
  1024×1024 icon is at
  `~/Desktop/Rotaly/Rotaly/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`.
- Expo Go's floating dev-menu bubble sits on top of the `Uredi` button in the
  top-right. Drag the bubble away, or ignore it — it is not part of the app.
