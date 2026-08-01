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
import { formatTime } from '../utils/time';
import { computeStreak } from '../utils/streak';
import type { StreakInfo } from '../utils/streak';
import StreakCard from '../components/home/StreakCard';
import PlayButton from '../components/home/PlayButton';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Home'> };

const EMPTY_STREAK: StreakInfo = {
  current: 0,
  best: 0,
  doneToday: false,
  week: [],
};

// What the play button says. Nudges while the day is open, congratulates once done.
function prompt(streak: StreakInfo, hasHistory: boolean): string {
  if (streak.doneToday) return 'séance du jour validée';
  if (streak.current === 0) return hasHistory ? 'relance ta série' : 'première séance';
  if (streak.current + 1 > streak.best) return `${streak.current + 1} jours = nouveau record`;
  return `ne casse pas ta série de ${streak.current} jours`;
}

function subPrompt(streak: StreakInfo): string | null {
  if (streak.doneToday) return 'encore une pour améliorer le temps ?';
  if (streak.current > 0) return 'plus qu\'aujourd\'hui à tenir';
  return null;
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
  const sub = subPrompt(streak);

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

        <View style={[styles.scoresRow, { gap: scale(32) }]}>
          <View style={[styles.scoreBox, {
            paddingHorizontal: scale(24),
            paddingVertical: scale(16),
            borderRadius: scale(16),
          }]}
          >
            <Text style={[styles.scoreLabel, { fontSize: ms(11) }]}>record</Text>
            <Text style={[styles.scoreValue, { fontSize: ms(42) }]}>
              {bestScore?.duration != null ? formatTime(bestScore.duration) : '--:--'}
            </Text>
            <Text style={[styles.scoreDate, { fontSize: ms(12) }]}>
              {bestScore?.date
                ? new Date(bestScore.date).toLocaleDateString('fr', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : ''}
            </Text>
          </View>
          <View style={[styles.scoreBox, {
            paddingHorizontal: scale(24),
            paddingVertical: scale(16),
            borderRadius: scale(16),
          }]}
          >
            <Text style={[styles.scoreLabel, { fontSize: ms(11) }]}>dernier</Text>
            <Text style={[styles.scoreValue, {
              fontSize: ms(42),
              color: lastScore?.duration != null ? scoreColor(lastScore.duration, recentAvg) : '#fff',
            }]}
            >
              {lastScore?.duration != null ? formatTime(lastScore.duration) : '--:--'}
            </Text>
            <Text style={[styles.scoreDate, { fontSize: ms(12) }]}>
              {lastScore?.date
                ? new Date(lastScore.date).toLocaleDateString('fr', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : ''}
            </Text>
          </View>
        </View>

        <StreakCard streak={streak} />

        <PlayButton
          pulsing={!streak.doneToday}
          onPress={() => navigation.navigate('Challenge')}
        />

        <Text style={[styles.prompt, { fontSize: ms(14) }, streak.doneToday && styles.promptDone]}>
          {prompt(streak, hasHistory)}
        </Text>
        {sub && <Text style={[styles.subPrompt, { fontSize: ms(11) }]}>{sub}</Text>}
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
  scoresRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  scoreBox: {
    alignItems: 'center',
    backgroundColor: '#1c1c22',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    elevation: 4,
  },
  scoreLabel: {
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  scoreValue: {
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  scoreDate: {
    color: '#555',
    marginTop: 4,
  },
  prompt: {
    color: ACCENT,
    marginTop: 20,
    letterSpacing: 1,
    textAlign: 'center',
  },
  promptDone: { color: '#4caf50' },
  subPrompt: {
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
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
