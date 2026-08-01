import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { getHistory } from '../storage';
import type { RootStackParamList, Attempt } from '../types';
import { scoreColor, ACCENT } from '../utils/color';
import { COLORS } from '../theme';
import { formatTime } from '../utils/time';
import { computeStreak } from '../utils/streak';
import type { StreakInfo } from '../utils/streak';
import StatCard from '../components/home/StatCard';
import PlayButton from '../components/home/PlayButton';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Home'> };

const EMPTY_STREAK: StreakInfo = {
  current: 0,
  best: 0,
  doneToday: false,
};

// What the play button says. Nudges while the day is open, congratulates once done.
function prompt(streak: StreakInfo, hasHistory: boolean): string {
  if (streak.doneToday) return 'séance du jour validée';
  if (streak.current === 0) return hasHistory ? 'relance ta série' : 'première séance';
  if (streak.current + 1 > streak.best) return `${streak.current + 1} jours = nouveau record`;
  return `ne casse pas ta série de ${streak.current} jours`;
}

export default function HomeScreen({ navigation }: Props) {
  const [lastScore, setLastScore] = useState<Attempt | null>(null);
  const [bestScore, setBestScore] = useState<Attempt | null>(null);
  const [streak, setStreak] = useState<StreakInfo>(EMPTY_STREAK);
  const [recentAvg, setRecentAvg] = useState(0);

  useFocusEffect(useCallback(() => {
    getHistory().then(h => {
      setStreak(computeStreak(h));
      if (h.length > 0) {
        setLastScore(h[0]);
        setBestScore(h.reduce((max, a) => (a.duration ?? 0) > (max.duration ?? 0) ? a : max, h[0]));
        const recent = h.slice(0, 10).map(a => a.duration ?? 0).filter(t => t > 0);
        if (recent.length > 0) setRecentAvg(recent.reduce((a, b) => a + b, 0) / recent.length);
      }
    });
  }, []));

  const hasHistory = bestScore != null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.center}>
        <Text style={[styles.logo, {
          fontSize: ms(28),
          marginBottom: ms(24),
        }]}
        >
          BRING SALLY UP
        </Text>

        <View style={[styles.cards, { gap: scale(16) }]}>
          <StatCard
            label="temps"
            value={lastScore?.duration != null ? formatTime(lastScore.duration) : '--:--'}
            valueColor={lastScore?.duration != null
              ? scoreColor(lastScore.duration, recentAvg)
              : COLORS.text}
            record={bestScore?.duration != null ? formatTime(bestScore.duration) : undefined}
          />
          <StatCard
            label="série"
            value={String(streak.current)}
            valueColor={streak.current > 0 ? ACCENT : COLORS.faint}
            icon={streak.current > 0 ? '🔥' : undefined}
            record={streak.best > 0 ? `${streak.best} j` : undefined}
          />
        </View>

        <PlayButton
          pulsing={!streak.doneToday}
          onPress={() => navigation.navigate('Challenge')}
        />

        <Text style={[styles.prompt, { fontSize: ms(14) }, streak.doneToday && styles.promptDone]}>
          {prompt(streak, hasHistory)}
        </Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.navBtn, {
            paddingHorizontal: scale(28),
            paddingVertical: scale(14),
            borderRadius: scale(28),
          }]}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={[styles.navBtnText, { fontSize: ms(15) }]}>historique</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16161a',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logo: {
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cards: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginBottom: 36,
  },
  prompt: {
    color: ACCENT,
    marginTop: 20,
    letterSpacing: 1,
    textAlign: 'center',
  },
  promptDone: { color: COLORS.good },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 20,
    paddingTop: 16,
  },
  navBtn: {
    backgroundColor: '#1c1c22',
    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    elevation: 2,
  },
  navBtnText: {
    color: '#aaa',
    fontWeight: '500',
    letterSpacing: 1,
  },
});
