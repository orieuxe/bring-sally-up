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
├── screens/               # Home, Challenge (player), History, Import, Calibrate
├── components/history/    # History building blocks (calendar, chart, tables, filter bar)
├── utils/                 # Score color gradient, time formatting, stats helpers
├── theme.ts               # Shared color tokens
├── storage.ts             # AsyncStorage CRUD
└── types.ts               # Shared types
```

## Features

- **Player**: progress ring colored by score, UP/DOWN cue badges, tap to give up, ± time adjust before save. One entry per day (keeps the best).
- **History**: swipeable calendar heatmap, trend chart, weekday stats table, period summary. Sticky bottom filter bar (month / 6M / 1Y / all) driving the whole screen.
- **Record**: all-time best marked with a ★ across calendar, chart and tooltip.
- **Import / Export**: paste `YYYY-MM-DD M:SS` lines in, CSV out.
- **Calibration**: tap along with the song to record custom cue timestamps.

## Lint

```bash
npm run lint      # check
npm run format    # auto-fix
```
