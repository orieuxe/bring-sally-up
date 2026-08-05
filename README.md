# Bring Sally Up

Push-up challenge app synced to "Flower" by Moby. Timer follows the vocal cues "Bring Sally up / down", tracks progress with a calendar heatmap, trend chart and stats.

## Stack

Expo (React Native) + TypeScript. Local persistence via AsyncStorage — no backend.

## Run

```bash
npm install
npx expo start --web    # web (dev)
npx expo start          # mobile (scan Expo Go)
```

Requires `assets/sally.mp3` (not included).

## Build APK

```bash
npx eas build -p android --profile preview
```

## Structure

```
src/
├── data/cues.ts           # Calibrated cue timestamps
├── screens/               # Home, Challenge (player), History, Import
├── components/
│   ├── home/              # Stat card, animated play button
│   └── history/           # History building blocks (calendar, chart, tables, filter bar, delete sheet)
├── utils/                 # Score color gradient, time formatting, stats helpers, export
├── theme.ts               # Shared color tokens
├── storage.ts             # AsyncStorage CRUD
└── types.ts               # Shared types
```

## Features

- **Home**: two stat cards — best time under the last time, best streak under the current one — and a play button that pulses with a nudge until today's session is done.
- **Player**: progress ring colored by score, UP/DOWN cue badges, tap to give up, ± time adjust before save. One entry per day (keeps the best), and a second run of the day says by how much it beat the first.
- **History**: swipeable calendar heatmap, trend chart, weekday and time-of-day stats tables, period summary. Sticky bottom filter bar (month / 6M / 1Y / all) driving the whole screen.
- **Record**: all-time best marked with a ★ across calendar, chart and tooltip.
- **Import / Export**: paste `YYYY-MM-DD M:SS` lines in; export writes the same format back out (file download on web, share sheet on mobile).
- **Delete**: from the history actions, either the session currently shown or the whole history.

## Lint

```bash
npm run lint      # check
npm run format    # auto-fix
```
