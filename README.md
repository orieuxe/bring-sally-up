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
│   ├── HistoryScreen.tsx   # History orchestration (state + composition)
│   ├── ImportScreen.tsx    # Bulk import in M:SS format
│   └── CalibrateScreen.tsx # Tap-to-calibrate cues (one-shot)
├── components/history/    # History building blocks
│   ├── PeriodSummary.tsx   # Period label + sessions/average/best
│   ├── DayTooltip.tsx      # Selected/latest day details
│   ├── CalendarCarousel.tsx# Swipeable month heatmap
│   ├── TrendChart.tsx      # Scatter + moving-average SVG chart
│   ├── WeekdayTable.tsx    # Sortable weekday stats
│   ├── TimeSlotTable.tsx   # Sortable time-of-day stats
│   └── FilterBar.tsx       # Sticky range filter + ⋯ actions
├── utils/
│   ├── color.ts            # scoreColor gradient, ACCENT, RECORD_GOLD
│   ├── time.ts             # formatTime (M:SS)
│   └── history.ts          # Pure helpers: ranges, months, stats
├── theme.ts               # Shared color tokens
├── storage.ts             # AsyncStorage CRUD (history, daily best, custom cues)
└── types.ts               # Shared types
```

## Features

- **Player**: SVG progress ring (green→red), UP/DOWN badges, tap anywhere to give up, ± time adjust before save. One entry per day (overwrites if better).
- **Calendar**: swipeable carousel, cells colored (red→green vs period average).
- **Tooltip**: always filled (latest session by default) — color dot, real reps, time, ±s vs average, ★ badge on the all-time record.
- **Trend chart**: moving average curve, scatter dots, auto-scaled Y axis.
- **Filters**: sticky bottom bar (thumb zone) — 1M / 6M / 1Y / ALL, plus a ⋯ menu for clear/import/export. The 1M button shows the selected month's name; swiping a month forces 1M on that month. A period label on the top summary card (sessions / average / best) echoes the active filter.
- **Weekday stats**: sortable table (avg time / sessions done / missed days).
- **Time-of-day stats**: sortable table by slot (nuit 0h-8h, matin 8h-12h, midi 12h-14h, aprem 14h-18h, soir 18h-0h) — the session hour is stored alongside the date (`Attempt.hour`); older entries without it are excluded.
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
