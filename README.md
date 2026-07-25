# Bring Sally Up

App de challenge push-up basée sur "Flower" de Moby. Chronomètre synchronisé avec les cues vocaux "Bring Sally up / down", suivi de progression, historique avec heatmap et graphiques.

## Stack

- **Expo SDK 57** (React Native 0.86)
- **TypeScript** (strict)
- **React Navigation** (stack)
- **react-native-reanimated** + **react-native-reanimated-carousel** (carousel calendrier)
- **react-native-svg** (graphiques, cercle de progression)
- **react-native-size-matters** (UI responsive)
- **expo-av** (lecture audio)
- **AsyncStorage** (persistance locale)

## Lancer le projet

```bash
npm install
npx expo start --web    # web (dev)
npx expo start          # mobile (scanner Expo Go)
```

## Build APK

```bash
npx eas build -p android --profile preview
```

L'APK nécessite le fichier `assets/sally.mp3` (non inclus, à fournir).

## Structure

```
src/
├── data/cues.ts           # Timestamps calibrés (61 cues)
├── screens/
│   ├── HomeScreen.tsx      # Accueil : scores, streak, bouton GO
│   ├── ChallengeScreen.tsx # Player : cercle progression, badges UP/DOWN, ajustement temps
│   ├── HistoryScreen.tsx   # Calendrier swipe, graphique tendance, stats, sessions
│   ├── ImportScreen.tsx    # Import historique en M:SS
│   └── CalibrateScreen.tsx # Calibration cues (one-shot)
├── storage.ts             # CRUD AsyncStorage (historique, cues custom)
└── types.ts               # Types partagés
```

## Fonctionnalités

- **Player** : cercle SVG progressif (vert → rouge), badges UP/DOWN, tap n'importe où pour abandonner, ajustement du temps ± avant sauvegarde. Une seule entrée par jour (écrase si meilleur temps).
- **Calendrier** : carousel swipe des 12 derniers mois, cellules colorées (rouge à vert selon performance vs moyenne).
- **Tooltip** : tap une cellule pour voir le temps, reps estimés, ±% vs moyenne.
- **Graphique tendance** : courbe mobile average, nuage de points, axe Y auto-scalé, axe X première/dernière date.
- **Filtres** : 1M / 6M / 1Y / ALL. Le swipe d'un mois force 1M sur ce mois.
- **Historique** : liste des sessions dans une carte, dates format FR.
- **Import** : format `YYYY-MM-DD M:SS`.
- **Calibration** : tape au rythme de la chanson pour enregistrer les vrais timestamps (stockés en dur depuis).

## Dernières actions (juillet 2026)

- **UI responsive** : `react-native-size-matters` (`ms()` / `scale()`) pour adapter tailles à l'écran (mobile, tablette).
- **Tooltip calendrier** : remplace la légende, affiche temps + reps + écart à la moyenne au tap.
- **Dates FR** : format `jj/mm/aa` dans l'historique.
- **Carousel calendrier** : `react-native-reanimated-carousel` v5, swipe fluide, aperçu des mois adjacents.
- **Graphique tendance** : auto-scale Y (min all-time → max période), grille, labels lisibles.
- **Une entrée par jour** : sauvegarde intelligente, rejet si moins bon que le jour même.
- **Player** : cercle de progression SVG (vert→jaune→orange→rouge), badges UP/DOWN largeur fixe, pas de saut de layout.
- **TypeScript** : migration complète, types partagés, navigation typée.
- **ESLint** : config `@stylistic`, format auto avant commit.
