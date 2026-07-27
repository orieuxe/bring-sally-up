# Bring Sally Up

Push-up challenge app synced to "Flower" by Moby. Timer follows vocal cues "Bring Sally up / down", tracks progress with heatmap and charts.

## Stack

- **Expo SDK 57** (React Native 0.86)
- **TypeScript** (strict)
- **React Navigation** (stack)
- **react-native-reanimated** + **react-native-reanimated-carousel** (calendar carousel)
- **react-native-svg** (charts, progress ring)
- **react-native-size-matters** (responsive UI)
- **expo-audio** (playback)
- **AsyncStorage** (local persistence)

## Run

```bash
npm install
npx expo start --web    # web (dev)
npx expo start          # mobile (scan Expo Go)
```

## Build APK

```bash
npx eas build -p android --profile preview
```

Requires `assets/sally.mp3` (not included).

## Structure

```
src/
├── data/cues.ts           # Calibrated timestamps (61 cues)
├── screens/
│   ├── HomeScreen.tsx      # Home: scores, streak, GO button
│   ├── ChallengeScreen.tsx # Player: progress ring, UP/DOWN badges, time adjust
│   ├── HistoryScreen.tsx   # Calendar carousel, trend chart, weekday stats, sessions
│   ├── ImportScreen.tsx    # Bulk import in M:SS format
│   └── CalibrateScreen.tsx # Tap-to-calibrate cues (one-shot)
├── storage.ts             # AsyncStorage CRUD (history, custom cues)
└── types.ts               # Shared types
```

## Features

- **Player**: SVG progress ring (green→red), UP/DOWN badges, tap anywhere to give up, ± time adjust before save. One entry per day (overwrites if better).
- **Calendar**: swipeable carousel, cells colored (red→green vs period average).
- **Tooltip**: tap a cell to see time, estimated reps, ±s vs average.
- **Trend chart**: moving average curve, scatter dots, auto-scaled Y axis.
- **Filters**: 1M / 6M / 1Y / ALL. Swiping a month forces 1M on that month.
- **Weekday stats**: sortable table (avg time / sessions done / missed days).
- **Import**: paste `YYYY-MM-DD M:SS` lines.
- **Calibration**: tap along with the song to record real timestamps (stored as custom cues).
- **Export**: CSV download (date, duration, completed).
- **Score color**: shared `scoreColor(score, avg)` gradient — dark red → brick → dull sage (average) → green → deep pine (record). White text stays readable on every step; all-time best day gets an accent ★ in the calendar, selected day a white border.

## Recent (July 2026)

- **Responsive UI**: `react-native-size-matters` (`ms()` / `scale()`) for all screens.
- **Calendar carousel**: `react-native-reanimated-carousel`, skips empty months, left/right arrows + swipe.
- **Heatmap**: per-cell color based on score vs 10-session average.
- **Weekday table**: replaces raw session list, sortable columns.
- **Tooltip at top**: always visible placeholder or selected-day details.
- **Trend chart**: auto-scale, overflow-visible labels, clickable scatter points.
- **Score color ring**: live ring color based on average of last 10 sessions.
- **ACENT constant**: single source of truth for all button/highlight colors.
- **ESLint**: `@stylistic` rules with auto-fix (`npm run format`).
